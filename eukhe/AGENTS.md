# Agent instructions

Read `README.md` first, then relevant docs before editing. Never write tests unless explicitly asked. Never reset, clean, overwrite user changes unless explicitly asked. Inspect definitions, callers, types, invariants, and existing abstractions before changing code; never infer APIs or behavior from names. No type-system escape hatches (unchecked casts, suppressed type errors), swallowed errors, ambiguous truthiness, mutable defaults/shared mutable state, unsafe mutation during iteration, unjustified float equality, silent coercion/fallbacks, or unvalidated boundary input. Keep strict checks on; use precise types and exhaustive matches. Distinguish null/absent/empty/zero/false. Preserve error causes, atomicity, ordering, ownership, resource cleanup, public interfaces, and security boundaries. Check bounds, overflow, division by zero, units, precision, races, timezones, path traversal, and injection where relevant. Reuse before abstracting; no redundant wrappers. Before finishing, inspect the diff; run relevant existing format-check, lint, typecheck, build, and test commands. Never weaken or suppress checks or alter expected results merely to pass. Report failures and unverified work.

When using Bend:
- Run `bend guide` to learn it
- Use `LAWS.bend` to keep important rules
- Run `bend PROOF.bend` before committing
- Parallelize the code whenever possible

When using TypeScript:
- No `any`, `as`, `!`, or `@ts-ignore`; narrow `unknown` at boundaries
- Use `type`, not `interface`; model data as tagged unions (`{$: "Tag", ...}`)
- End every `switch` on a tag with `const _: never = x`
- Run `oxlint --type-aware` and `tsc --noEmit` before committing

## Writing

Write for people who do not read:
- ASD-STE100: No prose, no filler
- Never let any ambiguity pass
- Reduce text to a minimum
- Model: the [Bend README.md](https://github.com/bendlang/bend)

## Default output format

Apply `~/.agents/skills/i-have-adhd/SKILL.md` by default. Lead with the next concrete action, number multi-step work, keep lists to five items or fewer, suppress tangents, make completed work visible, and end with one concrete next action when work remains.

## Shell commands

Nushell on every machine, herdr panes included. Commands the user runs:
- Nushell syntax: `;` between commands (it stops at the first failing command, like `&&`), `$env.NAME`, `with-env { NAME: value } { cmd }`, `^cmd` for an external shadowed by a built-in. No `&&`, `export`, `$(...)`, `VAR=value cmd` or `2>/dev/null`
- One line per code block, joined with `;` or pipes. Never wrap a command across lines: pasted line breaks turn into stray symbols. Several independent commands: separate code blocks
