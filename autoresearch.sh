#!/usr/bin/env bash
# Metric: o200k_base tokens of AGENTS.md. Fails if any required rule is missing,
# so compression cannot delete information. Deterministic: fixed rules, cached
# tokenizer, no network.
set -euo pipefail
cd "$(dirname "$0")"
f=AGENTS.md
[[ -r $f ]] || { echo "missing $f" >&2; exit 1; }

rules=(
  'unsafe' 'parallel'
  'PROOF\.bend'
  'oxlint' 'tsc --noEmit' 'interface' 'tagged union' '_: never'
  'tests unless' 'user changes' 'infer API'
  'swallowed errors' 'truthiness' 'float equality' 'escape hatch'
  'null/absent/empty/zero/false' 'atomicity' 'injection' 'bounds' 'timezones'
  'reuse before abstract' 'weaken' 'unverified'
  'reader need' 'needs? to act' 'License' 'Install' 'Components' 'Limitations' 'Credits'
  'i-have-adhd' 'count (the )?tokens' 'separator'
  'Nushell' 'herdr' 'with-env' '2>/dev/null'
  'memo wake' '280' 'never edit' 'recall' 'zoom' 'subagent' 'run memo'
)
fail=0
for pat in "${rules[@]}"; do
  grep -qiE -- "$pat" "$f" || { echo "missing required rule: $pat" >&2; fail=1; }
done
(( fail )) && exit 1

python3 - <<'PY'
import tiktoken
text = open("AGENTS.md", encoding="utf-8").read()
tokens = len(tiktoken.get_encoding("o200k_base").encode(text))
print(f"METRIC tokens={tokens}")
print(f"METRIC bytes={len(text.encode())}")
PY
