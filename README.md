# Context Mill

This repo assembles context for AI agents and LLMs into [Agent Skills](https://agentskills.io/specification)-compliant packages. See `/transformation-config` for the configuration that drives it.

The context mill gathers content from multiple sources, packages it into a versioned manifest, and ships it as a zip file that any agent or MCP server can consume.

## How it works

The build is an assembly line with three stages:

**1. Context sourcing** — skills come from four places:
- **Native skill groups** in `transformation-config/skills/**` (`config.yaml` + variants), combining example code, fetched docs, prompts, and tag-based guidance.
- **Prebuilt skills** — a directory containing a `SKILL.md` (or a parent of several), e.g. a skill pack already in Claude format.
- **ocx profiles** — an [ocx](https://github.com/kdcokenny/ocx) project. `ocx add` installs Claude-format skills to `<project>/.opencode/skills/`; point at the project root and they're imported.
- **Skill_Seekers (glue)** — the mill shells out to the real [Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers) CLI to scrape and **merge** multiple sources (docs + GitHub + PDF + …) into a unified skill with conflict detection, then packages the result.

**2. Context assembly** — sources are transformed and packaged into per-skill ZIPs plus a portable, self-contained manifest.

**3. Context delivery** — a versioned release of the manifest, consumable by any agent or MCP server as a skill or resource.

## Configuration

Everything lives in `transformation-config/`:

| File | Purpose |
|------|---------|
| `branding.yaml` | Author, repo URL, and plugin identity (single source of truth — no org name is hardcoded). |
| `sources.yaml` | External skill sources: `prebuilt` directories and `ocx_profiles`. |
| `skills/**/config.yaml` | Native skill groups and their variants. |
| `docs.yaml` | Standalone documentation resources, inlined in the manifest. |
| `uri-schema.yaml` | URI scheme and patterns used in the manifest. |
| `commandments.yaml` | Tag-based guidance injected into generated skills. |
| `skip-patterns.yaml` | Files/lines to skip when processing example code. |

## Build

```
pnpm install
pnpm build       # writes dist/ (per-skill ZIPs, manifest.json, skill-menu.json, plugin/, bundle)
pnpm dev         # dev server with incremental rebuilds
pnpm test        # unit tests
```

### Build outputs

| Output | Description |
|--------|-------------|
| `dist/skills/*.zip` | One ZIP per skill |
| `dist/skills/manifest.json` | Resource URIs and metadata |
| `dist/skills/skill-menu.json` | Skills grouped by category |
| `dist/plugin/` | A Claude Code plugin (`skills/` + `agents/` + `.claude-plugin/`), shaped like a standard plugin repo |
| `dist/skills-mcp-resources.zip` | Complete bundled archive |

### Adding skills

- **Native**: add a `transformation-config/skills/<group>/config.yaml` with a `variants` array.
- **Prebuilt**: point `sources.yaml` `prebuilt` at a `SKILL.md` directory (or a parent of several). See `examples/seojuice-skills/`.
- **ocx**: `ocx add <component>` installs skills to `<project>/.opencode/skills/`. Point `sources.yaml` `ocx_profiles` at the project root.
- **Skill_Seekers**: add a `sources.yaml` `skill_seekers` entry (`config:` for a unified merge, or `source:` for one source). Requires the `skill-seekers` CLI. See `examples/skill-seekers/`.

## Launch

The build emits a Claude Code plugin at `dist/plugin/`. Load it for a session:

```
pnpm start                                   # builds, then launches claude with the plugin
# equivalently:
pnpm build && claude --plugin-dir="$PWD/dist/plugin"
```

The plugin's skills, the skill-reminder hook, and any agents in `.claude/agents/` are registered automatically for that session. Validate the emitted plugin with `claude plugin validate dist/plugin`.

### The millwright agent

`.claude/agents/millwright.md` is a resident guide that knows the mill and Skill_Seekers. It's active when you work in this repo, and it's bundled into `dist/plugin/agents/` so anyone who launches the plugin gets it too. Ask it to add skills, wrangle Skill_Seekers, or run upkeep.

## Reference content

The `examples/` directory holds the original PostHog skills, docs, prompts, and example apps. It is excluded from the default build and kept for reference.
