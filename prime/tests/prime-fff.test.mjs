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
	typeof p === "object" ? p.source?.includes("pi-fff") : false,
);

assert.ok(fffEntry, "settings.packages pins the fff search package");
assert.match(
	fffEntry.source,
	/^git:github\.com\/gildrb\/pi-fff-patched@[0-9a-f]{40}$/,
	"fff is pinned to an exact git sha of the patched package",
);
assert.deepEqual(
	fffEntry.extensions,
	[],
	"package extensions stay unloaded; prime-fff.ts is the only loader",
);
assert.match(
	adapter,
	/git:github\.com\/dmtrKovalenko\/fff@[0-9a-f]{40}/,
	"adapter records the git provenance hash of the upstream pin",
);
assert.match(
	adapter,
	/git\/github\.com\/gildrb\/pi-fff-patched\/src\/index\.ts/,
	"adapter loads the package from the git checkout root",
);

// npmCommand redirects npm's global root into the Prime config dir via env so
// -g installs stay off the read-only Nix store, while in-checkout npm installs
// (git packages) keep working from their own cwd. Keep $HOME for portability.
const [sh, dashC, script, argv0] = settings.npmCommand ?? [];
assert.equal(sh, "sh");
assert.equal(dashC, "-c");
assert.equal(argv0, "npm");
assert.equal(
	script,
	'export npm_config_prefix="$HOME/.prime/agent/npm-global"; exec npm "$@"',
	"npmCommand redirects the global npm root into the Prime config dir",
);

assert.equal(typeof primeFff, "function", "adapter default-exports a loader");
