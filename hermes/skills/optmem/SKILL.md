---
name: optmem
description: Mandatory durable-memory workflow for top-level Hermes CLI and gateway sessions.
---

# OptMem

OptMem persists across sessions, compaction, models, and vendors. Use the managed
`memo` command. It selects the configured memory directory; do not override
`MEMORY_DIR`, initialize another store, or edit memory files directly.

## Top-level sessions

- Before the first response or any other tool call, run `memo wake`. Read every
  page and follow its printed continuation and compression instructions before
  other work. If startup already supplied wake output, finish it without rerunning.
- If wake fails, report the failure. Do not pretend memory was loaded or run
  `memo init` without explicit permission.
- Record durable decisions, preferences, lessons, useful personal context, and
  meaningful outcomes with `memo note "<one line, maximum 280 bytes>"`. Avoid
  duplicates and never record secrets. This standing memory permission does not
  authorize unrelated system changes.
- If a command requests compression, complete the requested `memo nap` before
  another action. Use `memo recall <regex>` and `memo zoom <a-b>` to retrieve context.

## Delegated agents

Subagents must not run any `memo` command or write shared memories. Return useful
findings to the parent, which owns memory writes. When delegating, explicitly
instruct the child: `You are a subagent. Do not run memo.`
