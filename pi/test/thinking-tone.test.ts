import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { flattenThinking } from "../extensions/thinking-tone/flatten.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

test("strips headings, emphasis, and inline code", () => {
  const out = flattenThinking(
    "# Title\n\nSee **bold** and *italic* plus `remote_command`.",
  );
  assert.equal(out.includes("# "), false);
  assert.equal(out.includes("**"), false);
  assert.equal(out.includes("`"), false);
  assert.match(out, /Title/);
  assert.match(out, /bold/);
  assert.match(out, /remote_command/);
});

test("unwraps fenced and indented code so it cannot paint as output", () => {
  const out = flattenThinking(
    "before\n```ts\nconst paper = '#e8e8e8'\n```\n    indented()\n",
  );
  assert.equal(out.includes("```"), false);
  assert.match(out, /const paper/);
  assert.match(out, /indented\(\)/);
  assert.equal(/^ {4}/m.test(out), false);
});

test("keeps streaming unclosed fences as plain text", () => {
  const out = flattenThinking("```python\nprint('hi')");
  assert.equal(out.includes("```"), false);
  assert.match(out, /print\('hi'\)/);
});

test("neutralizes lists, quotes, and tables", () => {
  const out = flattenThinking(
    [
      "- item one",
      "1. item two",
      "> quoted",
      "| col | val |",
      "| --- | --- |",
      "| a | b |",
    ].join("\n"),
  );
  assert.equal(out.includes("|"), false);
  assert.match(out, /item one/);
  assert.match(out, /quoted/);
  assert.match(out, /col {2}val/);
  assert.doesNotMatch(out, /^[-*+] /m);
  assert.doesNotMatch(out, /^\d+\. /m);
  assert.doesNotMatch(out, /^>/m);
});

test("only assistant output tokens stay paper", () => {
  const theme = JSON.parse(
    readFileSync(join(root, "themes/death-note.json"), "utf8"),
  ) as {
    colors: Record<string, string>;
  };
  assert.equal(theme.colors.text, "paper");
  assert.equal(theme.colors.userMessageText, "paper");
  assert.equal(theme.colors.thinkingText, "comment");
  assert.equal(theme.colors.toolOutput, "comment");
  assert.equal(theme.colors.toolTitle, "redBright");
  assert.notEqual(theme.colors.thinkingText, "paper");
  assert.notEqual(theme.colors.toolOutput, "paper");
  assert.notEqual(theme.colors.mdQuote, "paper");
});
