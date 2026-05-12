const fs = require('fs');
const path = require('path');

const STORE_PATH = path.resolve(__dirname, '../conversations.json');

function load() {
  if (!fs.existsSync(STORE_PATH)) return {};
  try { return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8')); } catch { return {}; }
}

function save(store) {
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2));
}

// Returns the active thread_ts for a user, or null if none.
function getActiveThread(userId) {
  return load()[userId] ?? null;
}

// Sets (or clears) the active thread for a user.
function setActiveThread(userId, threadTs) {
  const store = load();
  if (threadTs === null) {
    delete store[userId];
  } else {
    store[userId] = threadTs;
  }
  save(store);
}

module.exports = { getActiveThread, setActiveThread };
