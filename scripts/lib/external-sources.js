/**
 * External skill sources
 *
 * Imports skills that already exist as SKILL.md packages on disk — the output
 * of Skill_Seekers, or skills pulled from an ocx registry/profile (which are
 * already in Claude SKILL.md format). A folder is a skill iff it contains a
 * SKILL.md. No format conversion happens here.
 *
 * Two source types, configured in transformation-config/sources.yaml:
 *   - prebuilt:     one entry == one skill directory
 *   - ocx_profiles: one entry == a directory scanned recursively for skills
 */

import fs from 'fs';
import os from 'os';
import path from 'path';
import { execFileSync } from 'child_process';
import yaml from 'js-yaml';
import matter from 'gray-matter';

const IMPORTED_TYPE = 'imported';

function loadSourcesConfig(configDir) {
    const sourcesPath = path.join(configDir, 'sources.yaml');
    if (!fs.existsSync(sourcesPath)) return { prebuilt: [], ocx_profiles: [], skill_seekers: [] };
    const loaded = yaml.load(fs.readFileSync(sourcesPath, 'utf8')) || {};
    return {
        prebuilt: loaded.prebuilt || [],
        ocx_profiles: loaded.ocx_profiles || [],
        skill_seekers: loaded.skill_seekers || [],
    };
}

/**
 * Resolve a configured path. Supports "~", absolute paths, and paths relative
 * to the repo root.
 */
function resolveSourcePath(p, repoRoot) {
    if (!p) return null;
    let expanded = p;
    if (expanded === '~' || expanded.startsWith('~/')) {
        expanded = path.join(os.homedir(), expanded.slice(1));
    }
    return path.isAbsolute(expanded) ? expanded : path.resolve(repoRoot, expanded);
}

/**
 * Sanitize a string into a filesystem- and URI-safe skill id.
 */
function toSkillId(value) {
    return String(value)
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '') || 'skill';
}

/**
 * Locate the directory ocx installs skills into. `ocx add <component>` writes
 * skills to `<project>/.opencode/skills/<name>/` (the component-type → dir map
 * in ocx is `skill → "skills"`). We accept the project root, a `.opencode`
 * dir, or the `.opencode/skills` dir itself.
 */
function ocxSkillsDir(baseDir) {
    if (!baseDir) return null;
    const candidates = [
        path.join(baseDir, '.opencode', 'skills'),
        path.basename(baseDir) === '.opencode' ? path.join(baseDir, 'skills') : null,
        path.basename(baseDir) === 'skills' ? baseDir : null,
    ].filter(Boolean);
    return candidates.find(d => fs.existsSync(d) && fs.statSync(d).isDirectory()) || null;
}

/**
 * Immediate child directories of `skillsDir` that contain a SKILL.md. ocx lays
 * skills out one-level-deep under `.opencode/skills/`, so this is a flat scan,
 * not a recursive grep.
 */
function skillDirsUnder(skillsDir) {
    if (!skillsDir || !fs.existsSync(skillsDir) || !fs.statSync(skillsDir).isDirectory()) return [];
    return fs.readdirSync(skillsDir, { withFileTypes: true })
        .filter(e => e.isDirectory() && fs.existsSync(path.join(skillsDir, e.name, 'SKILL.md')))
        .map(e => path.join(skillsDir, e.name));
}

/**
 * Where a `skill_seekers` entry's CLI run works and writes. skill-seekers
 * always emits to `output/<name>/` relative to its cwd.
 */
function skillSeekersDirs(entry, repoRoot) {
    const cwd = resolveSourcePath(entry.cwd || '.skill-seekers', repoRoot);
    return { cwd, outputDir: path.join(cwd, 'output') };
}

/**
 * Run the real skill-seekers CLI for one entry. `config` → the multi-source
 * "glue" build (`skill-seekers unified --config`); `source` → a single source
 * (`skill-seekers create`). Throws loudly if the CLI isn't installed — this
 * never fakes the build.
 */
function runSkillSeekers(entry, repoRoot, log = () => {}) {
    const { cwd } = skillSeekersDirs(entry, repoRoot);
    fs.mkdirSync(cwd, { recursive: true });

    let args;
    if (entry.config) args = ['unified', '--config', resolveSourcePath(entry.config, repoRoot)];
    else if (entry.source) args = ['create', String(entry.source)];
    else {
        log(`  [WARN] skill_seekers entry needs 'config' or 'source', skipping`);
        return;
    }
    if (Array.isArray(entry.args)) args.push(...entry.args);

    log(`  → skill-seekers ${args.join(' ')}`);
    try {
        execFileSync('skill-seekers', args, { cwd, stdio: 'inherit' });
    } catch (err) {
        if (err.code === 'ENOENT') {
            throw new Error(
                'skill_seekers source requires the `skill-seekers` CLI. Install it ' +
                '(e.g. `uv tool install skill-seekers` or `pip install skill-seekers`) — ' +
                'see github.com/yusufkaraaslan/Skill_Seekers.',
            );
        }
        throw new Error(`skill-seekers exited non-zero for ${entry.config || entry.source}: ${err.message}`);
    }
}

/**
 * Run skill-seekers for every configured skill_seekers source. Side-effecting;
 * called once at the start of a full ingest (never during metadata listing).
 */
function runSkillSeekersSources({ configDir, repoRoot, log = () => {} }) {
    const { skill_seekers } = loadSourcesConfig(configDir);
    for (const entry of skill_seekers) runSkillSeekers(entry, repoRoot, log);
}

/**
 * Read SKILL.md frontmatter from a skill directory.
 */
