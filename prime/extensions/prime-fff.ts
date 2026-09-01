/**
 * prime-fff: resilient Prime-side binding for the pinned FFF search extension.
 *
 * Prime exposes only the ipython tool, so FFF's "override" tool names
 * (grep/find/multi_grep) are free and match the names models already know;
 * stock Pi keeps its builtin find/grep and uses the prefixed fffind/ffgrep.
 * Benchmark (glm-5.3, 3-turn search/edit/verify, 2 reps): override naming
 * raised cache hit share 90.2% -> 92.0% and cut uncached input 27.4k -> 25.2k
 * tokens versus baseline by moving search off python subprocess round-trips.
 *
 * Reliability contract (Prime has NO builtin grep/find to fall back to):
 * 1. The package is loaded from generation-independent paths: the declarative
 *    git checkout first, the legacy npm-global copy as bridge. A broken
 *    candidate never blocks the next one, and tool registration is recorded
 *    then replayed so a half-registered extension cannot mix states.
 * 2. If no candidate loads (fresh machine before package install, nuked
 *    node_modules, store GC), dependency-free builtin grep/find register
 *    instead, and the user is notified at session start. Search keeps working;
 *    only fuzzy ranking, frecency and pagination are lost.
 * 3. Loaded FFF tools that throw infrastructure errors mid-session (home-dir
 *    scan refusal, native/LMDB failures) degrade that call to the builtin
 *    search instead of failing the task. Agent-facing errors (bad patterns,
 *    wildcard guards) pass through untouched.
 *
 * The package is installed declaratively by the packages entry in
 * settings.json ({"extensions": []} so it does not auto-load a second time).
 * Git packages clone to ~/.prime/agent/git/<host>/<path> and run
 * `npm install` inside the checkout; npmCommand in settings.json therefore
 * exports npm_config_prefix instead of passing --prefix, so -g installs land
 * in ~/.prime/agent/npm-global while in-checkout installs stay local (the
 * Nix store global root is read-only).
 *
 * Provenance: gildrb/pi-fff-patched@8689459d1ea2ea80d6c38f5a32085204ef4926f2
 * = npm:@ff-labs/pi-fff@0.10.5
 * = git:github.com/dmtrKovalenko/fff@16730049c86e9f7fe987ab8df0c36b82450c8438
 * (tag v0.10.5) plus pagination and search-contract fixes: fuzzy grep cursors
 * resume the fuzzy stream, find pages use native item offsets, fuzzy fallback
 * retains constraints and strict case, and invalid cursors fail closed.
 */
import { homedir } from "node:os";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const agentDir = process.env.PI_CODING_AGENT_DIR ?? `${homedir()}/.prime/agent`;

const CANDIDATE_ENTRIES = [
	`${agentDir}/git/github.com/gildrb/pi-fff-patched/src/index.ts`,
	`${agentDir}/npm-global/lib/node_modules/@ff-labs/pi-fff/src/index.ts`,
];

// The override names; search tools wrapped for execute-time degradation.
const SEARCH_TOOLS = new Set(["grep", "find", "multi_grep"]);

// ---------------------------------------------------------------------------
// Degraded builtin search (no dependencies; used only when FFF is broken).
// Schemas carry TypeBox Kind markers because pi validates tool arguments with
// TypeBox, which rejects plain JSON schema ("Unknown type").
// ---------------------------------------------------------------------------

const TYPEBOX_KIND = Symbol.for("TypeBox.Kind");
const tString = (description: string) => ({ type: "string", description, [TYPEBOX_KIND]: "String" });
const tNumber = (description: string) => ({ type: "number", description, [TYPEBOX_KIND]: "Number" });
const tBoolean = (description: string) => ({ type: "boolean", description, [TYPEBOX_KIND]: "Boolean" });

const SKIP_DIRS = new Set([".git", ".direnv", "node_modules", "result"]);
const MAX_FILE_BYTES = 2 * 1024 * 1024;

interface DegradedParams {
	pattern?: string;
	patterns?: string[];
	path?: string;
	limit?: number;
	exclude?: string | string[];
	context?: number;
	caseSensitive?: boolean;
	cursor?: string;
}

function degradedHeader(reason: string): string {
	return `[prime-fff degraded: ${reason}. Builtin substring search — literal patterns only, no fuzzy ranking, no pagination. Fix: prime-agent package install git:github.com/gildrb/pi-fff-patched]`;
}

