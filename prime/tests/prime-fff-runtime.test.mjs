import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// Runtime contract for the resilient prime-fff adapter. The FFF package itself
// is exercised separately; these scenarios must pass on a machine where the
// package is absent or broken.
const scratch = mkdtempSync(join(tmpdir(), "prime-fff-runtime-"));
const agentDir = join(scratch, "agent");
const cwd = join(scratch, "work");
mkdirSync(join(cwd, "src"), { recursive: true });
writeFileSync(join(cwd, "src", "alpha.txt"), "hello world\nnpm command here\nalpha beta\n");
process.env.PI_CODING_AGENT_DIR = agentDir;
process.chdir(cwd);

const adapterUrl = new URL("../extensions/prime-fff.ts", import.meta.url).href;

function stubPi() {
	const tools = new Map();
	const handlers = [];
	const pi = new Proxy(
		{
			registerTool: (def) => tools.set(def.name, def),
			on: (event, fn) => handlers.push([event, fn]),
		},
		{
			get(target, prop) {
				if (prop in target) return target[prop];
				return () => undefined;
			},
		},
	);
	return { pi, tools, handlers };
}

const text = async (tool, params) => (await tool.execute("t", params, undefined)).content[0].text;

// Scenario B: no FFF package installed anywhere -> degraded builtin grep/find.
{
	const { pi, tools, handlers } = stubPi();
	const primeFff = (await import(adapterUrl)).default;
	await primeFff(pi);
	assert.ok(tools.has("grep") && tools.has("find"), "degraded grep+find register when FFF is missing");
	assert.ok(
		handlers.some(([event]) => event === "session_start"),
		"a failed load registers a session_start notification",
	);
	const out = await text(tools.get("grep"), { pattern: "npm command", path: "src" });
	assert.match(out, /src\/alpha\.txt\n 2: npm command here/, "degraded grep finds literal substring with line number");
	assert.match(out, /prime-fff degraded:/, "degraded output explains the mode");
	assert.match(
		await text(tools.get("grep"), { pattern: "zzz-not-here", path: "src" }),
		/No matches found/,
		"degraded zero hit stays clean",
	);
	assert.match(
		await text(tools.get("find"), { pattern: "alpha", path: "." }),
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
}
`,
	);
	const { pi, tools } = stubPi();
	const primeFff = (await import(adapterUrl)).default;
	await primeFff(pi);
	assert.ok(tools.has("grep"), "loaded package registers its tools");
	const out = await text(tools.get("grep"), { pattern: "npm command", path: "src" });
	assert.match(out, /src\/alpha\.txt/, "infra failure degrades the call to builtin results");
	assert.match(out, /Failed to create FFF file finder/, "degraded header carries the real reason");
	await assert.rejects(
		() => tools.get("grep").execute("t", { pattern: "agenterror", path: "src" }, undefined),
		/matches everything/,
		"agent-facing errors pass through untouched",
	);
	assert.match(
		await text(tools.get("find"), { pattern: "alpha", path: "." }),
		/src\/alpha\.txt/,
		"find degrades on the home-directory scan refusal",
	);
}

rmSync(scratch, { recursive: true, force: true });
