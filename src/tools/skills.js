/**
 * cortex_get_skill  — returns bundled SKILL.md or a named user skill
 * cortex_list_skills — lists all available skills (bundled + user)
 *
 * Universal skill discovery — works with every MCP client:
 *   - Claude Code, Codex, Cursor, Gemini → call cortex_get_skill as a tool
 *   - Antigravity, Claude Desktop, etc.  → via MCP resources/list + resources/read
 *   - npx cortex-mcp                     → skill is bundled in the package
 *   - npm install -g cortex-mcp          → skill is bundled in the package
 */

import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Bundled skills directory — lives inside the npm package at <package>/skills/
// Works regardless of how Cortex was installed (npx, global, local)
const BUNDLED_SKILLS_DIR = path.join(__dirname, '../../skills');

/**
 * Get user skills directory — .cortex/library/skills/ in the user's project.
 */
function getUserSkillsDir(projectPath) {
  if (!projectPath) return null;
  const dir = path.join(projectPath, '.cortex', 'library', 'skills');
  return fs.existsSync(dir) ? dir : null;
}

/**
 * Read a skill file and extract its description from YAML frontmatter or first heading.
 */
function readSkillMeta(filePath, name, source) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    let description = '';

    // Try YAML frontmatter description field
    const fmMatch = content.match(/^---[\r\n]+([\s\S]*?)[\r\n]+---/);
    if (fmMatch) {
      // Handle multiline description (> block scalar)
      const descMatch = fmMatch[1].match(/description:\s*[>|]?\s*[\r\n]?\s*(.+)/);
      if (descMatch) description = descMatch[1].trim();
    }

    // Fall back to first heading
    if (!description) {
      const headingMatch = content.match(/^#{1,2}\s+(.+)/m);
      if (headingMatch) description = headingMatch[1].trim();
    }

    return { name, source, description, filePath };
  } catch {
    return { name, source, description: '', filePath };
  }
}

/**
 * List all available skills — bundled first, then user skills.
 */
function listAllSkills(projectPath) {
  const skills = [];

  // 1. Bundled skills (shipped inside the npm package)
  if (fs.existsSync(BUNDLED_SKILLS_DIR)) {
    const files = fs.readdirSync(BUNDLED_SKILLS_DIR)
      .filter(f => f.endsWith('.md'))
      .sort();
    for (const file of files) {
      const name = file.replace(/\.md$/, '');
      skills.push(readSkillMeta(path.join(BUNDLED_SKILLS_DIR, file), name, 'bundled'));
    }
  }

  // 2. User skills (project's .cortex/library/skills/)
  const userDir = getUserSkillsDir(projectPath);
  if (userDir) {
    const files = fs.readdirSync(userDir)
      .filter(f => f.endsWith('.md'))
      .sort();
    for (const file of files) {
      const name = file.replace(/\.md$/, '');
      // Don't overwrite a bundled skill with same name
      if (!skills.find(s => s.name === name && s.source === 'bundled')) {
        skills.push(readSkillMeta(path.join(userDir, file), name, 'user'));
      }
    }
  }

  return skills;
}

/**
 * Get the content of a named skill.
 * Searches bundled first, then user skills.
 * Defaults to 'cortex' (the main SKILL.md) if no name given.
 */
function getSkillContent(name, projectPath) {
  const skillName = (name || 'cortex').trim();
  const fileName = skillName.endsWith('.md') ? skillName : `${skillName}.md`;

  // 1. Bundled (package directory — always available, even via npx)
  const bundledPath = path.join(BUNDLED_SKILLS_DIR, fileName);
  if (fs.existsSync(bundledPath)) {
    return {
      name: skillName,
      content: fs.readFileSync(bundledPath, 'utf8'),
      source: 'bundled'
    };
  }

  // 2. User skill (project's .cortex/library/skills/)
  const userDir = getUserSkillsDir(projectPath);
  if (userDir) {
    const userPath = path.join(userDir, fileName);
    if (fs.existsSync(userPath)) {
      return {
        name: skillName,
        content: fs.readFileSync(userPath, 'utf8'),
        source: 'user'
      };
    }
  }

  return null;
}

