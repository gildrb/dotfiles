---
name: optmem
description: Mandatory durable-memory workflow for top-level Hermes CLI and gateway sessions.
---

# OptMem

OptMem persists across sessions, compaction, models, and vendors. Use the dedicated
`"$HERMES_MEMO"` command, not `memo` from `PATH`. It is bound to the Hermes-only
memory store. Do not override its directory, initialize another store, or edit
memory files directly. Never read, write, import, or copy the primary coding-agent
OptMem store.

## Top-level sessions

- Before the first response or any other tool call, run `"$HERMES_MEMO" wake`. Read every
  page and follow its printed continuation and compression instructions before
  other work. If startup already supplied wake output, finish it without rerunning.
- If wake fails, report the failure. Do not pretend memory was loaded or run
  `"$HERMES_MEMO" init` without explicit permission.
- Record durable decisions, preferences, lessons, useful personal context, and
  meaningful outcomes with `"$HERMES_MEMO" note "<one line, maximum 280 bytes>"`. Avoid
  duplicates and never record secrets. This standing memory permission does not
  authorize unrelated system changes.
- If a command requests compression, complete the requested `"$HERMES_MEMO" nap` before
  another action. Use `"$HERMES_MEMO" recall <regex>` and `"$HERMES_MEMO" zoom <a-b>` to retrieve context.

## Delegated agents

Subagents must not run any OptMem command or write Hermes memories. Return useful
findings to the parent, which owns memory writes. When delegating, explicitly
instruct the child: `You are a subagent. Do not run memo.`
