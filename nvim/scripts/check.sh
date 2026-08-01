#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")/.." && pwd)"
config_parent="$(dirname -- "$repo_root")"
app_name="$(basename -- "$repo_root")"

while IFS= read -r lua_file; do
  nvim --headless --clean \
    "+lua assert(loadfile([[${lua_file}]]))" \
    +qa
done < <(find "$repo_root" -type f -name '*.lua' -not -path '*/.git/*' | sort)

XDG_CONFIG_HOME="$config_parent" NVIM_APPNAME="$app_name" \
  nvim --headless \
    "+lua assert(vim.g.colors_name == 'death-note')" \
    "+lua local names = vim.tbl_keys(require('lazy.core.config').plugins); require('lazy').load({ plugins = names, wait = true }); vim.wait(100)" \
    "+luafile $repo_root/scripts/check-theme.lua" \
    +qa

printf 'Neovim configuration checks passed.\n'
