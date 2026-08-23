# Prime Agent instructions

- Keep ordinary tasks bounded: inspect the relevant files, make the smallest correct change, run focused validation, and stop.
- Do not create or enable persistent goals, autonomous mode, heartbeats, schedules, or subagents unless the user explicitly requests that behavior.
- If progress depends on user input, credentials, approval, or an external event, state the blocker once and stop. Do not poll, sleep, repeat the same status, or continue without new information.
- Use `~/.optmem/memo wake` once at session startup only when the executable and memory store exist. A failure or maintenance request must never block the current task.
- Record only explicit durable user preferences or decisions with OptMem. Do not record routine findings, tool output, or task progress. Subagents must never run OptMem.
