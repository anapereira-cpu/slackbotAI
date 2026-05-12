const SLACKBOT_USERNAME = 'Slackbot';
const SLACKBOT_ICON = 'https://a.slack-edge.com/80588/marketing/img/meta/slack_hash_256.png';
const DEFAULT_DELAY_MS = 1000;

/**
 * Posts each message in the script to the channel with the configured delay,
 * spoofing the display name and icon to look like Slackbot.
 *
 * Slackbot impersonation requires chat:write.customize scope and the bot must
 * have permission to post in the target channel.
 */
async function playback(client, channelId, script) {
  for (const msg of script.messages) {
    const delayMs = typeof msg.delay === 'number' ? msg.delay : DEFAULT_DELAY_MS;
    await sleep(delayMs);

    const payload = {
      channel: channelId,
      username: msg.username ?? SLACKBOT_USERNAME,
      icon_url: msg.icon_url ?? SLACKBOT_ICON,
    };

    if (msg.text) payload.text = msg.text;
    if (Array.isArray(msg.blocks)) payload.blocks = msg.blocks;
    if (msg.thread_ts) payload.thread_ts = msg.thread_ts;

    await client.chat.postMessage(payload);
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { playback };
