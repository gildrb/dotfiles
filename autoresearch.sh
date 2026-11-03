#!/usr/bin/env bash
# Metric: o200k_base tokens of AGENTS.md, minimized under two gates:
# 1. every required rule survives (grep list below);
# 2. function: a fixed local model (qwen3.8-27b @ 127.0.0.1:18020, temp 0)
#    writes Rust/TypeScript and answers OptMem probes with and without the
#    file; the with-file output must pass every mechanical check and beat
#    the without-file output. Deterministic prompts, greedy decoding.
set -euo pipefail
cd "$(dirname "$0")"
f=AGENTS.md
[[ -r $f ]] || { echo "missing $f" >&2; exit 1; }

rules=(
  'unsafe' 'parallel' 'cohesion' 'strong typing'
  'rust' 'typescript' 'bend'
  'skills/bend|bend skill' 'PROOF\.bend'
  'unwrap' 'newtype' 'clippy' 'cargo fmt'
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
import json, pathlib, re, subprocess, sys, tempfile, urllib.request

text = pathlib.Path("AGENTS.md").read_text()
key = open("/mnt/ssd/storage/ai/qwen3.8-27b/api-key").read().strip()
url = "http://127.0.0.1:18020/v1/chat/completions"

def ask(task, with_rules, budget=3000):
    msgs = []
    if with_rules:
        msgs.append({"role": "user", "content": text + "\n\nFollow these rules exactly."})
    msgs.append({"role": "user", "content": task})
    body = json.dumps({"model": "qwen3.8-27b", "temperature": 0, "max_tokens": budget,
                       "chat_template_kwargs": {"enable_thinking": False},
                       "messages": msgs}).encode()
    req = urllib.request.Request(url, body, {"Authorization": "Bearer " + key,
                                             "Content-Type": "application/json"})
    out = json.load(urllib.request.urlopen(req, timeout=120))
    return out["choices"][0]["message"].get("content") or ""

def code_of(reply):
    m = re.search(r"```[a-z]*\n(.*)```", reply, re.S)
    return (m.group(1) if m else reply).strip()

def gen(task, with_rules):
    raw = ask(task, with_rules)
    code = code_of(raw)
    fd, path = tempfile.mkstemp(suffix=".rs" if "rust" in task else ".ts")
    pathlib.Path(path).write_text(code)
    return raw, path

rust_task = "Write a Rust function named `parse_port` that takes a &str and parses a TCP port number from it. Single file, no main, no tests, no explanations - code only."
ts_task = "Write a TypeScript function `opposite(direction: Direction)` that returns the opposite of 'up' | 'down' | 'left' | 'right'. Define Direction yourself and use a switch statement. Code only."
wake_task = "Your session just started. What do you run first? Answer with the command only."
note_task = 'Your instructions say learnings are recorded as memo note "<1 line, <=280 bytes>". You just learned the deploy key rotates weekly. What exactly do you run? Answer with the command only.'

def score(code, lang, raw):
    checks = {}
    checks["no_unsafe"] = "unsafe" not in code
    checks["no_unwrap"] = not re.search(r"\.unwrap\(\)|\.expect\(|panic!\(", code)
    if lang == "rust":
        checks["result_or_option"] = bool(re.search(r"\b(Result|Option)\b", code))
        with tempfile.NamedTemporaryFile("w", suffix=".rs", delete=False) as fh:
            fh.write(code); path = fh.name
        checks["compiles"] = subprocess.run(
            ["rustc", "--edition", "2021", "--crate-type", "lib", path, "-o", path + ".rlib"],
            capture_output=True).returncode == 0
    else:
        checks["no_any"] = not re.search(r"\bany\b", code)
        checks["no_as_cast"] = not re.search(r"\bas\s+[A-Za-z]", code)
        checks["no_interface"] = "interface" not in code
        checks["exhaustive_never"] = bool(re.search(r"\bnever\b", code)) and bool(re.search(r"\btype\s+Direction\b", code))
    return checks

with_rust_raw, with_rust = gen(rust_task, True)
with_ts_raw, with_ts = gen(ts_task, True)
with_rust_c = score(open(with_rust).read(), "rust", with_rust_raw)
with_ts_c = score(open(with_ts).read(), "ts", with_ts_raw)
with_mem = {"wake": "memo wake" in ask(wake_task, True, budget=700),
            "note": "memo note" in ask(note_task, True, budget=700)}

without_rust_raw, without_rust = gen(rust_task, False)
without_ts_raw, without_ts = gen(ts_task, False)
without_rust_c = score(open(without_rust).read(), "rust", without_rust_raw)
without_ts_c = score(open(without_ts).read(), "ts", without_ts_raw)
without_mem = {"wake": "memo wake" in ask(wake_task, False, budget=700),
               "note": "memo note" in ask(note_task, False, budget=700)}

with_all = list(with_rust_c.values()) + list(with_ts_c.values()) + list(with_mem.values())
without_all = list(without_rust_c.values()) + list(without_ts_c.values()) + list(without_mem.values())
with_score, without_score = sum(with_all), sum(without_all)
max_score = len(with_all)
delta = with_score - without_score

print(f"with checks: {with_rust_c} {with_ts_c} {with_mem}", file=sys.stderr)
print(f"without checks: {without_rust_c} {without_ts_c} {without_mem}", file=sys.stderr)
print(f"METRIC functional_with={with_score}")
print(f"METRIC functional_without={without_score}")
print(f"METRIC behavior_delta={delta}")

ok = with_score == max_score and with_mem["wake"] and with_mem["note"] and delta >= 2
if not ok:
    print("functional gate failed: with-file output must pass every check, call memo, and beat the no-rules baseline by >= 2", file=sys.stderr)
    sys.exit(1)

import tiktoken
print(f"METRIC tokens={len(tiktoken.get_encoding('o200k_base').encode(text))}")
print(f"METRIC bytes={len(text.encode())}")
PY
