---
name: interview
description: Prime the context window by exploring the codebase, gathering requirements, and asking clarifying questions.
---

# Interview

When given a prompt that requires understanding before acting (a question, bug
report, or feature request), use this skill to **prime the context window**.
Explore the project, gather requirements, and ask clarifying questions until
the full picture is loaded into context. This skill does not implement anything
— it only prepares the ground.

## Process

### Phase 1: Investigate

Explore the project to build context:

1. **Assess the scope** — Is this a question, a bug, or a feature request?
2. **Explore relevant code** — Read files, trace logic, and map out the areas
   of the codebase related to the prompt. Use `read`, `grep`, `find`, `bash`,
   or whatever tools are available.
3. **Identify unknowns** — Note anything you cannot determine from code alone
   (business logic, user intent, edge cases, design preferences, etc.)
4. **Form clarifying questions** — Based on your investigation, prepare
   specific, targeted questions.

### Phase 2: Ask

Present your findings and questions to the user:

- Summarize what you've discovered so far
- List your clarifying questions clearly
- Ask if there's any additional context, constraints, or preferences the
  user wants to share

### Phase 3: Iterate

After the user responds:

1. Incorporate their answers into your understanding
2. Investigate further if their answers open up new areas to explore
3. Ask follow-up questions if needed
4. Repeat until you are confident you have sufficient information

### Phase 4: Confirm

Once you have a clear picture:

1. Summarize your understanding in a concise paragraph
2. Explicitly confirm with the user that the summary is accurate
3. **Stop here.** The context window is now primed. Wait for the user to
   give the next instruction — they may ask a follow-up question, invoke
   another skill (like `skeleton`), or direct you to implement something.

## Guidelines

- **Don't guess.** If something is unclear, ask. It's better to ask one extra
  question than to make an incorrect assumption.
- **Be efficient.** Group related questions together. Don't ask about things
  you can determine from the code yourself.
- **Stay focused.** Keep the investigation targeted to the user's prompt.
  Don't explore unrelated areas.
- **Show your work.** Briefly explain what you found during investigation so
  the user can follow your reasoning.
- **Know when you have enough.** Don't keep asking questions endlessly. Once
  you have a solid understanding and the remaining unknowns are minor, confirm
  and stop.
- **Do not implement.** This skill is for context priming only. Implementation,
  planning, and code changes are separate steps that come after the user has
  confirmed the context is correct.

## Invocation

Invoke this skill when you need to understand something before acting. Use
`/skill:interview <prompt>` or reference it when a request is vague and needs
clarification before the context window is ready for the next step.
