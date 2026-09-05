# Hermes defaults

`SOUL.md` is the automatically loaded identity and behavior policy for new CLI
and gateway sessions. It includes the mandatory `i-have-adhd` response style and
OptMem workflow inline. Their skill files also support explicit skill loading;
a slash command is not needed to activate the defaults. Other skills remain
opt-in. `config.json` owns reusable tool and provider policy; Nix supplies runtime
paths, packages, secrets references, and the pinned dotfiles source.

OptMem's first `memo wake` is a model instruction, not an enforced runtime hook.
The configured terminal tool and managed `memo` command must be available. The
command selects the canonical memory store independently of the gateway's HOME.
Do not initialize, copy, or migrate memories to repair a missing command or path.
Subagents never run `memo`; the parent owns shared memory writes.

## Adopting changes

Hermes persists the system prompt with each conversation. Replacing `SOUL.md` or
restarting the gateway does not reliably change an existing conversation's
prompt. `/reload-skills` refreshes discovery, not the system prompt.

After the new configuration is deployed, start a new CLI session or send `/new`
in the affected gateway conversation. `/new` starts a fresh active context; it
retains the old stored session/history but does not carry that history into the
new context. Save any needed handoff first. Do not delete or rewrite session DB
rows to force a prompt update.
