# dotfiles

Public, portable configuration for Pi and related developer tools. The private [`gildrb/nix`](https://github.com/gildrb/nix) repository consumes this repository as a pinned source for Home Manager deployment.

## Layout

- `AGENTS.md` — shared agent behavior, including the default ADHD-friendly output format and OptMem workflow.
- `CLAUDE.md` — architecture map and source-of-truth boundaries.
- `pi/` — Pi settings, extensions, prompts, themes, and focused TypeScript tests.

Host-specific instructions, machine policy, credentials, and generated runtime state do not belong here.

## Pi checks

```sh
cd pi
npm install
npm run check
npm test
npm run format:check
```
