# dotfiles

Public, portable configuration for Pi, Hermes, Neovim, Zed, Ghostty, tmux, and related tools. My private Nix repository consumes this repository as a pinned source for Home Manager and NixOS deployment.

## Layout

- `AGENTS.md` — shared Pi/Codex behavior, including the ADHD-friendly output format and OptMem workflow.
- `hermes/SOUL.md` — Hermes primary identity (SOUL.md): conversation role, response policy, OptMem.
- `pi/` — Pi settings, extensions, and theme.
- `nvim/` — Neovim configuration and pinned plugin versions.
- `zed/` — Zed editor settings, JetBrains keymap selection, extensions, fonts, and Workstation theme.
- `ghostty/` — Ghostty terminal settings and Workstation theme.
- `tmux/` — terminal multiplexer settings.
- `btop/` — btop display settings.
- `prime/` — Prime settings, extensions, and theme.

Host-specific instructions, machine policy, credentials, and generated runtime state do not belong here.


## Terminal editing

Neovim uses hybrid line numbers: the current line is absolute and surrounding
lines are relative for count-based jumps. tmux leaves raw Ctrl keys to Neovim
and the shell; press `Ctrl+B` first for tmux actions. Use `Ctrl+B`, then `H`
(or `|`) for a side-by-side split, `V` (or `-`) for a stacked split,
`h/j/k/l` to move between panes, and `1` through `9` to select windows.
Press `Ctrl+B` twice to send a literal `Ctrl+B` to the application.

The configuration files are copied from the active workstation so themes,
fonts, keybindings, extensions, and editor behavior remain reviewable in one
source tree. Runtime caches, credentials, and downloaded plugin data stay out
of the repository.
