# Prime zero-key web research benchmark

Run on 2026-09-02 with Prime/Pi 0.84.3. No new API key was created. Native OpenAI/Codex used the existing Prime OAuth session. Exa MCP, DuckDuckGo, and Bing were tested without credentials. A result counted as successful only when it contained useful source-backed evidence; HTTP 200 alone did not count.

## Adapter-provider benchmark

Twelve live queries covered current news, official docs, exact phrases, GitHub, VGPU/WebGPU, and two `site:x.com` searches. Each top result was fetched when one existed.

| Provider | Nonempty | Avg results | Avg unique domains/query | Authority hit | Median / p95 | Exact duplicate URLs within result sets | Useful top-page fetch |
|---|---:|---:|---:|---:|---:|---:|---:|
| Native OpenAI/Codex | 12/12 | 5.00 | 2.50 | 9/12 | 8.87s / 29.21s | 0/60 | 10/12 |
| Exa MCP free | 10/12 | 4.08 | 2.42 | 9/12 | 4.01s / 5.77s | 0/49 | 9/10 |
| DuckDuckGo HTML | 7/12 | 2.92 | 1.67 | 7/12 | 0.58s / 0.76s | 0/35 | 6/7 |

Across different queries, Exa repeated 2 of 49 URLs (4.1%); native OpenAI/Codex and DuckDuckGo repeated none. Exa's two empty responses were both X/Twitter queries. DuckDuckGo returned HTTP-200 challenge/empty pages after seven successful burst calls.

## Candidate regression benchmark

A separate 13-query run included NVIDIA VGPU, current releases/news/weather, TypeScript and RFC documentation, GitHub, exact API phrases, Portuguese news, and `site:x.com`.

| Candidate/backend | Useful/source-backed | Median / p95 | URLs measured | Exact duplicates | Result |
|---|---:|---:|---:|---:|---|
| ByteTrue Exa MCP free | 12/13 | 1.85s / 2.70s | 96 | 0 | Best fast keyless SERP; empty for X |
| ttttmr native Codex | 12/13 sourced | 13.45s / 35.11s | 33 displayed / 325 raw | 0 displayed / 36 raw | Strong synthesis; one unsourced weather answer |
| pi-codex-search | 12/13 cited | 16.10s / 42.06s | 34 | 0 | Useful specialist; one stale release answer |
| DuckDuckGo HTML, two rounds | 13/26 | 0.26-0.52s median | 98 | 0 | Too burst-sensitive for primary use |
| ByteTrue Bing HTML | about 2/13 usable | 0.16s / 0.40s | 104 | Source identity lost | Rejected: escaped redirect URLs and poor relevance |

The generic fetch route extracted useful text from NVIDIA docs, GitHub releases, TypeScript docs, and RFC 9110. Expected failures such as an OpenAI 403 and an SSRF/DNS rejection were surfaced instead of reported as success.

## Selected route

1. Use Exa MCP first for normal searches because it is fast, source-rich, and keyless.
2. Route `site:x.com` and `site:twitter.com` queries to keyless Parallel MCP, retry through native OpenAI/Codex when Parallel returns no results or errors, then use DuckDuckGo only if both fail. A live regression returned official VGPU sources plus a direct X status where Exa was empty and DuckDuckGo failed.
3. Use native OpenAI/Codex after Exa for unsupported, transient, quota, network, or invalid-response failures.
4. Keep DuckDuckGo as the final package fallback and as the adapter's dependency-free degraded mode.
5. Fetch public X status pages through Twitter's zero-key oEmbed endpoint; use the package's guarded HTTP/Jina route for other pages.

The installed implementation is pinned to `nicobailon/pi-web-access@711cc41313202e277a248b1cc45942b6dc8927f7`.
