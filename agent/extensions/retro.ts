/**
 * Retro Extension — session retrospective for continuous improvement.
 *
 * Registers a `/retro` command that lets you select a past (or current) session
 * and prompts the model to analyze it for:
 *
 *   1. Mistakes & wrong turns — where clearer project instructions would help
 *   2. Tool misuse — wrong tools, bad ordering, over-reading
 *   3. Skill / extension gaps — unused or misused capabilities
 *   4. System prompt & documentation improvements
 *   5. Recurring patterns & anti-patterns
 *
 * Usage:
 *   /retro              → interactive session picker
 *   /retro current      → analyze the current session
 */
import type { ExtensionAPI, ExtensionCommandContext } from "@earendil-works/pi-coding-agent";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { readFileSync } from "node:fs";
import { basename } from "node:path";

// ── Limits ───────────────────────────────────────────────────────────────────
const MAX_ANALYSIS_BYTES = 80_000; // Truncate session content above this
const MAX_TOOL_OUTPUT_CHARS = 200; // Max chars shown per tool result
const MAX_TURNS = 50; // Max conversation turns to include

// ── Types ────────────────────────────────────────────────────────────────────
interface RawEntry {
  id?: string;
  parentId?: string | null;
  type: string;
  timestamp?: string;
  [key: string]: unknown;
}

interface SessionMeta {
  path: string;
  id: string;
  timestamp: string;
  modified: string;
  entryCount: number;
  cwd: string;
  firstMessage: string;
}

// ── Entry point ──────────────────────────────────────────────────────────────
export default function (pi: ExtensionAPI) {
  pi.registerCommand("retro", {
    description: "Analyze past coding sessions for continuous improvement opportunities",
    handler: async (args, ctx) => {
      await ctx.waitForIdle();

      // Check for direct "current" argument
      if (args?.trim() === "current") {
        const content = formatCurrentSession(ctx);
        if (content === null) {
          ctx.ui.notify("Nothing to analyze in this session yet.", "info");
          return;
        }
        const prompt = buildAnalysisPrompt(content, null);
        pi.sendUserMessage(prompt);
        return;
      }

      // ── Build the session picker ─────────────────────────────────────
      const sessions = await SessionManager.listAll();
      const currentFile = ctx.sessionManager.getSessionFile();

      const metas: SessionMeta[] = sessions
        .filter((s) => s.path !== currentFile)
        .map((s) => ({
          path: s.path,
          id: s.id,
          timestamp: String(s.created ?? ""),
          modified: String(s.modified ?? ""),
          entryCount: s.messageCount,
          cwd: s.cwd,
          firstMessage: s.firstMessage ?? "",
        }));

      // Add current session at the front
      if (currentFile) {
        const branch = ctx.sessionManager.getBranch();
        metas.unshift({
          path: currentFile,
          id: ctx.sessionManager.getSessionId() ?? "?",
          timestamp: new Date().toISOString(),
          modified: new Date().toISOString(),
          entryCount: branch.length,
          cwd: ctx.cwd,
          firstMessage: "(current session)",
        });
      }

      if (metas.length === 0) {
        ctx.ui.notify("No sessions found to analyze.", "info");
        return;
      }

      // Sort: most-recent first
      metas.sort((a, b) => {
        const da = new Date(String(a.timestamp)).getTime();
        const db = new Date(String(b.timestamp)).getTime();
        if (!isNaN(da) && !isNaN(db)) return db - da;
        if (!isNaN(da)) return 1;  // a is valid, push b down
        if (!isNaN(db)) return -1; // b is valid, push a down
        return String(b.timestamp).localeCompare(String(a.timestamp));
      });

      const labels = metas.map((m) => formatSessionLabel(m));
      const choice = await ctx.ui.select("Select a session to analyze:", labels);
      if (choice === undefined) return;

      const selected = metas.find((_m, i) => labels[i] === choice);
      if (!selected) return;

      // ── Parse & format the session ───────────────────────────────────
      ctx.ui.notify("Parsing session…", "info");

      let sessionContent: string;
      if (selected.path === currentFile) {
        sessionContent = formatCurrentSession(ctx) ?? "No content to analyze.";
      } else {
        sessionContent = parseAndFormatSession(selected.path);
      }

      const prompt = buildAnalysisPrompt(sessionContent, selected.path);

      pi.sendUserMessage(prompt);
    },
  });
}

// ── Session picker helpers ───────────────────────────────────────────────────

