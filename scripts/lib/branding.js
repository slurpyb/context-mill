/**
 * Branding — single source of truth for author/repo/plugin identity.
 *
 * Reads transformation-config/branding.yaml so no org name is hardcoded in the
 * generators. Missing file or missing keys fall back to neutral defaults.
 */

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';

const DEFAULTS = {
    author: 'context-mill',
    repo_url: 'https://github.com/slurpyb/context-mill',
    plugin: {
        name: 'context-mill',
        description: '',
        skill_reminder_hook: true,
    },
    default_keywords: ['skills'],
};

function loadBranding(configDir) {
    const brandingPath = path.join(configDir, 'branding.yaml');
    if (!fs.existsSync(brandingPath)) return DEFAULTS;
    const loaded = yaml.load(fs.readFileSync(brandingPath, 'utf8')) || {};
    return {
        ...DEFAULTS,
        ...loaded,
        plugin: { ...DEFAULTS.plugin, ...(loaded.plugin || {}) },
    };
}

export { loadBranding };
