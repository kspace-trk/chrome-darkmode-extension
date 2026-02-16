const globalToggle = document.getElementById("globalToggle");
const siteToggle = document.getElementById("siteToggle");
const siteLabel = document.getElementById("siteLabel");
const siteList = document.getElementById("siteList");

let currentHostname = null;

// Get current tab hostname
async function getCurrentTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  return tab;
}

// Load state and render
async function init() {
  const tab = await getCurrentTab();
  if (tab && tab.url && !tab.url.startsWith("chrome://")) {
    currentHostname = new URL(tab.url).hostname;
    siteLabel.textContent = currentHostname;
  } else {
    siteLabel.textContent = "利用不可";
    siteToggle.disabled = true;
  }

  chrome.runtime.sendMessage({ action: "getState" }, (data) => {
    if (chrome.runtime.lastError) return;
    render(data);
  });
}

function render(data) {
  globalToggle.checked = data.enabled;

  // Site toggle
  if (currentHostname) {
    const siteConfig = data.siteSettings[currentHostname];
    if (siteConfig && typeof siteConfig.enabled === "boolean") {
      siteToggle.checked = siteConfig.enabled;
    } else {
      siteToggle.checked = data.enabled;
    }
  }

  // Site list
  renderSiteList(data.siteSettings);
}

function renderSiteList(siteSettings) {
  siteList.innerHTML = "";
  const entries = Object.entries(siteSettings);

  if (entries.length === 0) {
    const li = document.createElement("li");
    li.className = "empty-message";
    li.textContent = "サイト別設定なし";
    siteList.appendChild(li);
    return;
  }

  for (const [hostname, config] of entries) {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "site-name";
    nameSpan.textContent = hostname;

    const statusSpan = document.createElement("span");
    statusSpan.className = "site-status";
    statusSpan.textContent = config.enabled ? "ON" : "OFF";

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeSite(hostname));

    li.appendChild(nameSpan);
    li.appendChild(statusSpan);
    li.appendChild(removeBtn);
    siteList.appendChild(li);
  }
}

// Event handlers
globalToggle.addEventListener("change", () => {
  chrome.runtime.sendMessage(
    { action: "setGlobalEnabled", enabled: globalToggle.checked },
    (data) => {
      if (data) render(data);
    }
  );
});

siteToggle.addEventListener("change", () => {
  if (!currentHostname) return;
  chrome.runtime.sendMessage(
    {
      action: "setSiteEnabled",
      hostname: currentHostname,
      enabled: siteToggle.checked,
    },
    (data) => {
      if (data) render(data);
    }
  );
});

function removeSite(hostname) {
  chrome.runtime.sendMessage(
    { action: "removeSiteSetting", hostname },
    (data) => {
      if (data) render(data);
    }
  );
}

init();
