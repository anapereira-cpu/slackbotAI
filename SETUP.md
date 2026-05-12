# Slackbot AI — Setup Guide

## What this is
A Slack app that lets you set up trigger phrases → auto-responses from the bot. Manage everything from the app's Home tab in Slack.

---

## Step 1 — Get the code

1. Make sure you have [Node.js](https://nodejs.org) installed (v18 or higher)
2. Clone the repo:
   ```
   git clone https://github.com/anapereira-cpu/slackbotAI.git
   cd slackbotAI
   ```
3. Install dependencies:
   ```
   npm install
   ```

---

## Step 2 — Create your Slack app

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From a manifest**
3. Select your Slack workspace and click **Next**
4. Delete everything in the text box and paste the contents of `manifest.json` from this repo
5. Click **Next** → **Create**

---

## Step 3 — Enable Socket Mode

1. In your app settings, go to **Socket Mode** (left sidebar)
2. Toggle **Enable Socket Mode** on
3. Give the token a name (e.g. `my-app-token`) and click **Generate**
4. Copy the token that starts with `xapp-` — you'll need it in Step 5

---

## Step 4 — Install the app to your workspace

1. Go to **OAuth & Permissions** (left sidebar)
2. Scroll down to **User Token Scopes** and add:
   - `chat:write`
   - `im:history`
3. Scroll back to the top and click **Install to Workspace** → **Allow**
4. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
5. Copy the **User OAuth Token** (starts with `xoxp-`)

---

## Step 5 — Configure your environment

1. In the project folder, copy the example env file:
   ```
   cp .env.example .env
   ```
2. Open `.env` in a text editor and fill in your tokens:
   ```
   SLACK_BOT_TOKEN=xoxb-...        ← from Step 4
   SLACK_APP_TOKEN=xapp-...        ← from Step 3
   SLACK_USER_TOKEN=xoxp-...       ← from Step 4
   ```
3. Get your **Signing Secret**:
   - Go to **Basic Information** in your app settings
   - Scroll to **App Credentials** → copy **Signing Secret**
   - Paste it into `.env`:
     ```
     SLACK_SIGNING_SECRET=...
     ```

---

## Step 6 — Run the app

```
npm start
```

You should see:
```
Scriptbot is running on port 3000
Now connected to Slack
```

---

## Step 7 — Use it in Slack

1. Open Slack and search for your app by the name you gave it
2. Click on it and go to the **Home** tab
3. Click **+ Add trigger collection** to set up your first trigger phrase and response
4. Send that phrase in the **Messages** tab — the bot will reply automatically

---

## Troubleshooting

**App not responding?**
- Make sure `npm start` is still running in your terminal
- Check that Socket Mode is enabled in your app settings

**"dispatch_failed" error in Slack?**
- Your signing secret is wrong — double check it in Basic Information

**Bot replies but shows wrong name/icon?**
- Go to **App Home** in your app settings and make sure "Always Show My Bot as Online" is checked
