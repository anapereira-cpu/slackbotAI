require('dotenv').config();
const { App } = require('@slack/bolt');
const { loadScript, listScripts } = require('./scriptLoader');
const { playback } = require('./playback');
const { addTrigger, removeTrigger, listTriggers, matchTrigger } = require('./triggerStore');
const { buildHomeView, buildAddTriggerModal, buildTriggersModal } = require('./homeView');
const { parseResponse } = require('./parseResponse');
const { claudeReply } = require('./claudeFallback');

const { WebClient } = require('@slack/web-api');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: process.env.SLACK_APP_TOKEN ? true : false,
  appToken: process.env.SLACK_APP_TOKEN,
});

const userClient = process.env.SLACK_USER_TOKEN
  ? new WebClient(process.env.SLACK_USER_TOKEN)
  : null;

// Render the Home tab whenever a user opens it
app.event('app_home_opened', async ({ event, client }) => {
  await client.views.publish({
    user_id: event.user,
    view: buildHomeView(listTriggers(event.user)),
  });
});

// Open the "View all triggers" modal
app.action('open_triggers_modal', async ({ body, ack, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildTriggersModal(listTriggers(body.user.id)),
  });
});

// Open the "Add trigger" modal
app.action('open_add_trigger_modal', async ({ body, ack, client }) => {
  await ack();
  await client.views.open({
    trigger_id: body.trigger_id,
    view: buildAddTriggerModal(),
  });
});

// "Add more dialogue" button — update modal with one extra pair
app.action('add_dialogue_pair', async ({ ack, body, client }) => {
  await ack();
  const view = body.view;
  const { count } = JSON.parse(view.private_metadata || '{}');
  const currentCount = count || 3;

  const existing = [];
  for (let i = 0; i < currentCount; i++) {
    existing.push({
      phrase: view.state.values[`phrase_block_${i}`]?.phrase_input?.value || '',
      response: view.state.values[`response_block_${i}`]?.response_input?.value || '',
    });
  }

  try {
    await client.views.update({
      view_id: view.id,
      view: buildAddTriggerModal(currentCount + 1, existing),
    });
  } catch (err) {
    console.error('[add_dialogue_pair] views.update failed:', err?.data || err);
  }
});

// Handle modal submission — save all pairs
app.view('add_trigger_modal', async ({ ack, body, view, client }) => {
  const { count } = JSON.parse(view.private_metadata || '{}');
  const totalPairs = count || 3;
  const errors = {};

  const pairs = [];
  for (let i = 0; i < totalPairs; i++) {
    const phrase = view.state.values[`phrase_block_${i}`]?.phrase_input?.value?.trim();
    const rawResponse = view.state.values[`response_block_${i}`]?.response_input?.value?.trim();

    // Skip completely empty pairs
    if (!phrase && !rawResponse) continue;

    if (!phrase) {
      errors[`phrase_block_${i}`] = 'Phrase is required.';
      continue;
    }
    if (!rawResponse) {
      errors[`response_block_${i}`] = 'Enter a response.';
      continue;
    }

    let response;
    try {
      response = parseResponse(rawResponse);
    } catch {
      errors[`response_block_${i}`] = 'Invalid JSON. Check your Block Kit syntax.';
      continue;
    }

    pairs.push({ phrase, response });
  }

  if (Object.keys(errors).length > 0) {
    await ack({ response_action: 'errors', errors });
    return;
  }

  await ack();

  for (const { phrase, response } of pairs) {
    addTrigger(body.user.id, phrase, response);
  }

  await client.views.publish({
    user_id: body.user.id,
    view: buildHomeView(listTriggers(body.user.id)),
  });
});

// Handle "Remove" button on the Home tab
app.action('remove_trigger', async ({ ack, body, action, client }) => {
  await ack();
  removeTrigger(body.user.id, action.value);
  await client.views.publish({
    user_id: body.user.id,
    view: buildHomeView(listTriggers(body.user.id)),
  });
});

