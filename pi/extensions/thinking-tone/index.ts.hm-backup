import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { flattenThinking } from "./flatten.ts";

type MarkdownPi = ExtensionAPI & {
  registerMarkdownTransformer: (
    transformer: (
      markdown: string,
      context: { messageType: string },
    ) => string,
  ) => void;
};

export default function (pi: ExtensionAPI): void {
  (pi as MarkdownPi).registerMarkdownTransformer((markdown, { messageType }) => {
    if (messageType !== "assistant-thinking") return markdown;
    return flattenThinking(markdown);
  });
}
