import assert from "node:assert/strict";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
const dotfilesRoot = join(repositoryRoot, "..");

test("runtime extension tree contains no test modules", async () => {
  const entries = await readdir(join(repositoryRoot, "extensions"), {
    recursive: true,
  });

  assert.deepEqual(
    entries.filter((entry) => entry.endsWith(".test.ts")),
    [],
  );
});

test("runtime, settings, and update command use the same Pi version", async () => {
  const packageJson = JSON.parse(
    await readFile(join(repositoryRoot, "package.json"), "utf8"),
  ) as {
    dependencies: Record<string, string>;
  };
  const settings = JSON.parse(
    await readFile(join(repositoryRoot, "settings.json"), "utf8"),
  ) as {
    lastChangelogVersion: string;
    theme: string;
    defaultProvider: string;
    defaultModel: string;
    enabledModels: string[];
    packages: string[];
    skills: string[];
    steeringMode: string;
    followUpMode: string;
  };
  const updateExtension = await readFile(
    join(repositoryRoot, "extensions", "update", "index.ts"),
    "utf8",
  );
  const version = packageJson.dependencies["@earendil-works/pi-coding-agent"];

  assert.equal(version, "0.82.1");
  assert.equal(settings.lastChangelogVersion, version);
  assert.match(updateExtension, new RegExp(`PINNED_VERSION = "${version}"`));
  assert.equal(settings.defaultProvider, "openai-codex");
  assert.ok(
    settings.enabledModels.includes(`openai-codex/${settings.defaultModel}`),
  );
  assert.equal(settings.steeringMode, "all");
  assert.equal(settings.followUpMode, "all");
  assert.deepEqual(settings.skills, ["~/.codex/skills"]);
  assert.equal(settings.theme, "death-note");
  assert.ok(settings.packages.includes("npm:@ff-labs/pi-fff@0.6.0"));
  assert.ok(settings.packages.includes("npm:pi-lens"));
  assert.ok(
    settings.packages
      .filter((source) => source.startsWith("git:"))
      .every((source) => /@[0-9a-f]{40}$/.test(source)),
  );
});

test("shared agent instructions stay short and portable", async () => {
  const instructions = await readFile(join(dotfilesRoot, "AGENTS.md"), "utf8");
  assert.ok(instructions.trim().split(/\s+/).length < 1000);
  assert.match(instructions, /i-have-adhd/);
  assert.match(instructions, /memo wake/);
  assert.doesNotMatch(instructions, /hephaistos|Tailscale|NixOS/);
});