function excludeTerms(exclude: string | string[] | undefined): string[] {
	const list = Array.isArray(exclude) ? exclude : exclude ? [exclude] : [];
	return list
		.flatMap((raw) => raw.split(/[,\s]+/))
		.map((term) => term.replace(/^!/, "").trim())
		.filter(Boolean);
}

async function* walkFiles(root: string): AsyncGenerator<string> {
	const pending = [root];
	while (pending.length > 0) {
		const dir = pending.pop()!;
		let entries;
		try {
			entries = await fs.readdir(dir, { withFileTypes: true });
		} catch {
			continue; // unreadable dirs (permissions, races) must not fail the call
		}
		for (const entry of entries) {
			if (SKIP_DIRS.has(entry.name)) continue;
			const full = path.join(dir, entry.name);
			if (entry.isDirectory()) pending.push(full);
			else if (entry.isFile()) yield full;
		}
	}
}

async function degradedGrep(params: DegradedParams): Promise<string> {
	const pattern = params.pattern ?? "";
	if (!pattern) throw new Error("pattern is required");
	const cwd = process.cwd();
	const root = path.resolve(cwd, params.path ?? ".");
	const excludes = excludeTerms(params.exclude);
	const smartCase = params.caseSensitive !== true;
	const insensitive = smartCase && pattern === pattern.toLowerCase();
	const needle = insensitive ? pattern.toLowerCase() : pattern;
	const limit = Math.max(1, Math.min(params.limit ?? 20, 200));
	const context = Math.max(0, Math.min(params.context ?? 0, 20));

	const stat = await fs.stat(root).catch(() => null);
	const files = stat?.isFile() ? [root] : walkFiles(root);
	const blocks: string[] = [];
	let shown = 0;
	for await (const file of files) {
		const relative = path.relative(cwd, file) || file;
		if (excludes.some((term) => relative.includes(term))) continue;
		const info = await fs.stat(file).catch(() => null);
		if (!info || info.size > MAX_FILE_BYTES) continue;
		const text = await fs.readFile(file, "utf8").catch(() => null);
		if (text === null || text.includes("\0")) continue; // unreadable or binary
		const lines = text.split("\n");
		const matches: string[] = [];
		for (let i = 0; i < lines.length && shown + matches.length < limit; i++) {
			const haystack = insensitive ? lines[i].toLowerCase() : lines[i];
			if (!haystack.includes(needle)) continue;
			for (let c = Math.max(0, i - context); c < i; c++) matches.push(`${c + 1}- ${lines[c]}`);
			matches.push(` ${i + 1}: ${lines[i].slice(0, 500)}`);
			for (let c = i + 1; c <= Math.min(lines.length - 1, i + context); c++) matches.push(`${c + 1}- ${lines[c]}`);
		}
		if (matches.length > 0) {
			shown += matches.length;
			blocks.push(`${relative}\n${matches.join("\n")}`);
		}
		if (shown >= limit) break;
	}
	return blocks.length > 0 ? blocks.join("\n\n") : "No matches found";
}

async function degradedFind(params: DegradedParams): Promise<string> {
	const pattern = params.pattern ?? "";
	if (!pattern) throw new Error("pattern is required");
	const cwd = process.cwd();
	const root = path.resolve(cwd, params.path ?? ".");
	const excludes = excludeTerms(params.exclude);
	const needle = pattern.toLowerCase();
	const limit = Math.max(1, Math.min(params.limit ?? 30, 200));

	const found: string[] = [];
	for await (const file of walkFiles(root)) {
		const relative = path.relative(cwd, file) || file;
		if (excludes.some((term) => relative.includes(term))) continue;
		if (relative.toLowerCase().includes(needle)) found.push(relative);
		if (found.length >= limit) break;
	}
	return found.length > 0 ? found.join("\n") : "No matches found";
}

// multi_grep takes patterns (OR); degrade by running the builtin per pattern.
async function degradedMultiGrep(params: DegradedParams): Promise<string> {
	const patterns = params.patterns ?? (params.pattern ? [params.pattern] : []);
	if (patterns.length === 0) throw new Error("patterns array must have at least 1 element");
	const blocks: string[] = [];
	for (const pattern of patterns) {
		const out = await degradedGrep({ ...params, pattern });
		if (out !== "No matches found") blocks.push(out);
	}
	return blocks.length > 0 ? blocks.join("\n\n") : "No matches found";
}

