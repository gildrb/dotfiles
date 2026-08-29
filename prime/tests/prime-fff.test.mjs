import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import primeFff from "../extensions/prime-fff.ts";

const here = dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(
	readFileSync(join(here, "../settings.json"), "utf8"),
);
const adapter = readFileSync(join(here, "../extensions/prime-fff.ts"), "utf8");

const fffEntry = settings.packages?.find((p) =>
	typeof p === "object" ? p.source?.startsWith("npm:@ff-labs/pi-fff@") : false,
);

assert.ok(fffEntry, "settings.packages pins @ff-labs/pi-fff");
assert.match(
	fffEntry.source,
	/npm:@ff-labs\/pi-fff@\d+\.\d+\.\d+$/,
	"fff is pinned to an exact npm version",
);
assert.deepEqual(
	fffEntry.extensions,
	[],
	"package extensions stay unloaded; prime-fff.ts is the only loader",
);
assert.match(
	adapter,
	/git:github\.com\/dmtrKovalenko\/fff@[0-9a-f]{40}/,
	"adapter records the git provenance hash of the npm pin",
);
assert.match(
	adapter,
	/npm-global\/lib\/node_modules\/@ff-labs\/pi-fff\/src\/index\.ts/,
	"adapter loads the package from the redirected npm root",
);
assert.match(
	adapter,
	/process\.env\.PI_FFF_MODE \?\?= "override"/,
	"adapter defaults to Prime-only override tool names without clobbering an explicit mode",
);

// npm's global root is read-only under Nix; the redirect must stay portable
// across hosts via $HOME and keep install and resolution on the same root.
const [sh, dashC, script, argv0] = settings.npmCommand ?? [];
assert.equal(sh, "sh");
assert.equal(dashC, "-c");
assert.equal(argv0, "npm");
assert.equal(
	script,
	'exec npm --prefix "$HOME/.prime/agent/npm-global" "$@"',
	"npmCommand redirects the global npm root into the Prime config dir",
);

assert.equal(typeof primeFff, "function", "adapter default-exports a loader");
