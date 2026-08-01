import assert from "node:assert/strict";
import test from "node:test";
import {
  formatRateLimitWindow,
  formatUsagePayload,
} from "../extensions/status/index.ts";

test("formats remaining allowance and reset time", () => {
  const output = formatRateLimitWindow("Codex", {
    used_percent: 7,
    limit_window_seconds: 604_800,
    reset_after_seconds: 60,
  });

  assert.match(output, /^Codex \(7d\): 93% left, 7% used/);
  assert.match(output, /resets in 1m$/);
});

test("formats plan, primary window, and credits", () => {
  const lines = formatUsagePayload({
    plan_type: "plus",
    rate_limit: {
      primary_window: {
        used_percent: 6,
        limit_window_seconds: 604_800,
        reset_after_seconds: 600,
      },
    },
    credits: { has_credits: true, balance: "12" },
  });

  assert.equal(lines[0], "ChatGPT plan: Plus");
  assert.match(lines[1] ?? "", /94% left/);
  assert.equal(lines.at(-1), "Credits: 12");
});
