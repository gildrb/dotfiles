/**
 * Process-safety guardrails for model tool calls.
 *
 * User-entered terminal commands are unaffected. Model-run Bash commands get a
 * hard deadline, and commands that can outlive a tool call are blocked.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const MODEL_BASH_TIMEOUT_SECONDS = 300;
const PACKAGE_MANAGERS = new Set(["bun", "npm", "pnpm", "yarn"]);
const PACKAGE_EXECUTORS = new Set(["bunx", "npx"]);
const SHELL_WRAPPERS = new Set(["bash", "dash", "fish", "sh", "zsh"]);
const COMMAND_WRAPPERS = new Set([
	"command",
	"corepack",
	"env",
	"exec",
	"nice",
	"sudo",
	"time",
	"timeout",
]);
const DETACH_EXECUTABLES = new Set(["daemonize", "nohup", "setsid"]);
const WRAPPER_OPTIONS_WITH_VALUE = new Map<string, Set<string>>([
	["env", new Set(["-C", "--chdir", "-S", "--split-string", "-u", "--unset"])],
	["nice", new Set(["-n", "--adjustment"])],
	["sudo", new Set(["-C", "-D", "-g", "-h", "-p", "-R", "-r", "-t", "-u", "--chdir", "--group", "--host", "--prompt", "--role", "--type", "--user"])],
	["timeout", new Set(["-k", "-s", "--kill-after", "--signal"])],
]);
const ALWAYS_PERSISTENT_EXECUTABLES = new Set([
	"gunicorn",
	"http-server",
	"hypercorn",
	"live-server",
	"ngrok",
	"nodemon",
	"rackup",
	"serve",
	"sphinx-autobuild",
	"uvicorn",
	"watch",
	"watchexec",
	"webpack-dev-server",
]);
const PACKAGE_SERVER_SCRIPT = /^(?:dev|develop|preview|serve|start|storybook|watch)(?::[a-z0-9_.-]+)?$/i;
const SERVER_FILE = /^(?:dev[-_.]?server|http[-_.]?server|preview[-_.]?server|server)\.(?:c?js|mjs|py|rb)$/i;
const PYTHON_SERVER_MODULES = new Set([
	"flask",
	"gunicorn",
	"http.server",
	"hypercorn",
	"uvicorn",
]);
const PERSISTENT_SUBCOMMANDS = new Map<string, Set<string>>([
	["astro", new Set(["dev", "preview"])],
	["cloudflared", new Set(["tunnel"])],
	["docker-compose", new Set(["up"])],
	["eleventy", new Set(["serve", "watch"])],
	["flask", new Set(["run"])],
	["gatsby", new Set(["develop", "serve"])],
	["jekyll", new Set(["serve"])],
	["mkdocs", new Set(["serve"])],
	["netlify", new Set(["dev"])],
	["next", new Set(["dev", "start"])],
	["ng", new Set(["serve"])],
	["nuxt", new Set(["dev", "preview", "start"])],
	["nuxi", new Set(["dev", "preview"])],
	["parcel", new Set(["serve", "watch"])],
	["php", new Set(["-s"])],
	["rails", new Set(["s", "server"])],
	["react-scripts", new Set(["start"])],
	["remix", new Set(["dev"])],
	["storybook", new Set(["dev"])],
	["streamlit", new Set(["run"])],
	["vercel", new Set(["dev"])],
	["vitepress", new Set(["dev", "preview"])],
	["vue-cli-service", new Set(["serve"])],
	["webpack", new Set(["serve", "watch"])],
	["wrangler", new Set(["dev", "tail"])],
]);
const NON_SERVER_VITE_SUBCOMMANDS = new Set([
	"--help",
	"--version",
	"-h",
	"-v",
	"build",
	"optimize",
]);

function shellWords(source: string): string[] {
	return (
		source.match(/(?:\\.|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|[^\s]+)/g) ?? []
	).map((word) => {
		if (
			(word.startsWith("\"") && word.endsWith("\"")) ||
			(word.startsWith("'") && word.endsWith("'"))
		) {
			return word.slice(1, -1);
		}
		return word;
	});
}

function commandName(word: string): string {
	const name = word
		.replace(/['"]/g, "")
		.split("/")
		.at(-1)
		?.replace(/\.(?:cmd|exe|js)$/i, "")
		.toLowerCase() ?? word.toLowerCase();
	return name.startsWith("@") ? name : name.replace(/@[^@]+$/, "");
}

function splitShellCommands(source: string): string[] {
	const commands: string[] = [];
	let start = 0;
	let quote: string | undefined;
	let escaped = false;

	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = undefined;
			continue;
		}
		if (character === "'" || character === '\"') {
			quote = character;
			continue;
		}
		if (character === ";" || character === "\n" || character === "|" || character === "&") {
			commands.push(source.slice(start, index));
			if ((character === "|" || character === "&") && source[index + 1] === character) index += 1;
			start = index + 1;
		}
	}
	commands.push(source.slice(start));
	return commands;
}

function hasBackgroundOperator(source: string): boolean {
	let quote: string | undefined;
	let escaped = false;
	for (let index = 0; index < source.length; index += 1) {
		const character = source[index];
		if (escaped) {
			escaped = false;
			continue;
		}
		if (character === "\\" && quote !== "'") {
			escaped = true;
			continue;
		}
		if (quote) {
			if (character === quote) quote = undefined;
			continue;
		}
		if (character === "'" || character === '\"') {
			quote = character;
			continue;
		}
		if (
			character === "&" &&
			source[index - 1] !== "&" &&
			source[index - 1] !== ">" &&
			source[index + 1] !== "&" &&
			source[index + 1] !== ">"
		) {
			return true;
		}
	}
	return false;
}

function firstCommandIndex(words: string[]): number {
	let index = 0;
	while (index < words.length) {
		const name = commandName(words[index]);
		if (COMMAND_WRAPPERS.has(name)) {
			index += 1;
			const valueOptions = WRAPPER_OPTIONS_WITH_VALUE.get(name);
			while (index < words.length && words[index].startsWith("-")) {
				const option = words[index];
				index += 1;
				if (valueOptions?.has(option) && !option.includes("=")) index += 1;
			}
			if (name === "timeout" && /^\d+(?:\.\d+)?[smhd]?$/.test(words[index] ?? "")) index += 1;
			continue;
		}
		if (/^[A-Za-z_][A-Za-z0-9_]*=/.test(words[index])) {
			index += 1;
			continue;
		}
		break;
	}
	return index;
}

function packageScript(words: string[], executableIndex: number): string | undefined {
	const executable = commandName(words[executableIndex]);
	if (!PACKAGE_MANAGERS.has(executable)) return undefined;
	let index = executableIndex + 1;
	if (words[index] === "run") index += 1;
	while (index < words.length) {
		const word = words[index];
		if (["--filter", "--workspace", "-C", "--dir", "--cwd", "--prefix"].includes(word)) {
			index += 2;
			continue;
		}
		if (word.startsWith("-")) {
			index += 1;
			continue;
		}
		if (["exec", "dlx", "install", "add", "remove"].includes(word)) return undefined;
		return word;
	}
	return undefined;
}


function packageWorkingDirectory(words: string[], executableIndex: number, cwd: string): string {
	let result = cwd;
	for (let index = 0; index < words.length; index += 1) {
		const previous = words[index - 1];
		if (index < executableIndex && ["-C", "--chdir"].includes(previous)) result = resolve(result, words[index]);
		if (index > executableIndex && ["-C", "--dir", "--cwd", "--prefix"].includes(previous)) result = resolve(result, words[index]);
		const match = words[index].match(/^--(?:chdir|dir|cwd|prefix)=(.+)$/);
		if (match) result = resolve(result, match[1]);
	}
	return result;
}

function resolvedPackageScript(script: string, cwd: string): string | undefined {
	try {
		const pkg = JSON.parse(readFileSync(resolve(cwd, "package.json"), "utf8")) as {
			scripts?: Record<string, unknown>;
		};
		const value = pkg.scripts?.[script];
		return typeof value === "string" ? value : undefined;
	} catch {
		return undefined;
	}
}

function hasPersistentSubcommand(executable: string, words: string[], index: number): boolean {
	const subcommands = PERSISTENT_SUBCOMMANDS.get(executable);
	if (!subcommands) return false;
	return words.slice(index + 1).some((word) => subcommands.has(word.toLowerCase()));
}

function commandStartsPersistentProcess(
	source: string,
	cwd: string,
	depth: number,
): boolean {
	if (depth > 6) return true;
	const words = shellWords(source);
	const index = firstCommandIndex(words);
	const executable = commandName(words[index] ?? "");
	if (!executable) return false;

	if (DETACH_EXECUTABLES.has(executable) || executable === "disown") return true;
	if (["eval", "xargs"].includes(executable)) {
		return isPersistentProcessCommand(words.slice(index + 1).join(" "), cwd, depth + 1);
	}
	if (SHELL_WRAPPERS.has(executable) || executable === "nix") {
		const commandOption = words.findIndex(
			(word) => word === "-c" || word === "--command" || /^-[^-]*c/.test(word),
		);
		return commandOption >= 0 && isPersistentProcessCommand(words.slice(commandOption + 1).join(" "), cwd, depth + 1);
	}

	if (ALWAYS_PERSISTENT_EXECUTABLES.has(executable)) return true;
	if (hasPersistentSubcommand(executable, words, index)) return true;
	if (executable === "docker" && words.includes("compose") && words.includes("up")) return true;
	if (executable === "kubectl" && words.slice(index + 1).some((word) => word === "port-forward" || word === "proxy")) return true;
	if (executable === "ssh" && words.slice(index + 1).some((word) => /^-[DLNR]$/.test(word) || /^-[DLR]/.test(word))) return true;
	if (["journalctl", "tail"].includes(executable) && words.slice(index + 1).some((word) => word === "-f" || word === "--follow")) return true;
	if (["jest", "tsc", "vitest"].includes(executable) && words.slice(index + 1).some((word) => word === "--watch" || word === "--watchAll")) return true;
	if (executable === "playwright" && words.slice(index + 1).some((word) => ["codegen", "show-report", "test"].includes(word))) return true;
	if (executable === "sleep") {
		const duration = (words[index + 1] ?? "").toLowerCase();
		if (["infinity", "inf"].includes(duration)) return true;
		const seconds = Number.parseFloat(duration) * (duration.endsWith("m") ? 60 : duration.endsWith("h") ? 3600 : 1);
		if (Number.isFinite(seconds) && seconds > MODEL_BASH_TIMEOUT_SECONDS) return true;
	}
	if (executable === "cypress" && words.slice(index + 1).includes("open")) return true;

	if (executable === "vite" || executable === "vitejs") {
		const args = words.slice(index + 1).map((word) => word.toLowerCase());
		if (args.some((word) => ["dev", "preview", "serve", "--watch", "-w"].includes(word))) return true;
		if (args.some((word) => NON_SERVER_VITE_SUBCOMMANDS.has(word))) return false;
		return true;
	}
	if (executable === "nuxt") return !words[index + 1] || hasPersistentSubcommand(executable, words, index);
	if (executable === "parcel") return !words[index + 1] || hasPersistentSubcommand(executable, words, index);

	if (executable === "python" || executable === "python3") {
		if (words.some((word) => /serve_forever|uvicorn\.run|web\.run_app|websockets\.serve/.test(word))) return true;
		const moduleIndex = words.indexOf("-m", index + 1);
		if (moduleIndex >= 0 && PYTHON_SERVER_MODULES.has((words[moduleIndex + 1] ?? "").toLowerCase())) return true;
		if (words.slice(index + 1).some((word) => word === "runserver" || SERVER_FILE.test(word.split("/").at(-1) ?? ""))) return true;
	}
	if (executable === "node" || executable === "nodejs") {
		if (words.some((word) => /vite[\s\S]*createServer|createServer[\s\S]*vite/i.test(word))) return true;
		const script = words.slice(index + 1).find((word) => !word.startsWith("-"));
		if (script && SERVER_FILE.test(script.split("/").at(-1) ?? "")) return true;
		if (script && ["vite", "vitejs"].includes(commandName(script))) {
			return commandStartsPersistentProcess(words.slice(words.indexOf(script)).join(" "), cwd, depth + 1);
		}
	}

	if (executable === "deno" && words.some((word) => /npm:vite(?:@|\b)/i.test(word))) return true;
	if (PACKAGE_EXECUTORS.has(executable)) {
		let commandIndex = index + 1;
		while (commandIndex < words.length && words[commandIndex].startsWith("-")) {
			const option = words[commandIndex];
			commandIndex += 1;
			if (["-p", "--package"].includes(option) && !option.includes("=")) commandIndex += 1;
		}
		return commandStartsPersistentProcess(words.slice(commandIndex).join(" "), cwd, depth + 1);
	}
	if (PACKAGE_MANAGERS.has(executable)) {
		const execIndex = words.findIndex((word, wordIndex) => wordIndex > index && ["dlx", "exec"].includes(word));
		if (execIndex >= 0) return commandStartsPersistentProcess(words.slice(execIndex + 1).join(" "), cwd, depth + 1);
		const script = packageScript(words, index);
		if (script && PACKAGE_SERVER_SCRIPT.test(script)) return true;
		if (script && /^(?:check|test)(?::[a-z0-9_.-]+)?$/i.test(script) && words.includes("--filter")) return true;
		if (words.slice(index + 1).some((word) => ["--watch", "--watchAll"].includes(word))) return true;
		const packageCwd = packageWorkingDirectory(words, index, cwd);
		const body = script ? resolvedPackageScript(script, packageCwd) : undefined;
		return body ? isPersistentProcessCommand(body, packageCwd, depth + 1) : false;
	}
	return false;
}

/** True when a shell command can keep running or outlive its tool call. */
export function isPersistentProcessCommand(
	source: string,
	cwd = process.cwd(),
	depth = 0,
): boolean {
	if (hasBackgroundOperator(source)) return true;
	if (/\$\([\s\S]*\)|`[^`]*`/.test(source) && PACKAGE_SERVER_SCRIPT.test(source.split(/\s+/).at(-1) ?? "")) return true;
	if (/(?:^|[;&|\s])(?:while\s+(?::|true)|for\s*\(\(\s*;\s*;)/.test(source)) return true;
	let commandCwd = cwd;
	for (const command of splitShellCommands(source)) {
		const words = shellWords(command);
		const index = firstCommandIndex(words);
		if (commandName(words[index] ?? "") === "cd" && words[index + 1]) {
			commandCwd = resolve(commandCwd, words[index + 1]);
			continue;
		}
		if (commandStartsPersistentProcess(command, commandCwd, depth)) return true;
	}
	return false;
}

function hasDeadlineBefore(words: string[], commandIndex: number): boolean {
	for (let index = 0; index < commandIndex; index += 1) {
		if (commandName(words[index]) !== "timeout") continue;
		index += 1;
		while (index < commandIndex && words[index].startsWith("-")) index += 1;
		if (/^\d+(?:\.\d+)?[smhd]?$/.test(words[index] ?? "")) return true;
	}
	return false;
}

/** True when a direct NixOS VM test build has no external deadline. */
export function isUnboundedNixVmTestCommand(source: string): boolean {
	for (const command of splitShellCommands(source)) {
		const words = shellWords(command);
		const index = firstCommandIndex(words);
		if (commandName(words[index] ?? "") !== "nix") continue;
		const args = words.slice(index + 1);
		const buildsVmTest =
			args.includes("build") &&
			args.some((word) => /(?:^|\/)tests\/[A-Za-z0-9_.-]+\.nix$/.test(word));
		if (buildsVmTest && !hasDeadlineBefore(words, index)) return true;
	}
	return false;
}

function pythonRunsBlockedCommand(
	code: string,
	predicate: (source: string) => boolean,
): boolean {
	if (/\b(?:os\.fork|subprocess\.Popen|asyncio\.create_subprocess_(?:exec|shell)|child_process\.(?:fork|spawn)|multiprocessing\.Process)\s*\(/.test(code)) return true;
	if (/\b(?:asyncio\.sleep|time\.sleep)\s*\(/.test(code)) return true;
	if (/\bwhile\s+(?:True|1)\s*:|itertools\.count\s*\(/.test(code)) return true;
	if (/\b(?:HTTPServer|TCPServer|asyncio\.start_server|serve_forever|uvicorn\.run|web\.run_app|websockets\.serve)\s*\(/.test(code)) return true;
	if (/\b(?:app|application)\.run\s*\(/.test(code)) return true;

	for (const match of code.matchAll(/%%bash[^\n]*\n([\s\S]*)/g)) {
		if (predicate(match[1])) return true;
	}
	for (const line of code.split("\n")) {
		if (/^\s*!([^=]|$)/.test(line) && predicate(line.replace(/^\s*!/, ""))) return true;
	}

	const executions = code.matchAll(
		/\b(?:subprocess\.(?:call|check_call|check_output|run)|os\.(?:popen|system)|child_process\.(?:exec|execFile)|get_ipython\(\)\.system|run_cell_magic|run_line_magic)\s*\(([\s\S]*?)(?:\n\s*)?\)/g,
	);
	for (const match of executions) {
		const literalValues = [
			...match[1].matchAll(
				/(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)/g,
			),
		].map((literal) => literal[1] ?? literal[2] ?? literal[3] ?? "");
		const isSystemMagic = /\brun_(?:cell|line)_magic\b/.test(match[0]);
		if ((isSystemMagic && literalValues.some(predicate)) || predicate(literalValues.join(" "))) return true;
	}
	return false;
}

function blockedToolCall(
	toolName: string,
	input: Record<string, unknown>,
): string | undefined {
	const source = toolName === "bash" && typeof input.command === "string" ? input.command : undefined;
	const python = toolName === "ipython" && typeof input.code === "string" ? input.code : undefined;

	if (
		(source && isPersistentProcessCommand(source)) ||
		(python && pythonRunsBlockedCommand(python, isPersistentProcessCommand))
	) {
		return (
			"Blocked: model tools cannot start persistent, background, detached, browser-test, " +
			"watch, preview, or local-server processes. Run these manually outside Prime Agent."
		);
	}
	if (
		(source && isUnboundedNixVmTestCommand(source)) ||
		(python && pythonRunsBlockedCommand(python, isUnboundedNixVmTestCommand))
	) {
		return (
			"Blocked: direct NixOS VM test builds need a hard deadline. " +
			"Use the repository validation runner, or wrap the command in timeout."
		);
	}
	return undefined;
}

export default function (pi: ExtensionAPI) {
	pi.on("tool_call", (event) => {
		if (event.toolName === "bash") {
			const timeout = event.input.timeout;
			event.input.timeout =
				typeof timeout === "number"
					? Math.min(timeout, MODEL_BASH_TIMEOUT_SECONDS)
					: MODEL_BASH_TIMEOUT_SECONDS;
		}
		const reason = blockedToolCall(event.toolName, event.input);
		if (!reason) return;
		return { block: true, reason, terminate: true };
	});
}
