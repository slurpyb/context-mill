---
name: documentation-tweak
description: Workflow command scaffold for documentation-tweak in context-mill.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /documentation-tweak

Use this workflow when working on **documentation-tweak** in `context-mill`.

## Goal

Makes small updates or refinements to documentation markdown files, such as prompts or readmes.

## Common Files

- `llm-prompts/**/*.md`
- `README.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Edit markdown files in 'llm-prompts/' or 'README.md'

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.