// ─── MCP Tool Registration ───────────────────────────────────────────────────

export function registerSkillTools(server, getProjectPath) {
  // cortex_list_skills
  server.tool(
    'cortex_list_skills',
    'List all available Cortex skills — bundled with the package (always available) plus any user-added skills. ' +
    'Returns name, source ("bundled" or "user"), and description for each.',
    {},
    async () => {
      try {
        const projectPath = getProjectPath ? getProjectPath() : null;
        const skills = listAllSkills(projectPath);
        const result = skills.map(s => ({
          name: s.name,
          source: s.source,
          description: s.description
        }));
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }]
        };
      }
    }
  );

  // cortex_get_skill
  server.tool(
    'cortex_get_skill',
    'Get the full content of a Cortex skill file. ' +
    'Call this at the start of any session to load the complete agent guide. ' +
    'Works with Claude Code, Gemini, Codex, Cursor, OpenCode, and any MCP client. ' +
    'Defaults to the main "cortex" skill (SKILL.md) if no name is given.',
    {
      name: z.string().optional().describe(
        'Skill name to retrieve (e.g., "cortex"). Defaults to the main Cortex agent guide.'
      )
    },
    async (args) => {
      try {
        const projectPath = getProjectPath ? getProjectPath() : null;
        const skill = getSkillContent(args.name, projectPath);

        if (!skill) {
          const available = listAllSkills(projectPath).map(s => s.name);
          return {
            content: [{
              type: 'text',
              text: JSON.stringify({
                error: `Skill "${args.name || 'cortex'}" not found`,
                available_skills: available,
                hint: 'Add skill files as .md files in .cortex/library/skills/'
              })
            }]
          };
        }

        return {
          content: [{
            type: 'text',
            text: JSON.stringify({
              name: skill.name,
              source: skill.source,
              content: skill.content
            }, null, 2)
          }]
        };
      } catch (err) {
        return {
          content: [{ type: 'text', text: JSON.stringify({ error: err.message }) }]
        };
      }
    }
  );
}

// ─── MCP Resources Registration ──────────────────────────────────────────────
// For agent hosts that support the MCP resources protocol (resources/list + resources/read).
// URI scheme: cortex://skills/<name>

export function buildSkillResourceHandlers(getProjectPath) {
  return {
    /**
     * resources/list handler
     * Returns all available skills as MCP resources.
     */
    listResources: async () => {
      const projectPath = getProjectPath ? getProjectPath() : null;
      const skills = listAllSkills(projectPath);
      return {
        resources: skills.map(s => ({
          uri: `cortex://skills/${s.name}`,
          name: `Cortex Skill: ${s.name}`,
          description: s.description || `Cortex agent skill: ${s.name}`,
          mimeType: 'text/markdown'
        }))
      };
    },

    /**
     * resources/read handler
     * Returns skill content for a given cortex://skills/<name> URI.
     */
    readResource: async (uri) => {
      const match = String(uri).match(/^cortex:\/\/skills\/(.+)$/);
      if (!match) {
        throw new Error(`Unknown resource URI: ${uri}. Expected format: cortex://skills/<skill-name>`);
      }

      const skillName = match[1];
      const projectPath = getProjectPath ? getProjectPath() : null;
      const skill = getSkillContent(skillName, projectPath);

      if (!skill) {
        const available = listAllSkills(projectPath).map(s => s.name);
        throw new Error(`Skill not found: ${skillName}. Available: ${available.join(', ')}`);
      }

      return {
        contents: [{
          uri: `cortex://skills/${skillName}`,
          mimeType: 'text/markdown',
          text: skill.content
        }]
      };
    }
  };
}
