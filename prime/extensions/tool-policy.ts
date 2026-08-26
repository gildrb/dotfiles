/**
 * Guardrails for commands that can leave a long-running development server.
 *
 * This blocks only model tool calls. User-entered terminal commands are not
 * affected, so the user can start a Vite server manually when needed.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const PACKAGE_MANAGERS = new Set([
	"bun",
	"bunx",
	"npm",
	"npx",
	"pnpm",
	"yarn",
]);
const SHELL_WRAPPERS = new Set(["bash", "dash", "fish", "sh", "zsh"]);
const COMMAND_WRAPPERS = new Set([
	"command",
	"corepack",
	"env",
	"exec",
	"nice",
	"nohup",
	"setsid",
	"sudo",
	"time",
	"timeout",
]);
const NON_SERVER_VITE_SUBCOMMANDS = new Set([
	"--help",
	"--version",
	"-h",
	"-v",
	"build",
	"optimize",
]);
const VITE_SERVER_SCRIPT = /^(?:dev|preview)(?::[a-z0-9_.-]+)?$/i;

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
	return word.split("/").at(-1)?.replace(/\.(?:cmd|exe|js)$/i, "") ?? word;
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

		const isPipe = character === "|";
		const isAnd = character === "&";
		if (character === ";" || character === "\n" || isPipe || isAnd) {
			commands.push(source.slice(start, index));
			if ((isPipe || isAnd) && source[index + 1] === character) index += 1;
			start = index + 1;
		}
	}
	commands.push(source.slice(start));
	return commands;
}

function isViteExecutable(word: string): boolean {
	const name = commandName(word);
	return name === "vite" || name === "vitejs";
}

function viteStartsServer(words: string[], viteIndex: number): boolean {
	const subcommand = words[viteIndex + 1];
	if (!subcommand) return true;
	return !NON_SERVER_VITE_SUBCOMMANDS.has(subcommand.toLowerCase());
}

function firstCommandIndex(words: string[]): number {
	let index = 0;
	while (index < words.length) {
		const name = commandName(words[index]);
		if (COMMAND_WRAPPERS.has(name)) {
			index += 1;
			while (index < words.length && /^-/.test(words[index])) index += 1;
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

function commandStartsViteServer(source: string): boolean {
	const words = shellWords(source);
	const index = firstCommandIndex(words);
	const executable = commandName(words[index] ?? "");
	if (!executable) return false;

	if (SHELL_WRAPPERS.has(executable) || executable === "nix") {
		const commandOption = words.findIndex(
			(word) =>
				word === "-c" || word === "--command" || /^-[^-]*c/.test(word),
		);
		return commandOption >= 0 && commandStartsViteServer(words.slice(commandOption + 1).join(" "));
	}

	if (executable === "node" || executable === "nodejs") {
		const scriptIndex = index + 1;
		if (scriptIndex < words.length && isViteExecutable(words[scriptIndex])) {
			return viteStartsServer(words, scriptIndex);
		}
	}

	if (PACKAGE_MANAGERS.has(executable)) {
		for (let wordIndex = index + 1; wordIndex < words.length; wordIndex += 1) {
			const word = words[wordIndex];
			if (VITE_SERVER_SCRIPT.test(word)) return true;
			if (isViteExecutable(word) && viteStartsServer(words, wordIndex)) {
				return true;
			}
		}
		return false;
	}

	return isViteExecutable(words[index]) && viteStartsServer(words, index);
}

/** True when a shell command starts a Vite development or preview server. */
export function isViteServerCommand(source: string): boolean {
	return splitShellCommands(source).some(commandStartsViteServer);
}

/** True when a direct NixOS VM test build has no external deadline. */
export function isUnboundedNixVmTestCommand(source: string): boolean {
	const buildsVmTest =
		/\bnix\b[\s\S]{0,500}\bbuild\b/.test(source) &&
		/(?:^|[\s'"`])(?:\.\/)?tests\/[A-Za-z0-9_.-]+\.nix\b/.test(source);
	return buildsVmTest && !/(?:^|[\s;&|])timeout(?:[\s]|$)/.test(source);
}

function pythonRunsBlockedCommand(
	code: string,
	predicate: (source: string) => boolean,
	detectAssembledViteServer = false,
): boolean {
	const bashCells = code.matchAll(/%%bash[^\n]*\n([\s\S]*)/g);
	for (const match of bashCells) {
		if (predicate(match[1])) return true;
	}

	// Covers subprocess.run/Popen, os.system, child-process calls, and IPython
	// system magics. Joining string literals also catches list-style argv calls.
	const executions = code.matchAll(
		/\b(?:subprocess\.(?:call|check_call|check_output|run|Popen)|os\.(?:popen|system)|child_process\.(?:exec|execFile|spawn)|run_cell_magic|run_line_magic)\s*\(([\s\S]*?)(?:\n\s*)?\)/g,
	);
	for (const match of executions) {
		const literalValues = [
			...match[1].matchAll(
				/(?:"((?:\\.|[^"\\])*)"|'((?:\\.|[^'\\])*)'|`((?:\\.|[^`\\])*)`)/g,
			),
		].map((literal) => literal[1] ?? literal[2] ?? literal[3] ?? "");
		const isSystemMagic = /\b(?:run_cell_magic|run_line_magic)\b/.test(
			match[0],
		);
		if (
			(isSystemMagic && literalValues.some(predicate)) ||
			predicate(literalValues.join(" "))
		) {
			return true;
		}
	}

	// Catch a command assembled from simple literals on one executable line,
	// while avoiding ordinary source inspection and comments on other lines.
	if (!detectAssembledViteServer) return false;
	return (
		/(?:subprocess\.|os\.(?:popen|system)|child_process\.|run_(?:cell|line)_magic)/.test(
			code,
		) &&
		code.split("\n").some((line) => {
			const withoutStrings = line.replace(
				/(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`)/g,
				"",
			);
			return /\b(?:bun|bunx|npm|npx|pnpm|yarn)\b[^#\n]{0,120}\b(?:dev|preview)(?::[a-z0-9_.-]+)?\b/i.test(
				withoutStrings,
			);
		})
	);
}

function blockedToolCall(
	toolName: string,
	input: Record<string, unknown>,
): string | undefined {
	const source =
		toolName === "bash" && typeof input.command === "string"
			? input.command
			: undefined;
	const python =
		toolName === "ipython" && typeof input.code === "string"
			? input.code
			: undefined;

	if (
		(source && isViteServerCommand(source)) ||
		(python && pythonRunsBlockedCommand(python, isViteServerCommand, true))
	) {
		return (
			"Blocked: Vite development and preview servers are user-only. " +
			"Start local servers manually outside Prime Agent; build and static " +
			"validation commands are allowed."
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
		const reason = blockedToolCall(event.toolName, event.input);
		if (!reason) return;
		return { block: true, reason };
	});
}
