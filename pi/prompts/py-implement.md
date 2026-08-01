---
description: Implement a Python change using local conventions and focused checks
argument-hint: "<task>"
---
Implement this Python task: $ARGUMENTS

Workflow:
1. Read the relevant project files before editing.
2. Follow existing architecture and naming; prefer readable, typed code.
3. Keep behavior changes intentional and minimal.
4. Add or update focused tests when behavior changes.
5. Run the narrowest relevant `uv run ruff check`, `uv run basedpyright`, and `uv run pytest --cov` checks.
6. Report files changed, checks run, and any limitations.
