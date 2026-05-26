/**
 * Plugin Generator
 *
 * Emits a single Claude Code plugin at dist/plugin/, shaped like a standard
 * plugin repo (e.g. PostHog/ai-plugin): all skills live under a top-level
 * `skills/` directory, with metadata in `.claude-plugin/plugin.json`. Copy the
 * directory wherever you publish it.
 */

import fs from 'fs';
import path from 'path';
import { loadBranding } from './branding.js';

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
 * Write a UserPromptSubmit hook that nudges the agent to check its skills.
 */
function writeSkillReminderHook(pluginDir) {
    const hooksDir = path.join(pluginDir, 'hooks');
    fs.mkdirSync(hooksDir, { recursive: true });

    const hooksJson = {
        hooks: {
            UserPromptSubmit: [
                { hooks: [{ type: 'command', command: '${CLAUDE_PLUGIN_ROOT}/hooks/skill-reminder.sh' }] },
            ],
        },
    };
    fs.writeFileSync(path.join(hooksDir, 'hooks.json'), JSON.stringify(hooksJson, null, 2));

    const script = `#!/usr/bin/env bash
set -euo pipefail

cat <<'EOF'
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "<IMPORTANT>\\nBefore responding, check if any of your skills apply to this task. Your available skills are listed in your system context. If a skill is relevant and has not been activated in this session, use the Skill tool to activate it.\\n</IMPORTANT>"
  }
}
EOF
`;
    const scriptPath = path.join(hooksDir, 'skill-reminder.sh');
    fs.writeFileSync(scriptPath, script);
    fs.chmodSync(scriptPath, 0o755);
}

/**
 * Build the dist/plugin/ directory from the freshly generated skills.
 *
 * @param {Object} options
 * @param {Array} options.skills - Skill metadata array (from generateAllSkills)
 * @param {string} options.tempDir - Temp dir holding built skill folders
 * @param {string} options.version - Build version
 * @param {string} options.outputDir - Root output directory (dist/)
 * @param {string} options.configDir - transformation-config/ path
 */
function generatePlugin({ skills, tempDir, version, outputDir, configDir }) {
    const branding = loadBranding(configDir);
    const pluginDir = path.join(outputDir, 'plugin');

    fs.rmSync(pluginDir, { recursive: true, force: true });

    let copied = 0;
    for (const skill of skills) {
        const srcDir = path.join(tempDir, skill.id);
        if (!fs.existsSync(srcDir)) {
            console.warn(`  [WARN] Skill directory not found: ${srcDir}`);
            continue;
        }
        copyDirSync(srcDir, path.join(pluginDir, 'skills', skill.id));
        copied++;
    }

    const metaDir = path.join(pluginDir, '.claude-plugin');
    fs.mkdirSync(metaDir, { recursive: true });
    const pluginJson = {
        name: branding.plugin.name,
        description: branding.plugin.description || '',
        version,
        author: { name: branding.author },
        keywords: branding.default_keywords,
    };
    fs.writeFileSync(path.join(metaDir, 'plugin.json'), JSON.stringify(pluginJson, null, 2));

    if (branding.plugin.skill_reminder_hook) {
        writeSkillReminderHook(pluginDir);
    }

    console.log(`  ✓ ${branding.plugin.name} (${copied} skills)`);

    return { pluginDir, skillCount: copied };
}

export { generatePlugin };