function formatSessionLabel(m: SessionMeta): string {
  const date = formatTimestamp(m.timestamp);
  const preview = truncate(m.firstMessage.replace(/\n/g, " "), 60);
  const project = basename(m.cwd);
  return `${date}  ·  ${project}  ·  ${m.entryCount} msgs  ·  ${preview}`;
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "unknown";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// ── Session parsing ──────────────────────────────────────────────────────────

function parseAndFormatSession(file: string): string {
  const raw = readFileSync(file, "utf-8");
  const lines = raw.trim().split("\n");
  if (lines.length <= 1) return "_(empty session)_";

  const entries: RawEntry[] = [];
  for (const line of lines) {
    try {
      entries.push(JSON.parse(line));
    } catch {
      // skip
    }
  }

  if (entries.length <= 1) return "_(no parseable entries)_";

  // Build id → entry map and walk from the last entry to root
  const entryMap = new Map<string, RawEntry>();
  for (const e of entries) {
    if (e.id) entryMap.set(e.id, e);
  }

  const branch: RawEntry[] = [];
  const visited = new Set<string>();
  let current: RawEntry | undefined = entries[entries.length - 1];

  while (current?.id && !visited.has(current.id)) {
    visited.add(current.id);
    branch.push(current);
    current = current.parentId && typeof current.parentId === "string"
      ? entryMap.get(current.parentId)
      : undefined;
  }

  branch.reverse(); // root → leaf
  return formatBranch(branch);
}

function formatCurrentSession(ctx: ExtensionCommandContext): string | null {
  const branch = ctx.sessionManager.getBranch();
  if (branch.length === 0) return null;

  // Convert SessionEntryBase[] to RawEntry[] (they're close enough)
  return formatBranch(branch as unknown as RawEntry[]);
}

// ── Branch formatting ────────────────────────────────────────────────────────

function formatBranch(branch: RawEntry[]): string {
  const out: string[] = [];
  let totalBytes = 0;
  let turnCount = 0;

  for (const entry of branch) {
    if (turnCount >= MAX_TURNS) {
      out.push(`\n⚠️ _Truncated at ${MAX_TURNS} turns._`);
      break;
    }
    if (totalBytes >= MAX_ANALYSIS_BYTES) {
      out.push(`\n⚠️ _Truncated at ${MAX_ANALYSIS_BYTES / 1000}KB._`);
      break;
    }

    const formatted = formatEntry(entry, () => ++turnCount, turnCount);
    if (formatted) {
      out.push(formatted);
      totalBytes += Buffer.byteLength(formatted, "utf-8");
    }
  }

  return out.join("\n");
}

function formatEntry(entry: RawEntry, bumpTurn: () => number, currentTurn: number): string | null {
  switch (entry.type) {
    // ── Session header ─────────────────────────────────────────────────
    case "session":
      return [
        `## Session ${(entry.id as string)?.slice(0, 8) ?? "?"}`,
        `- Started: ${(entry.timestamp as string) ?? "?"}`,
        entry.parentSession
          ? `- Forked from: ${basename(entry.parentSession as string)}`
          : null,
        "",
      ]
        .filter(Boolean)
        .join("\n");

    // ── Messages ───────────────────────────────────────────────────────
    case "message": {
      const msg = entry.message as Record<string, unknown> | undefined;
      if (!msg) return null;

      switch (msg.role) {
        case "user": {
          const turn = bumpTurn();
          const content = extractText(msg.content);
          return `### Turn ${turn}\n**👤 User:** ${truncate(content, 500)}`;
        }

        case "assistant": {
          const parts: string[] = [];
          const textContent = extractText(
            ((msg.content as unknown[]) ?? []).filter(
              (c: any) => c?.type === "text",
            ),
          );
          if (textContent) parts.push(truncate(textContent, 300));

          const toolCalls = ((msg.content as unknown[]) ?? []).filter(
            (c: any) => c?.type === "toolCall",
          );
          if (toolCalls.length > 0) {
            const names = toolCalls.map((tc: any) =>
              `${tc.name}(${summarizeArgs(tc.arguments)})`,
            );
            parts.push(`🔧 ${names.join(", ")}`);
          }

          const modelInfo =
            msg.provider || msg.model
              ? ` [${msg.provider ?? "?"}/${msg.model ?? "?"}]`
              : "";

          let line = `**🤖 Assistant${modelInfo}:** ${parts.join(" | ")}`;
          if (
            msg.stopReason &&
            msg.stopReason !== "stop" &&
            msg.stopReason !== "toolUse"
          ) {
            line += ` ⚠️ stop=${msg.stopReason}`;
          }
          return line;
        }

        case "toolResult": {
          const name = (msg.toolName as string) ?? "?";
          const output = extractText(msg.content);
          const status = msg.isError ? "❌" : "✓";
          return `  ${status} ${name}: ${truncate(output, MAX_TOOL_OUTPUT_CHARS)}`;
        }

        case "bashExecution": {
          const cmd = (msg.command as string) ?? "";
          const output = (msg.output as string) ?? "";
          const exit = msg.exitCode as number | undefined;
          let line = `  ! ${truncate(cmd, 100)}`;
          if (output) {
            line += `\n    → ${truncate(output, MAX_TOOL_OUTPUT_CHARS)}`;
          }
          if (exit !== undefined && exit !== 0) {
            line += ` (exit ${exit})`;
          }
          return line;
        }

        default:
          return null;
      }
    }

    // ── Compaction ─────────────────────────────────────────────────────
    case "compaction":
      return `\n**[Compaction]** ${truncate((entry.summary as string) ?? "", 250)}`;

    // ── Branch summary ─────────────────────────────────────────────────
    case "branch_summary":
      return `**[Branch]** ${truncate((entry.summary as string) ?? "", 250)}`;

    // ── Model / thinking changes ───────────────────────────────────────
    case "model_change":
      return `**[Model →]** ${entry.provider ?? "?"}/${entry.modelId ?? "?"}`;

    case "thinking_level_change":
      return `**[Thinking →]** ${entry.thinkingLevel ?? "?"}`;

    default:
      return null;
  }
}

// ── Content extraction helpers ───────────────────────────────────────────────

function extractText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((c): c is { type: string; text?: string } => {
        return typeof c === "object" && c !== null && "type" in c;
      })
      .filter((c) => c.type === "text")
      .map((c) => c.text ?? "")
      .join("\n");
  }
  return "";
}

