import type { ExtensionAPI, Theme, ToolDefinition } from "@earendil-works/pi-coding-agent";
import { getLanguageFromPath, highlightCode } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";

const HASHLINE_RE = /^([+\- ])([A-Za-z0-9]{3}| {3})│(.*)$/;
const PI_NUMBERED_RE = /^([+\- ])(\s*\d+)\s(.*)$/;
const UNIFIED_HUNK_RE = /^@@\s+-(\d+)(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/;
const DIFF_TOOLS = new Set(["edit", "replace", "undo_last_replace"]);

type Kind = "add" | "remove" | "context" | "hunk" | "meta";

type DiffRow = {
  kind: Kind;
  content: string;
  oldLine?: number;
  newLine?: number;
};

function toolPath(args: unknown): string | undefined {
  if (!args || typeof args !== "object") return undefined;
  const record = args as Record<string, unknown>;
  if (typeof record.path === "string") return record.path;
  if (typeof record.file_path === "string") return record.file_path;
  return undefined;
}

function highlightLine(content: string, lang: string | undefined, theme: Theme): string {
  if (!lang) return theme.fg("mdCodeBlock", content);
  try {
    return highlightCode(content, lang)[0] ?? theme.fg("mdCodeBlock", content);
  } catch {
    return theme.fg("mdCodeBlock", content);
  }
}

function underlineSpan(oldContent: string, newContent: string, theme: Theme, lang: string | undefined) {
  let start = 0;
  const maxStart = Math.min(oldContent.length, newContent.length);
  while (start < maxStart && oldContent[start] === newContent[start]) {
    start += 1;
  }

  let oldEnd = oldContent.length;
  let newEnd = newContent.length;
  while (oldEnd > start && newEnd > start && oldContent[oldEnd - 1] === newContent[newEnd - 1]) {
    oldEnd -= 1;
    newEnd -= 1;
  }

  const paint = (text: string, changedFrom: number, changedTo: number) =>
    highlightLine(text.slice(0, changedFrom), lang, theme) +
    theme.underline(text.slice(changedFrom, changedTo)) +
    highlightLine(text.slice(changedTo), lang, theme);

  return {
    removed: paint(oldContent, start, oldEnd),
    added: paint(newContent, start, newEnd),
  };
}

function parseDiff(diffText: string, startLine = 1): DiffRow[] {
  const lines = diffText.replace(/\r\n/g, "\n").split("\n");
  const rows: DiffRow[] = [];
  let oldLine = startLine;
  let newLine = startLine;
  let sawHashline = false;
  let sawPiNumbered = false;

  for (const line of lines) {
    if (line === "" && rows.length === 0) continue;
    if (line.startsWith("diff ") || line.startsWith("index ") || line.startsWith("---") || line.startsWith("+++")) {
      rows.push({ kind: "meta", content: line });
      continue;
    }
    if (line.trim() === "..." || line.trim() === "…" || /^ \.\.\.$/.test(line) || /^\s+\.\.\.$/.test(line)) {
      rows.push({ kind: "hunk", content: "…" });
      continue;
    }

    const hunk = line.match(UNIFIED_HUNK_RE);
    if (hunk) {
      oldLine = Number(hunk[1]);
      newLine = Number(hunk[2]);
      rows.push({ kind: "hunk", content: "…" });
      continue;
    }

    const hashline = line.match(HASHLINE_RE);
    if (hashline) {
      sawHashline = true;
      const prefix = hashline[1];
      const content = hashline[3] ?? "";
      if (prefix === "+") {
        rows.push({ kind: "add", content, newLine });
        newLine += 1;
      } else if (prefix === "-") {
        rows.push({ kind: "remove", content, oldLine });
        oldLine += 1;
      } else {
        rows.push({ kind: "context", content, oldLine, newLine });
        oldLine += 1;
        newLine += 1;
      }
      continue;
    }

    const numbered = line.match(PI_NUMBERED_RE);
    if (numbered && !sawHashline) {
      sawPiNumbered = true;
      const prefix = numbered[1];
      const number = Number(numbered[2]);
      const content = numbered[3] ?? "";
      if (prefix === "+") {
        rows.push({ kind: "add", content, newLine: number });
        newLine = number + 1;
      } else if (prefix === "-") {
        rows.push({ kind: "remove", content, oldLine: number });
        oldLine = number + 1;
      } else {
        rows.push({ kind: "context", content, oldLine: number, newLine: number });
        oldLine = number + 1;
        newLine = number + 1;
      }
      continue;
    }

    if (!sawPiNumbered && (line.startsWith("+") || line.startsWith("-") || line.startsWith(" "))) {
      const prefix = line[0];
      const content = line.slice(1);
      if (prefix === "+") {
        rows.push({ kind: "add", content, newLine });
        newLine += 1;
      } else if (prefix === "-") {
        rows.push({ kind: "remove", content, oldLine });
        oldLine += 1;
      } else {
        rows.push({ kind: "context", content, oldLine, newLine });
        oldLine += 1;
        newLine += 1;
      }
      continue;
    }

    if (line.length > 0) {
      rows.push({ kind: "meta", content: line });
    }
  }

  return rows;
}

function lineWidth(rows: DiffRow[]): number {
  let max = 1;
  for (const row of rows) {
    max = Math.max(max, row.oldLine ?? 0, row.newLine ?? 0);
  }
  return String(max).length;
}

function formatNumber(value: number | undefined, width: number, theme: Theme): string {
  if (!value) return theme.fg("dim", " ".repeat(width));
  return theme.fg("dim", String(value).padStart(width, " "));
}

function leadingContextCount(rows: DiffRow[]): number {
  let count = 0;
  for (const row of rows) {
    if (row.kind === "meta" || row.kind === "hunk") continue;
    if (row.kind !== "context") break;
    count += 1;
  }
  return count;
}

function renderDiff(
  diffText: string,
  filePath: string | undefined,
  theme: Theme,
  startLine = 1,
): string {
  const rows = parseDiff(diffText, startLine);
  if (rows.length === 0) return "";
  if (startLine > 1) {
    const shift = -leadingContextCount(rows);
    if (shift !== 0) {
      for (const row of rows) {
        if (row.oldLine) row.oldLine = Math.max(1, row.oldLine + shift);
        if (row.newLine) row.newLine = Math.max(1, row.newLine + shift);
      }
    }
  }
  const lang = filePath ? getLanguageFromPath(filePath) : undefined;
  const width = lineWidth(rows);
  const out: string[] = [];

  let index = 0;
  while (index < rows.length) {
    const row = rows[index]!;
    if (row.kind === "hunk") {
      out.push(theme.fg("dim", ` ${" ".repeat(width)}  …`));
      index += 1;
      continue;
    }
    if (row.kind === "meta") {
      out.push(theme.fg("toolDiffContext", row.content));
      index += 1;
      continue;
    }
    if (row.kind === "remove" && rows[index + 1]?.kind === "add") {
      const added = rows[index + 1]!;
      const intra = underlineSpan(row.content, added.content, theme, lang);
      out.push(
        `${theme.fg("toolDiffRemoved", "-")}${formatNumber(row.oldLine, width, theme)} ${intra.removed}`,
      );
      out.push(
        `${theme.fg("toolDiffAdded", "+")}${formatNumber(added.newLine, width, theme)} ${intra.added}`,
      );
      index += 2;
      continue;
    }

    const marker =
      row.kind === "add"
        ? theme.fg("toolDiffAdded", "+")
        : row.kind === "remove"
          ? theme.fg("toolDiffRemoved", "-")
          : " ";
    const number = formatNumber(row.kind === "remove" ? row.oldLine : row.newLine ?? row.oldLine, width, theme);
    out.push(`${marker}${number} ${highlightLine(row.content, lang, theme)}`);
    index += 1;
  }

  return out.join("\n");
}

function previewDiff(state: unknown): string | undefined {
  if (!state || typeof state !== "object") return undefined;
  const preview = (state as { preview?: { diff?: string; error?: string } }).preview;
  if (!preview || preview.error || typeof preview.diff !== "string") return undefined;
  return preview.diff;
}

function resultDiff(result: { details?: unknown }): { diff: string; startLine: number } | undefined {
  const details = result.details;
  if (!details || typeof details !== "object") return undefined;
  const record = details as { diff?: unknown; firstChangedLine?: unknown };
  if (typeof record.diff !== "string" || record.diff.length === 0) return undefined;
  const first = typeof record.firstChangedLine === "number" ? record.firstChangedLine : 1;
  return { diff: record.diff, startLine: Math.max(1, first) };
}

function setComponentText(component: unknown, text: string): unknown {
  if (component && typeof component === "object" && "setText" in component) {
    (component as Text).setText(text);
    return component;
  }
  return new Text(text, 0, 0);
}

function patchTool(tool: ToolDefinition): void {
  if (!DIFF_TOOLS.has(tool.name)) return;

  const originalCall = tool.renderCall;
  const originalResult = tool.renderResult;

  tool.renderCall = (args, theme, context) => {
    const rendered = originalCall?.(args, theme, context);
    const path = toolPath(args);
    const fromBox =
      rendered && typeof rendered === "object" && "preview" in rendered
        ? (rendered as { preview?: { diff?: string } }).preview?.diff
        : undefined;
    const diff = previewDiff(context.state) ?? fromBox;
    if (!diff) return rendered ?? new Text("", 0, 0);
    const header = `${theme.fg("toolTitle", theme.bold(tool.name))} ${theme.fg("mdLink", path ?? "")}`;
    return setComponentText(rendered, `${header}\n${renderDiff(diff, path, theme)}`) as Text;
  };

  tool.renderResult = (result, options, theme, context) => {
    const path = toolPath(context.args);
    const diff = resultDiff(result);
    if (diff) {
      return setComponentText(
        context.lastComponent,
        renderDiff(diff.diff, path, theme, diff.startLine),
      ) as Text;
    }
    if (originalResult) {
      return originalResult(result, options, theme, context);
    }
    return new Text("", 0, 0);
  };
}

export default function (pi: ExtensionAPI): void {
  const register = pi.registerTool.bind(pi);
  pi.registerTool = ((tool: ToolDefinition) => {
    patchTool(tool);
    return register(tool);
  }) as typeof pi.registerTool;
}
