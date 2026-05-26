import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, mkdtempSync, rmSync, existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

import { generatePlugin } from '../plugin-generator.js';

describe('generatePlugin', () => {
    let repoRoot;
    let configDir;
    let tempDir;
    let distDir;

    beforeEach(() => {
        repoRoot = mkdtempSync(join(tmpdir(), 'plugin-gen-'));
        configDir = join(repoRoot, 'transformation-config');
        mkdirSync(configDir, { recursive: true });
        writeFileSync(join(configDir, 'branding.yaml'),
            'author: acme\nplugin:\n  name: acme-plugin\n  description: Acme\n  skill_reminder_hook: false\ndefault_keywords: [acme]\n');

        tempDir = join(repoRoot, 'temp');
        const skillDir = join(tempDir, 'my-skill');
        mkdirSync(skillDir, { recursive: true });
        writeFileSync(join(skillDir, 'SKILL.md'), '---\nname: my-skill\ndescription: x\n---\n# x\n');

        distDir = join(repoRoot, 'dist');
    });

    afterEach(() => rmSync(repoRoot, { recursive: true, force: true }));

    const skills = [{ id: 'my-skill', shortId: 'my-skill', group: 'g', category: 'g', displayName: 'My', description: 'x', type: 'imported', tags: [] }];

    it('emits an ai-plugin-shaped dir: skills/<id> + .claude-plugin/plugin.json', () => {
        const res = generatePlugin({ skills, tempDir, version: '1.0.0', outputDir: distDir, configDir });
        expect(res.skillCount).toBe(1);
        expect(existsSync(join(distDir, 'plugin', 'skills', 'my-skill', 'SKILL.md'))).toBe(true);
        const meta = JSON.parse(readFileSync(join(distDir, 'plugin', '.claude-plugin', 'plugin.json'), 'utf8'));
        expect(meta.name).toBe('acme-plugin');
        expect(meta.author.name).toBe('acme');
        expect(meta.version).toBe('1.0.0');
    });

    it('bundles .claude/agents/*.md into the plugin', () => {
        const agentsDir = join(repoRoot, '.claude', 'agents');
        mkdirSync(agentsDir, { recursive: true });
        writeFileSync(join(agentsDir, 'millwright.md'), '---\nname: millwright\ndescription: guide\n---\nbody\n');

        const res = generatePlugin({ skills, tempDir, version: '1.0.0', outputDir: distDir, configDir });
        expect(res.agentCount).toBe(1);
        expect(existsSync(join(distDir, 'plugin', 'agents', 'millwright.md'))).toBe(true);
    });

    it('omits the agents dir when there are none', () => {
        const res = generatePlugin({ skills, tempDir, version: '1.0.0', outputDir: distDir, configDir });
        expect(res.agentCount).toBe(0);
        expect(existsSync(join(distDir, 'plugin', 'agents'))).toBe(false);
    });
});
