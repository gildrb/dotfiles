import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import installPolicy, {
	isPersistentProcessCommand,
	isUnboundedNixVmTestCommand,
} from "../extensions/tool-policy.ts";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

type ToolCallEvent = {
	toolName: string;
	input: ({ command?: string; code?: string; timeout?: number } & Record<string, unknown>);
};
type PolicyVerdict = { block: true; reason: string; terminate: boolean } | undefined;

const cwd = mkdtempSync(join(tmpdir(), "prime-tool-policy-"));
const app = join(cwd, "app");
mkdirSync(app);
writeFileSync(
	join(cwd, "package.json"),
	JSON.stringify({
		scripts: {
			build: "vite build",
			check: "pnpm test:unit",
			sneaky: "vite preview",
			test: "playwright test",
			"test:unit": "playwright test --config playwright.unit.config.ts",
		},
	}),
);
writeFileSync(
	join(app, "package.json"),
	JSON.stringify({ scripts: { build: "vite build", test: "playwright test" } }),
);

const blockedCommands = [
	"vite",
	"vite preview",
	"vite build --watch",
	"pnpm dev",
	"pnpm preview",
	"pnpm start",
	"pnpm watch",
	"pnpm sneaky",
	"pnpm test",
	"pnpm check",
	"npx vite@latest",
	"npx --yes vite preview",
	"npx -p vite vite preview",
	"pnpm dlx vite@latest",
	"node server.js",
	"node -e \"require('vite').createServer()\"",
	"deno run npm:vite",
	"python3 -m http.server 8000",
	"python -m uvicorn app:app",
	"flask run",
	"uvicorn app:app",
	"gunicorn app:app",
	"next dev",
	"next start",
	"astro dev",
	"webpack serve",
	"webpack-dev-server",
	"parcel",
	"parcel watch",
	"react-scripts start",
	"ng serve",
	"vue-cli-service serve",
	"storybook dev",
	"http-server",
	"live-server",
	"serve dist",
	"mkdocs serve",
	"rails server",
	"php -S 127.0.0.1:8000",
	"kubectl port-forward pod/x 8080:80",
	"ssh -N -L 8000:localhost:80 host",
	"tail -f log",
	"journalctl --follow",
	"vitest --watch",
	"playwright test",
	"playwright show-report",
	"playwright codegen",
	"cypress open",
	"docker compose up",
	"cloudflared tunnel run x",
	"ngrok http 3000",
	"pnpm build &",
	"nohup pnpm build",
	"setsid pnpm build",
	"bash -lc 'pnpm preview'",
	"nix develop -c pnpm dev",
	"sleep infinity",
	"sleep 301",
	"env -C app pnpm dev",
	"nice -n 5 pnpm dev",
	"sudo -u user pnpm dev",
	"timeout 10 pnpm dev",
	"timeout --signal KILL 10 pnpm dev",
	"eval 'pnpm dev'",
	"printf pnpm | xargs pnpm dev",
	"p'n'pm dev",
	"$(printf pnpm) dev",
	"while true; do echo x; done",
	"cd app && pnpm test",
	"pnpm -C app test",
	"npm --prefix app test",
	"env -C app pnpm test",
	"env --chdir=app pnpm test",
	"pnpm --filter app test",
];

const allowedCommands = [
	"vite build",
	"vite optimize",
	"vite --help",
	"vite --config vite.config.ts build",
	"pnpm build",
	"pnpm add vite",
	"npm view vite",
	"npm install dev",
	"pnpm why vite",
	"playwright screenshot https://example.com /tmp/a.png",
	"cypress run",
	"tail -n 50 log",
	"journalctl -n 20",
	"python scripts/build.py",
	"node scripts/build.mjs",
	"echo 'pnpm dev'",
	"printf x 2>&1",
	"true && pnpm build",
	"sleep 1",
	"env -C app pnpm build",
	"timeout 10 pnpm build",
	"pnpm -C app build",
];

for (const command of blockedCommands) {
	assert.equal(isPersistentProcessCommand(command, cwd), true, `must block: ${command}`);
}
for (const command of allowedCommands) {
	assert.equal(isPersistentProcessCommand(command, cwd), false, `must allow: ${command}`);
}

const blockedNix = [
	"nix build tests/foo.nix",
	`nix ${"x".repeat(700)} build /tmp/repo/tests/foo.nix`,
	"timeout --help nix build tests/foo.nix",
	"timeout --help; nix build tests/foo.nix",
];
const allowedNix = [
	"timeout 30 nix build tests/foo.nix",
	"/usr/bin/timeout 2m nix build ./tests/foo.nix",
	"env timeout 30 nix build /tmp/repo/tests/foo.nix",
	"nix build .#checks.x86_64-linux.default",
	"echo nix build tests/foo.nix",
];
for (const command of blockedNix) {
	assert.equal(isUnboundedNixVmTestCommand(command), true, `must require deadline: ${command}`);
}
for (const command of allowedNix) {
	assert.equal(isUnboundedNixVmTestCommand(command), false, `deadline is valid: ${command}`);
}

let toolCall: ((event: ToolCallEvent) => PolicyVerdict) | undefined;
installPolicy({
	on(event: string, callback: (event: ToolCallEvent) => PolicyVerdict) {
		if (event === "tool_call") toolCall = callback;
	},
} as unknown as ExtensionAPI);
assert.equal(typeof toolCall, "function");

const toolCases: Array<[ToolCallEvent, boolean]> = [
	[{ toolName: "bash", input: { command: "pnpm preview" } }, true],
	[{ toolName: "bash", input: { command: "pnpm build" } }, false],
	[{ toolName: "ipython", input: { code: "%%bash\npnpm preview" } }, true],
	[{ toolName: "ipython", input: { code: "!playwright test" } }, true],
	[{ toolName: "ipython", input: { code: "get_ipython().system('pnpm preview')" } }, true],
	[{ toolName: "ipython", input: { code: "subprocess.run(['pnpm', 'preview'])" } }, true],
	[{ toolName: "ipython", input: { code: "subprocess.Popen(['echo', 'ok'])" } }, true],
	[{ toolName: "ipython", input: { code: "await asyncio.create_subprocess_exec('echo', 'ok')" } }, true],
	[{ toolName: "ipython", input: { code: "subprocess.run(['pnpm', 'build'])" } }, false],
];
for (const [event, blocked] of toolCases) {
	const result = toolCall!(event);
	assert.equal(Boolean(result?.block), blocked);
	if (blocked) assert.equal(result?.terminate, true);
}
for (const [given, expected] of [[undefined, 300], [30, 30], [900, 300]] as const) {
	const input: ToolCallEvent["input"] = {
		command: "echo ok",
		...(given === undefined ? {} : { timeout: given }),
	};
	toolCall!({ toolName: "bash", input });
	assert.equal(input.timeout, expected);
}

console.log(
	`tool-policy: ${blockedCommands.length + allowedCommands.length + blockedNix.length + allowedNix.length + toolCases.length + 3} cases passed`,
);
