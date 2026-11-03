# Agents

Read README.md, docs first. No tests unless asked. Never reset, clean, overwrite user changes. Before editing read definitions, callers, types, invariants; never infer APIs from names. Never: unsafe (any language), escape hatches (`as`, `!`, `@ts-ignore`), swallowed errors, ambiguous truthiness, shared mutable state, mutation during iteration, float equality, silent coercion, unvalidated input, weakened checks to pass. Strict checks, precise types, exhaustive matches; null/absent/empty/zero/false are distinct. Preserve error causes, atomicity, ordering, ownership, cleanup, public APIs, security. Check bounds, overflow, units, precision, races, timezones, path traversal, injection. Reuse before abstracting; no wrapper without two callers. Finish: inspect the diff; run fmt/lint/typecheck/build/tests. Report failures, unverified work.

## Languages

Rust, TypeScript, Bend.
- Rust: never unsafe; no bare unwrap/expect; newtypes over primitives; clippy --all-targets -- -D warnings + cargo fmt before commit.
- TypeScript: no any/as/!/@ts-ignore; narrow unknown; type not interface; tagged unions `{$:"Tag"}`; switch ends `const _: never = x`; oxlint --type-aware + tsc --noEmit.
- Bend: the bend skill (~/.agents/skills/bend/SKILL.md) owns laws, proofs, bank layout; bend PROOF.bend before commit.
- Parallelize hot paths (rayon, workers, Bend native) when load allows.

Architecture: high cohesion, strong typing, coupling downward only, small public surfaces.

## Writing

Dense, telegraphic; only what the reader needs to act on. Cut flattery, history, restated rules. One fact once; lists over prose; example over explanation. README: every line answers "does the reader need this?"; order tagline, Install (one command first), Use (first commands, then --help), one section per differentiator (≤3 bullets), Components (one line each), Limitations, Credits, License; cut settings, flags, internals, paths users never touch, what --help shows; dev setup in AGENTS.md; tables only to compare. Skills and AGENTS.md: rules, commands, examples; count tokens. No `·` separators.

## Output

~/.agents/skills/i-have-adhd/SKILL.md default: next action first, numbered steps, ≤5-item lists, no tangents, one next action at end.

## Shell

Nushell everywhere (herdr included): `;` not `&&`; `$env.X`; `with-env {X: v} {cmd}`; `^cmd` for shadowed builtins; never export, $(...), VAR=v cmd, 2>/dev/null; one line per code block.

## Memory

OptMem: ~/.optmem/memo, data ~/.optmem/memory; outlives sessions, compaction, models. Startup: memo wake; do what it prints. Lasting learning: memo note "<1 line, ≤280 bytes>"; no duplicates; compress when asked. Never edit the memory dir. Search: memo recall <regex>. memo zoom <a-b> opens a tree node. Subagents never run memo; on spawn write: You are a subagent. Don't run memo.
