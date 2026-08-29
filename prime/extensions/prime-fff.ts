/**
 * prime-fff: Prime-side binding for the pinned FFF search extension.
 *
 * Prime exposes only the ipython tool, so FFF's "override" tool names
 * (grep/find/multi_grep) are free and match the names models already know;
 * stock Pi keeps its builtin find/grep and uses the prefixed fffind/ffgrep.
 * Benchmark (glm-5.3, 3-turn search/edit/verify, 2 reps): override naming
 * raised cache hit share 90.2% -> 92.0% and cut uncached input 27.4k -> 25.2k
 * tokens versus baseline by moving search off python subprocess round-trips.
 *
 * The package is installed declaratively by the packages entry in
 * settings.json ({"extensions": []} so it does not auto-load a second time).
 * Git packages clone to ~/.prime/agent/git/<host>/<path> and run
 * `npm install` inside the checkout; npmCommand in settings.json therefore
 * exports npm_config_prefix instead of passing --prefix, so -g installs land
 * in ~/.prime/agent/npm-global while in-checkout installs stay local (the
 * Nix store global root is read-only).
 *
 * Provenance: gildrb/pi-fff-patched@14deeeb426aa48486454b4c3fc4907c82c0cb4f4
 * = npm:@ff-labs/pi-fff@0.10.5
 * = git:github.com/dmtrKovalenko/fff@16730049c86e9f7fe987ab8df0c36b82450c8438
 * (tag v0.10.5) plus one patch: fuzzy-fallback pagination cursors resume the
 * fuzzy match stream instead of replaying against the literal query that
 * matched nothing, which turned every fallback continuation into
 * "No matches found".
 */
import { homedir } from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const agentDir = process.env.PI_CODING_AGENT_DIR ?? `${homedir()}/.prime/agent`;
const PACKAGE_ENTRY = `${agentDir}/git/github.com/gildrb/pi-fff-patched/src/index.ts`;

export default async function primeFff(pi: ExtensionAPI): Promise<void> {
	process.env.PI_FFF_MODE ??= "override";
	const mod = (await import(PACKAGE_ENTRY)) as {
		default: (pi: ExtensionAPI) => void;
	};
	mod.default(pi);
}
