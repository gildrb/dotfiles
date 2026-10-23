## Anki gamepad

Add-on `anki/gamepad`. Any controller macOS sees (8BitDo, Switch Pro, Xbox, DualSense). Acts only while the Anki main window is active. Buttons send Anki shortcuts per screen; edit `anki/gamepad/config.json`. Button names are the printed labels: `buttonA` = A.

| Button | Decks / Overview | Question | Answer |
| --- | --- | --- | --- |
| `A` | Study | Show answer | Easy |
| `B` | | Show answer | Good |
| `X` | | Show answer | Hard |
| `Y` | | Show answer | Again |
| D-pad left / down / right / up | | Show answer | Again / Hard / Good / Easy |
| `L` | | Replay audio | Replay audio |
| `R` | Undo | Undo | Undo |
| `+` | Study | | |
| `−` | Decks (Overview) | Decks | Decks |

## AeroSpace

Modifier: `Ctrl+Cmd`. Default layout: accordion. Windows stack at full size; new windows and tabs do not resize other windows. Finder and System Settings float.

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `h` / `l` | Previous / next window (wide screen) | `k` / `j` | Previous / next window (tall screen) |
| `Shift+h/j/k/l` | Move window left / down / up / right | `x` | Close window |
| `\` / `-` | Tiles side by side / top and bottom | `,` | Accordion; again: toggle direction |
| `=` | Equal sizes | `r`, then `h/l/j/k`, `Esc` | Resize mode |
| `f` | Fullscreen | `t` | Float / tile window |
| `1–9` | Workspace 1–9 | `Shift+1–9` | Move window to workspace 1–9 |
| `u` / `i` | Previous / next workspace | `Tab` | Last workspace |
| `o` | Next monitor | `Shift+o` | Move window to next monitor |
| `Shift+c` | Reload config | `Cmd+Tab` (macOS, no `Ctrl`) | Raise app window |

## Herdr

Prefix: `Ctrl+B`, then the key below. `Ctrl+B Ctrl+B` sends `Ctrl+B` to the pane.

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `a` | New workspace | `q`, then `y` | Close workspace |
| `u` / `i` | Previous / next workspace | `s` | Workspace / agent picker |
| `,` / `.` | Previous / next agent | `Alt+1–9` | Focus agent 1–9 |
| `c` / `r` | New / rename tab | `1–9` | Focus tab 1–9 |
| `p` / `n` | Previous / next tab | `g` | Go to |
| `H` / `\|` | Split side by side | `V` / `-` | Split top / bottom |
| `h/j/k/l` | Focus left / down / up / right pane | `o` / `y` | Cycle panes |
| `x` | Close pane | `R` | Resize mode |
| `S` | Settings | `C` | Reload config |
| `d` | Detach | `?` | Active bindings |
| `j` / `k` (picker, no prefix) | Next / previous workspace | `h/n/p/l` (picker, no prefix) | Left / down / up / right pane |

## Neovim

Leader: `Space`.

- Files save by themselves: after each change, when you leave a file, and when Neovim loses focus. Explicit saves (`Ctrl+S`, `Space w`, `:w`) also format the file.
- Autosave does not recreate a file that was renamed or deleted outside Neovim. `:w` writes it again on purpose.
- `:'<,'>w` fails with `E140`. It does not overwrite the file with the selection.
- To rename, create, or delete files: press `-`, edit the names in the folder buffer, then save. Open buffers follow the rename.
- `nvim .` restores the last session of this folder. `nvim <folder>` opens the file finder. `nvim` shows the start menu.
- File finder and text search: [fff](https://github.com/dmtrKovalenko/fff). Lazy builds it from source with `cargo`, about 5 minutes on first install.

| Key | Action | Key | Action |
| --- | --- | --- | --- |
| `{count}j` / `{count}k` | Down / up by line count | `Ctrl+F` / `Ctrl+B` | Page down / up |
| `Ctrl+h/j/k/l` | Focus left / down / up / right window | `Alt+j/k` | Move line / selection down / up |
| `<` / `>` (visual) | Indent; retain selection | `Esc` | Clear search highlighting |
| `Ctrl+S` / `Space w` | Save and format | `Space q` / `Space Q` | Close window / quit Neovim |
| `Space bd` | Delete buffer | `Esc Esc` (terminal) | Normal mode |
| `-` / `Space e` | Folder of this file (oil) | `Space ff` / `Space Space` / `Space fg` | Find files / find files / find text |
| `Space fw` | Find word or selection | | |
| `Space fb` / `Space fr` | Buffers / recent files | `Space /` | Search current buffer |
| `Space fh` / `Space fk` / `Space fc` | Help / keymaps / commands | `Space gc` / `Space gs` | Git commits / status |
| `gd` / `gr` / `gI` | Definition / references / implementations | `K` | Hover documentation |
| `Space ca` / `Space cr` / `Space cf` | Code action / rename / format | `Space cd` | Line diagnostics |
| `[d` / `]d` | Previous / next diagnostic | `Space xx` / `Space xX` | All / buffer diagnostics |
| `Space cs` / `Space cl` | Symbols / LSP references | `[h` / `]h` | Previous / next Git hunk |
| `Space hp` / `Space hs` | Preview / stage Git hunk | `Space hr` / `Space hb` | Reset / blame Git hunk |
| `f` / `n` / `e` / `g` (start menu) | Find file / new file / folder / find text | `r` / `l` / `q` (start menu) | Recent / plugins / quit |

## Theme

Amber: amber on black, orange line numbers, cyan on navy selection. Source: `theme/amber.json`. Every app theme in this repository uses its colors.

| Role | Color | APCA Lc on black |
| --- | --- | --- |
| Text | `#ffc757` | 78 |
| Headings, functions | `#ffe0a7` / `#ffdc96` | 90 / 88 |
| Strings | `#fbda44` | 85 |
| Keywords (bold), types | `#ffc091` / `#ffbf72` | 76 / 75 |
| Punctuation, borders | `#ffa914` | 66 |
| Comments, muted text, thinking | `#faa003` | 62 |
| Line numbers | `#ff7b25` | 52 |
| Selection | cyan `#60e3e2` on navy `#000066` | 76 |
| Error / warning / success | `#ff9381` / `#fade01` / `#05d83d` | 60 / 87 / 66 |
| Cursor (Ghostty) | green `#05d83d` | 66 |
