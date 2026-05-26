import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import {
    ocxSkillsDir,
    skillDirsUnder,
    listExternalSkills,
    ingestExternalSkills,
} from '../external-sources.js';

function writeSkill(dir, name, frontmatter) {
    const skillDir = join(dir, name);
    mkdirSync(join(skillDir, 'references'), { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), frontmatter);
    writeFileSync(join(skillDir, 'references', 'r.md'), 'ref');
    return skillDir;
}

describe('external-sources — ocx', () => {
    let tmp;
    let configDir;
    let project;

    beforeEach(() => {
        tmp = mkdtempSync(join(tmpdir(), 'ext-src-'));
        configDir = join(tmp, 'transformation-config');
        mkdirSync(configDir, { recursive: true });

        // A realistic ocx project: `ocx add` writes to .opencode/skills/<name>/
        project = join(tmp, 'my-app');
        const skillsDir = join(project, '.opencode', 'skills');
        mkdirSync(skillsDir, { recursive: true });
        writeSkill(skillsDir, 'pragmatic-programmer', '---\nname: pragmatic-programmer\ndescription: Practices\ntags: [craft]\n---\n# PP\n');
        // ocx bookkeeping + a non-skill component that must NOT be imported
        mkdirSync(join(project, '.opencode', 'agents'), { recursive: true });
        writeFileSync(join(project, '.opencode', 'agents', 'reviewer.md'), 'agent');
        writeFileSync(join(project, '.opencode', 'ocx.jsonc'), '{ "registries": {} }');
    });

    afterEach(() => rmSync(tmp, { recursive: true, force: true }));

    it('resolves .opencode/skills from project root, .opencode, or the dir itself', () => {
        const skillsDir = join(project, '.opencode', 'skills');
        expect(ocxSkillsDir(project)).toBe(skillsDir);
        expect(ocxSkillsDir(join(project, '.opencode'))).toBe(skillsDir);
        expect(ocxSkillsDir(skillsDir)).toBe(skillsDir);
        expect(ocxSkillsDir(join(tmp, 'nope'))).toBeNull();
    });

    it('imports only one-level-deep skill folders, ignoring agents/bookkeeping', () => {
        const dirs = skillDirsUnder(join(project, '.opencode', 'skills'));
        expect(dirs).toHaveLength(1);
        expect(dirs[0].endsWith('pragmatic-programmer')).toBe(true);
    });

    function writeSources(yaml) {
        writeFileSync(join(configDir, 'sources.yaml'), yaml);
    }

    it('lists ocx skills with frontmatter metadata (no copy)', () => {
        writeSources(`prebuilt: []\nocx_profiles:\n  - path: ${project}\n    group: ocx\n    tags: [extra]\n`);
        const skills = listExternalSkills({ configDir, repoRoot: tmp });
        expect(skills).toHaveLength(1);
        const s = skills[0];
        expect(s.id).toBe('pragmatic-programmer');
        expect(s.group).toBe('ocx');
        expect(s.type).toBe('imported');
        expect(s.tags).toEqual(['craft', 'extra']);
    });

    it('ingests ocx skills into the output dir', () => {
        writeSources(`prebuilt: []\nocx_profiles:\n  - path: ${project}\n    group: ocx\n`);
        const out = join(tmp, 'out');
        const skills = ingestExternalSkills({ configDir, repoRoot: tmp, outputDir: out });
        expect(skills.map(s => s.id)).toEqual(['pragmatic-programmer']);
        expect(existsSync(join(out, 'pragmatic-programmer', 'SKILL.md'))).toBe(true);
        expect(existsSync(join(out, 'pragmatic-programmer', 'references', 'r.md'))).toBe(true);
    });

    it('warns and skips when .opencode/skills is missing', () => {
        writeSources(`prebuilt: []\nocx_profiles:\n  - path: ${join(tmp, 'no-ocx')}\n    group: ocx\n`);
        const skills = listExternalSkills({ configDir, repoRoot: tmp });
        expect(skills).toEqual([]);
    });

    it('prebuilt: a single entry pointing at a parent dir imports every skill under it', () => {
        const pack = join(tmp, 'pack');
        mkdirSync(pack, { recursive: true });
        writeSkill(pack, 'one', '---\nname: one\ndescription: One\n---\n# one\n');
        writeSkill(pack, 'two', '---\nname: two\ndescription: Two\n---\n# two\n');
        writeSources(`prebuilt:\n  - path: ${pack}\n    group: seo\n    tags: [seo]\nocx_profiles: []\n`);
        const skills = listExternalSkills({ configDir, repoRoot: tmp });
        expect(skills.map(s => s.id).sort()).toEqual(['one', 'two']);
        expect(skills.every(s => s.group === 'seo' && s.tags.includes('seo'))).toBe(true);
    });

    it('prebuilt: a single skill dir (has SKILL.md) imports just that skill with its id', () => {
        const single = join(tmp, 'single');
        mkdirSync(single, { recursive: true });
        writeFileSync(join(single, 'SKILL.md'), '---\nname: solo\ndescription: Solo\n---\n# solo\n');
        writeSources(`prebuilt:\n  - path: ${single}\n    id: custom-id\n    group: imported\nocx_profiles: []\n`);
        const skills = listExternalSkills({ configDir, repoRoot: tmp });
        expect(skills.map(s => s.id)).toEqual(['custom-id']);
    });

    it('skips importing a skill whose id collides with an existing native id', () => {
        writeSources(`prebuilt: []\nocx_profiles:\n  - path: ${project}\n    group: ocx\n`);
        const out = join(tmp, 'out2');
        const skills = ingestExternalSkills({
            configDir,
            repoRoot: tmp,
            outputDir: out,
            existingIds: new Set(['pragmatic-programmer']),
        });
        expect(skills).toEqual([]);
        expect(existsSync(join(out, 'pragmatic-programmer'))).toBe(false);
    });
});
