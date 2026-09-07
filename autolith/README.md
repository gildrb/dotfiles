# Autolith Death Note

Install `init.lisp` as `${XDG_CONFIG_HOME:-~/.config}/autolith/init.lisp`.
If that file already has local settings, load this file from it instead of
replacing those settings. Restart Autolith to apply it.

Use the shared Death Note terminal palette (`../ghostty/themes/Death Note`).
Autolith renders basic or indexed ANSI colors, not RGB. These styles therefore
reuse the terminal palette rather than duplicate approximate hex colors:
black `#09090b`, white `#ededed`, red `#ff6a6e`, bright red `#fe598f`,
blue `#5fa5ff`, green `#10c955`, yellow `#ffb200`, bright black `#9a9a9a`.
A different terminal palette produces different colors. Color-disabled output
still follows Autolith's own renderer.

The init changes brand and recovery gradients, keyword and heading accents,
child names, and status/compaction styles. Other semantic roles retain upstream
defaults, which already use the terminal palette. Reloading replaces existing
entries; it does not add duplicate styles.

## Local Qwen

`qwen.lisp` registers Hermes' local Qwen provider: `qwen-local` at
`http://127.0.0.1:18020/v1`, model `qwen3.8-27b`, 65536-token window.
Home Manager concatenates it only on the NixOS computer host and sets
`AUTOLITH_MODEL=qwen3.8-27b` there. Mac and other hosts keep the theme and
package, without this provider. Authenticate once on that host with
`autolith auth qwen-local`; Autolith keeps the key in its private store.
This file does not store credentials.

## Upstream contract

Checked against Autolith 0.48.0, commit
`464b65ab46650bb26d52de0af64126fbf7070ebc`:

- `docs/guide.org`, “Configure Autolith”, documents `init.lisp` as ordinary
  Common Lisp evaluated in package `AUTOLITH`, including reconnect reloads.
- `docs/guide.org`, “Providers”, documents `register-openai-compatible-provider`
  with `:endpoint`, `:models-endpoint`, and static `:models`.
- `src/configuration/settings.lisp`, `configuration-user-init-path`, resolves
  the filename under the configuration root. `AUTOLITH_MODEL` selects the model
  before init loads; unknown registered models are accepted when startup defers
  provider validation.
- `src/terminal/style.lisp` defines `*terminal-style-table*` as an association
  list of Colorist `make-style` objects. `terminal-style-sequence` renders these
  at `:basic` or `:indexed` color level.

There is no documented named-theme API. This init uses the internal style table;
check that contract when upgrading Autolith. It does not replace the renderer.
