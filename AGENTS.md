# Agent instructions

- Prefer fast, direct, low-coupling changes.
- Keep code simple. Do not add one-line wrapper functions.
- Avoid duplication. Reuse existing modules and helpers; check for reusable behavior before adding new abstractions.
- Use dependency inversion at boundaries: host files choose policy; modules expose reusable behavior.
- Preserve user data and unrelated work. Never reset, clean, or overwrite user changes unless explicitly asked.
- Read the project and relevant documentation before editing. Follow local instructions and established best practices.
- Keep responses concise, technical, and direct. Avoid fluff, hype, and unnecessary preambles.

## Default output format

Apply `~/.codex/skills/i-have-adhd/SKILL.md` by default. Lead with the next concrete action, number multi-step work, keep lists to five items or fewer, suppress tangents, make completed work visible, and end with one concrete next action when work remains.

## Durable memory

Use OptMem for durable Pi memory.

- Run `memo wake` before other tool calls.
- Record durable decisions and lessons with `memo note "..."`.
- Run `memo nap` when `memo note` requests compression.
- Never edit files under OptMem's memory directory manually.

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
