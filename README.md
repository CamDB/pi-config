# Pi Config

Personal configuration for the [Pi coding agent](https://pi.dev).

## Extensions

- **review** — `/review` command for code reviews (PR, branch, commit, or uncommitted diffs). Copied from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/review.ts)
- **answer** — `/answer` extracts questions from assistant messages and provides an interactive Q&A TUI. Copied from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/answer.ts)
- **websearch** — adds `search_hn`, `search_reddit`, `search_github`, and `search_web` tools for LLM-callable web searches. Custom.

## Skills

- **interview** — prompts the agent to ask clarifying questions before tackling a problem or bug.

## Themes

- **gruvbox-dark** — Gruvbox dark color palette for the terminal UI.

## Other

- **APPEND_SYSTEM.md** — appends git commit + push instructions to the system prompt.
- **settings.json** — global Pi settings.
- **bin/** — bundled `fd` and `rg` binaries.
