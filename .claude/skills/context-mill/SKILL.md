```markdown
# context-mill Development Patterns

> Auto-generated skill from repository analysis

## Overview

This skill guides you through the development patterns and workflows in the `context-mill` JavaScript repository. It covers coding conventions, file organization, and step-by-step instructions for common tasks such as adding or updating skills, documentation tweaks, triggering releases, and merging branches. Use this as a reference to maintain consistency and efficiency in your contributions.

## Coding Conventions

**File Naming**

- Use kebab-case for all file names.
  - Example: `skill-config.js`, `my-component.test.js`

**Import Style**

- Use relative imports for modules.
  - Example:
    ```javascript
    import { transformData } from './utils/transform-data.js';
    ```

**Export Style**

- Use named exports.
  - Example:
    ```javascript
    // In utils/transform-data.js
    export function transformData(input) {
      // ...
    }
    ```

**Commit Messages**

- Mostly freeform, sometimes prefixed with `chore`.
- Keep commit messages concise (average ~48 characters).

## Workflows

### Add or Update Skill
**Trigger:** When introducing a new skill or updating an existing skill's configuration or documentation.  
**Command:** `/add-skill`

1. Create or update `transformation-config/skills/<skill-name>/config.yaml`.
2. Create or update `transformation-config/skills/<skill-name>/description.md`.
3. Create or update reference markdown files under `transformation-config/skills/<skill-name>/references/`.

**Example:**
```bash
# Add a new skill called "summarize"
mkdir -p transformation-config/skills/summarize/references
touch transformation-config/skills/summarize/config.yaml
touch transformation-config/skills/summarize/description.md
touch transformation-config/skills/summarize/references/example.md
```

---

### Delete Skill
**Trigger:** When removing a skill from the system.  
**Command:** `/delete-skill`

1. Delete `transformation-config/skills/<skill-name>/config.yaml`.
2. Delete `transformation-config/skills/<skill-name>/description.md`.

**Example:**
```bash
rm transformation-config/skills/summarize/config.yaml
rm transformation-config/skills/summarize/description.md
```

---

### Documentation Tweak
**Trigger:** When making small updates or refinements to documentation markdown files (e.g., prompts or README).  
**Command:** `/edit-docs`

1. Edit markdown files in `llm-prompts/` or `README.md` as needed.

**Example:**
```bash
nano llm-prompts/summarize-prompt.md
# or
nano README.md
```

---

### Release Trigger
**Trigger:** When forcing a CI run or cutting a new release (often via empty commits or minor README changes).  
**Command:** `/trigger-release`

1. Create an empty commit or make a minor edit (e.g., to `README.md`).
2. Push to trigger CI/release workflows.

**Example:**
```bash
git commit --allow-empty -m "chore: trigger release"
git push
```

---

### Merge Main or Feature Branch
**Trigger:** When synchronizing branches or landing feature work.  
**Command:** `/merge-branch`

1. Merge the main or feature branch into the current branch.
2. Resolve conflicts and update files as needed, especially:
   - `.github/workflows/build.yml`
   - `package.json`
   - `pnpm-lock.yaml`
   - `scripts/**/*.js`
   - `transformation-config/skills/**/*`

**Example:**
```bash
git checkout feature/my-feature
git merge main
# Resolve conflicts if any
git add .
git commit -m "Merge main into feature/my-feature"
git push
```

## Testing Patterns

- Test files use the pattern `*.test.*` (e.g., `utils.test.js`).
- The testing framework is not explicitly specified; check existing test files for structure and assertions.
- To run tests, use the command appropriate for your setup (e.g., `npm test` or `pnpm test`).

**Example Test File:**
```javascript
// utils/transform-data.test.js
import { transformData } from './transform-data.js';

test('transforms input correctly', () => {
  const result = transformData('input');
  expect(result).toBe('expected output');
});
```

## Commands

| Command          | Purpose                                                      |
|------------------|--------------------------------------------------------------|
| /add-skill       | Add or update a skill (config, description, references)      |
| /delete-skill    | Remove a skill and its configuration/docs                    |
| /edit-docs       | Make small documentation tweaks                              |
| /trigger-release | Trigger a CI build or release                                |
| /merge-branch    | Merge main or feature branch and resolve conflicts           |
```
