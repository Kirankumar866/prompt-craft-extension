# ✦ PromptCraft – AI Prompt Enhancer

A Chrome Extension that transforms simple ideas into powerful chain-of-thought prompts — right inside ChatGPT, Claude.ai, Gemini, and DeepSeek.

---

## 🚀 Installation (Developer Mode)

1. **Download / unzip** this folder somewhere on your computer.
2. Open Chrome and go to `chrome://extensions/`
3. Toggle **Developer mode** ON (top-right corner).
4. Click **"Load unpacked"** and select the `prompt-enhancer-extension` folder.
5. The ✦ PromptCraft icon will appear in your Chrome toolbar.

---

## 🔑 Setup

1. Click the **✦ PromptCraft icon** in your toolbar.
2. Sign up free at [console.groq.com](https://console.groq.com/keys) and create an API key (starts with `gsk_`).
3. Paste it into the popup and click **Save API Key**.

> **Groq free tier** — 30 requests/minute, 14,400/day on Llama 3.3 70B. More than enough for daily use.

---

## ✨ How to Use

1. Go to **ChatGPT, Claude.ai, Gemini, or DeepSeek**.
2. Type your simple idea in the chat input box.  
   *(e.g. "build a calculator app")*
3. Click the purple **✦ Enhance** button that appears near the send button.
4. A preview popup will show your **original vs enhanced** prompt side-by-side.
5. Click **"Insert into chat ↵"** to replace the input with the enhanced prompt.
6. Hit send and get dramatically better results! 🎯

---

## 🏗️ Architecture

```
prompt-enhancer-extension/
├── manifest.json          # Extension config (MV3)
├── background.js          # Service worker — calls Anthropic API
├── content.js             # Injects button + modal into LLM pages
├── content.css            # All injected UI styles
├── icons/                 # Extension icons (16, 48, 128px)
└── popup/
    ├── popup.html         # Extension popup (API key management)
    └── popup.js           # Popup logic
```

---

## 🌐 Supported Platforms

| Platform | URL |
|----------|-----|
| 🤖 ChatGPT | chatgpt.com |
| 🧠 Claude.ai | claude.ai |
| 💎 Gemini | gemini.google.com |
| 🐋 DeepSeek | chat.deepseek.com |

---

## 🔐 Privacy

- Your API key is stored **locally** in Chrome's sync storage — never sent anywhere except directly to Anthropic's API.
- No analytics, no tracking, no data collection.

---

## 🛠️ Customizing the Prompt Style

To change the enhancement style, edit `background.js` → the `systemPrompt` variable inside `enhancePrompt()`.
