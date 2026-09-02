import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(readFileSync(join(here, "../settings.json"), "utf8")) as {
	packages?: Array<{ source: string; extensions: string[] }>;
};
const config = JSON.parse(readFileSync(join(here, "../web-search.json"), "utf8")) as Record<string, any>;
const adapter = readFileSync(join(here, "../extensions/prime-web-search.ts"), "utf8");
const entry = settings.packages?.find((candidate) => candidate.source.includes("pi-web-access"));

assert.ok(entry, "settings installs pi-web-access");
assert.match(
	entry.source,
	/^git:github\.com\/nicobailon\/pi-web-access@[0-9a-f]{40}$/,
	"web research package is pinned to an exact upstream commit",
);
assert.deepEqual(entry.extensions, [], "the package cannot auto-load beside the Prime adapter");
assert.deepEqual(
	config.searchRouting,
	{
		providers: ["exa", "openai", "duckduckgo"],
		useCurrentModel: true,
		fallbackOn: ["unsupported", "transient", "quota", "network", "invalid-response"],
	},
	"search uses Exa first with native Codex and DuckDuckGo fallbacks",
);
assert.equal(config.workflow, "none", "research never starts the package's curator server");
assert.equal(config.autoOpenBrowser, false, "research does not open a browser sidecar");
assert.equal(config.tools.sourceCheck.enabled, false, "the high-overlap source_check tool stays disabled");
assert.deepEqual(
	config.toolNames,
	{ webSearch: "web_search", fetchContent: "web_fetch", getSearchContent: "web_read" },
	"Prime gets conventional compact tool names",
);
assert.equal(config.fetchRouting.allowRemoteHostedProviders, true, "Jina may recover public pages blocked to direct fetch");
assert.doesNotMatch(JSON.stringify(config), /(apiKey|token|secret|password)/i, "tracked config contains no credentials");
assert.match(adapter, /PRIME_AGENT_CODING_AGENT_DIR/, "adapter maps Prime's config directory into Pi packages");
assert.match(adapter, /nicobailon\/pi-web-access@[0-9a-f]{40}/, "adapter records upstream provenance");
assert.match(adapter, /provider: "parallel-mcp"/, "X searches use the tested keyless Parallel MCP route");
assert.match(adapter, /provider: "openai"/, "X searches retry through native Codex");
assert.match(adapter, /provider: "duckduckgo"/, "X searches keep a keyless final fallback");
assert.match(adapter, /primeFallbackUsed/, "X search results disclose adapter fallback use");
