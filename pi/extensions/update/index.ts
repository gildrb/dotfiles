import type {
  ExtensionAPI,
  ExtensionCommandContext,
} from "@earendil-works/pi-coding-agent";

const PINNED_VERSION = "0.84.3";

async function shell(pi: ExtensionAPI, script: string) {
  const result = await pi.exec("bash", ["-lc", script], { timeout: 10_000 });
  return result.stdout.trim() || result.stderr.trim() || "unknown";
}

async function currentVersion(pi: ExtensionAPI) {
  return shell(pi, "pi --version");
}

async function activePiPath(pi: ExtensionAPI) {
  return shell(pi, "command -v pi || true");
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function isExactPinnedVersion(output: string) {
  const escaped = escapeRegExp(PINNED_VERSION);
  return new RegExp(`(^|[^0-9A-Za-z.])v?${escaped}($|[^0-9A-Za-z.-])`).test(
    output,
  );
}

async function updatePi(pi: ExtensionAPI, ctx: ExtensionCommandContext) {
  await ctx.waitForIdle();

  const activePath = await activePiPath(pi).catch(() => "unknown");
  const version = await currentVersion(pi).catch(() => "unknown");

  if (!isExactPinnedVersion(version)) {
    ctx.ui.notify(
      `Pi resolves to ${version}; expected repo-pinned ${PINNED_VERSION}. Rebuild the NixOS/Home Manager config.`,
      "error",
    );
    return;
  }

  if (activePath.endsWith("/.local/bin/pi")) {
    ctx.ui.notify(
      `Pi resolves to legacy local shim ${activePath}. Rebuild the NixOS/Home Manager config so the Nix profile wins on PATH.`,
      "error",
    );
    return;
  }

  ctx.ui.notify(
    `Pi is Nix-managed at ${activePath} and pinned to ${PINNED_VERSION}. To update, bump the repo pin and rebuild.`,
    "info",
  );
}

export default function (pi: ExtensionAPI) {
  pi.registerFlag("update", {
    description: `Check the repo-pinned Nix-managed Pi ${PINNED_VERSION} package`,
    type: "boolean",
    default: false,
  });

  pi.registerCommand("update", {
    description: `Check the repo-pinned Nix-managed Pi ${PINNED_VERSION} package`,
    handler: async (_args, ctx) => {
      await updatePi(pi, ctx);
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    if (!pi.getFlag("update")) return;
    pi.sendUserMessage("/update", { deliverAs: "followUp" });
    ctx.ui.notify("Queued /update from --update", "info");
  });
}