function readSkillFrontmatter(skillSrcDir) {
    const parsed = matter(fs.readFileSync(path.join(skillSrcDir, 'SKILL.md'), 'utf8'));
    return parsed.data || {};
}

/**
 * Build the serialized skill object (matching skill-generator's serializeSkill
 * shape) for an imported skill directory.
 */
function describeImportedSkill({ skillSrcDir, id, group, tags = [] }) {
    const fm = readSkillFrontmatter(skillSrcDir);
    const resolvedId = toSkillId(id || fm.name || path.basename(skillSrcDir));
    const description = fm.description || resolvedId;
    const fmTags = Array.isArray(fm.tags) ? fm.tags : [];
    return {
        id: resolvedId,
        shortId: resolvedId,
        category: group,
        displayName: fm.name || resolvedId,
        type: IMPORTED_TYPE,
        group,
        name: description,
        description,
        tags: [...fmTags, ...tags],
    };
}

function copyDirSync(src, dest) {
    fs.mkdirSync(dest, { recursive: true });
    for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);
        if (entry.isDirectory()) copyDirSync(srcPath, destPath);
        else fs.copyFileSync(srcPath, destPath);
    }
}

/**
 * Expand sources.yaml into a flat list of { skillSrcDir, id, group, tags }
 * import targets. Missing paths are skipped with a warning.
 */
function resolveImportTargets({ configDir, repoRoot, log = () => {} }) {
    const { prebuilt, ocx_profiles, skill_seekers } = loadSourcesConfig(configDir);
    const targets = [];

    for (const entry of prebuilt) {
        const dir = resolveSourcePath(entry.path, repoRoot);
        const group = entry.group || 'imported';
        const tags = entry.tags || [];

        // A prebuilt entry may point at a single skill (dir with SKILL.md) or a
        // parent directory holding several skill folders.
        if (dir && fs.existsSync(path.join(dir, 'SKILL.md'))) {
            targets.push({ skillSrcDir: dir, id: entry.id, group, tags });
            continue;
        }
        const children = skillDirsUnder(dir);
        if (children.length === 0) {
            log(`  [WARN] prebuilt source has no SKILL.md skills, skipping: ${entry.path}`);
            continue;
        }
        for (const skillSrcDir of children) {
            targets.push({ skillSrcDir, id: undefined, group, tags });
        }
    }

    for (const entry of ocx_profiles) {
        const dir = resolveSourcePath(entry.path, repoRoot);
        const skillsDir = ocxSkillsDir(dir);
        if (!skillsDir) {
            log(`  [WARN] no .opencode/skills found for ocx source, skipping: ${entry.path}`);
            continue;
        }
        const skillDirs = skillDirsUnder(skillsDir);
        if (skillDirs.length === 0) {
            log(`  [WARN] .opencode/skills is empty (run \`ocx add\` first?), skipping: ${entry.path}`);
            continue;
        }
        for (const skillSrcDir of skillDirs) {
            targets.push({
                skillSrcDir,
                id: undefined, // derived from frontmatter/dir name
                group: entry.group || 'ocx',
                tags: entry.tags || [],
            });
        }
    }

    // skill_seekers: read whatever the CLI already produced under output/.
    // The CLI itself is invoked separately (runSkillSeekersSources), so this
    // stays read-only and safe for metadata-only listing.
    for (const entry of skill_seekers) {
        const { outputDir } = skillSeekersDirs(entry, repoRoot);
        const children = skillDirsUnder(outputDir);
        if (children.length === 0) {
            log(`  [WARN] no skill-seekers output yet for ${entry.config || entry.source}`);
            continue;
        }
        for (const skillSrcDir of children) {
            targets.push({
                skillSrcDir,
                id: undefined,
                group: entry.group || 'imported',
                tags: entry.tags || [],
            });
        }
    }

    return targets;
}

/**
 * Metadata-only pass — no copying. Used by partial rebuilds so the manifest
 * stays complete without touching external dirs.
 */
function listExternalSkills({ configDir, repoRoot, log = () => {} }) {
    return resolveImportTargets({ configDir, repoRoot, log })
        .map(t => describeImportedSkill(t));
}

/**
 * Full ingest — copies each external skill directory into `outputDir/<id>/`
 * and returns the serialized skill objects. Skipped on id collisions with a
 * warning so a native skill is never clobbered.
 */
function ingestExternalSkills({ configDir, repoRoot, outputDir, existingIds = new Set(), log = () => {} }) {
    // Glue step: run skill-seekers first so its output exists before we resolve
    // import targets.
    runSkillSeekersSources({ configDir, repoRoot, log });

    const targets = resolveImportTargets({ configDir, repoRoot, log });
    const seen = new Set(existingIds);
    const skills = [];

    for (const target of targets) {
        const skill = describeImportedSkill(target);
        if (seen.has(skill.id)) {
            log(`  [WARN] duplicate skill id "${skill.id}", skipping import from ${target.skillSrcDir}`);
            continue;
        }
        seen.add(skill.id);

        const destDir = path.join(outputDir, skill.id);
        fs.rmSync(destDir, { recursive: true, force: true });
        copyDirSync(target.skillSrcDir, destDir);

        skills.push(skill);
        log(`  ✓ imported ${skill.id} (group: ${skill.group})`);
    }

    return skills;
}

export {
    loadSourcesConfig,
    resolveSourcePath,
    ocxSkillsDir,
    skillDirsUnder,
    skillSeekersDirs,
    runSkillSeekers,
    runSkillSeekersSources,
    listExternalSkills,
    ingestExternalSkills,
    IMPORTED_TYPE,
};
