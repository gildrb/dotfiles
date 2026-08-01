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
