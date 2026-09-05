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

## Upstream contract

Checked against Autolith 0.46.1, commit
`d7073fd4c8c5815aa60c8c16796352f5d31a0bd4`:

- `docs/guide.org`, “Configure Autolith”, documents `init.lisp` as ordinary
  Common Lisp evaluated in package `AUTOLITH`, including reconnect reloads.
- `src/configuration/settings.lisp`, `configuration-user-init-path`, resolves
  the filename under the configuration root.
- `src/terminal/style.lisp` defines `*terminal-style-table*` as an association
  list of Colorist `make-style` objects. `terminal-style-sequence` renders these
  at `:basic` or `:indexed` color level.

There is no documented named-theme API. This init uses the internal style table;
check that contract when upgrading Autolith. It does not replace the renderer,
change provider settings, or store credentials.
