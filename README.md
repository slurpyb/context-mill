# Context Mill

This repo assembles context for AI agents and LLMs into [Agent Skills](https://agentskills.io/specification)-compliant packages. See `/transformation-config` for the configuration that drives it.

The context mill gathers content from multiple sources, packages it into a versioned manifest, and ships it as a zip file that any agent or MCP server can consume.

## How it works

The build is an assembly line with three stages:

**1. Context sourcing** — skills come from three places:
- **Native skill groups** in `transformation-config/skills/**` (`config.yaml` + variants), combining example code, fetched docs, prompts, and tag-based guidance.
- **Prebuilt skills** — directories that already contain a `SKILL.md` (+ optional `references/`), e.g. the output of [Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers).
- **ocx profiles** — an [ocx](https://github.com/kdcokenny/ocx) profile/registry directory. Skills there are already in Claude (`SKILL.md`) format, so the importer scans the directory and imports every skill folder it finds.

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
| `dist/plugin/` | A Claude Code plugin (`skills/` + `.claude-plugin/`), shaped like a standard plugin repo |
| `dist/skills-mcp-resources.zip` | Complete bundled archive |

### Adding skills

- **Native**: add a `transformation-config/skills/<group>/config.yaml` with a `variants` array.
- **Prebuilt**: point `sources.yaml` `prebuilt` at a directory containing a `SKILL.md` (e.g. Skill_Seekers output).
- **ocx**: `ocx add <component>` installs skills to `<project>/.opencode/skills/`. Point `sources.yaml` `ocx_profiles` at the project root and they're imported.

## Launch

The build emits a Claude Code plugin at `dist/plugin/`. Load it for a session:

```
pnpm start                                   # builds, then launches claude with the plugin
# equivalently:
pnpm build && claude --plugin-dir="$PWD/dist/plugin"
```

The plugin's skills (and the skill-reminder hook) are registered automatically for that session. Validate the emitted plugin with `claude plugin validate dist/plugin`.

## Reference content

The `examples/` directory holds the original PostHog skills, docs, prompts, and example apps. It is excluded from the default build and kept for reference.
