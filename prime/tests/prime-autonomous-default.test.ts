import assert from "node:assert/strict";
import primeAutonomousDefault from "../extensions/prime-autonomous-default.ts";

type SessionStartEvent = { reason: "startup" | "reload" | "new" | "resume" | "fork" };
let start: ((event: SessionStartEvent) => void) | undefined;
const messages: string[] = [];

primeAutonomousDefault({
	on(event: string, handler: (event: SessionStartEvent) => void) {
		assert.equal(event, "session_start");
		start = handler;
	},
	sendUserMessage(message: string) {
		messages.push(message);
	},
} as never);

assert.ok(start, "extension registers a session_start handler");
for (const reason of ["startup", "new", "resume", "fork"] as const) start({ reason });
assert.deepEqual(
	messages,
	Array.from({ length: 4 }, () => "/autonomous on"),
	"every started session enables host-managed autonomous mode",
);
start({ reason: "reload" });
assert.equal(messages.length, 4, "extension reload does not override an explicit /autonomous off");
