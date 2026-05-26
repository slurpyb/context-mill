# Example: Skill_Seekers as the glue

[Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) is the context
glue: it scrapes and **merges** many source types (docs, GitHub, PDFs, videos,
notebooks, …) into a single unified skill, with automatic conflict detection
between documented APIs and actual code.

The mill exposes this through the `skill_seekers` source type. During a build it
runs the real `skill-seekers` CLI, then packages the skill(s) the CLI writes to
`<cwd>/output/<name>/`.

- `config:` → `skill-seekers unified --config <file>` — the multi-source merge.
- `source:` → `skill-seekers create <source>` — a single url / `owner/repo` / file.

## Requirements

- The `skill-seekers` CLI on PATH: `uv tool install skill-seekers` (or `pip install skill-seekers`).
- Network access (and, for AI-enhanced merge modes, a Claude API key or the Claude Code CLI).

If the CLI isn't installed, the build fails loudly — it never fabricates output.

## Run it

```
cp examples/skill-seekers/sources.yaml transformation-config/sources.yaml
# edit example_unified.json to point at real sources
pnpm start
```

`example_unified.json` is a template using the real Skill_Seekers unified-config
schema (`name`, `merge_mode`, `sources[]`).
