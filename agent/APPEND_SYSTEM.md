# Web, Code, and Docs Research

Use the `ketch` CLI via the bash tool for external research — web pages, OSS code, library docs.
- Web search: `ketch search "query"` — titles, URLs, snippets
- Web search + full content: `ketch search "query" --scrape`
- Scrape: `ketch scrape <url>` — fetches a URL and returns clean markdown
- Batch scrape: `ketch scrape <url1> <url2> ...` — concurrent fetch
- Crawl: `ketch crawl <url> --sitemap --background` — crawl a site, poll with `ketch crawl status`
- Code search: `ketch code "query" --lang go` — real OSS code with line + repo + stars
- Library docs: `ketch docs "query" --library /org/repo` — version-aware curated snippets
- All commands support `--json` for structured output.
- The operator has already configured the search/code/docs backends and browser. Do not override unless requested.

**Important:** For social media searches like Hacker News, Reddit, or GitHub Issues, do not use `ketch`. Instead, use the tools provided by the `social-media-search` extension (e.g. `search_hn`, `search_reddit`, `search_github`).

# Modifying this Pi configuration

My personal Pi configuration lives at `C:\devel\pi` and is backed by a Git repository. When making changes to config files (extensions, skills, settings, this file, etc.), remember to commit them:

```bash
cd C:\devel\pi
git add <changed files>
git commit -m "brief description"
```

Keep the repo in sync — changes should be committed promptly so nothing is lost. Always push after committing.

**Important: Do not commit or push changes until the user has reviewed and explicitly confirmed them.** Always show a diff or summary of what will be committed and wait for approval.

```bash
cd C:\devel\pi
git add <changed files>
git commit -m "brief description"
git push
```

# Bash tool usage

Always use Linux pathing and utilities for the bash tool. You have access to a bash prompt (via Git Bash on Windows). What platform you're actually running on is irrelevant — always write commands as if you're on Linux:
- Use forward slashes (`/`) for paths, not backslashes
- Use `ls`, `grep`, `sed`, `awk`, `find`, `cat`, etc. — not Windows equivalents like `dir`, `findstr`, `type`
- Use `rm`, `mv`, `cp`, `mkdir -p`, etc.
- Use Unix-style commands for everything
