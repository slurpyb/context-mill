# Example: SEOJuice skill pack

A worked example of importing a third-party skill pack into the mill.

The `skills/` directory here is vendored from
[calm-north/seojuice-skills](https://github.com/calm-north/seojuice-skills)
(MIT, see `LICENSE`) — 14 SEO skills already in Claude `SKILL.md` format.

Because they're already SKILL.md packages, they use the `prebuilt` source path
(the same path [Skill_Seekers](https://github.com/yusufkaraaslan/Skill_Seekers)
output uses) — no format conversion. `sources.yaml` shows a single `prebuilt`
entry pointing at the parent `skills/` directory, which imports all 14.

## Run it

```
cp examples/seojuice-skills/sources.yaml transformation-config/sources.yaml
pnpm start
```

That builds `dist/plugin/` containing the 14 SEO skills (group `seo`) and
launches `claude --plugin-dir=$PWD/dist/plugin`.
