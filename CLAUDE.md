# Dotfiles architecture

This repository is the public source of truth for portable user configuration. Keep machine identity, host hardware, private infrastructure, secrets, and host-specific agent instructions out of it.

## Source of truth

- `AGENTS.md` defines the default behavior and response format for agents. The Nix configuration deploys it as both the Pi agent context and Codex context.
- `pi/` contains the Pi package metadata, settings, extensions, prompts, themes, and tests.
- Future application configurations belong in their own top-level directory, such as `nvim/`, with a focused README and validation.

## Nix integration

The private `gildrb/nix` repository is the system-config consumer. Its flake pins this repository as the `dotfiles` input and maps portable files into Home Manager. On macOS, `~/dotfiles` is the writable development checkout; Linux hosts use the locked flake input.

The Nix repository owns host policy, private agent instructions, and any private vendor payloads. This repository must not require those files to build or deploy its portable configuration.

## Change flow

1. Edit the relevant file here.
2. Run the focused checks from the owning directory (`cd pi && npm run check && npm test && npm run format:check` for Pi changes).
3. Update the locked `dotfiles` input in `gildrb/nix` when a deployed revision changes.
4. Apply the Nix configuration only after the public checkout and lockfile agree.
