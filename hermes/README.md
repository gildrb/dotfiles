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

Hermes CLI and Telegram share only the dedicated Hermes OptMem store. Coding
agents keep their existing primary store. The runtime exposes `HERMES_MEMO` as an
absolute command bound to Hermes's store, so login-shell PATH changes cannot select
the primary `memo` wrapper. Provisioning initializes a missing Hermes store empty;
it never copies primary memories. Existing Hermes memories are preserved.

The managed `optmem-startup` plugin loads the installed OptMem skill and executes
the real `"$HERMES_MEMO" wake` before the first top-level model call. It follows
bounded wake pagination without executing arbitrary printed commands. Complete
output enters the conversation context and is persisted with that session.
Compression remains the parent agent's job; subagents never run OptMem commands.

Hermes's native hooks fail open and may skip a callback already running for another
session. This is automatic startup on the healthy path, not an absolute gate.
The plugin reports command failures and oversized or incomplete output explicitly;
SOUL keeps the manual wake requirement as a fallback. It does not silently truncate
memory or claim a failed load succeeded.

## Adopting changes

Hermes persists the system prompt with each conversation. Replacing `SOUL.md` or
restarting the gateway does not reliably change an existing conversation's
prompt. `/reload-skills` refreshes discovery, not the system prompt.

After the new configuration is deployed, start a new CLI session or send `/new`
in the affected gateway conversation. `/new` starts a fresh active context; it
retains the old stored session/history but does not carry that history into the
new context. Save any needed handoff first. Do not delete or rewrite session DB
rows to force a prompt update.

After changing memory isolation, start a fresh session: an existing conversation
may still contain primary-store material already loaded into its context. The
change does not delete archived conversations or modify primary memories.
