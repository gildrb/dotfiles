/**
 * Prime Agent adapter for the pinned pi-web-access package.
 *
 * Prime uses ~/.prime/agent, while Pi extensions conventionally inspect
 * PI_CODING_AGENT_DIR. Set that boundary before importing the package so its
 * config, cache, and model-auth lookup stay inside Prime's managed directory.
 *
 * The package is installed declaratively with auto-loading disabled. This
 * adapter records every registration and replays it only after all three
 * required research tools exist, so a partial package load cannot leave a
 * broken session. A dependency-free DuckDuckGo search remains available when
 * both package locations are absent.
 *
 * Provenance: nicobailon/pi-web-access@711cc41313202e277a248b1cc45942b6dc8927f7
 * (MIT), selected after repeated native Codex, Exa MCP, DuckDuckGo, and Bing
 * comparison runs. prime/web-search.json chooses zero-key Exa first for its
 * latency and source quality, then native OpenAI/Codex and DuckDuckGo. Site-specific X queries use
 * keyless Parallel MCP with native OpenAI/Codex retry because Exa returned empty results. Public X/Twitter status
 * fetches use Twitter's own zero-key oEmbed endpoint before generic extraction.
 */
import { homedir } from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const agentDir =
	process.env.PI_CODING_AGENT_DIR ??
	process.env.PRIME_AGENT_CODING_AGENT_DIR ??
	`${homedir()}/.prime/agent`;
process.env.PI_CODING_AGENT_DIR = agentDir;

const CANDIDATE_ENTRIES = [
	`${agentDir}/git/github.com/nicobailon/pi-web-access/index.ts`,
	`${agentDir}/npm-global/lib/node_modules/pi-web-access/index.ts`,
];
const REQUIRED_TOOLS = new Set(["web_search", "web_fetch", "web_read"]);
const REGISTRATION_METHODS = new Set([
	"on",
	"registerCommand",
	"registerShortcut",
	"registerTool",
]);
const TYPEBOX_KIND = Symbol.for("TypeBox.Kind");
const MAX_QUERIES = 4;
const MAX_RESULTS = 10;
const SEARCH_TIMEOUT_MS = 20_000;

type Registration = {
	method: "on" | "registerCommand" | "registerShortcut" | "registerTool";
	args: unknown[];
};

type SearchParams = {
	query?: string;
	queries?: string[];
	numResults?: number;
};

type SearchResult = {
	title: string;
	url: string;
	snippet: string;
};

function decodeHtml(value: string): string {
	return value
		.replaceAll("&amp;", "&")
		.replaceAll("&quot;", '"')
		.replaceAll("&#39;", "'")
		.replaceAll("&lt;", "<")
		.replaceAll("&gt;", ">")
		.replaceAll("&nbsp;", " ")
		.replaceAll("&mdash;", "—")
		.replaceAll("&ndash;", "–")
		.replace(/&#x([0-9a-f]+);/gi, (_match, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 16)),
		)
		.replace(/&#(\d+);/g, (_match, code: string) =>
			String.fromCodePoint(Number.parseInt(code, 10)),
		);
}

