# FFF search for Hermes

Repository-managed MCP integration using upstream FFF v0.10.6. No Hermes fork,
Chrome, Node/npm, pip, or hosted search service is required. The standalone Nix
flake pins nixpkgs and the upstream Linux x86_64 musl release by SHA-256.
This is a pinned upstream binary, not a from-source FFF build.

## Design

Hermes discovers three stable tools: `mcp__fff__grep`, `mcp__fff__multi_grep`, and
`mcp__fff__find_files`. The stdlib-only `server.py` adapter preserves upstream
tool schemas and search results, adding a required absolute `root` argument.
It lazily keeps at most four FFF processes (LRU), one per resolved root, rather
than creating duplicate MCP tool sets per repository. Processes retain warm
indexes, watch changes, cache up to 2048 file contents each, and release idle
search caches after 24 hours. That is not a hard RAM limit. Calls are serialized;
batch independent OR searches with `multi_grep`.

- Startup discovers schemas using an empty temporary directory: no automatic
  home, repository, or memory-store scan.
- FFF may expand a selected subdirectory to its enclosing Git repository root.
  Roots are routing hints, **not security sandboxes**. FFF honors its own
  ignored/binary/size exclusions; zero hits do not prove absence in those files.
- FFF update checks are disabled (`--no-update-check`); Hermes MCP sampling is
  explicitly disabled. Normal MCP startup uses Nix `--offline` and cannot
  download dependencies. Initial installation does download pinned packages.
- These are filesystem/search caches, **not LLM prompt-cache hits**. There is
  no measured prompt-cache improvement or RLM implementation in this change.

FFF is intended for every grep/content-search and file-discovery task. Known
file reads still use `read_file`. This integration adds the FFF tools, but does
not remove Hermes's existing search tools or technically force model selection.
The attempted protected `SOUL.md` policy edit was denied after an approval
timeout and was NOT applied. Enforcing FFF-only policy remains pending approval.

## Install and activate

The configured launch path intentionally uses this machine's dotfiles checkout:
`/home/gilrodrigues/Repos/dotfiles/hermes/fff`. Do not move/delete it without
updating `hermes/config.json`. Version pins are committed in this directory.

Build once as the gateway's user, retaining a Nix GC root so offline startup
survives garbage collection:

```sh
nix build path:/home/gilrodrigues/Repos/dotfiles/hermes/fff -o /home/gilrodrigues/.local/state/hermes-fff
nix flake check path:/home/gilrodrigues/Repos/dotfiles/hermes/fff --print-build-logs
```

Then apply the repository-backed Hermes config (requires sudo; this also applies
any other pending Nix configuration changes):

```sh
cd /home/gilrodrigues/nix &&
nix flake update dotfiles &&
sudo nixos-rebuild switch --flake .#computer &&
sudo systemctl restart hermes-minimal-profile.service &&
sudo systemctl restart hermes-agent.service &&
systemctl is-active hermes-agent.service
```

Start a fresh CLI session or reset the Telegram conversation. Ask Hermes to use
`mcp__fff__grep` with root `/home/gilrodrigues/Repos/dotfiles` and query
`hermes/config.json mcp_servers`. A live gateway call remains necessary to verify
post-deployment exposure; a passing standalone test is not that verification.

## Verification

`nix flake check` runs seven actual-FFF integration tests: schema stability,
search plus warm PID reuse, OR batches and filenames, invalid inputs, watcher
refresh, dead-backend restart, and bounded/isolated root pooling.

`verify_hermes.py` runs with the installed Hermes Python environment. It patches
only the config loader in its own verification process, discovers the exact
three tool names through Hermes's real MCP client/registry, and executes a
real search of this repository. It does not edit live config or call an LLM.
On this machine:

```sh
HOME=/mnt/ssd/storage/agents/hermes /nix/store/1b949s4np3zwilh77d1rvbw65rjg185p-hermes-agent-env/bin/python3 /home/gilrodrigues/Repos/dotfiles/hermes/fff/verify_hermes.py
```

The installed Hermes client emitted an upstream unawaited `_watch_stdio_children`
coroutine warning during a verification run; discovery and search succeeded.
The interpreter store path above is an environment-specific test command, not
a deployment dependency. Re-resolve it from the Hermes wrapper after upgrades.

## Search enforcement

The Nix-managed `optmem-startup` plugin also registers an independent
`pre_tool_call` guard from `fff_policy.py`. This packaging reuses the existing
managed plugin deployment; the guard does not read or write OptMem state and
runs independently of wake success. No model call is needed for enforcement.

The guard rejects `search_files` and common filesystem-search tool aliases,
and terminal calls containing grep/rg/ag/ack, find/fd/locate, ls/tree, git grep,
git ls-files/ls-tree, and common explicit Python traversal expressions. The
error instructs the model to use FFF with an absolute root. FFF failure must
be reported, not used to justify another engine. Direct file reads, web and
session/memory searches, ordinary builds and administrative commands remain
available. Schemas stay stable; rejected searches cost a retry rather than
being silently translated with potentially different semantics.

This is enforcement for standard tool paths, NOT an arbitrary-code sandbox.
A general-purpose terminal/browser can execute disguised search code; native
Hermes plugin-load/hook exceptions also fail open. Shell detection is
conservative and may reject a command merely mentioning a search executable
as an argument. Absolute guarantees require a restricted execution capability
or a core fail-closed dispatcher, not this plugin. Do not describe this as
100% enforcement against every possible bypass.

Run `test_policy.py` with the same installed Hermes Python as above. It uses
an isolated temporary profile, actual plugin discovery and the native hook
dispatcher to verify rejection and allowed operations. Nix activation refreshes
the plugin; restart the gateway and start a fresh CLI session afterward.

## Rollback

Remove the `pre_tool_call` registration and its manifest entry before removing
FFF. Then remove `mcp_servers.fff` from `hermes/config.json`, commit/push, and
reapply the managed Nix configuration. Remove the GC-root symlink only when
FFF is no longer needed. No OptMem store or other profile is changed.
