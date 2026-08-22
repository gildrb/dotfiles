---
description: Run a focused Python closeout after code edits
argument-hint: "[paths/tests]"
---
Close out the Python changes for: $ARGUMENTS

1. Inspect the changed files and identify the smallest relevant validation set.
2. Run focused checks only:
   - `uv run ruff check <paths>`
   - `uv run basedpyright <paths>`
   - `uv run pytest <tests> --cov=<package>` when tests are relevant
3. Fix actionable issues without broad rewrites.
4. Summarize the exact checks run and remaining risks, if any.
