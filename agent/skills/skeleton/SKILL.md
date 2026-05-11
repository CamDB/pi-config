---
name: skeleton
description: For greenfield work, stub out structure with TODO comments and get approval before writing any implementation.
---

# Skeleton

When asked to build something new from scratch (an extension, module, feature, or
script), first produce a **skeleton** — a structural scaffold with TODO comments
describing what each piece should do — and wait for approval before writing a
single line of implementation.

## Why

Building without confirmed structure leads to:
- Wrong assumptions about architecture
- Hundreds of lines written on an unapproved approach
- Rework and wasted tokens when the user wanted something different

A skeleton costs 10–20% of the total session budget and catches structural
errors before they're embedded in implementation.

## Process

### Phase 1: Identify components

Based on the user's request, break the work into components:

- Files, functions, classes, modules
- Data structures and their relationships
- External dependencies (libraries, APIs, other modules in the codebase)

### Phase 2: Write stubs

For each component, write a minimal definition:

- **Function signatures** with parameter and return types
- **Struct/class definitions** with field names and types
- **Module/extension registration** boilerplate
- **No implementation logic** — only the shape

### Phase 3: Annotate with TODOs

Inside each stub, add `// TODO:` comments describing:

- What this component should do
- Input/output contract (what it receives, what it returns)
- Key edge cases or constraints
- Dependencies on other components (reference them by name)

Example:

```ts
// TODO: Sort sessions by creation date, newest first.
// Input: SessionMeta[] (from SessionManager.listAll)
// Output: SessionMeta[] sorted by `created` field (coerced to string)
// Edge case: `created` may not be a Date — use String() coercion
function sortSessions(sessions: SessionMeta[]): SessionMeta[] {
  throw new Error("not implemented");
}
```

### Phase 4: Present and confirm

Show the full skeleton to the user as a diff or a file listing. Explicitly say:
*"This is the skeleton. I haven't written any implementation yet. Does this
structure look right before I fill it in?"*

Do **not** proceed to implementation until the user confirms.

### Phase 5: Implement

Once confirmed, fill in the TODOs one at a time, working from components with
no dependencies (leaves) inward to components that depend on others.

## Guidelines

- **Stubs must compile** (or at least parse). Empty function bodies, `throw new
  Error("not implemented")`, `todo!()`, etc. are fine — but type signatures
  should be real.
- **TODOs are the spec.** A reviewer should understand the full design by
  reading only the TODOs and signatures, without seeing any implementation.
- **Don't over-structure.** If the work is a single function, a single stub
  with 2–3 TODOs is enough. If it's a multi-file module, stub every file.
- **Show dependencies explicitly.** If component B calls component A, say so
  in B's TODO.
- **Ask before implementing.** The skeleton phase ends with explicit user
  approval. Never skip this gate.

## Invocation

Invoke this skill for any greenfield work — new extensions, new modules,
new features with no existing scaffolding. Use `/skill:skeleton` or reference
it when the user asks you to build something from scratch.

If the work is a modification to existing code (not greenfield), this skill
does not apply — use the `interview` skill instead to clarify requirements.
