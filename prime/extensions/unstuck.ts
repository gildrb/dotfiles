/**
 * Unstuck: stall watchdog for Prime Agent sessions.
 *
 * Sessions freeze when a model holds its turn open on one blocking tool call
 * (unbounded bash, hung GPU/docker command, dead provider stream) with no
 * visible progress. This extension makes silence measurable and recoverable:
 *
 * - Every bash call gets a timeout floor and cap, so no command runs unbounded.
 * - In-flight tools are tracked; output updates count as liveness.
 * - After a silent warn window the user is notified; after the abort window
 *   the tool is aborted (process tree killed) and a recovery message with the
 *   captured output tail is steered into the session, instructing the model to
 *   restart the work nonblocking instead of re-awaiting it inline.
 * - Provider streams silent past their window are aborted once per turn with
 *   the same recovery protocol.
 * - Events append to ~/.cache/unstuck/log.jsonl for postmortems.
 *
 * Configure with env vars (UNSTUCK_*) or the /unstuck command; "/unstuck off"
 * disables enforcement for the session when a long silent run is intended.
 */
import { appendFile, mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import {
	isToolCallEventType,
	type ExtensionAPI,
	type ExtensionContext,
} from "@earendil-works/pi-coding-agent";

const LEDGER_PATH = join(homedir(), ".cache", "unstuck", "log.jsonl");
const PARTIAL_TAIL_CHARS = 1536;
const LABEL_CHARS = 200;

type Settings = {
	enabled: boolean;
	pollMs: number;
	warnMs: number;
	abortMs: number;
	providerStallMs: number;
	bashDefaultSec: number;
	bashMaxSec: number;
};

type InFlight = {
	toolCallId: string;
	toolName: string;
	label: string;
	startedAt: number;
	lastActivityAt: number;
	lastPartial: string;
	warned: boolean;
	escalated: boolean;
};

type LedgerEntry = {
	ts: string;
	kind: "warn" | "abort" | "provider-stall" | "config";
	session: string;
	tool?: string;
	label?: string;
	silenceMs?: number;
	ranMs?: number;
	note?: string;
};

function envInt(name: string, fallback: number, min: number, max: number): number {
	const raw = process.env[name];
	if (raw === undefined || raw.trim() === "") {
		return fallback;
	}
	const parsed = Number.parseInt(raw, 10);
	if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
		return fallback;
	}
	return parsed;
}

