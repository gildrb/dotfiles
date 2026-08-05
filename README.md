# dotfiles

Public, portable configuration for Pi, Hermes, Neovim, Zed, Ghostty, tmux, and related tools. My private Nix repository consumes this repository as a pinned source for Home Manager and NixOS deployment.

## Layout

- `AGENTS.md` — shared Pi/Codex behavior, including the ADHD-friendly output format and OptMem workflow.
- `hermes/AGENTS.md` — separate conversational and durable-memory instructions for Hermes.
- `pi/` — Pi settings, extensions, and theme.
- `nvim/` — Neovim configuration, pinned plugin versions, and validation script.
- `zed/` — Zed editor settings, JetBrains keymap selection, extensions, fonts, and Workstation theme.
- `ghostty/` — Ghostty terminal settings and Workstation theme.
- `tmux/` — terminal multiplexer settings.
- `btop/` — btop display settings.

Host-specific instructions, machine policy, credentials, and generated runtime state do not belong here.

## Neovim checks

```sh
cd nvim
./scripts/check.sh
```

The configuration files are copied from the active workstation so themes,
fonts, keybindings, extensions, and editor behavior remain reviewable in one
source tree. Runtime caches, credentials, and downloaded plugin data stay out
of the repository.
