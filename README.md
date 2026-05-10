# Pi Config

Personal configuration for the [Pi coding agent](https://pi.dev).

## Extensions

- **review** — `/review` command for code reviews (PR, branch, commit, or uncommitted diffs). Copied from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/review.ts)
- **answer** — `/answer` extracts questions from assistant messages and provides an interactive Q&A TUI. Copied from [mitsuhiko/agent-stuff](https://github.com/mitsuhiko/agent-stuff/blob/main/extensions/answer.ts)
- **social-media-search** — adds `search_hn`, `search_reddit`, and `search_github` tools for LLM-callable social media searches. Custom.

## Skills

- **interview** — prompts the agent to ask clarifying questions before tackling a problem or bug.

## Themes

- **gruvbox-dark** — Gruvbox dark color palette for the terminal UI.

## Other

- **APPEND_SYSTEM.md** — appends git commit + push instructions to the system prompt, as well as instructions on using Ketch for search.
- **settings.json** — global Pi settings.

## Search & Agents Setup

We use `ketch` for web, code, and documentation searches by our agents, backed by a self-hosted `SearXNG` instance for web search privacy.

### 1. Start SearXNG

We run a local instance of SearXNG in a Docker container to provide a self-hosted search engine on port `9720`.

```bash
cd searxng
docker-compose up -d
```

### 2. Configure Ketch

Once Ketch is installed (e.g., `brew install 1broseidon/tap/ketch`), configure it to use our SearXNG instance and Context7 API key for documentation searches:

```bash
# Point web searches to local SearXNG
ketch config set backend searxng
ketch config set searxng_url http://localhost:9720

# Set Context7 key for library docs search
ketch config set context7_api_key <your_api_key>

# (Optional) Setup headless chrome for JS-rendered pages
ketch config set browser chrome
```
