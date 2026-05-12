/**
 * Colored Footer Extension
 *
 * Replaces the default Pi footer with a colored version:
 *   - Model name & provider: colored by company brand color
 *   - Thinking/effort level: colored on the built-in thinking* scale
 *   - Context window %: heatmap (green → yellow → orange → red)
 *
 * Layout:  cwd · branch                  provider/model · effort · ctx XX%
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";

// ─── Color maps ──────────────────────────────────────────────────────────────

const PROVIDER_COLORS: Record<string, string> = {
  anthropic: "#d97742",
  openai: "#10a37f",
  deepseek: "#4f8ef7",
  google: "#8b9cf7",
  mistral: "#7c3aed",
  groq: "#ff5100",
  cerebras: "#00d4b8",
  xai: "#e0e0e0",
  bedrock: "#ff9900",
  fireworks: "#ff6b35",
  openrouter: "#a855f7",
  "vercel-ai-gateway": "#000000",
  zai: "#00e5ff",
  opencode: "#00e5ff",
  "opencode-go": "#00e5ff",
  huggingface: "#ffbd45",
  "cloudflare-ai-gateway": "#f38020",
  "cloudflare-workers-ai": "#f38020",
  "kimi-coding": "#00a86b",
  minimax: "#4fc3f7",
  "minimax-cn": "#4fc3f7",
  xiaomi: "#ff6900",
  "xiaomi-token-plan-cn": "#ff6900",
  "xiaomi-token-plan-ams": "#ff6900",
  "xiaomi-token-plan-sgp": "#ff6900",
};

// ─── Color helpers ───────────────────────────────────────────────────────────

function hexToFg(hex: string): (text: string) => string {
  const match = /^#?([0-9a-fA-F]{6})$/.exec(hex);
  if (!match) return (t) => t;
  const rgb = match[1]!;
  const r = parseInt(rgb.slice(0, 2), 16);
  const g = parseInt(rgb.slice(2, 4), 16);
  const b = parseInt(rgb.slice(4, 6), 16);
  return (text: string) => `\x1b[38;2;${r};${g};${b}m${text}\x1b[39m`;
}

function providerFg(provider: string, theme: any): (text: string) => string {
  const hex = PROVIDER_COLORS[provider];
  if (hex) return hexToFg(hex);
  return (text: string) => theme.fg("dim", text);
}

function contextPctFg(pct: number | null, theme: any): (text: string) => string {
  if (pct === null || pct === undefined) return (t: string) => theme.fg("dim", t);
  if (pct <= 50) return (t: string) => theme.fg("success", t);
  if (pct <= 75) return (t: string) => theme.fg("warning", t);
  if (pct <= 90) return hexToFg("#f0a030");
  return (t: string) => theme.fg("error", t);
}

function thinkingFg(level: string, theme: any): (text: string) => string {
  const tokenMap: Record<string, string> = {
    off: "thinkingOff",
    minimal: "thinkingMinimal",
    low: "thinkingLow",
    medium: "thinkingMedium",
    high: "thinkingHigh",
    xhigh: "thinkingXhigh",
  };
  const token = tokenMap[level];
  if (token) return (t: string) => theme.fg(token, t);
  return (t: string) => theme.fg("dim", t);
}

// ─── Footer formatting ──────────────────────────────────────────────────────

function formatContext(ctx: any): string {
  const usage = ctx.getContextUsage();
  if (!usage || usage.percent === null || usage.percent === undefined) {
    return "ctx ?";
  }
  const pct = Math.round(usage.percent);
  const cw = usage.contextWindow ?? ctx.model?.contextWindow;
  const windowK = cw ? `${(cw / 1000).toFixed(0)}k` : "?";
  return `ctx ${pct}%/${windowK}`;
}

function formatCwd(cwd: string): string {
  const home = process.env.HOME;
  if (home && cwd.startsWith(home)) {
    return `~${cwd.slice(home.length)}`;
  }
  return cwd;
}

function effortDot(level: string): string {
  switch (level) {
    case "off": return "○";
    case "minimal": return "◐";
    case "low": return "◑";
    case "medium": return "◒";
    case "high": return "●";
    case "xhigh": return "⬤";
    default: return "·";
  }
}

function buildFooterLine(
  ctx: any,
  pi: any,
  theme: any,
  width: number,
  gitBranch: string | null,
): string {
  const cwd = formatCwd(ctx.cwd);
  const provider = ctx.model?.provider ?? "";
  const modelId = ctx.model?.id ?? "?";
  const modelStr = provider ? `${provider}/${modelId}` : modelId;
  const thinking = pi.getThinkingLevel();
  const contextStr = formatContext(ctx);
  const dot = effortDot(thinking);

  // Left side: cwd + optional git branch
  let left = theme.fg("dim", cwd);
  if (gitBranch) {
    left += " " + theme.fg("dim", gitBranch);
  }

  // Right side: provider/model · effort-dot level · context%
  const modelFg = providerFg(provider, theme);
  const thinkFg = thinkingFg(thinking, theme);
  const useCtx = ctx.getContextUsage() ?? null;
  const ctxFg = contextPctFg(useCtx?.percent ?? null, theme);

  const right =
    modelFg(modelStr) +
    " " +
    thinkFg(`${dot} ${thinking}`) +
    " " +
    ctxFg(contextStr);

  const pad = " ".repeat(
    Math.max(1, width - visibleWidth(left) - visibleWidth(right)),
  );
  return truncateToWidth(left + pad + right, width);
}

// ─── Extension entry point ───────────────────────────────────────────────────

export default function (pi: ExtensionAPI) {
  let activeTui: any = null;

  pi.on("model_select", async () => {
    activeTui?.requestRender();
  });

  pi.on("thinking_level_select", async () => {
    activeTui?.requestRender();
  });

  pi.on("turn_end", async () => {
    activeTui?.requestRender();
  });

  pi.on("session_start", async (_event, ctx) => {
    ctx.ui.setFooter((tui, theme, footerData) => {
      activeTui = tui;
      const unsub = footerData.onBranchChange(() => tui.requestRender());

      return {
        dispose: unsub,
        invalidate() {},
        render(width: number): string[] {
          const branch = footerData.getGitBranch();
          return [buildFooterLine(ctx, pi, theme, width, branch)];
        },
      };
    });
  });

  pi.on("session_shutdown", async () => {
    activeTui = null;
  });
}
