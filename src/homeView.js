function responsePreview(response) {
  if (response.blocks) return '_Block Kit JSON_';
  return response.text.length > 60 ? response.text.slice(0, 60) + '…' : response.text;
}

function buildHomeView(triggers) {
  const entries = Object.entries(triggers);

  const blocks = [
    {
      type: 'header',
      text: { type: 'plain_text', text: 'Scriptbot — Your Trigger Collections', emoji: true },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: 'When you send a message containing a trigger phrase, Slackbot will reply with your response.',
      },
    },
    { type: 'divider' },
  ];

  if (entries.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_You have no trigger collections yet. Add one below._' },
    });
  } else {
    for (const [phrase, response] of entries) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*"${phrase}"*\n${responsePreview(response)}`,
        },
        accessory: {
          type: 'button',
          text: { type: 'plain_text', text: 'Remove', emoji: false },
          style: 'danger',
          action_id: 'remove_trigger',
          value: phrase,
          confirm: {
            title: { type: 'plain_text', text: 'Remove trigger?' },
            text: { type: 'mrkdwn', text: `Remove the trigger *"${phrase}"*?` },
            confirm: { type: 'plain_text', text: 'Remove' },
            deny: { type: 'plain_text', text: 'Cancel' },
          },
        },
      });
    }
  }

  blocks.push({ type: 'divider' });
  blocks.push({
    type: 'actions',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '+ Add trigger collection', emoji: false },
        style: 'primary',
        action_id: 'open_add_trigger_modal',
      },
      ...(entries.length > 0
        ? [
            {
              type: 'button',
              text: { type: 'plain_text', text: 'View all', emoji: false },
              action_id: 'open_triggers_modal',
            },
          ]
        : []),
      {
        type: 'button',
        text: { type: 'plain_text', text: 'Clear previous chat', emoji: false },
        action_id: 'new_conversation',
      },
    ],
  });

  return { type: 'home', blocks };
}

function buildAddTriggerModal(count = 3, existingValues = []) {
  const blocks = [];

  for (let i = 0; i < count; i++) {
    if (i > 0) {
      blocks.push({ type: 'divider', block_id: `divider_block_${i}` });
      blocks.push({
        type: 'section',
        block_id: `header_block_${i}`,
        text: { type: 'mrkdwn', text: `*Dialogue ${i + 1}*` },
      });
    }

    const prePhrase = existingValues[i]?.phrase || '';
    const preResponse = existingValues[i]?.response || '';

    blocks.push({
      type: 'input',
      block_id: `phrase_block_${i}`,
      label: { type: 'plain_text', text: 'Trigger phrase' },
      hint: { type: 'plain_text', text: 'When your message contains this phrase, Slackbot will reply.' },
      optional: true,
      element: {
        type: 'plain_text_input',
        action_id: 'phrase_input',
        ...(prePhrase ? { initial_value: prePhrase } : {}),
        placeholder: { type: 'plain_text', text: 'e.g. hello there' },
      },
    });

    blocks.push({
      type: 'input',
      block_id: `response_block_${i}`,
      label: { type: 'plain_text', text: 'Slackbot response' },
      optional: true,
      hint: {
        type: 'plain_text',
        text: 'Plain text, or paste a Block Kit JSON array for rich messages.',
      },
      element: {
        type: 'plain_text_input',
        action_id: 'response_input',
        multiline: true,
        ...(preResponse ? { initial_value: preResponse } : {}),
        placeholder: {
          type: 'plain_text',
          text: 'Hi there! 👋\n\nor paste Block Kit JSON:\n[{"type":"section","text":{"type":"mrkdwn","text":"Hello!"}}]',
        },
      },
    });
  }

  blocks.push({
    type: 'actions',
    block_id: 'add_more_block',
    elements: [
      {
        type: 'button',
        text: { type: 'plain_text', text: '+ Add more dialogue', emoji: false },
        action_id: 'add_dialogue_pair',
      },
    ],
  });

  return {
    type: 'modal',
    callback_id: 'add_trigger_modal',
    title: { type: 'plain_text', text: 'Add trigger collection' },
    submit: { type: 'plain_text', text: 'Save' },
    close: { type: 'plain_text', text: 'Cancel' },
    private_metadata: JSON.stringify({ count }),
    blocks,
  };
}

function buildTriggersModal(triggers) {
  const entries = Object.entries(triggers);
  const blocks = [];

  if (entries.length === 0) {
    blocks.push({
      type: 'section',
      text: { type: 'mrkdwn', text: '_No trigger collections yet._' },
    });
  } else {
    for (const [phrase, response] of entries) {
      blocks.push({
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `*"${phrase}"*\n${responsePreview(response)}`,
        },
      });
      blocks.push({ type: 'divider' });
    }
  }

  return {
    type: 'modal',
    callback_id: 'triggers_modal',
    title: { type: 'plain_text', text: 'Trigger collections' },
    close: { type: 'plain_text', text: 'Close' },
    blocks,
  };
}

module.exports = { buildHomeView, buildAddTriggerModal, buildTriggersModal };
