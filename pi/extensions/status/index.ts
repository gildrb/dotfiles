import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { readStoredCredential } from "@earendil-works/pi-coding-agent";

const USAGE_URL = "https://chatgpt.com/backend-api/wham/usage";

export type RateLimitWindow = {
  used_percent?: number;
  limit_window_seconds?: number;
  reset_after_seconds?: number;
  reset_at?: number;
};

type RateLimit = {
  allowed?: boolean;
  limit_reached?: boolean;
  primary_window?: RateLimitWindow | null;
  secondary_window?: RateLimitWindow | null;
};

type AdditionalRateLimit = {
  limit_name?: string;
  metered_feature?: string;
  rate_limit?: RateLimit | null;
};

export type UsagePayload = {
  plan_type?: string;
  rate_limit?: RateLimit | null;
  code_review_rate_limit?: RateLimit | null;
  additional_rate_limits?: AdditionalRateLimit[] | null;
  credits?: {
    has_credits?: boolean;
    unlimited?: boolean;
    balance?: string | number | null;
  } | null;
};

function numberOrUndefined(value: unknown) {
  return typeof value === "number" && Number.isFinite(value)
    ? value
    : undefined;
}

function titleCase(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatTokenCount(tokens: number) {
  return new Intl.NumberFormat(undefined, { maximumFractionDigits: 0 }).format(
    tokens,
  );
}

function formatWindowLength(seconds: number | undefined) {
  if (!seconds || seconds <= 0) return "window";
  if (seconds % 86_400 === 0) return `${seconds / 86_400}d`;
  if (seconds % 3_600 === 0) return `${seconds / 3_600}h`;
  return `${Math.round(seconds / 60)}m`;
}

function formatReset(window: RateLimitWindow) {
  const resetAt = numberOrUndefined(window.reset_at);
  if (resetAt) {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(resetAt * 1000));
  }

  const remaining = numberOrUndefined(window.reset_after_seconds);
  if (remaining === undefined) return "unknown";
  if (remaining < 60) return `in ${Math.max(0, Math.round(remaining))}s`;
  if (remaining < 3_600) return `in ${Math.round(remaining / 60)}m`;
  if (remaining < 86_400) return `in ${Math.round(remaining / 3_600)}h`;
  return `in ${Math.round(remaining / 86_400)}d`;
}

export function formatRateLimitWindow(label: string, window: RateLimitWindow) {
  const used = Math.min(
    100,
    Math.max(0, numberOrUndefined(window.used_percent) ?? 0),
  );
  const remaining = 100 - used;
  const duration = formatWindowLength(
    numberOrUndefined(window.limit_window_seconds),
  );
  return `${label} (${duration}): ${remaining}% left, ${used}% used · resets ${formatReset(window)}`;
}

function rateLimitLines(label: string, limit: RateLimit | null | undefined) {
  if (!limit) return [];

  const lines: string[] = [];
  if (limit.primary_window) {
    lines.push(formatRateLimitWindow(label, limit.primary_window));
  }
  if (limit.secondary_window) {
    lines.push(
      formatRateLimitWindow(`${label} secondary`, limit.secondary_window),
    );
  }
  if (limit.limit_reached) lines.push(`${label}: limit reached`);
  return lines;
}

export function formatUsagePayload(payload: UsagePayload) {
  const lines = [
    `ChatGPT plan: ${titleCase(payload.plan_type ?? "unknown")}`,
    ...rateLimitLines("Codex", payload.rate_limit),
    ...rateLimitLines("Code review", payload.code_review_rate_limit),
  ];

  for (const additional of payload.additional_rate_limits ?? []) {
    const label = titleCase(
      additional.limit_name ?? additional.metered_feature ?? "Additional",
    );
    lines.push(...rateLimitLines(label, additional.rate_limit));
  }

  if (payload.credits?.unlimited) {
    lines.push("Credits: unlimited");
  } else if (payload.credits?.has_credits) {
    lines.push(`Credits: ${payload.credits.balance ?? "available"}`);
  }

  return lines;
}

async function fetchUsage() {
  const credential = readStoredCredential("openai-codex");
  if (!credential || credential.type !== "oauth") {
    throw new Error("OpenAI Codex is not logged in. Run /login first.");
  }

  const accountId =
    typeof credential.accountId === "string" ? credential.accountId : undefined;
  const headers: Record<string, string> = {
    Authorization: `Bearer ${credential.access}`,
  };
  if (accountId) headers["ChatGPT-Account-Id"] = accountId;

  const response = await fetch(USAGE_URL, {
    headers,
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) {
    throw new Error(
      "The OpenAI Codex login has expired. Run /login and try /status again.",
    );
  }
  if (!response.ok) {
    throw new Error(
      `ChatGPT usage request failed with HTTP ${response.status}.`,
    );
  }
  return (await response.json()) as UsagePayload;
}

export default function status(pi: ExtensionAPI) {
  pi.registerCommand("status", {
    description:
      "Show the active model, context use, and live ChatGPT/Codex usage limits",
    handler: async (_args, ctx) => {
      const model = ctx.model;
      const context = ctx.getContextUsage();
      const lines = [
        `Model: ${model ? `${model.provider}/${model.id}` : "none"}`,
        `Thinking: ${model?.reasoning ? pi.getThinkingLevel() : "off"}`,
      ];

      if (context?.tokens != null && context.percent != null) {
        lines.push(
          `Context: ${formatTokenCount(context.tokens)} / ${formatTokenCount(context.contextWindow)} tokens (${context.percent.toFixed(1)}%)`,
        );
      }

      try {
        lines.push("", ...formatUsagePayload(await fetchUsage()));
        ctx.ui.notify(lines.join("\n"), "info");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        ctx.ui.notify(
          `${lines.join("\n")}\n\nUsage limits unavailable: ${message}`,
          "warning",
        );
      }
    },
  });
}