function stripHtml(value: string): string {
	return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

function resultUrl(rawHref: string): string | undefined {
	try {
		const decoded = decodeHtml(rawHref);
		const url = new URL(decoded.startsWith("//") ? `https:${decoded}` : decoded);
		const destination = url.searchParams.get("uddg");
		return destination ? decodeURIComponent(destination) : url.href;
	} catch {
		return undefined;
	}
}

function parseDuckDuckGo(html: string, limit: number): SearchResult[] {
	const anchors = [
		...html.matchAll(
			/<a\b[^>]*class="[^"]*result__a[^"]*"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
		),
	];
	const snippets = [
		...html.matchAll(
			/<a\b[^>]*class="[^"]*result__snippet[^"]*"[^>]*>([\s\S]*?)<\/a>/g,
		),
	].map((match) => stripHtml(match[1] ?? ""));
	const results: SearchResult[] = [];
	for (const [index, anchor] of anchors.entries()) {
		const title = stripHtml(anchor[2] ?? "");
		const url = resultUrl(anchor[1] ?? "");
		if (!title || !url || results.some((result) => result.url === url)) continue;
		results.push({
			title: title.slice(0, 300),
			url,
			snippet: (snippets[index] ?? "").slice(0, 500),
		});
		if (results.length >= limit) break;
	}
	return results;
}

async function searchDuckDuckGo(
	query: string,
	limit: number,
	signal: AbortSignal | undefined,
): Promise<SearchResult[]> {
	const url = new URL("https://html.duckduckgo.com/html/");
	url.searchParams.set("q", query);
	const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
	const response = await fetch(url, {
		headers: {
			Accept: "text/html",
			"User-Agent": "Mozilla/5.0 (compatible; prime-web-search-fallback/1.0)",
		},
		signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
	});
	if (!response.ok) throw new Error(`DuckDuckGo returned HTTP ${response.status}`);
	const results = parseDuckDuckGo(await response.text(), limit);
	if (results.length === 0) {
		throw new Error("DuckDuckGo returned no parseable results");
	}
	return results;
}

type WebToolDefinition = {
	name?: string;
	execute?: (
		toolCallId: string,
		params: Record<string, unknown>,
		signal?: AbortSignal,
		onUpdate?: unknown,
		context?: unknown,
	) => Promise<unknown>;
	[key: string]: unknown;
};

function twitterStatusUrl(raw: unknown): URL | undefined {
	if (typeof raw !== "string") return undefined;
	try {
		const url = new URL(raw);
		const hostname = url.hostname.toLowerCase().replace(/^www\./, "");
		if (hostname !== "x.com" && hostname !== "twitter.com") return undefined;
		if (!/^\/[^/]+\/status\/\d+/.test(url.pathname)) return undefined;
		return url;
	} catch {
		return undefined;
	}
}

async function fetchTwitterOembed(
	url: URL,
	signal: AbortSignal | undefined,
): Promise<{ content: Array<{ type: "text"; text: string }>; details: Record<string, unknown> } | undefined> {
	const endpoint = new URL("https://publish.twitter.com/oembed");
	endpoint.searchParams.set("url", url.href);
	endpoint.searchParams.set("omit_script", "true");
	endpoint.searchParams.set("dnt", "true");
	const timeout = AbortSignal.timeout(SEARCH_TIMEOUT_MS);
	try {
		const response = await fetch(endpoint, {
			headers: { Accept: "application/json" },
			signal: signal ? AbortSignal.any([signal, timeout]) : timeout,
		});
		if (!response.ok) return undefined;
		const payload = (await response.json()) as Record<string, unknown>;
		const html = typeof payload.html === "string" ? payload.html : "";
		const text = stripHtml(html).slice(0, 20_000);
		if (!text) return undefined;
		const author = typeof payload.author_name === "string" ? payload.author_name : "Unknown author";
		return {
			content: [{
				type: "text",
				text: `**Fetched X/Twitter post:** ${url.href}\n**Author:** ${author}\n\n${text}`,
			}],
			details: { url: url.href, provider: "twitter-oembed", contentLength: text.length },
		};
	} catch {
		return undefined;
	}
}

function hasXSiteQuery(params: Record<string, unknown>): boolean {
	const query = typeof params.query === "string" ? [params.query] : [];
	const queries = Array.isArray(params.queries)
		? params.queries.filter((value): value is string => typeof value === "string")
		: query;
	return queries.some((value) => /site:(?:x\.com|twitter\.com)|(?:x\.com|twitter\.com)\//i.test(value));
}

function hasSearchResults(value: unknown): boolean {
	if (typeof value !== "object" || value === null) return false;
	const result = value as {
		content?: Array<{ type?: string; text?: string }>;
		details?: { totalResults?: unknown };
	};
	if (typeof result.details?.totalResults === "number") {
		return result.details.totalResults > 0;
	}
	return result.content?.some(
		(item) => item.type === "text" && typeof item.text === "string" && /https?:\/\//.test(item.text),
	) ?? false;
}

function withSearchRoute(value: unknown, provider: string, fallbackUsed: boolean): unknown {
	if (typeof value !== "object" || value === null) return value;
	const result = value as {
		content?: Array<{ type?: string; text?: string; [key: string]: unknown }>;
		details?: Record<string, unknown>;
	};
	let annotated = false;
	const content = result.content?.map((item) => {
		if (annotated || item.type !== "text" || typeof item.text !== "string") return item;
		annotated = true;
		return {
			...item,
			text: `${item.text}\n\n[Prime search route: provider=${provider}; fallback=${fallbackUsed}]`,
		};
	});
	return {
		...result,
		content,
		details: {
			...result.details,
			primeProviderRoute: provider,
			primeFallbackUsed: fallbackUsed,
		},
	};
}

function withPrimeReliability(definition: WebToolDefinition): WebToolDefinition {
	if (typeof definition.execute !== "function") return definition;
	const execute = definition.execute;
	if (definition.name === "web_search") {
		return {
			...definition,
			async execute(toolCallId, params, signal, onUpdate, context) {
				const provider = params.provider;
				if (
					!hasXSiteQuery(params) ||
					(provider !== undefined && provider !== "auto")
				) {
					return execute(toolCallId, params, signal, onUpdate, context);
				}
				try {
					const parallel = await execute(
						toolCallId,
						{ ...params, provider: "parallel-mcp" },
						signal,
						onUpdate,
						context,
					);
					if (hasSearchResults(parallel)) {
						return withSearchRoute(parallel, "parallel-mcp", false);
					}
				} catch (error) {
					if (signal?.aborted) throw error;
					// Retry through the existing Prime/Codex authentication below.
				}
				const openai = await execute(
					toolCallId,
					{ ...params, provider: "openai" },
					signal,
					onUpdate,
					context,
				);
				return withSearchRoute(openai, "openai", true);
			},
		};
	}
	if (definition.name !== "web_fetch") return definition;
	return {
		...definition,
		async execute(toolCallId, params, signal, onUpdate, context) {
			const statusUrl = twitterStatusUrl(params.url);
			if (statusUrl) {
				const oembed = await fetchTwitterOembed(statusUrl, signal);
				if (oembed) return oembed;
			}
			return execute(toolCallId, params, signal, onUpdate, context);
		},
	};
}

function registerFallbackSearch(pi: ExtensionAPI, reason: string): void {
	pi.registerTool({
		name: "web_search",
		label: "Web Search (fallback)",
		description:
			"Search the public web through zero-key DuckDuckGo. The full native-Codex/Exa research package failed to load.",
		parameters: {
			type: "object",
			[TYPEBOX_KIND]: "Object",
			properties: {
				query: { type: "string", [TYPEBOX_KIND]: "String" },
				queries: {
					type: "array",
					[TYPEBOX_KIND]: "Array",
					items: { type: "string", [TYPEBOX_KIND]: "String" },
				},
				numResults: { type: "number", [TYPEBOX_KIND]: "Number" },
			},
		},
		async execute(_toolCallId, params: SearchParams, signal) {
			const queries = (params.queries ?? (params.query ? [params.query] : []))
				.map((query) => query.trim())
				.filter(Boolean)
				.slice(0, MAX_QUERIES);
			if (queries.length === 0) throw new Error("query or queries is required");
			const limit = Math.max(1, Math.min(Math.floor(params.numResults ?? 5), MAX_RESULTS));
			const blocks: string[] = [];
			for (const query of queries) {
				const results = await searchDuckDuckGo(query, limit, signal);
				blocks.push(
					[`Web search results for "${query}":`, ...results.map(
						(result, index) =>
							`${index + 1}. ${result.title}\n   ${result.url}${result.snippet ? `\n   ${result.snippet}` : ""}`,
					)].join("\n"),
				);
			}
			return {
				content: [{
					type: "text" as const,
					text: `${blocks.join("\n\n")}\n\n[prime-web-search degraded: ${reason}]`,
				}],
				details: { degraded: true, provider: "duckduckgo", queryCount: queries.length },
			};
		},
	});
	pi.on("session_start", async (_event, ctx) => {
		ctx.ui?.notify?.(
			`Prime web research package failed to load; zero-key DuckDuckGo fallback is active. ${reason}`,
			"error",
		);
	});
}

export default async function primeWebSearch(pi: ExtensionAPI): Promise<void> {
	let failure: unknown = new Error("no candidate package found");
	for (const entry of CANDIDATE_ENTRIES) {
		const registrations: Registration[] = [];
		const recorder = new Proxy(pi, {
			get(target, property) {
				if (typeof property === "string" && REGISTRATION_METHODS.has(property)) {
					return (...args: unknown[]) => {
						registrations.push({ method: property as Registration["method"], args });
					};
				}
				const value = Reflect.get(target, property);
				return typeof value === "function" ? value.bind(target) : value;
			},
		});
		try {
			const module = (await import(entry)) as {
				default: (api: ExtensionAPI) => void | Promise<void>;
			};
			await module.default(recorder);
			const names = new Set(
				registrations
					.filter((registration) => registration.method === "registerTool")
					.map((registration) => (registration.args[0] as { name?: string } | undefined)?.name),
			);
			const missing = [...REQUIRED_TOOLS].filter((name) => !names.has(name));
			if (missing.length > 0) {
				throw new Error(`loaded ${entry} without required tools: ${missing.join(", ")}`);
			}
			for (const registration of registrations) {
				const register = pi[registration.method] as (...args: unknown[]) => unknown;
				const args =
					registration.method === "registerTool" && registration.args[0]
						? [
							withPrimeReliability(registration.args[0] as WebToolDefinition),
							...registration.args.slice(1),
						]
						: registration.args;
				Reflect.apply(register, pi, args);
			}
			return;
		} catch (error) {
			failure = error;
		}
	}
	const reason = failure instanceof Error ? failure.message : String(failure);
	registerFallbackSearch(pi, reason);
}
