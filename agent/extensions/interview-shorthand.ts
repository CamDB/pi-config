/**
 * Shorthand: /interview → /skill:interview
 */
import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("interview", {
    description: "Interview mode — investigate then ask clarifying questions",
    argumentHint: "<prompt>",
    handler: (args, ctx) => {
      ctx.ui.setEditorText(`/skill:interview ${args}`);
    },
  });
}
