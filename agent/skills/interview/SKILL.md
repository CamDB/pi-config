---
name: interview
description: Investigate a question, bug, or feature request by exploring the project and asking clarifying questions before proceeding.
---

# Interview

When given a short prompt (question, bug report, or feature request), follow an interview process to fully understand the request before providing an answer or taking action.

## Process

### Phase 1: Investigate

Begin by exploring the project to build context around the prompt:

1. **Assess the scope** — Is this a question, a bug, or a feature request?
2. **Explore relevant code** — Read files, trace logic, and map out the areas of the codebase related to the prompt. Use `read`, `grep`, `find`, `bash`, or whatever tools are available.
3. **Identify unknowns** — Note anything you cannot determine from code alone (business logic, user intent, edge cases, design preferences, etc.)
4. **Form clarifying questions** — Based on your investigation, prepare specific, targeted questions.

### Phase 2: Ask

Present your findings and questions to the user:

- Summarize what you've discovered so far
- List your clarifying questions clearly, one at a time or in a small batch
- Ask if there's any additional context, constraints, or preferences the user wants to share

### Phase 3: Iterate

After the user responds:

1. Incorporate their answers into your understanding
2. Investigate further if their answers open up new areas to explore
3. Ask follow-up questions if needed
4. Repeat until you are confident you have sufficient information

### Phase 4: Proceed

Once you have enough information:

- **For questions:** Provide a clear, well-reasoned answer with evidence from the codebase
- **For bugs:** Confirm the root cause and propose a fix (or implement it if asked)
- **For features:** Present a plan of action, then implement if asked to proceed

## Guidelines

- **Don't guess.** If something is unclear, ask. It's better to ask one extra question than to make an incorrect assumption.
- **Be efficient.** Group related questions together. Don't ask about things you can determine from the code yourself.
- **Stay focused.** Keep the investigation targeted to the user's prompt. Don't explore unrelated areas.
- **Show your work.** Briefly explain what you found during investigation so the user can follow your reasoning.
- **Know when you have enough.** Don't keep asking questions endlessly. If you have a solid understanding and the remaining unknowns are minor, proceed.

## Invocation

Invoke this skill when the user asks you to investigate a question, bug, or feature before acting on it, or when a request is vague and needs clarification. Use `/skill:interview <prompt>` or simply reference this skill in conversation.
