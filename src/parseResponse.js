// Parses user input into a { text } or { blocks } response object.
// If the input is valid JSON containing a blocks array, treat as Block Kit.
// Otherwise treat as plain text (mrkdwn).
function parseResponse(input) {
  const trimmed = input.trim();
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      return { blocks: parsed };
    }
    if (parsed && Array.isArray(parsed.blocks)) {
      return { blocks: parsed.blocks };
    }
    if (parsed && typeof parsed.text === 'string') {
      return { text: parsed.text };
    }
  } catch {
    // not JSON — fall through to plain text
  }
  return { text: trimmed };
}

module.exports = { parseResponse };
