---
description: Review Python changes for correctness, typing, tests, and maintainability
argument-hint: "[scope]"
---
Review the Python changes in scope: $ARGUMENTS

Focus on:
- correctness and edge cases
- type-safety and basedpyright issues
- ruff/style problems that affect readability
- test coverage gaps and brittle tests
- hidden I/O, global state, broad exceptions, mutable defaults
- security-sensitive subprocess, file, network, and secret handling

Prefer small targeted fixes. Verify findings against the real code before changing anything.
