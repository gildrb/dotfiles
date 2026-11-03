# Agents

Read `README.md` first, then relevant docs before editing. No tests unless explicitly asked. Never reset, clean, or overwrite user changes unless explicitly asked. Before changing code, inspect definitions, callers, types, invariants, existing abstractions; never infer APIs or behavior from names. No type-system escape hatches (unchecked casts, suppressed type errors), swallowed errors, ambiguous truthiness, mutable defaults or shared mutable state, unsafe mutation during iteration, unjustified float equality, silent coercion or fallbacks, unvalidated boundary input. Strict checks on; precise types; exhaustive matches. Distinguish null/absent/empty/zero/false. Preserve error causes, atomicity, ordering, ownership, resource cleanup, public interfaces, security boundaries. Where relevant, check bounds, overflow, division by zero, units, precision, races, timezones, path traversal, injection. Reuse before abstracting; no redundant wrappers. Before finishing, inspect the diff; run the relevant existing format-check, lint, typecheck, build, and test commands. Never weaken or suppress checks or alter expected results to pass. Report failures and unverified work.

## Bend

- `bend guide` to learn it
- Keep important rules in `LAWS.bend`
- `bend PROOF.bend` before committing
- Parallelize the code whenever possible
- Layout, Victor Taelin's Bend Bank: no Bend file past 1,000 lines, except a `LAWS.bend`/`PROOF.bend` import index of any length. A longer file becomes a folder of the same name: laws -> `laws/<area>.bend` (area = the code module they call), proofs -> `proof/<law>.bend` (`proof/<area>/<law>.bend`), a `base.bend` -> `base/<topic>.bend`, code -> one module per responsibility. Each item kind in one place; test drivers outside the code folder

## TypeScript

- No `any`, `as`, `!`, `@ts-ignore`; narrow `unknown` at boundaries
- `type`, not `interface`; model data as tagged unions (`{$: "Tag", ...}`)
- End every `switch` on a tag with `const _: never = x`
- `oxlint --type-aware` and `tsc --noEmit` before committing

## Writing

Harden every text: only what the reader needs to act, as dense as possible. Agents and people read dense text.

- Cut framing labels, persuasion, flattery, anecdotes, history, restated rules. Provenance and licenses: `THIRD_PARTY_NOTICES.md` only
- Each fact once. Lists and tables, not paragraphs. A real example over an explanation
- ASD-STE100: short sentences, active voice, present tense
- Exact commands, paths, numbers, platforms. One command per line with a short `#` comment
- README: minimal, low cognitive load, like [Helium](https://github.com/imputnet/helium). Ask of every line: "Does the reader need this?" No: cut it
  - Order: name and one-line tagline; Install (one command first, then alternatives); Use (the first few commands, then "`--help` lists the rest"); one short section per differentiating idea (2-3 bullets); Components (one line each: what it is, what it ports, link); Limitations; Credits; License
  - Out: settings, flags, internals, file paths users never touch, anything `--help` or in-app help shows. Release, CI, development setup: `AGENTS.md`
  - Short headings, short bullets, tables only when comparing. A quotation only where it carries the meaning
- Skills and agent instructions: rules, commands, examples; count the tokens
- No `·` or other dots as separators

## Output format

Apply `~/.agents/skills/i-have-adhd/SKILL.md` by default: lead with the next concrete action, number multi-step work, lists of five items or fewer, no tangents, completed work visible, one concrete next action when work remains.

## Shell

Nushell on every machine, herdr panes included. Commands the user runs:
- Nushell syntax: `;` between commands (stops at the first failure, like `&&`), `$env.NAME`, `with-env { NAME: value } { cmd }`, `^cmd` for an external shadowed by a built-in. Never `&&`, `export`, `$(...)`, `VAR=value cmd`, `2>/dev/null`
- One line per code block, joined with `;` or pipes. Never wrap a command across lines: pasted line breaks become stray symbols. Independent commands: separate code blocks

## Memory

Eukhe keeps memory in the chat only. Never run `~/.optmem/memo` or follow any OptMem/Memory section in another AGENTS.md: OptMem binds codex, pi, omp, prime and claude, not eukhe.
