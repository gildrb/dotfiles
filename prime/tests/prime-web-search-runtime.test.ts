import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { spawnSync } from "node:child_process";

const root = mkdtempSync(join(tmpdir(), "prime-web-search-runtime-"));
const adapterUrl = pathToFileURL(join(import.meta.dir, "../extensions/prime-web-search.ts")).href;

function run(name: string, source: string): Record<string, unknown> {
	const path = join(root, `${name}.ts`);
	writeFileSync(path, source);
	const child = spawnSync(process.execPath, [path], {
		cwd: import.meta.dir,
		encoding: "utf8",
	});
	assert.equal(child.status, 0, child.stderr || child.stdout);
	return JSON.parse(child.stdout.trim()) as Record<string, unknown>;
}

const completeAgentDir = join(root, "complete-agent");
const completePackageDir = join(
	completeAgentDir,
	"git/github.com/nicobailon/pi-web-access",
);
mkdirSync(completePackageDir, { recursive: true });
writeFileSync(
	join(completePackageDir, "index.ts"),
	`export default function (pi) {
		pi.on("session_start", () => {});
		pi.registerShortcut("web-activity", {});
		pi.registerTool({ name: "web_search", execute: async (_id, params) => {
			if (params.query.includes("throw") && params.provider === "parallel-mcp") throw new Error("mocked provider failure");
			if (params.query.includes("openai-error") && params.provider === "openai") throw new Error("mocked OpenAI quota failure");
			const empty = (
				(params.query.includes("fallback") || params.query.includes("openai-"))
				&& params.provider === "parallel-mcp"
			) || (params.query.includes("openai-empty") && params.provider === "openai");
			return { content: [{ type: "text", text: params.provider ?? "routed" }], details: { totalResults: empty ? 0 : 1 } };
		} });
		pi.registerTool({ name: "web_fetch", execute: async () => ({ content: [{ type: "text", text: "generic" }] }) });
		pi.registerTool({ name: "web_read", execute: async () => ({ content: [{ type: "text", text: "read" }] }) });
	}`,
);
const complete = run(
	"complete",
	`process.env.PI_CODING_AGENT_DIR = ${JSON.stringify(completeAgentDir)};
	const tools = new Map();
	const events = [];
	const shortcuts = [];
	const pi = {
		registerTool: (tool) => tools.set(tool.name, tool),
		on: (event) => events.push(event),
		registerShortcut: (name) => shortcuts.push(name),
		registerCommand: () => {},
	};
	const adapter = (await import(${JSON.stringify(adapterUrl)})).default;
	await adapter(pi);
	globalThis.fetch = async (input) => {
		if (!String(input).startsWith("https://publish.twitter.com/oembed?")) throw new Error("unexpected fetch");
		return Response.json({ author_name: "VGPU", html: "<blockquote><p>Verified WebGPU post.</p><a>June 1, 2026</a></blockquote>" });
	};
	const xSearch = await tools.get("web_search").execute("x", { query: "site:x.com vgpu.sh" });
	const normalSearch = await tools.get("web_search").execute("normal", { query: "vgpu docs" });
	const fallbackSearch = await tools.get("web_search").execute("fallback", { query: "site:x.com fallback" });
	const thrownSearch = await tools.get("web_search").execute("throw", { query: "site:x.com throw" });
	const openaiEmptySearch = await tools.get("web_search").execute("openai-empty", { query: "site:x.com openai-empty" });
	const openaiErrorSearch = await tools.get("web_search").execute("openai-error", { query: "site:x.com openai-error" });
	const explicitSearch = await tools.get("web_search").execute("explicit", { query: "site:x.com vgpu.sh", provider: "exa" });
	const abortController = new AbortController();
	abortController.abort();
	let abortPreserved = false;
	try {
		await tools.get("web_search").execute("aborted", { query: "site:x.com throw" }, abortController.signal);
	} catch (error) {
		abortPreserved = error instanceof Error && error.message === "mocked provider failure";
	}
	const result = await tools.get("web_fetch").execute("twitter", { url: "https://x.com/vgpu/status/123" });
	console.log(JSON.stringify({ tools: [...tools.keys()], events, shortcuts, xProvider: xSearch.content[0].text, xDetails: xSearch.details, normalProvider: normalSearch.content[0].text, fallbackProvider: fallbackSearch.content[0].text, fallbackDetails: fallbackSearch.details, thrownProvider: thrownSearch.content[0].text, thrownDetails: thrownSearch.details, openaiEmptyProvider: openaiEmptySearch.content[0].text, openaiEmptyDetails: openaiEmptySearch.details, openaiErrorProvider: openaiErrorSearch.content[0].text, openaiErrorDetails: openaiErrorSearch.details, explicitProvider: explicitSearch.content[0].text, abortPreserved, text: result.content[0].text, details: result.details }));`,
);
assert.deepEqual(complete.tools, ["web_search", "web_fetch", "web_read"]);
assert.deepEqual(complete.events, ["session_start"]);
assert.deepEqual(complete.shortcuts, ["web-activity"]);
assert.match(String(complete.xProvider), /^parallel-mcp[\s\S]*provider=parallel-mcp; fallback=false/);
assert.deepEqual(complete.xDetails, {
	totalResults: 1,
	primeProviderRoute: "parallel-mcp",
	primeFallbackUsed: false,
});
assert.equal(complete.normalProvider, "routed");
assert.match(String(complete.fallbackProvider), /^openai[\s\S]*provider=openai; fallback=true/);
assert.deepEqual(complete.fallbackDetails, {
	totalResults: 1,
	primeProviderRoute: "openai",
	primeFallbackUsed: true,
});
assert.match(String(complete.thrownProvider), /^openai[\s\S]*provider=openai; fallback=true/);
assert.deepEqual(complete.thrownDetails, {
	totalResults: 1,
	primeProviderRoute: "openai",
	primeFallbackUsed: true,
});
assert.match(String(complete.openaiEmptyProvider), /^duckduckgo[\s\S]*provider=duckduckgo; fallback=true/);
assert.deepEqual(complete.openaiEmptyDetails, {
	totalResults: 1,
	primeProviderRoute: "duckduckgo",
	primeFallbackUsed: true,
});
assert.match(String(complete.openaiErrorProvider), /^duckduckgo[\s\S]*provider=duckduckgo; fallback=true/);
assert.deepEqual(complete.openaiErrorDetails, {
	totalResults: 1,
	primeProviderRoute: "duckduckgo",
	primeFallbackUsed: true,
});
assert.equal(complete.explicitProvider, "exa");
assert.equal(complete.abortPreserved, true);
assert.match(String(complete.text), /Verified WebGPU post/);
assert.deepEqual(complete.details, {
	url: "https://x.com/vgpu/status/123",
	provider: "twitter-oembed",
	contentLength: 34,
});

