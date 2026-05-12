const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../triggers.json');

function load() {
  if (!fs.existsSync(STORE_PATH)) return {};
  try {
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return {};
  }
}

function save(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// response: { text: string } | { blocks: array }
function addTrigger(userId, phrase, response) {
  const store = load();
  if (!store[userId]) store[userId] = {};
  store[userId][phrase.toLowerCase()] = response;
  save(store);
}

function removeTrigger(userId, phrase) {
  const store = load();
  if (!store[userId]) return false;
  const key = phrase.toLowerCase();
  if (!store[userId][key]) return false;
  delete store[userId][key];
  save(store);
  return true;
}

function listTriggers(userId) {
  const store = load();
  return store[userId] ?? {};
}

// Returns the stored response object for the first matching trigger, or null.
function matchTrigger(userId, text) {
  const store = load();
  const triggers = store[userId] ?? {};
  const lower = text.toLowerCase();
  for (const [phrase, response] of Object.entries(triggers)) {
    if (typeof response === 'object' && lower.includes(phrase)) return response;
  }
  return null;
}

// Returns a deduplicated list of all responses ever saved across all users,
// formatted for use as modal dropdown options.
function allResponses() {
  const store = load();
  const seen = new Set();
  const results = [];

  for (const triggers of Object.values(store)) {
    for (const response of Object.values(triggers)) {
      const serialized = JSON.stringify(response);
      if (seen.has(serialized)) continue;
      seen.add(serialized);

      const label = response.blocks
        ? `[Block Kit] ${JSON.stringify(response.blocks).slice(0, 50)}…`
        : response.text.length > 60
        ? response.text.slice(0, 60) + '…'
        : response.text;

      results.push({ label, value: serialized });
    }
  }

  return results;
}

module.exports = { addTrigger, removeTrigger, listTriggers, matchTrigger, allResponses };
