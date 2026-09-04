import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import primeFff from "../extensions/prime-fff.ts";

const here = dirname(fileURLToPath(import.meta.url));
const settings = JSON.parse(
	readFileSync(join(here, "../settings.json"), "utf8"),
) as Record<string, unknown>;

assert.equal(settings.packages, undefined, "live settings do not ask Prime to install packages");
assert.equal(settings.npmCommand, undefined, "live settings do not carry package-manager policy");
assert.equal(typeof primeFff, "function", "adapter default-exports a loader");