// /scriptbot run <script-name>
// /scriptbot trigger add <phrase> <script-name>
// /scriptbot trigger remove <phrase>
// /scriptbot trigger list
// /scriptbot scripts
app.command('/scriptbot', async ({ command, ack, respond, client }) => {
  console.log('[scriptbot] received command:', command.text);
  await ack();

  const parts = command.text.trim().split(/\s+/);
  const [subcommand, ...rest] = parts;

  if (subcommand === 'run') {
    const scriptName = rest[0];
    if (!scriptName) {
      await respond({ text: 'Usage: `/scriptbot run <script-name>`', response_type: 'ephemeral' });
      return;
    }
    let script;
    try {
      script = loadScript(scriptName);
    } catch (err) {
      await respond({ text: `Could not load script \`${scriptName}\`: ${err.message}`, response_type: 'ephemeral' });
      return;
    }
    await respond({ text: `Playing script \`${scriptName}\`...`, response_type: 'ephemeral' });
    await playback(client, command.channel_id, script);
    return;
  }

  if (subcommand === 'scripts') {
    const names = listScripts();
    const text = names.length
      ? `Available scripts:\n${names.map((n) => `• \`${n}\``).join('\n')}`
      : 'No scripts found. Add JSON files to the `scripts/` directory.';
    await respond({ text, response_type: 'ephemeral' });
    return;
  }

  if (subcommand === 'trigger') {
    const [action, ...triggerRest] = rest;

    if (action === 'list') {
      const triggers = listTriggers(command.user_id);
      const entries = Object.entries(triggers);
      const text = entries.length
        ? `Your triggers:\n${entries.map(([phrase, script]) => `• \`${phrase}\` → \`${script}\``).join('\n')}`
        : 'You have no triggers. Use `/scriptbot trigger add <phrase> <script-name>` or visit the app Home tab.';
      await respond({ text, response_type: 'ephemeral' });
      return;
    }

    if (action === 'add') {
      const scriptName = triggerRest[triggerRest.length - 1];
      const phrase = triggerRest.slice(0, -1).join(' ');
      if (!phrase || !scriptName) {
        await respond({ text: 'Usage: `/scriptbot trigger add <phrase> <script-name>`', response_type: 'ephemeral' });
        return;
      }
      try {
        loadScript(scriptName);
      } catch (err) {
        await respond({ text: `Script \`${scriptName}\` not found: ${err.message}`, response_type: 'ephemeral' });
        return;
      }
      addTrigger(command.user_id, phrase, scriptName);
      await respond({ text: `Trigger added: \`${phrase}\` → \`${scriptName}\``, response_type: 'ephemeral' });
      return;
    }

    if (action === 'remove') {
      const phrase = triggerRest.join(' ');
      if (!phrase) {
        await respond({ text: 'Usage: `/scriptbot trigger remove <phrase>`', response_type: 'ephemeral' });
        return;
      }
      const removed = removeTrigger(command.user_id, phrase);
      await respond({
        text: removed ? `Trigger \`${phrase}\` removed.` : `No trigger found for \`${phrase}\`.`,
        response_type: 'ephemeral',
      });
      return;
    }

    await respond({
      text: 'Usage:\n• `/scriptbot trigger add <phrase> <script-name>`\n• `/scriptbot trigger remove <phrase>`\n• `/scriptbot trigger list`',
      response_type: 'ephemeral',
    });
    return;
  }

  await respond({
    text: 'Usage:\n• `/scriptbot run <script-name>`\n• `/scriptbot scripts`\n• `/scriptbot trigger add <phrase> <script-name>`\n• `/scriptbot trigger remove <phrase>`\n• `/scriptbot trigger list`',
    response_type: 'ephemeral',
  });
});

// "New Conversation" button on the Home tab
app.action('new_conversation', async ({ body, ack, client }) => {
  await ack();
  const userId = body.user.id;

  const dm = await client.conversations.open({ users: userId });
  const channelId = dm.channel.id;

  // Delete all messages including thread replies
  const deleteMsg = async (ts, isBotMsg) => {
    try {
      if (isBotMsg) await client.chat.delete({ channel: channelId, ts });
      else if (userClient) await userClient.chat.delete({ channel: channelId, ts });
    } catch {}
  };

  let cursor;
  do {
    const history = await client.conversations.history({
      channel: channelId,
      limit: 200,
      ...(cursor ? { cursor } : {}),
    });
    for (const msg of history.messages) {
      // Delete thread replies first
      if (msg.reply_count > 0) {
        const thread = await client.conversations.replies({ channel: channelId, ts: msg.ts });
        for (const reply of thread.messages) {
          if (reply.ts === msg.ts) continue; // skip parent, handled below
          await deleteMsg(reply.ts, !!reply.bot_id);
        }
      }
      await deleteMsg(msg.ts, !!msg.bot_id);
    }
    cursor = history.response_metadata?.next_cursor;
  } while (cursor);

  await client.views.publish({
    user_id: userId,
    view: buildHomeView(listTriggers(userId)),
  });
});

// Fire matching trigger when a user sends a message
app.message(async ({ message, client }) => {
  if (message.bot_id || !message.user || !message.text || message.channel_type !== 'im') return;

  const response = matchTrigger(message.user, message.text);
  if (!response) return;

  console.log(`[scriptbot] trigger fired for user ${message.user}: "${message.text}"`);

  const payload = { channel: message.channel };
  if (response.text) payload.text = response.text;
  if (response.blocks) payload.blocks = response.blocks;

  await client.chat.postMessage(payload);
  return;
});

// Fallback: no trigger matched
app.message(async ({ message, client }) => {
  if (message.bot_id || !message.user || !message.text || message.channel_type !== 'im') return;
  if (matchTrigger(message.user, message.text)) return;

  console.log(`[fallback] for user ${message.user}: "${message.text}"`);

  const reply = await claudeReply(message.text);
  await client.chat.postMessage({ channel: message.channel, text: reply });
});

(async () => {
  await app.start(process.env.PORT || 3000);
  console.log(`Scriptbot is running on port ${process.env.PORT || 3000}`);
})();
