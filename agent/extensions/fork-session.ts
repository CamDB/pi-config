/**
 * Fork Session Extension — open a new terminal window with the current session context.
 *
 * Registers the /fork-session command. Launches a new WezTerm window (via `open -na`)
 * running `pi --fork <session-file>`, which copies the full session into a new file
 * and opens it in interactive mode. The current session keeps running.
 *
 * macOS + WezTerm only. Other platforms get an error message.
 */

import { spawn } from "node:child_process";
import * as os from "node:os";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

const WEZTERM_APP = "/Applications/WezTerm.app";

export default function (pi: ExtensionAPI) {
  pi.registerCommand("fork-session", {
    description: "Open the current session in a new WezTerm window",
    handler: async (_args, ctx) => {
      if (os.platform() !== "darwin") {
        ctx.ui.notify(
          `/fork-session only supports macOS. Other platforms are not implemented yet.`,
          "error",
        );
        return;
      }

      const sessionFile = ctx.sessionManager.getSessionFile();

      if (!sessionFile) {
        ctx.ui.notify(
          "No session to fork — this is an ephemeral session.",
          "error",
        );
        return;
      }

      const ok = await ctx.ui.confirm(
        "Fork session to new window?",
        "This will open a new WezTerm window with the full session context.\n\nCurrent session continues uninterrupted.",
      );

      if (!ok) return;

      ctx.ui.notify("Opening forked session in a new WezTerm window…", "info");

      // open -na launches a new WezTerm instance (separate window),
      // unlike `wezterm cli spawn` which targets the existing GUI.
      spawn(
        "open",
        [
          "-na",
          WEZTERM_APP,
          "--args",
          "start",
          "--cwd",
          ctx.cwd,
          "--",
          "bash",
          "-c",
          `pi --fork "${sessionFile}"`,
        ],
        { detached: true, stdio: "ignore" },
      ).unref();
    },
  });
}
