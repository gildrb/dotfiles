# Agents

Read README.md + docs first. No tests unless asked. Never reset, clean, overwrite user changes. Before editing read definitions, callers, types, invariants; never infer APIs from names. Never: unsafe (any language), escape hatches, swallowed errors, ambiguous truthiness, shared mutable state, mutation during iteration, float equality, silent coercion, unvalidated input, weakened checks to pass. Strict checks, precise types, exhaustive matches; null/absent/empty/zero/false distinct. Preserve error causes, atomicity, ordering, ownership, cleanup, public APIs, security. Check bounds, overflow, units, precision, races, timezones, traversal, injection. Reuse before abstracting; no wrapper without two callers. Finish: inspect the diff; run fmt/lint/typecheck/build/tests. Report failures, unverified work.

## Languages

- Rust: never unsafe; no bare unwrap/expect; fallible ops return Result/Option, never sentinels; errors as enums with From; newtypes over primitives; private by default; comments explain why, ≤2 lines; perf claims need a benchmark, median of 3 runs vs a recorded pin; clippy --all-targets -- -D warnings + cargo fmt before commit.
- TypeScript: no any/as/!/@ts-ignore; narrow unknown; type not interface; tagged unions `{$:"Tag"}`; every switch on a union ends `default: const _: never = d`; oxlint --type-aware + tsc --noEmit. Stack: vite-plus (`vp`), StyleX, Preact; React-compat imports via preact/compat.
- Bend: the bend skill (~/.agents/skills/bend/SKILL.md) owns laws, proofs, bank layout; bend PROOF.bend before commit.
- Parallelize hot paths (rayon, workers, SIMD, Bend native) when load allows.

Architecture: high cohesion, strong typing, coupling downward only, small public surfaces; hot paths in the compiled language.

## Writing

Dense, telegraphic; only what the reader needs to act on. Cut flattery, history, restated rules. One fact once; lists over prose; example over explanation. README: every line answers "does the reader need this?"; order tagline, Install (one command first), Use (first commands, then --help), one section per differentiator (≤3 bullets), Components (one line each), Limitations, Credits, License; cut settings, flags, internals, paths users never touch, what --help shows; dev setup in AGENTS.md; tables only to compare. Skills and AGENTS.md: rules, commands, examples; count tokens. No `·` separators.

## Output

~/.agents/skills/i-have-adhd/SKILL.md default: next action first, numbered steps, ≤5-item lists, no tangents, one next action at end.

## Shell

Nushell everywhere (herdr included): `;` not `&&`; `$env.X`; `with-env {X: v} {cmd}`; `^cmd` for shadowed builtins; never export, $(...), VAR=v cmd, 2>/dev/null; one line per code block.

## Memory

OptMem: ~/.optmem/memo, data ~/.optmem/memory. Startup: memo wake; do what it prints. Learnings: memo note "<1 line, ≤280 bytes>"; no duplicates; compress when asked. Never edit the memory dir. Search: memo recall <re>; memo zoom <a-b> opens a tree node. Subagents never run memo; on spawn write: You are a subagent. Don't run memo.