function summarizeArgs(args: unknown): string {
  if (!args || typeof args !== "object") return "";
  const obj = args as Record<string, unknown>;

  // Prefer the most informative single field
  if (typeof obj.path === "string") return shortPath(obj.path);
  if (typeof obj.command === "string") return truncate(obj.command, 60);
  if (typeof obj.pattern === "string") return `/${obj.pattern}/`;

  const entries = Object.entries(obj);
  if (entries.length === 0) return "";

  const [key, value] = entries[0];
  const strVal = typeof value === "string" ? value : JSON.stringify(value);
  const short = strVal.length > 40 ? strVal.slice(0, 37) + "…" : strVal;

  if (entries.length === 1) return short;
  return `${short}, …`;
}

function shortPath(p: string): string {
  // Show last 2 segments of a path for readability
  const parts = p.replace(/\\/g, "/").split("/").filter(Boolean);
  if (parts.length <= 2) return p;
  return `…/${parts.slice(-2).join("/")}`;
}

function truncate(str: string, maxLen: number): string {
  if (!str || str.length <= maxLen) return str;
  return str.slice(0, maxLen) + `… [${str.length - maxLen} more chars]`;
}

// ── Analysis prompt ──────────────────────────────────────────────────────────

function buildAnalysisPrompt(
  sessionContent: string,
  sourceFile: string | null,
): string {
  const source = sourceFile
    ? `Session file: \`${basename(sourceFile)}\``
    : "Current session (in-context)";

  return `# Session Retrospective

${source}

Analyze the session below for **continuous improvement opportunities.**
Look critically at what the model did wrong or suboptimally, and identify
concrete, actionable fixes.

---

${sessionContent}

---

## Analysis Instructions

Produce a structured retrospective covering these dimensions:

### 1. Mistakes & Wrong Turns
Where did the model make errors, incorrect assumptions, or need to backtrack?
Would clearer project instructions in **AGENTS.md / CLAUDE.md / APPEND_SYSTEM.md**
have prevented these?

### 2. Tool Usage Issues
- Wrong tool for the job? Suboptimal ordering (e.g. editing before reading)?
- Over-reading files or reading unnecessary files?
- Missing opportunities (available tools not used)?
- Inefficient bash patterns (not using grep/find when they'd be faster)?

### 3. Skill & Extension Gaps
- Were available **skills** not invoked when they would have helped?
- Were skills or extensions used incorrectly?
- What **new skills or extensions** would have made this session better?
- Would a **prompt template** be useful for repeated workflows?

### 4. System Prompt & Documentation Improvements
- What specific lines should be added to CLAUDE.md, APPEND_SYSTEM.md, or a
  custom SYSTEM.md?
- Are there project conventions the model keeps getting wrong?

### 5. Recurring Patterns
- Does the model make the same type of mistake across multiple turns?
- Are there meta-patterns (e.g., always picks wrong file first, always forgets
  to read before editing)?

### Output Format

For each finding provide:

- **What happened** — the specific exchange(s), with turn numbers
- **Impact** — how it affected the session (wasted tokens, wrong output, rework)
- **Recommendation** — a concrete fix the user can implement in <5 minutes
  (e.g. *"Add 'Always run \`cargo check\` before editing Rust files' to APPEND_SYSTEM.md"*,
  or *"Create a skill for X workflow"*)

Prioritize the most impactful findings first. Be specific and actionable.
Avoid vague suggestions — say exactly what file to change and what to add.`;
}
