const fs = require('fs');
const path = require('path');

const SCRIPTS_DIR = path.resolve(__dirname, '../scripts');

/**
 * Loads and validates a script file by name (without extension).
 * Scripts are JSON files in the /scripts directory.
 *
 * Script format:
 * {
 *   "name": "example",
 *   "messages": [
 *     { "delay": 1000, "text": "Hello from Slackbot!" },
 *     { "delay": 2000, "text": "How can I help you today?", "blocks": [...] }
 *   ]
 * }
 */
function loadScript(scriptName) {
  const filePath = path.join(SCRIPTS_DIR, `${scriptName}.json`);

  if (!fs.existsSync(filePath)) {
    const available = listScripts().join(', ') || 'none';
    throw new Error(`Script not found. Available scripts: ${available}`);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  let script;
  try {
    script = JSON.parse(raw);
  } catch {
    throw new Error('Script file contains invalid JSON.');
  }

  if (!Array.isArray(script.messages) || script.messages.length === 0) {
    throw new Error('Script must have a non-empty "messages" array.');
  }

  for (const [i, msg] of script.messages.entries()) {
    if (typeof msg.text !== 'string' && !Array.isArray(msg.blocks)) {
      throw new Error(`Message at index ${i} must have "text" or "blocks".`);
    }
  }

  return script;
}

function listScripts() {
  if (!fs.existsSync(SCRIPTS_DIR)) return [];
  return fs
    .readdirSync(SCRIPTS_DIR)
    .filter((f) => f.endsWith('.json'))
    .map((f) => f.replace('.json', ''));
}

module.exports = { loadScript, listScripts };
