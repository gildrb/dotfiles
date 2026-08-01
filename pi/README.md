# Pi configuration

This directory contains the portable Pi configuration consumed by Home
Manager. It keeps the settings, extensions, and theme that are part of the
workstation setup; runtime state and installed package caches remain outside
the repository.

## Message steering

`steeringMode` is set to `"all"` in `settings.json`. While Pi is working,
press Enter to queue a steering message; it is injected after the current
tool-call turn. Use Alt+Enter for a follow-up after the agent finishes all
work.
