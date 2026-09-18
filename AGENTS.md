# Agent instructions

Read `README.md` first, then relevant docs before editing. Never write tests or edit `README.md` unless explicitly asked. Never reset, clean, overwrite, commit, or push user changes unless explicitly asked. Inspect definitions, callers, types, invariants, and existing abstractions before changing code; never infer APIs or behavior from names. No `any`/`Any`, unsafe type casts/assertions, non-null assertions, `@ts-ignore`, swallowed errors, ambiguous truthiness, mutable defaults/shared mutable state, unsafe mutation during iteration, unjustified float equality, silent coercion/fallbacks, or unvalidated boundary input. Keep strict checks on; use precise types and exhaustive matches. Distinguish null/absent/empty/zero/false. Preserve error causes, atomicity, ordering, ownership, resource cleanup, public interfaces, and security boundaries. Check bounds, overflow, division by zero, units, precision, races, timezones, path traversal, and injection where relevant. Reuse before abstracting; no redundant wrappers. Before finishing, inspect the diff; run relevant existing format-check, lint, typecheck, build, and test commands. Never weaken or suppress checks or alter expected results merely to pass. Report failures and unverified work.

Subagent exemptions apply only to OptMem; all other instructions remain binding.

When using Bend:
- Run `bend guide` to learn it
- Use `LAWS.bend` to keep important rules
- Run `bend PROOF.bend` before committing
- Parallelize the code whenever possible

## Skills

Use skills only when the user explicitly names a skill or invokes `/skill:name` in chat, except for the default output-format skill below. Do not discover, read, invoke, or delegate any other skill merely because a task matches its description.

## Default output format

Apply `~/.codex/skills/i-have-adhd/SKILL.md` by default. Lead with the next concrete action, number multi-step work, keep lists to five items or fewer, suppress tangents, make completed work visible, and end with one concrete next action when work remains.

## Memory

Your memory is OptMem:

- The tool is `~/.optmem/memo`
- Your memories are in `~/.optmem/memory`

OptMem outlives every session, compaction, model and vendor change.
Without it you do not know who you are, or what was decided and tried.

### At startup: activating OptMem (mandatory)

Run `~/.optmem/memo wake` before any other tool call, in every session, and
then do exactly what it prints, to the end of its output.

### While working: register memories (mandatory)

Call `~/.optmem/memo note "<1 line, max 280 bytes>"` whenever you learn
something new, or something worth keeping happens. That covers a task
worth real effort, a fact or insight the user teaches you, anything you
learn about their life (even indirectly), any event of lasting effect.

Do not register redundant memories.

If `~/.optmem/memo note` asks a compression: do it before your next action.

Never edit or delete anything under `~/.optmem/memory`: the tool manages it.

### When you need an old memory: search, or navigate

`~/.optmem/memo recall <regex>` searches every memory, word for word.

Your memories also form a binary tree: #0-1, #2-3 ... exist as one-line
summaries, pairs of those as #0-3, and so on -- every `#a-b` line wake
prints is one node of it. `~/.optmem/memo zoom <a-b>` opens a node into its
two halves, down to the raw memories.

### If you're a subagent: skip everything above

Parallel sessions on this machine are all you, and may all write memories.
A subagent is not: it must never run `memo`, because it cannot judge what
is already known, and its notes would arrive duplicated and incorrectly.
When you spawn one, write: `You are a subagent. Don't run memo.`
