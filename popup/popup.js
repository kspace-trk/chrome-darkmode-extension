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
  // Site toggle: ON only if explicitly enabled for this site
  if (currentHostname) {
    const siteConfig = data.siteSettings[currentHostname];
    siteToggle.checked = siteConfig && siteConfig.enabled === true;
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
    li.textContent = "設定済みのサイトなし";
    siteList.appendChild(li);
    return;
  }

  for (const [hostname] of entries) {
    const li = document.createElement("li");

    const nameSpan = document.createElement("span");
    nameSpan.className = "site-name";
    nameSpan.textContent = hostname;

    const removeBtn = document.createElement("button");
    removeBtn.className = "remove-btn";
    removeBtn.textContent = "×";
    removeBtn.addEventListener("click", () => removeSite(hostname));

    li.appendChild(nameSpan);
    li.appendChild(removeBtn);
    siteList.appendChild(li);
  }
}

// Event handlers
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
