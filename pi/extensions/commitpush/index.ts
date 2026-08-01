import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const COMMIT_PUSH_PROMPT = `Commit and push the current repository changes.

Steps:
1. Inspect the working tree with git status and review the relevant diff before staging.
2. Stage only the specific files that belong in this commit. Do not use \`git add -A\` or \`git add .\`.
3. Inspect the staged changes and write a concise commit message that accurately summarizes them.
4. Commit the staged changes with that message.
5. Push the commit to the current branch's remote.
   - If the current branch does not have an upstream remote branch, create one by pushing with upstream tracking.
   - If this repository has no git remotes configured, do not push.
6. After pushing, output the remote URL for what was pushed if the repository has a remote.
   - If the current branch is \`main\`, output the normal remote repository URL.
   - If the current branch is not \`main\`, output a URL to create a pull request from the pushed branch into \`main\`.
   - Convert SSH git remotes like \`git@github.com:owner/repo.git\` to HTTPS URLs when printing.

Keep the commit message concise.`;

export default function (pi: ExtensionAPI) {
  pi.registerCommand("commitpush", {
    description:
      "Stage specific changed files, commit, and push the current repo changes",
    handler: async (args, ctx) => {
      const prompt = args?.trim()
        ? `${COMMIT_PUSH_PROMPT}\n\nAdditional instructions from the user:\n${args.trim()}`
        : COMMIT_PUSH_PROMPT;

      if (ctx.isIdle()) {
        pi.sendUserMessage(prompt);
      } else {
        pi.sendUserMessage(prompt, { deliverAs: "followUp" });
        ctx.ui.notify("Queued /commitpush as a follow-up", "info");
      }
    },
  });
}
