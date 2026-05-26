---
name: delete-skill
description: Workflow command scaffold for delete-skill in context-mill.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /delete-skill

Use this workflow when working on **delete-skill** in `context-mill`.

## Goal

Removes a skill by deleting its configuration and description files.

## Common Files

- `transformation-config/skills/*/config.yaml`
- `transformation-config/skills/*/description.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Delete 'transformation-config/skills/<skill-name>/config.yaml'
- Delete 'transformation-config/skills/<skill-name>/description.md'

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.