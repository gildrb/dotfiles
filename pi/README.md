# Pi configuration

This directory contains the portable Pi configuration consumed by Home
<<<<<<< HEAD
Manager. It keeps the settings, extensions, prompts, theme, and bundled agent
skills that are part of the workstation setup; runtime state and installed
package caches remain outside the repository.

The settings intentionally omit a fixed model and model allowlist. Pi keeps
its selected provider/model in the writable runtime settings file, so new
sessions reuse the last selection while all authenticated models—including
`openai-codex/gpt-5.6-luna`—remain available.

## Message steering

`steeringMode` is set to `"all"` in `settings.json`. While Pi is working,
press Enter to queue a steering message; it is injected after the current
tool-call turn. Use Alt+Enter for a follow-up after the agent finishes all
work.