function degradedTool(
	name: "grep" | "find",
	description: string,
	run: (params: DegradedParams) => Promise<string>,
	defaultLimit: number,
) {
	return {
		name,
		label: name,
		description,
		parameters: {
			type: "object",
			[TYPEBOX_KIND]: "Object",
			required: ["pattern"],
			properties: {
				pattern: tString(name === "grep" ? "Literal text to search for" : "Substring of the file path"),
				path: tString("Directory or file to search in (default: cwd)"),
				limit: tNumber(`Max results (default ${defaultLimit})`),
				exclude: tString("Skip paths containing these terms (comma/space separated, optional leading !)"),
				context: tNumber("Context lines before+after each match (grep only)"),
				caseSensitive: tBoolean("Force case-sensitive matching (default: smart-case)"),
				cursor: tString("Ignored in degraded mode; re-query narrower instead"),
			},
		},
		execute: async (_toolCallId: string, params: DegradedParams) => ({
			content: [{ type: "text" as const, text: `${await run(params)}\n\n${degradedHeader("FFF package failed to load")}` }],
			details: {},
		}),
	};
}

function registerDegradedTools(pi: ExtensionAPI, reason: string): void {
	pi.registerTool(
		degradedTool("grep", "Search file contents (degraded builtin: literal substring, smart-case)", degradedGrep, 20),
	);
	pi.registerTool(
		degradedTool("find", "Find files by path substring (degraded builtin)", degradedFind, 30),
	);
	const guidance = `prime-fff: FFF search failed to load (${reason}); degraded builtin grep/find are active. Fix: prime-agent package install git:github.com/gildrb/pi-fff-patched`;
	pi.on("session_start", async (_event, ctx) => {
		(ctx as { ui?: { notify?: (m: string, t: string) => void } })?.ui?.notify?.(guidance, "error");
	});
}

// ---------------------------------------------------------------------------
// Resilient load
// ---------------------------------------------------------------------------

// Execute-time degradation for infrastructure failures. Agent-facing errors
// (bad patterns, wildcard guards) never match this list and pass through.
const INFRA_FAILURE = [
	"Can not run certain FFF features in a file system root or home directories",
	"Failed to create FFF file finder",
	"Failed to create aux file finder",
	"frecency/history database",
	"Cannot find package '@ff-labs/",
	"Cannot find module '@ff-labs/",
];

function isInfraFailure(error: unknown): boolean {
	const message = error instanceof Error ? error.message : String(error);
	return INFRA_FAILURE.some((signature) => message.includes(signature));
}

function withDegradedFallback(def: any): any {
	if (!SEARCH_TOOLS.has(def.name)) return def;
	const run =
		def.name === "find" ? degradedFind : def.name === "multi_grep" ? degradedMultiGrep : degradedGrep;
	return {
		...def,
		execute: async (toolCallId: string, params: DegradedParams, signal: unknown, onUpdate: unknown, ctx: unknown) => {
			try {
				return await def.execute(toolCallId, params, signal, onUpdate, ctx);
			} catch (error) {
				if (!isInfraFailure(error)) throw error;
				const reason = error instanceof Error ? error.message : String(error);
				const text = `${await run(params)}\n\n${degradedHeader(reason)}`;
				return { content: [{ type: "text", text }], details: { degraded: true } };
			}
		},
	};
}

export default async function primeFff(pi: ExtensionAPI): Promise<void> {
	process.env.PI_FFF_MODE ??= "override";

	let failure: unknown = new Error("no candidate entries");
	for (const entry of CANDIDATE_ENTRIES) {
		// Record tool registrations first and replay them only on success, so a
		// candidate that throws halfway cannot leave a half-registered extension.
		const registered: any[] = [];
		const recorder = new Proxy(pi, {
			get(target, prop) {
				if (prop === "registerTool") return (def: any) => registered.push(def);
				const value = Reflect.get(target, prop);
				return typeof value === "function" ? value.bind(target) : value;
			},
		});
		try {
			const mod = (await import(entry)) as { default: (pi: ExtensionAPI) => void | Promise<void> };
			await mod.default(recorder);
			// In override mode the session is blind without both search tools.
			const names = new Set(registered.map((def) => def.name));
			if (!names.has("grep") || !names.has("find")) {
				throw new Error(`loaded ${entry} but it registered [${[...names].join(", ") || "none"}] instead of grep+find`);
			}
			for (const def of registered) pi.registerTool(withDegradedFallback(def));
			return;
		} catch (error) {
			failure = error;
		}
	}

	const reason = failure instanceof Error ? failure.message : String(failure);
	registerDegradedTools(pi, reason);
}
