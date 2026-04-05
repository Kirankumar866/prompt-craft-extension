// popup.js

const apiKeyInput = document.getElementById("api-key-input");
const saveBtn = document.getElementById("save-btn");
const savedMsg = document.getElementById("saved-msg");
const toggleVis = document.getElementById("toggle-vis");
const statusDot = document.getElementById("status-dot");

// Load saved key
chrome.storage.sync.get(["promptcraft_api_key"], ({ promptcraft_api_key }) => {
  if (promptcraft_api_key) {
    apiKeyInput.value = promptcraft_api_key;
    setStatus(true);
  } else {
    setStatus(false);
  }
});

// Save
saveBtn.addEventListener("click", () => {
  const key = apiKeyInput.value.trim();
  if (!key) {
    apiKeyInput.style.borderColor = "rgba(239,68,68,0.6)";
    setTimeout(() => (apiKeyInput.style.borderColor = ""), 1500);
    return;
  }
  if (!key.startsWith("gsk_")) {
    apiKeyInput.style.borderColor = "rgba(239,68,68,0.6)";
    apiKeyInput.placeholder = "Must start with gsk_...";
    setTimeout(() => {
      apiKeyInput.style.borderColor = "";
      apiKeyInput.placeholder = "gsk_...";
    }, 2000);
    return;
  }

  chrome.storage.sync.set({ promptcraft_api_key: key }, () => {
    saveBtn.textContent = "✓ Saved!";
    saveBtn.classList.add("saved");
    savedMsg.classList.add("visible");
    setStatus(true);
    setTimeout(() => {
      saveBtn.textContent = "Save API Key";
      saveBtn.classList.remove("saved");
      savedMsg.classList.remove("visible");
    }, 2500);
  });
});

// Toggle visibility
let visible = false;
toggleVis.addEventListener("click", () => {
  visible = !visible;
  apiKeyInput.type = visible ? "text" : "password";
  toggleVis.textContent = visible ? "🙈" : "👁";
});

// Enter key saves
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveBtn.click();
});

function setStatus(active) {
  statusDot.className = "status-dot" + (active ? "" : " inactive");
  statusDot.title = active ? "Groq API key configured – Llama 3.3 70B active" : "No API key – extension inactive";
}
