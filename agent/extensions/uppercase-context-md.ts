/**
 * Uppercase Context MD Extension
 *
 * Scans the project root recursively for UPPERCASE .md files
 * (e.g. COORDINATES.md, TODO.md, README.md) and lists them
 * in the system prompt so the agent is always aware of these
 * reference / convention files.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";

/**
 * Check whether a filename stem is all-uppercase
 * (contains no lowercase ASCII letters).
 */
function isUppercaseStem(filename: string): boolean {
  const stem = path.basename(filename, ".md");
  // Must have at least one character and no lowercase letters
  return stem.length > 0 && stem === stem.toUpperCase();
}

/**
 * Recursively find all UPPERCASE .md files under a directory.
 */
function findUppercaseMdFiles(dir: string, basePath: string = ""): string[] {
  const results: string[] = [];

  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const relativePath = basePath
      ? `${basePath}/${entry.name}`
      : entry.name;

    if (entry.isDirectory()) {
      // Skip hidden dirs and node_modules
      if (entry.name.startsWith(".") || entry.name === "node_modules") continue;
      results.push(
        ...findUppercaseMdFiles(path.join(dir, entry.name), relativePath),
      );
    } else if (
      entry.isFile() &&
      entry.name.endsWith(".md") &&
      isUppercaseStem(entry.name)
    ) {
      results.push(relativePath);
    }
  }

  return results;
}

export default function (pi: ExtensionAPI) {
  let mdFiles: string[] = [];
  let projectRoot: string = "";

  // ── Scan on session start ──────────────────────────────────────
  pi.on("session_start", async (_event, ctx) => {
    projectRoot = ctx.cwd;
    mdFiles = findUppercaseMdFiles(projectRoot);

    if (mdFiles.length > 0) {
      ctx.ui.notify(
        `Found ${mdFiles.length} uppercase .md file(s) in project`,
        "info",
      );
    }
  });

  // ── Inject list into system prompt ─────────────────────────────
  pi.on("before_agent_start", async (event) => {
    if (mdFiles.length === 0) return;

    const fileList = mdFiles.map((f) => `- ${f}`).join("\n");

    return {
      systemPrompt:
        event.systemPrompt +
        `

## Uppercase Markdown Files

The following uppercase .md files exist in this project:

${fileList}

These are likely convention / reference files (API docs, TODO lists,
coordinate systems, etc.). Use the read tool to load them when relevant.
`,
    };
  });
}
