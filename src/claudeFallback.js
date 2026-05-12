const FALLBACK_RESPONSES = [
  "Hmm, I don't have a response set up for that yet.",
  "I'm not sure about that one! Try setting up a trigger for it.",
  "No script found for that message. You can add one from my Home tab.",
];

async function claudeReply() {
  const i = Math.floor(Math.random() * FALLBACK_RESPONSES.length);
  return FALLBACK_RESPONSES[i];
}

module.exports = { claudeReply };
