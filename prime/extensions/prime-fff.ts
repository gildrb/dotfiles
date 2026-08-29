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
 * settings.json ({"extensions": []} so it does not auto-load a second time);
 * npmCommand in settings.json redirects npm's global root to
 * ~/.prime/agent/npm-global because the Nix store is read-only.
 *
 * Provenance: npm:@ff-labs/pi-fff@0.10.3 =
 * git:github.com/dmtrKovalenko/fff@e2cad2f09ea617d4c024f396f21d80e557f23a17
 * (npm gitHead matches tag v0.10.3; the git source itself is not loadable:
 * the workspace ships no dist and pins platform binaries to a 0.0.0
 * placeholder that npm cannot resolve).
 */
import { homedir } from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const agentDir = process.env.PI_CODING_AGENT_DIR ?? `${homedir()}/.prime/agent`;
const PACKAGE_ENTRY = `${agentDir}/npm-global/lib/node_modules/@ff-labs/pi-fff/src/index.ts`;

export default async function primeFff(pi: ExtensionAPI): Promise<void> {
	process.env.PI_FFF_MODE ??= "override";
	const mod = (await import(PACKAGE_ENTRY)) as {
		default: (pi: ExtensionAPI) => void;
	};
	mod.default(pi);
}
