---
name: add-or-update-skill
description: Workflow command scaffold for add-or-update-skill in context-mill.
allowed_tools: ["Bash", "Read", "Write", "Grep", "Glob"]
---

# /add-or-update-skill

Use this workflow when working on **add-or-update-skill** in `context-mill`.

## Goal

Adds a new skill or updates an existing skill, including configuration, description, and reference documentation.

## Common Files

- `transformation-config/skills/*/config.yaml`
- `transformation-config/skills/*/description.md`
- `transformation-config/skills/*/references/*.md`

## Suggested Sequence

1. Understand the current state and failure mode before editing.
2. Make the smallest coherent change that satisfies the workflow goal.
3. Run the most relevant verification for touched files.
4. Summarize what changed and what still needs review.

## Typical Commit Signals

- Create or update 'transformation-config/skills/<skill-name>/config.yaml'
- Create or update 'transformation-config/skills/<skill-name>/description.md'
- Create or update reference markdown files under 'transformation-config/skills/<skill-name>/references/'

## Notes

- Treat this as a scaffold, not a hard-coded script.
- Update the command if the workflow evolves materially.