// content.js – injects PromptCraft button into ChatGPT, Claude, Gemini, DeepSeek

(function () {
  "use strict";

  // ─── Platform Detection ────────────────────────────────────────────────────
  const PLATFORMS = {
    chatgpt: {
      match: () => location.hostname.includes("chatgpt.com") || location.hostname.includes("chat.openai.com"),
      getInput: () =>
        document.querySelector("#prompt-textarea") ||
        document.querySelector("textarea[data-id]") ||
        document.querySelector("div[contenteditable='true'][data-slate-editor]"),
      getInputValue: (el) => el.value ?? el.innerText,
      setInputValue: (el, val) => {
        if (el.tagName === "TEXTAREA") {
          const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
          nativeInputValueSetter.call(el, val);
          el.dispatchEvent(new Event("input", { bubbles: true }));
        } else {
          el.innerText = val;
          el.dispatchEvent(new InputEvent("input", { bubbles: true }));
        }
      },
      getAnchor: () =>
        document.querySelector("button[data-testid='send-button']")?.parentElement ||
        document.querySelector("button[aria-label='Send prompt']")?.parentElement ||
        document.querySelector("#prompt-textarea")?.parentElement ||
        document.querySelector("form") ||
        document.querySelector(".stretch"),
    },
    claude: {
      match: () => location.hostname.includes("claude.ai"),
      getInput: () =>
        document.querySelector("div[contenteditable='true'].ProseMirror") ||
        document.querySelector('[data-placeholder]') ||
        document.querySelector("div[contenteditable='true']"),
      getInputValue: (el) => el.innerText,
      setInputValue: (el, val) => {
        el.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, val);
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      },
      getAnchor: () =>
        document.querySelector("button[aria-label='Send Message']")?.parentElement ||
        document.querySelector("button[aria-label='Send message']")?.parentElement ||
        document.querySelector("fieldset")?.parentElement ||
        document.querySelector(".flex.items-end"),
    },
    gemini: {
      match: () => location.hostname.includes("gemini.google.com"),
      getInput: () =>
        document.querySelector("rich-textarea .ql-editor") ||
        document.querySelector("div[contenteditable='true']"),
      getInputValue: (el) => el.innerText,
      setInputValue: (el, val) => {
        el.focus();
        document.execCommand("selectAll", false, null);
        document.execCommand("insertText", false, val);
        el.dispatchEvent(new InputEvent("input", { bubbles: true }));
      },
      getAnchor: () =>
        document.querySelector("button.send-button")?.parentElement ||
        document.querySelector("button[aria-label='Send message']")?.parentElement ||
        document.querySelector(".input-area-container"),
    },
    deepseek: {
      match: () => location.hostname.includes("chat.deepseek.com"),
      getInput: () =>
        document.querySelector("textarea#chat-input") ||
        document.querySelector("textarea"),
      getInputValue: (el) => el.value,
      setInputValue: (el, val) => {
        const nativeInputValueSetter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
        nativeInputValueSetter.call(el, val);
        el.dispatchEvent(new Event("input", { bubbles: true }));
      },
      getAnchor: () =>
        document.querySelector("button[type='submit']")?.parentElement ||
        document.querySelector(".input-container") ||
        document.querySelector("textarea")?.parentElement,
    },
  };

  // ─── State ─────────────────────────────────────────────────────────────────
  let activePlatform = null;
  let injected = false;
  let currentModal = null;

  // ─── Detect Platform ───────────────────────────────────────────────────────
  function detectPlatform() {
    for (const [name, config] of Object.entries(PLATFORMS)) {
      if (config.match()) return { name, ...config };
    }
    return null;
  }

  // ─── Create the ✨ Button ──────────────────────────────────────────────────
  function createEnhanceButton() {
    const btn = document.createElement("button");
    btn.id = "promptcraft-btn";
    btn.innerHTML = `
      <span class="pc-icon">✦</span>
      <span class="pc-label">Enhance</span>
    `;
    btn.title = "PromptCraft – Enhance your prompt";
    btn.addEventListener("click", handleEnhanceClick);
    return btn;
  }

  // ─── Inject Button ─────────────────────────────────────────────────────────
  function injectButton() {
    if (document.getElementById("promptcraft-btn")) return;

    const platform = detectPlatform();
    if (!platform) return;
    activePlatform = platform;

    const anchor = platform.getAnchor();
    if (!anchor) return;

    const btn = createEnhanceButton();

    // Create wrapper to avoid breaking flex layouts
    const wrapper = document.createElement("div");
    wrapper.id = "promptcraft-wrapper";
    wrapper.appendChild(btn);

    anchor.style.position = "relative";
    anchor.appendChild(wrapper);
    injected = true;
  }

  // ─── Handle Click ──────────────────────────────────────────────────────────
  async function handleEnhanceClick(e) {
    e.preventDefault();
    e.stopPropagation();

    const platform = activePlatform || detectPlatform();
    if (!platform) return;

    const inputEl = platform.getInput();
    if (!inputEl) {
      showToast("⚠️ Could not find input field.");
      return;
    }

    const userText = platform.getInputValue(inputEl)?.trim();
    if (!userText) {
      showToast("✍️ Type something first, then enhance it!");
      return;
    }

    showLoadingModal(userText);

    // Get API key from storage
    chrome.storage.sync.get(["promptcraft_api_key"], async ({ promptcraft_api_key }) => {
      if (!promptcraft_api_key) {
        closeModal();
        showNoApiKeyModal();
        return;
      }

      chrome.runtime.sendMessage(
        { type: "ENHANCE_PROMPT", userInput: userText, apiKey: promptcraft_api_key },
        (response) => {
          closeModal();
          if (chrome.runtime.lastError || !response) {
            showToast("❌ Extension error. Try reloading.");
            return;
          }
          if (!response.success) {
            if (response.error === "INVALID_API_KEY") {
              showNoApiKeyModal(true);
            } else if (response.error === "RATE_LIMITED") {
              showToast("⏳ Rate limit hit — wait a moment and try again.");
            } else {
              showToast(`❌ ${response.error}`);
            }
            return;
          }
          showPreviewModal(userText, response.enhanced, () => {
            platform.setInputValue(inputEl, response.enhanced);
            inputEl.focus();
          });
        }
      );
    });
  }

  // ─── Loading Modal ─────────────────────────────────────────────────────────
  function showLoadingModal(originalText) {
    closeModal();
    const modal = buildModal(`
      <div class="pc-modal-header">
        <span class="pc-logo">✦ PromptCraft</span>
        <button class="pc-close" id="pc-close-btn">✕</button>
      </div>
      <div class="pc-loading-body">
        <div class="pc-spinner-ring"></div>
        <p class="pc-loading-title">Crafting your prompt…</p>
        <p class="pc-loading-sub">Analyzing intent and building chain-of-thought structure</p>
        <div class="pc-original-preview">
          <span class="pc-tag">Your input</span>
          <p>${escapeHtml(originalText.slice(0, 120))}${originalText.length > 120 ? "…" : ""}</p>
        </div>
      </div>
    `);
    document.body.appendChild(modal);
    currentModal = modal;
    document.getElementById("pc-close-btn")?.addEventListener("click", closeModal);
  }

  // ─── Preview Modal ─────────────────────────────────────────────────────────
  function showPreviewModal(original, enhanced, onInsert) {
    closeModal();
    const modal = buildModal(`
      <div class="pc-modal-header">
        <span class="pc-logo">✦ PromptCraft</span>
        <button class="pc-close" id="pc-close-btn">✕</button>
      </div>
      <div class="pc-preview-body">
        <div class="pc-compare">
          <div class="pc-compare-col">
            <div class="pc-col-label before">Before</div>
            <div class="pc-col-content">${escapeHtml(original)}</div>
          </div>
          <div class="pc-arrow">→</div>
          <div class="pc-compare-col enhanced">
            <div class="pc-col-label after">Enhanced ✦</div>
            <div class="pc-col-content" id="pc-enhanced-text">${escapeHtml(enhanced)}</div>
          </div>
        </div>
        <div class="pc-actions">
          <button class="pc-btn-secondary" id="pc-copy-btn">Copy</button>
          <button class="pc-btn-primary" id="pc-insert-btn">Insert into chat ↵</button>
        </div>
      </div>
    `);
    document.body.appendChild(modal);
    currentModal = modal;

    document.getElementById("pc-close-btn")?.addEventListener("click", closeModal);
    document.getElementById("pc-insert-btn")?.addEventListener("click", () => {
      onInsert();
      closeModal();
      showToast("✦ Enhanced prompt inserted!");
    });
    document.getElementById("pc-copy-btn")?.addEventListener("click", () => {
      navigator.clipboard.writeText(enhanced).then(() => {
        document.getElementById("pc-copy-btn").textContent = "Copied!";
        setTimeout(() => {
          if (document.getElementById("pc-copy-btn"))
            document.getElementById("pc-copy-btn").textContent = "Copy";
        }, 2000);
      });
    });
  }

  // ─── No API Key Modal ──────────────────────────────────────────────────────
  function showNoApiKeyModal(invalid = false) {
    closeModal();
    const modal = buildModal(`
      <div class="pc-modal-header">
        <span class="pc-logo">✦ PromptCraft</span>
        <button class="pc-close" id="pc-close-btn">✕</button>
      </div>
      <div class="pc-nokey-body">
        <div class="pc-nokey-icon">🔑</div>
        <h3>${invalid ? "Invalid API Key" : "API Key Required"}</h3>
        <p>${invalid
        ? "Your Groq API key appears to be invalid. Please check it in the extension popup."
        : "PromptCraft uses Groq's free Llama 3.3 70B to enhance prompts. Add your free Groq API key to get started."
      }</p>
        <a href="https://console.groq.com/keys" target="_blank" class="pc-btn-link">Get free Groq API key →</a>
        <p class="pc-hint">Then click the ✦ extension icon in your toolbar to add it.</p>
      </div>
    `);
    document.body.appendChild(modal);
    currentModal = modal;
    document.getElementById("pc-close-btn")?.addEventListener("click", closeModal);
  }

  // ─── Helpers ───────────────────────────────────────────────────────────────
  function buildModal(innerHtml) {
    const overlay = document.createElement("div");
    overlay.id = "promptcraft-overlay";
    overlay.innerHTML = `<div class="pc-modal">${innerHtml}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeModal();
    });
    return overlay;
  }

  function closeModal() {
    if (currentModal) {
      currentModal.remove();
      currentModal = null;
    }
    document.getElementById("promptcraft-overlay")?.remove();
  }

  function showToast(msg) {
    const existing = document.getElementById("pc-toast");
    if (existing) existing.remove();
    const toast = document.createElement("div");
    toast.id = "pc-toast";
    toast.textContent = msg;
    document.body.appendChild(toast);
    setTimeout(() => toast.classList.add("visible"), 10);
    setTimeout(() => {
      toast.classList.remove("visible");
      setTimeout(() => toast.remove(), 400);
    }, 3000);
  }

  function escapeHtml(text) {
    return text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/\n/g, "<br>");
  }

  // ─── MutationObserver to re-inject after SPA navigation ───────────────────
  let retryCount = 0;
  let isInjecting = false;

  function tryInject() {
    if (injected) return;
    isInjecting = true;
    injectButton();

    if (!injected && retryCount < 20) {
      retryCount++;
      setTimeout(tryInject, 800);
    } else {
      isInjecting = false;
    }
  }

  const observer = new MutationObserver(() => {
    if (!document.getElementById("promptcraft-btn") && !isInjecting) {
      injected = false;
      retryCount = 0;
      setTimeout(tryInject, 200);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });
  tryInject();
})();
