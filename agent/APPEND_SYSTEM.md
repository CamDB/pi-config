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