const missingAgentDir = join(root, "missing-agent");
const fallback = run(
	"fallback",
	`process.env.PI_CODING_AGENT_DIR = ${JSON.stringify(missingAgentDir)};
	const tools = new Map();
	const events = [];
	const pi = {
		registerTool: (tool) => tools.set(tool.name, tool),
		on: (event) => events.push(event),
		registerShortcut: () => {},
		registerCommand: () => {},
	};
	globalThis.fetch = async () => new Response(
		'<a class="result__a" href="//duckduckgo.com/l/?uddg=https%3A%2F%2Fexample.com%2Fdocs">Example Docs</a>' +
		'<a class="result__snippet">Verified documentation result.</a>',
		{ status: 200, headers: { "content-type": "text/html" } },
	);
	const adapter = (await import(${JSON.stringify(adapterUrl)})).default;
	await adapter(pi);
	const result = await tools.get("web_search").execute("test", { query: "example docs" });
	console.log(JSON.stringify({ tools: [...tools.keys()], events, text: result.content[0].text }));`,
);
assert.deepEqual(fallback.tools, ["web_search"]);
assert.deepEqual(fallback.events, ["session_start"]);
assert.match(String(fallback.text), /https:\/\/example\.com\/docs/);
assert.match(String(fallback.text), /prime-web-search degraded:/);

rmSync(root, { recursive: true, force: true });
