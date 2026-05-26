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
import yaml from 'js-yaml';
import matter from 'gray-matter';

const IMPORTED_TYPE = 'imported';

function loadSourcesConfig(configDir) {
    const sourcesPath = path.join(configDir, 'sources.yaml');
    if (!fs.existsSync(sourcesPath)) return { prebuilt: [], ocx_profiles: [] };
    const loaded = yaml.load(fs.readFileSync(sourcesPath, 'utf8')) || {};
    return {
        prebuilt: loaded.prebuilt || [],
        ocx_profiles: loaded.ocx_profiles || [],
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

// Bookkeeping dirs that never hold skills. Note we deliberately do NOT skip
// all dotfiles: ocx installs components under `.opencode/` and Claude Code
// keeps skills under `.claude/skills/`, so the scan must descend into hidden
// component dirs — only git/ocx receipts and node_modules are pruned.
const SCAN_PRUNE = new Set(['node_modules', '.git', '.ocx']);

/**
 * Recursively find directories that directly contain a SKILL.md, starting at
 * `rootDir`. Does not descend into a skill's own subdirectories.
 */
function findSkillDirs(rootDir) {
    const found = [];
    if (!rootDir || !fs.existsSync(rootDir) || !fs.statSync(rootDir).isDirectory()) return found;

    function walk(dir) {
        if (fs.existsSync(path.join(dir, 'SKILL.md'))) {
            found.push(dir);
            return; // a skill dir is a leaf — don't recurse into references/, etc.
        }
        for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
            if (!entry.isDirectory() || SCAN_PRUNE.has(entry.name)) continue;
            walk(path.join(dir, entry.name));
        }
    }

    walk(rootDir);
    return found;
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
    const { prebuilt, ocx_profiles } = loadSourcesConfig(configDir);
    const targets = [];

    for (const entry of prebuilt) {
        const dir = resolveSourcePath(entry.path, repoRoot);
        if (!dir || !fs.existsSync(path.join(dir, 'SKILL.md'))) {
            log(`  [WARN] prebuilt source has no SKILL.md, skipping: ${entry.path}`);
            continue;
        }
        targets.push({
            skillSrcDir: dir,
            id: entry.id,
            group: entry.group || 'imported',
            tags: entry.tags || [],
        });
    }

    for (const entry of ocx_profiles) {
        const dir = resolveSourcePath(entry.path, repoRoot);
        const skillDirs = findSkillDirs(dir);
        if (skillDirs.length === 0) {
            log(`  [WARN] ocx profile has no SKILL.md skills, skipping: ${entry.path}`);
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
    findSkillDirs,
    listExternalSkills,
    ingestExternalSkills,
    IMPORTED_TYPE,
};
