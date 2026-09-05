# Hermes defaults

`SOUL.md` is the automatically loaded identity and behavior policy for new CLI
and gateway sessions. It instructs the agent to apply the installed
`$HERMES_HOME/skills/i-have-adhd/SKILL.md`, includes a short response-style summary,
and carries the OptMem workflow inline. The full ADHD skill is not embedded in
SOUL; loading and following it is a model instruction, not an enforced runtime
hook. A slash command is not needed to request these defaults. Other skills remain
opt-in. `config.json` owns reusable tool and provider policy; Nix supplies runtime
paths, packages, secrets references, and the pinned dotfiles source. Model choices,
context/output budgets, provider model metadata, aliases, display, and terminal
preferences belong only in `config.json`. Nix injects local service URLs and the
runtime secret reader; it does not override those preferences.

The current host supports `custom:qwen-local` and `custom:ollama-local`. Select a
model provisioned on that host. Legacy aliases with provider `custom` use Ollama.
Unsupported providers or unprovisioned models fail host validation rather than
silently using a different endpoint.

Telegram is the only managed messaging integration. Its existing progress defaults
are unchanged. Before deploying this removal, follow the one-time retirement
procedure in `gildrb/nix/OPERATIONS.md`: old Signal/Discord credentials and runtime
configuration must be removed separately. This source change does not erase
credentials, sessions, or runtime directories. Hermes auto-detects old credentials;
removing settings alone is not an adapter allowlist.

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
