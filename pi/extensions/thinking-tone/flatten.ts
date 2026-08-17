const FENCE_RE = /```[^\n]*\n?([\s\S]*?)```/g;
const OPEN_FENCE_RE = /```[^\n]*\n?([\s\S]*)$/;
const INLINE_CODE_RE = /`([^`\n]+)`/g;
const IMAGE_RE = /!\[([^\]]*)\]\([^)]+\)/g;
const LINK_RE = /\[([^\]]+)\]\([^)]+\)/g;
const HEADING_RE = /^\s{0,3}#{1,6}\s+/gm;
const QUOTE_RE = /^\s{0,3}>\s?/gm;
const RULE_RE = /^\s{0,3}(?:-{3,}|\*{3,}|_{3,})\s*$/gm;
const BOLD_STAR_RE = /\*\*([^*]+)\*\*/g;
const BOLD_UNDER_RE = /__([^_]+)__/g;
const ITALIC_STAR_RE = /(?<!\*)\*([^*\n]+)\*(?!\*)/g;
const ITALIC_UNDER_RE = /(?<!_)_([^_\n]+)_(?!_)/g;
const STRIKE_RE = /~~([^~]+)~~/g;
const LIST_RE = /^(\s*)(?:[-*+]|\d+\.)\s+/gm;
const TABLE_ROW_RE = /^\s*\|(.+)\|\s*$/gm;
const INDENTED_CODE_RE = /^(?: {4}|\t)/gm;

export function flattenThinking(markdown: string): string {
  let text = markdown.replace(/\r\n/g, "\n");
  text = text.replace(FENCE_RE, "$1");
  text = text.replace(OPEN_FENCE_RE, "$1");
  text = text.replace(INLINE_CODE_RE, "$1");
  text = text.replace(IMAGE_RE, "$1");
  text = text.replace(LINK_RE, "$1");
  text = text.replace(HEADING_RE, "");
  text = text.replace(QUOTE_RE, "");
  text = text.replace(RULE_RE, "");
  text = text.replace(BOLD_STAR_RE, "$1");
  text = text.replace(BOLD_UNDER_RE, "$1");
  text = text.replace(ITALIC_STAR_RE, "$1");
  text = text.replace(ITALIC_UNDER_RE, "$1");
  text = text.replace(STRIKE_RE, "$1");
  text = text.replace(TABLE_ROW_RE, (_match, row: string) =>
    row
      .split("|")
      .map((cell) => cell.trim())
      .filter((cell) => !/^:?-+:?$/.test(cell))
      .join("  "),
  );
  text = text.replace(LIST_RE, "$1");
  text = text.replace(INDENTED_CODE_RE, "  ");
  return text;
}
