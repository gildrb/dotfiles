# dotfiles

## Neovim

Leader: `Space`. The current line is absolute; surrounding line numbers are relative.

### Movement and editing

| Key | Action |
| --- | --- |
| `{count}j` / `k` | Jump down / up by a displayed relative line count |
| `Ctrl+F` / `Ctrl+B` | Page down / up; inside Herdr use `Ctrl+B Ctrl+B` for page up |
| `Ctrl+h/j/k/l` | Focus left/down/up/right editor window |
| `Alt+j/k` | Move the current line or visual selection down/up |
| `<` / `>` in visual mode | Indent and keep the selection |
| `Esc` | Clear search highlighting |
| `Space w` | Save |
| `Space q` / `Q` | Close window / quit Neovim |
| `Space bd` | Delete buffer |
| `Esc Esc` in terminal mode | Return to normal mode |

### Files and search

| Key | Action |
| --- | --- |
| `Ctrl+n` / `Space e` | Toggle file tree / reveal current file |
| `Space ff` / `fg` | Find files / live grep |
| `Space fb` / `fr` | Buffers / recent files |
| `Space fh` / `fk` / `fc` | Help / keymaps / commands |
| `Space /` | Search current buffer |
| `Space gc` / `gs` | Git commits / status |

### Code and diagnostics

| Key | Action |
| --- | --- |
| `gd` / `gr` / `gI` | Definition / references / implementations |
| `K` | Hover documentation |
| `Space ca` / `cr` / `cf` | Code action / rename / format |
| `Space cd` | Diagnostics for the current line |
| `[d` / `]d` | Previous / next diagnostic |
| `Space xx` / `xX` | All / current-buffer diagnostics |
| `Space cs` / `cl` | Symbols / LSP references |
| `[h` / `]h` | Previous / next Git hunk |
| `Space hp` / `hs` / `hr` / `hb` | Preview / stage / reset / blame Git hunk |

Empty start screen: `f` files, `n` new file, `g` grep, `r` recent, `l` plugins, `q` quit.

## Herdr

Prefix: `Ctrl+B`. Press it, release it, then press the action key. Host sessions are `macOS` on the MacBook and `NixOS` on the PC.

Close the current workspace: `Ctrl+B q`. Confirm with `y`.

A **workspace** is a project inside Herdr. A named **session** is a whole Herdr server; start one with `herdr --session notes`.

Open the agent list with `Ctrl+B s`, then `j`/`k`. From a pane, `Ctrl+B ,` / `.` jumps previous / next agent.

| Key | Action |
| --- | --- |
| `Ctrl+B a` | New workspace |
| `Ctrl+B u` / `i` | Previous / next workspace |
| `Ctrl+B s` | Workspace / agent picker |
| `Ctrl+B ,` / `.` | Previous / next agent |
| `Ctrl+B Alt+1–9` | Jump to agent 1–9 |
| `Ctrl+B q` | Close current workspace |
| `Ctrl+B c` | New tab |
| `Ctrl+B r` | Rename tab |
| `Ctrl+B 1–9` | Jump to tab |
| `Ctrl+B n` / `p` | Next / previous tab |
| `Ctrl+B H` or `\|` | Split side by side |
| `Ctrl+B V` or `-` | Split top and bottom |
| `Ctrl+B h/j/k/l` | Focus left/down/up/right pane |
| `Ctrl+B o` / `y` | Cycle panes |
| `Ctrl+B x` | Close pane. If it is the last pane in the last tab, Herdr also closes that window. |
| `Ctrl+B d` | Detach and leave the session running |
| `Ctrl+B ?` | Show every active binding |

## Theme

`theme/death-note.json` is the app-neutral source of truth. Each app config is
an adapter for the roles its theme model supports:

| Syntax role | Color |
| --- | --- |
| Keywords and operators | Red `#fe598f` |
| Strings | Green `#10c955` |
| Functions and constructors | Purple `#c674f9` |
| Variables, properties, and constants | Blue `#5fa5ff` |
| Types and modules | Turquoise `#52f0db` |
| Numbers, booleans, and parameters | Orange `#ffb200` |
| Comments | Gray `#a0a0a0` |
| Default text and punctuation | White `#ededed` |

All syntax colors preserve at least 4.5:1 contrast against the ink, panel, and
code-selection surfaces. Controls that force a paper foreground can use the
stronger crimson fill. Terminal-only tools such as Hax and Nushell consume the matching ANSI table. Bat
uses the semantic roles directly; Delta disables its divergent bundled syntax
palette and uses the shared diff surfaces. htop uses its accessible Nord role map because it cannot load custom RGB colors.

## Files

```text
dotfiles/
  AGENTS.md       shared Pi/Codex behavior and OptMem workflow
  bat/             syntax viewer using the shared semantic palette
  btop/           terminal system monitor
  ghostty/        terminal settings and Death Note ANSI theme
  hax/            coding-agent presets consuming the shared ANSI roles
  htop/           process monitor using the terminal Death Note palette
  hunk/           diff viewer using the shared syntax and UI roles
  hermes/         Hermes identity and Death Note skin
  herdr/          agent multiplexer settings and Death Note palette
  nvim/           editor configuration and pinned plugins
  optmem/         persistent agent-memory command
  omp/            Oh My Pi settings, Pi-compatible keys, and Death Note theme
  pi/             Pi settings, extensions, prompts, and theme
  prime/          Prime settings, extensions, tests, and theme
  theme/          app-neutral Death Note palette and semantic roles
  vorssaint/      menubar toolkit preferences (defaults domain plist)
  zed/            editor settings, extensions, and themes
```
