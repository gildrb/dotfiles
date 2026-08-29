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

assert.match(
	adapter,
	/npm-global\/lib\/node_modules\/@ff-labs\/pi-fff\/src\/index\.ts/,
	"adapter keeps the npm-global copy as a bridge candidate",
);
assert.match(
	adapter,
	/Symbol\.for\("TypeBox\.Kind"\)/,
	"degraded fallback schemas carry TypeBox Kind markers (plain JSON schema is rejected)",
);
assert.match(
	adapter,
	/registerDegradedTools/,
	"adapter registers dependency-free builtin grep/find when FFF cannot load",
);
assert.match(
	adapter,
	/withDegradedFallback/,
	"loaded FFF search tools degrade per-call on infrastructure failures",
);
assert.match(
	adapter,
	/session_start/,
	"a failed FFF load notifies the user at session start",
);
assert.match(
	adapter,
	/Can not run certain FFF features in a file system root or home directories/,
	"execute-time degradation covers the home-directory scan refusal",
);

assert.equal(typeof primeFff, "function", "adapter default-exports a loader");
