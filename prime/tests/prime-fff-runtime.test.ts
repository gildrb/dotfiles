import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

// Runtime contract for the resilient prime-fff adapter. The FFF package itself
// is exercised separately; these scenarios must pass on a machine where the
// package is absent or broken.

type ToolResult = { content: { type: string; text: string }[]; details?: unknown };
type ToolDef = {
	name: string;
	label?: string;
	description?: string;
	parameters?: unknown;
	execute: (
		toolCallId: string,
		params: Record<string, unknown>,
		ctx: unknown,
	) => Promise<ToolResult>;
};
type FffLoader = (pi: ExtensionAPI) => void | Promise<void>;

const scratch = mkdtempSync(join(tmpdir(), "prime-fff-runtime-"));
const agentDir = join(scratch, "agent");
const cwd = join(scratch, "work");
mkdirSync(join(cwd, "src"), { recursive: true });
writeFileSync(join(cwd, "src", "alpha.txt"), "hello world\nnpm command here\nalpha beta\n");
process.env.PI_CODING_AGENT_DIR = agentDir;
process.chdir(cwd);

const adapterUrl = new URL("../extensions/prime-fff.ts", import.meta.url).href;

function stubPi() {
	const tools = new Map<string, ToolDef>();
	const handlers: Array<[string, unknown]> = [];
	const pi = new Proxy(
		{
			registerTool: (def: ToolDef) => tools.set(def.name, def),
			on: (event: string, fn: unknown) => handlers.push([event, fn]),
		},
		{
			get(target: Record<string, unknown>, prop: string | symbol) {
				if (prop in target) return target[prop as string];
				return () => undefined;
			},
		},
	) as unknown as ExtensionAPI;
	return { pi, tools, handlers };
}

const text = async (tool: ToolDef, params: Record<string, unknown>): Promise<string> =>
	(await tool.execute("t", params, undefined)).content[0].text;

// Scenario B: no FFF package installed anywhere -> degraded builtin grep/find.
{
	const { pi, tools, handlers } = stubPi();
	const primeFff = (await import(adapterUrl)).default as FffLoader;
	await primeFff(pi);
	assert.ok(tools.has("grep") && tools.has("find"), "degraded grep+find register when FFF is missing");
	assert.ok(
		handlers.some(([event]) => event === "session_start"),
		"a failed load registers a session_start notification",
	);
	const out = await text(tools.get("grep")!, { pattern: "npm command", path: "src" });
	assert.match(out, /src\/alpha\.txt\n 2: npm command here/, "degraded grep finds literal substring with line number");
	assert.match(out, /prime-fff degraded:/, "degraded output explains the mode");
	assert.match(
		await text(tools.get("grep")!, { pattern: "zzz-not-here", path: "src" }),
		/No matches found/,
		"degraded zero hit stays clean",
	);
	assert.match(
		await text(tools.get("find")!, { pattern: "alpha", path: "." }),
		/src\/alpha\.txt/,
		"degraded find matches path substrings",
	);
}

// Scenario C: package loads but throws infrastructure errors at execute-time.
{
	const fakeDir = join(agentDir, "git/github.com/gildrb/pi-fff-patched/src");
	mkdirSync(fakeDir, { recursive: true });
	writeFileSync(
		join(fakeDir, "index.ts"),
		`export default function fake(pi) {
	pi.registerTool({
		name: "grep",
		label: "grep",
		description: "fake",
		parameters: {},
		execute: async (_id, params) => {
			if (params.pattern === "agenterror") throw new Error("Pattern matches everything — grep needs a concrete substring");
			throw new Error("Failed to create FFF file finder for /x: mocked native failure");
		},
	});
	pi.registerTool({
		name: "find",
		label: "find",
		description: "fake",
		parameters: {},
		execute: async () => {
			throw new Error("Can not run certain FFF features in a file system root or home directories");
		},
	});
	pi.registerTool({
		name: "multi_grep",
		label: "multi_grep",
		description: "fake",
		parameters: {},
		execute: async () => {
			throw new Error("Failed to create FFF file finder for /x: mocked native failure");
		},
	});
}
`,
	);
	const { pi, tools } = stubPi();
	const primeFff = (await import(adapterUrl)).default as FffLoader;
	await primeFff(pi);
	assert.ok(tools.has("grep"), "loaded package registers its tools");
	const out = await text(tools.get("grep")!, { pattern: "npm command", path: "src" });
	assert.match(out, /src\/alpha\.txt/, "infra failure degrades the call to builtin results");
	assert.match(out, /Failed to create FFF file finder/, "degraded header carries the real reason");
	await assert.rejects(
		() => tools.get("grep")!.execute("t", { pattern: "agenterror", path: "src" }, undefined),
		/matches everything/,
		"agent-facing errors pass through untouched",
	);
	assert.match(
		await text(tools.get("find")!, { pattern: "alpha", path: "." }),
		/src\/alpha\.txt/,
		"find degrades on the home-directory scan refusal",
	);
	assert.match(
		await text(tools.get("multi_grep")!, { patterns: ["npm command"], path: "src" }),
		/src\/alpha\.txt/,
		"multi_grep degrades across its patterns array",
	);
}

// Scenario D: git checkout missing, npm-global bridge present -> bridge loads.
{
	const bridgeAgentDir = join(scratch, "agent-bridge");
	// Bare node refuses to strip types under node_modules, so the package lives
	// outside it and is linked in; Prime's own TS loader has no such limit.
	const realPkg = join(scratch, "bridge-pkg");
	const bridgeDir = join(realPkg, "src");
	mkdirSync(bridgeDir, { recursive: true });
	mkdirSync(join(bridgeAgentDir, "npm-global/lib/node_modules/@ff-labs"), { recursive: true });
	symlinkSync(realPkg, join(bridgeAgentDir, "npm-global/lib/node_modules/@ff-labs/pi-fff"), "dir");
	writeFileSync(
		join(bridgeDir, "index.ts"),
		`export default function fake(pi) {
	pi.registerTool({ name: "grep", label: "grep", description: "fake", parameters: {},
		execute: async () => ({ content: [{ type: "text", text: "from-bridge-package" }], details: {} }) });
	pi.registerTool({ name: "find", label: "find", description: "fake", parameters: {},
		execute: async () => ({ content: [{ type: "text", text: "from-bridge-package" }], details: {} }) });
}
`,
	);
	process.env.PI_CODING_AGENT_DIR = bridgeAgentDir;
	const { pi, tools, handlers } = stubPi();
	// Reuse the loaded adapter: candidate roots resolve when it is invoked.
	const primeFff = (await import(adapterUrl)).default as FffLoader;
	await primeFff(pi);
	assert.ok(tools.has("grep") && tools.has("find"), "bridge candidate registers grep+find");
	assert.match(
		await text(tools.get("grep")!, { pattern: "x" }),
		/from-bridge-package/,
		"bridge package tools serve the calls",
	);
	assert.ok(
		!handlers.some(([event]) => event === "session_start"),
		"a successful bridge load stays silent",
	);
}

rmSync(scratch, { recursive: true, force: true });
