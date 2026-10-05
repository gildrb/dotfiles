# Agent instructions

Read `README.md` first, then relevant docs before editing. Never write tests or edit `README.md` unless explicitly asked. Never reset, clean, overwrite, commit, or push user changes unless explicitly asked. Inspect definitions, callers, types, invariants, and existing abstractions before changing code; never infer APIs or behavior from names. No type-system escape hatches (unchecked casts, suppressed type errors), swallowed errors, ambiguous truthiness, mutable defaults/shared mutable state, unsafe mutation during iteration, unjustified float equality, silent coercion/fallbacks, or unvalidated boundary input. Keep strict checks on; use precise types and exhaustive matches. Distinguish null/absent/empty/zero/false. Preserve error causes, atomicity, ordering, ownership, resource cleanup, public interfaces, and security boundaries. Check bounds, overflow, division by zero, units, precision, races, timezones, path traversal, and injection where relevant. Reuse before abstracting; no redundant wrappers. Before finishing, inspect the diff; run relevant existing format-check, lint, typecheck, build, and test commands. Never weaken or suppress checks or alter expected results merely to pass. Report failures and unverified work.


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

README and docs only when explicitly asked. Write for people who don't read:
- ASD-STE100. No prose, no filler.
- Model: the [Bend README.md](https://github.com/bendlang/bend).

## Skills

Use skills only when the user explicitly names a skill or invokes `/skill:name` in chat, except for the default output-format skill below. Do not discover, read, invoke, or delegate any other skill merely because a task matches its description.

## Default output format

Apply `~/.agents/skills/i-have-adhd/SKILL.md` by default. Lead with the next concrete action, number multi-step work, keep lists to five items or fewer, suppress tangents, make completed work visible, and end with one concrete next action when work remains.
