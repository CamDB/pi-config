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

# Pi Self-Modification

When writing pi extensions, prompt templates, or skills, the following
pi-specific mechanics are easy to get wrong.

## Slash-command namespace is shared

Extensions and prompt templates both register slash commands, and they
share the same namespace. A template `prompts/foo.md` creates `/foo`, which
collides with any extension that also registers `/foo`. The user will see
two entries in the slash-command menu and one may shadow the other.

Before creating a prompt template, check for collisions:

```bash
ls ~/.pi/agent/prompts/ ~/.pi/agent/extensions/ | grep <name>
```

## SDK types are not always accurate at runtime

The pi SDK ships `.d.ts` type declarations, but runtime return types
occasionally differ. Known examples:

- `SessionManager.list()` returns `{path, created, messageCount,
  firstMessage}` — not `{file, timestamp}`.
- The `created` field may not be a `Date` or `string`; always coerce:
  `String(s.created ?? "")`.

Before wiring an SDK call into an extension, test its actual output shape
in a one-liner:

```bash
node -e "const {SessionManager} = require('@earendil-works/pi-coding-agent');
SessionManager.listAll().then(s => console.log(JSON.stringify(s[0])))"
```

## TypeScript compilation does not run automatically

Extensions are `.ts` files loaded at runtime. There is no build step —
syntax errors and type mismatches surface only when the user runs the
command. Always check with:

```bash
npx tsc --noEmit --strict ~/.pi/agent/extensions/<name>.ts
```

## Prefer working examples over reference docs

The pi docs under `~/.local/share/fnm/node-versions/v24.1.0/installation/lib/node_modules/@earendil-works/pi-coding-agent/docs/`
are comprehensive but verbose. When learning a specific API (command
registration, TUI components, SessionManager), grep the user's existing
extensions first — the patterns are more concise and guaranteed to work:

```bash
grep -r "registerSlashCommand\|SessionManager\|ExtensionAPI" ~/.pi/agent/extensions/
```

## Session format reference

The session JSONL schema is documented at:
`<pi-install>/docs/session-format.md`. Cross-reference it when consuming
session objects; do not assume field names.

# Implementation Discipline

## Do not build without explicit instruction

- **Discussion mode:** When the user asks a question, requests a suggestion,
  or explores options ("how would you...", "suggest a method", "what do you
  think about..."), **only discuss**. Do not write code, do not edit files.
- **Ambiguous requests:** When the user says "I want to build..." or "let's
  add..." without a clear specification, ask clarifying questions. Present
  a plan and wait for explicit confirmation before implementing.
- **Direct instructions only:** Only write code when the user gives a clear
  directive: "fix the bug in...", "add a function that...", "create a file
  called...", "implement the...", etc. If in doubt, ask.

## Use the skeleton skill for greenfield work

When asked to build something new from scratch (a new extension, module,
feature, or script), invoke the `skeleton` skill. Produce stubs with TODO
comments and get structural approval before writing any implementation.
This prevents writing hundreds of lines against wrong assumptions.

For modifications to existing code (not greenfield), use the `interview`
skill instead to clarify scope and approach before editing.

# Bash tool usage

Always use Linux pathing and utilities for the bash tool. You have access to a bash prompt (via Git Bash on Windows). What platform you're actually running on is irrelevant — always write commands as if you're on Linux:
- Use forward slashes (`/`) for paths, not backslashes
- Use `ls`, `grep`, `sed`, `awk`, `find`, `cat`, etc. — not Windows equivalents like `dir`, `findstr`, `type`
- Use `rm`, `mv`, `cp`, `mkdir -p`, etc.
- Use Unix-style commands for everything