function defaultSettings(): Settings {
	return {
		enabled: process.env.UNSTUCK_DISABLE !== "1",
		pollMs: envInt("UNSTUCK_POLL_MS", 10_000, 2_000, 60_000),
		warnMs: envInt("UNSTUCK_WARN_MS", 180_000, 30_000, 3_600_000),
		abortMs: envInt("UNSTUCK_ABORT_MS", 900_000, 60_000, 7_200_000),
		providerStallMs: envInt("UNSTUCK_PROVIDER_MS", 900_000, 60_000, 7_200_000),
		bashDefaultSec: envInt("UNSTUCK_BASH_SEC", 900, 5, 86_400),
		bashMaxSec: envInt("UNSTUCK_BASH_MAX", 3_600, 60, 86_400),
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describeArgs(args: unknown): string {
	try {
		const text = JSON.stringify(args) ?? "<null>";
		return text.length > LABEL_CHARS ? `${text.slice(0, LABEL_CHARS)}...` : text;
	} catch {
		return "<unserializable args>";
	}
}

function partialText(partial: unknown): string {
	if (!isRecord(partial) || !Array.isArray(partial.content)) {
		return "";
	}
	const parts: string[] = [];
	for (const item of partial.content) {
		if (isRecord(item) && item.type === "text" && typeof item.text === "string") {
			parts.push(item.text);
		}
	}
	const text = parts.join("\n");
	if (text.length <= PARTIAL_TAIL_CHARS) {
		return text;
	}
	return text.slice(text.length - PARTIAL_TAIL_CHARS);
}

function formatDuration(ms: number): string {
	const totalSeconds = Math.round(ms / 1000);
	const minutes = Math.floor(totalSeconds / 60);
	const seconds = totalSeconds % 60;
	if (minutes === 0) {
		return `${seconds}s`;
	}
	return `${minutes}m ${seconds}s`;
}

export default function (pi: ExtensionAPI): void {
	const settings: Settings = defaultSettings();

	const inFlight = new Map<string, InFlight>();
	let ctx: ExtensionContext | undefined;
	let timer: ReturnType<typeof setInterval> | undefined;
	let timerBroken = false;
	let ledgerReady = false;
	let ledgerFailed = false;
	let turnActive = false;
	let providerEscalated = false;
	let lastProgressAt = Date.now();
	let lastStatus = "";
	let abortCount = 0;

	function writeLedger(entry: LedgerEntry): void {
		if (ledgerFailed) {
			return;
		}
		const line = `${JSON.stringify(entry)}\n`;
		void (async () => {
			try {
				if (!ledgerReady) {
					await mkdir(dirname(LEDGER_PATH), { recursive: true });
					ledgerReady = true;
				}
				await appendFile(LEDGER_PATH, line);
			} catch (error: unknown) {
				ledgerFailed = true;
				console.error(`unstuck: ledger write failed: ${String(error)}`);
			}
		})();
	}

	function sessionLabel(): string {
		const file = ctx?.sessionManager.getSessionFile();
		if (file !== undefined && file !== null) {
			return file;
		}
		return "<ephemeral>";
	}

	function notify(message: string, level: "info" | "warning" | "error"): void {
		if (ctx?.hasUI === true) {
			ctx.ui.notify(message, level);
		}
	}

	function setStatus(text: string): void {
		if (text !== lastStatus) {
			lastStatus = text;
			if (ctx?.hasUI === true) {
				ctx.ui.setStatus("unstuck", text);
			}
		}
	}

	function recoveryMessage(intro: string, tail: string): string {
		const lines = [
			`[unstuck] ${intro}`,
			"Recovery protocol: the stalled work was killed, not completed. Do not re-run it inline.",
			"1) Diagnose the likely hang cause from the output tail below (GPU contention, docker daemon, network, interactive prompt, provider outage).",
			"2) If the work must continue, start it nonblocking (background handle), end the turn, and consume the completion follow-up later.",
			"3) Set an explicit timeout on every long-running bash call.",
			"4) If the same failure repeats twice, stop and report evidence instead of retrying.",
		];
		if (tail.length > 0) {
			lines.push(`Last output tail:\n${tail}`);
		}
		return lines.join("\n");
	}

	async function steerRecovery(content: string): Promise<void> {
		try {
			await pi.sendMessage(
				{ customType: "unstuck", content, display: true, details: { source: "unstuck" } },
				{ triggerTurn: true, deliverAs: "steer" },
			);
		} catch (error: unknown) {
			console.error(`unstuck: recovery message failed: ${String(error)}`);
		}
	}

	function warnTool(entry: InFlight): void {
		entry.warned = true;
		const silence = formatDuration(Date.now() - entry.lastActivityAt);
		notify(`unstuck: ${entry.toolName} silent for ${silence}: ${entry.label}`, "warning");
		writeLedger({
			ts: new Date().toISOString(),
			kind: "warn",
			session: sessionLabel(),
			tool: entry.toolName,
			label: entry.label,
			silenceMs: Date.now() - entry.lastActivityAt,
		});
	}

	function abortTool(entry: InFlight): void {
		entry.escalated = true;
		abortCount += 1;
		const now = Date.now();
		const silence = formatDuration(now - entry.lastActivityAt);
		const ran = formatDuration(now - entry.startedAt);
		notify(`unstuck: aborting ${entry.toolName} after ${silence} of silence (ran ${ran})`, "error");
		writeLedger({
			ts: new Date().toISOString(),
			kind: "abort",
			session: sessionLabel(),
			tool: entry.toolName,
			label: entry.label,
			silenceMs: now - entry.lastActivityAt,
			ranMs: now - entry.startedAt,
		});
		const report = recoveryMessage(
			`${entry.toolName} "${entry.label}" produced no output for ${silence} (ran ${ran} total) and was aborted.`,
			entry.lastPartial,
		);
		void steerRecovery(report).then(() => {
			ctx?.abort();
		});
	}

	function abortProviderStall(): void {
		providerEscalated = true;
		abortCount += 1;
		const silence = formatDuration(Date.now() - lastProgressAt);
		notify(`unstuck: provider stream silent for ${silence}; aborting turn`, "error");
		writeLedger({
			ts: new Date().toISOString(),
			kind: "provider-stall",
			session: sessionLabel(),
			silenceMs: Date.now() - lastProgressAt,
			note: "no message updates and no in-flight tools during an active turn",
		});
		const report = recoveryMessage(
			`The provider stream produced no events for ${silence} during an active turn and was aborted. If this was a legitimate long reasoning phase, continue the task now.`,
			"",
		);
		void steerRecovery(report).then(() => {
			ctx?.abort();
		});
	}

	function tick(): void {
		if (timerBroken || ctx === undefined) {
			return;
		}
		if (!settings.enabled) {
			setStatus("unstuck: off");
			return;
		}
		const now = Date.now();
		type Action = { kind: "warn" | "abort"; entry: InFlight };
		const actions: Action[] = [];
		inFlight.forEach((entry) => {
			const silenceMs = now - entry.lastActivityAt;
			if (silenceMs >= settings.abortMs && !entry.escalated) {
				actions.push({ kind: "abort", entry });
			} else if (silenceMs >= settings.warnMs && !entry.warned) {
				actions.push({ kind: "warn", entry });
			}
		});
		for (const action of actions) {
			if (action.kind === "warn") {
				warnTool(action.entry);
			} else {
				abortTool(action.entry);
			}
		}
		if (
			turnActive &&
			inFlight.size === 0 &&
			!providerEscalated &&
			now - lastProgressAt >= settings.providerStallMs &&
			!ctx.isIdle()
		) {
			abortProviderStall();
		}
		let status: string;
		if (inFlight.size === 0) {
			status = turnActive ? "unstuck: active" : "";
		} else {
			let oldestSilenceMs = 0;
			let oldestName = "";
			inFlight.forEach((entry) => {
				const silenceMs = now - entry.lastActivityAt;
				if (silenceMs > oldestSilenceMs) {
					oldestSilenceMs = silenceMs;
					oldestName = entry.toolName;
				}
			});
			status = `unstuck: ${oldestName} silent ${formatDuration(oldestSilenceMs)}`;
		}
		setStatus(status);
	}

	function startTimer(): void {
		if (timer !== undefined) {
			return;
		}
		timer = setInterval(() => {
			try {
				tick();
			} catch (error: unknown) {
				timerBroken = true;
				console.error(`unstuck: watchdog tick failed: ${String(error)}`);
			}
		}, settings.pollMs);
		if (typeof timer.unref === "function") {
			timer.unref();
		}
	}

	function stopTimer(): void {
		if (timer !== undefined) {
			clearInterval(timer);
			timer = undefined;
		}
	}

	pi.on("session_start", (_event, sessionCtx) => {
		ctx = sessionCtx;
		lastProgressAt = Date.now();
		startTimer();
		setStatus("unstuck: ready");
	});

	pi.on("session_shutdown", () => {
		stopTimer();
		ctx = undefined;
		inFlight.clear();
		setStatus("");
	});

	pi.on("turn_start", () => {
		turnActive = true;
		providerEscalated = false;
		lastProgressAt = Date.now();
	});

	pi.on("turn_end", () => {
		turnActive = false;
		lastProgressAt = Date.now();
	});

	pi.on("message_update", (_event, sessionCtx) => {
		ctx = sessionCtx;
		lastProgressAt = Date.now();
	});

	pi.on("tool_call", (event, sessionCtx) => {
		ctx = sessionCtx;
		if (!settings.enabled || !isToolCallEventType("bash", event)) {
			return;
		}
		if (event.input.timeout === undefined || event.input.timeout <= 0) {
			event.input.timeout = settings.bashDefaultSec;
		} else if (event.input.timeout > settings.bashMaxSec) {
			event.input.timeout = settings.bashMaxSec;
		}
	});

	pi.on("tool_execution_start", (event, sessionCtx) => {
		ctx = sessionCtx;
		lastProgressAt = Date.now();
		inFlight.set(event.toolCallId, {
			toolCallId: event.toolCallId,
			toolName: event.toolName,
			label: describeArgs(event.args),
			startedAt: Date.now(),
			lastActivityAt: Date.now(),
			lastPartial: "",
			warned: false,
			escalated: false,
		});
	});

	pi.on("tool_execution_update", (event, sessionCtx) => {
		ctx = sessionCtx;
		const entry = inFlight.get(event.toolCallId);
		if (entry === undefined) {
			return;
		}
		entry.lastActivityAt = Date.now();
		const tail = partialText(event.partialResult);
		if (tail.length > 0) {
			entry.lastPartial = tail;
		}
	});

	pi.on("tool_execution_end", (event, sessionCtx) => {
		ctx = sessionCtx;
		inFlight.delete(event.toolCallId);
		lastProgressAt = Date.now();
	});

	pi.registerCommand("unstuck", {
		description: "Show or tune the stall watchdog (off|on|warn N|abort N|provider N|bash N|max N, seconds/ms)",
		handler: async (args, commandCtx) => {
			const parts = args.trim().split(/\s+/).filter((part) => part.length > 0);
			if (parts.length === 0) {
				const ages = Array.from(inFlight.values()).map(
					(entry) =>
						`${entry.toolName} ran ${formatDuration(Date.now() - entry.startedAt)}, silent ${formatDuration(Date.now() - entry.lastActivityAt)}`,
				);
				const summary = [
					`unstuck: ${settings.enabled ? "enabled" : "disabled"}; aborts this session: ${abortCount}`,
					`warn ${Math.round(settings.warnMs / 1000)}s, abort ${Math.round(settings.abortMs / 1000)}s, provider ${Math.round(settings.providerStallMs / 1000)}s, bash timeout ${settings.bashDefaultSec}s (max ${settings.bashMaxSec}s)`,
					ages.length > 0 ? `in flight: ${ages.join("; ")}` : "no tools in flight",
				];
				commandCtx.ui.notify(summary.join("\n"), "info");
				return;
			}
			const [verb, valueText] = parts;
			const applyNumber = (
				current: number,
				apply: (parsed: number) => void,
				min: number,
				max: number,
			): boolean => {
				if (valueText === undefined) {
					commandCtx.ui.notify("unstuck: missing value", "error");
					return false;
				}
				const parsed = Number.parseInt(valueText, 10);
				if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
					commandCtx.ui.notify(`unstuck: value out of range (${min}..${max})`, "error");
					return false;
				}
				if (parsed === current) {
					return true;
				}
				apply(parsed);
				return true;
			};
			switch (verb) {
				case "off":
					settings.enabled = false;
					break;
				case "on":
					settings.enabled = true;
					break;
				case "warn":
					if (!applyNumber(settings.warnMs, (parsed) => { settings.warnMs = parsed * 1000; }, 30, 3600)) {
						return;
					}
					break;
				case "abort":
					if (!applyNumber(settings.abortMs, (parsed) => { settings.abortMs = parsed * 1000; }, 60, 7200)) {
						return;
					}
					break;
				case "provider":
					if (!applyNumber(settings.providerStallMs, (parsed) => { settings.providerStallMs = parsed * 1000; }, 60, 7200)) {
						return;
					}
					break;
				case "bash":
					if (!applyNumber(settings.bashDefaultSec, (parsed) => { settings.bashDefaultSec = parsed; }, 5, 86400)) {
						return;
					}
					break;
				case "max":
					if (!applyNumber(settings.bashMaxSec, (parsed) => { settings.bashMaxSec = parsed; }, 60, 86400)) {
						return;
					}
					break;
				default:
					commandCtx.ui.notify("unstuck: unknown argument", "error");
					return;
			}
			if (settings.enabled && settings.abortMs <= settings.warnMs) {
				commandCtx.ui.notify("unstuck: abort window must exceed warn window", "error");
				return;
			}
			writeLedger({
				ts: new Date().toISOString(),
				kind: "config",
				session: sessionLabel(),
				note: args,
			});
			commandCtx.ui.notify(
				`unstuck: ${settings.enabled ? "enabled" : "disabled"}; warn ${Math.round(settings.warnMs / 1000)}s abort ${Math.round(settings.abortMs / 1000)}s provider ${Math.round(settings.providerStallMs / 1000)}s bash ${settings.bashDefaultSec}s max ${settings.bashMaxSec}s`,
				"info",
			);
		},
	});
}
