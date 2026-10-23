import type {
  ExtensionAPI,
  ExtensionContext,
} from "@earendil-works/pi-coding-agent";

type ThinkingLevel =
  "off" | "minimal" | "low" | "medium" | "high" | "xhigh" | "max";

type FastTarget = {
  provider: string;
  model: string;
  thinking: ThinkingLevel;
};

const SERVICE_TIER = "priority";

const DEFAULT_TARGET: FastTarget = {
  provider: "openai-codex",
  model: "gpt-5.6-sol",
  thinking: "xhigh",
};

const THINKING_LEVELS = new Set<ThinkingLevel>([
  "off",
  "minimal",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
]);

const PRESETS: Record<string, Partial<FastTarget>> = {
  max: { model: "gpt-5.6-sol", thinking: "max" },
  xhigh: { model: "gpt-5.6-sol", thinking: "xhigh" },
  high: { model: "gpt-5.6-sol", thinking: "high" },
  "5.6": { model: "gpt-5.6-sol", thinking: "xhigh" },
  sol: { model: "gpt-5.6-sol", thinking: "xhigh" },
  terra: { model: "gpt-5.6-terra", thinking: "high" },
  luna: { model: "gpt-5.6-luna", thinking: "xhigh" },
  "5.5": { model: "gpt-5.5", thinking: "xhigh" },
  "5.4": { model: "gpt-5.4", thinking: "high" },
  mini: { model: "gpt-5.4-mini", thinking: "high" },
  spark: { model: "gpt-5.3-codex-spark", thinking: "high" },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isOpenAICodexResponsesPayload(
  payload: unknown,
): payload is Record<string, unknown> {
  if (!isRecord(payload)) return false;

  const model = payload.model;
  if (typeof model === "string" && model.includes("codex")) return true;

  // Pi's OpenAI Codex Responses payload has this shape. This catches Codex-provider
  // requests even when the selected model id is not codex-named, such as gpt-5.5.
  return (
    payload.stream === true &&
    typeof payload.instructions === "string" &&
    Array.isArray(payload.input) &&
    payload.tool_choice === "auto" &&
    "prompt_cache_key" in payload
  );
}

function isThinkingLevel(value: string): value is ThinkingLevel {
  return THINKING_LEVELS.has(value as ThinkingLevel);
}

function parseTarget(args: string): FastTarget {
  let target: FastTarget = { ...DEFAULT_TARGET };

  for (const rawToken of args.trim().split(/\s+/).filter(Boolean)) {
    const token = rawToken.toLowerCase();
    const preset = PRESETS[token];
    if (preset) {
      target = { ...target, ...preset };
      continue;
    }

    if (isThinkingLevel(token)) {
      target.thinking = token;
      continue;
    }

    if (rawToken.includes("/")) {
      const [provider, model] = rawToken.split("/", 2);
      if (provider && model) {
        target = { ...target, provider, model };
      }
      continue;
    }

    if (token.startsWith("gpt-")) {
      target.model = rawToken;
    }
  }

  return target;
}

function candidateTargets(target: FastTarget): FastTarget[] {
  const candidates = [target];

  if (target.provider === "openai-codex") {
    candidates.push({ ...target, provider: "github-copilot" });
  }

  return candidates;
}

function updateStatus(ctx: ExtensionContext, target?: FastTarget): void {
  if (!ctx.hasUI) return;
  if (!target) {
    ctx.ui.setStatus("fast", undefined);
    return;
  }
  ctx.ui.setStatus(
    "fast",
    `fast: ${target.provider}/${target.model}:${target.thinking} ${SERVICE_TIER}`,
  );
}

async function switchToFast(
  pi: ExtensionAPI,
  ctx: ExtensionContext,
  args: string,
): Promise<FastTarget | undefined> {
  const target = parseTarget(args);
  const failures: string[] = [];

  for (const candidate of candidateTargets(target)) {
    const model = ctx.modelRegistry.find(candidate.provider, candidate.model);
    if (!model) {
      failures.push(`${candidate.provider}/${candidate.model}: not found`);
      continue;
    }

    const selected = await pi.setModel(model);
    if (!selected) {
      failures.push(
        `${candidate.provider}/${candidate.model}: not authenticated`,
      );
      continue;
    }

    pi.setThinkingLevel(candidate.thinking);
    updateStatus(ctx, candidate);
    ctx.ui.notify(
      `Fast mode enabled: ${candidate.provider}/${candidate.model} with ${candidate.thinking} thinking and ${SERVICE_TIER} service tier. This may cost more.`,
      "info",
    );
    return candidate;
  }

  ctx.ui.notify(`No available /fast model. ${failures.join("; ")}`, "error");
  return undefined;
}

export default function (pi: ExtensionAPI): void {
  let fastModeEnabled = false;
  let activeTarget: FastTarget | undefined;

  pi.registerCommand("fast", {
    description:
      "Enable OpenAI Codex priority service tier and switch to a high-inference coding model. Usage: /fast [max|high|5.6|sol|terra|luna|5.5|5.4|mini|spark|off] [thinking]",
    handler: async (args, ctx) => {
      if (args.trim().toLowerCase() === "off") {
        fastModeEnabled = false;
        activeTarget = undefined;
        updateStatus(ctx);
        ctx.ui.notify(
          "Fast mode disabled. Future OpenAI Codex requests will not set priority service tier.",
          "info",
        );
        return;
      }

      const target = await switchToFast(pi, ctx, args);
      if (!target) return;
      fastModeEnabled = true;
      activeTarget = target;
    },
  });

  pi.on("before_provider_request", (event) => {
    if (!fastModeEnabled) return;
    if (!isOpenAICodexResponsesPayload(event.payload)) return;

    return {
      ...event.payload,
      service_tier: SERVICE_TIER,
    };
  });

  pi.on("model_select", async (event, ctx) => {
    if (!fastModeEnabled) return;

    if (
      event.model.provider !== "openai-codex" &&
      event.model.provider !== "github-copilot"
    ) {
      activeTarget = undefined;
      updateStatus(ctx);
      return;
    }

    if (!event.model.id.startsWith("gpt-5")) {
      activeTarget = undefined;
      updateStatus(ctx);
      return;
    }

    activeTarget = {
      provider: event.model.provider,
      model: event.model.id,
      thinking: pi.getThinkingLevel(),
    };
    updateStatus(ctx, activeTarget);
  });

  pi.on("thinking_level_select", async (event, ctx) => {
    if (!fastModeEnabled) return;

    const model = ctx.model;
    if (
      !model ||
      (model.provider !== "openai-codex" && model.provider !== "github-copilot")
    ) {
      activeTarget = undefined;
      updateStatus(ctx);
      return;
    }

    if (!model.id.startsWith("gpt-5")) {
      activeTarget = undefined;
      updateStatus(ctx);
      return;
    }

    activeTarget = {
      provider: model.provider,
      model: model.id,
      thinking: event.level,
    };
    updateStatus(ctx, activeTarget);
  });

  pi.on("session_start", async (_event, ctx) => {
    if (fastModeEnabled) updateStatus(ctx, activeTarget);
  });
}
