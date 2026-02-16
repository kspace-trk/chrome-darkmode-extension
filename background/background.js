// Initialize default settings on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
    chrome.storage.local.set(data);
  });
});

// Update badge based on state
function updateBadge(tabId, isEnabled) {
  chrome.action.setBadgeText({
    text: isEnabled ? "ON" : "OFF",
    tabId,
  });
  chrome.action.setBadgeBackgroundColor({
    color: isEnabled ? "#4CAF50" : "#757575",
    tabId,
  });
}

// Determine if dark mode should be active for a given hostname
function isDarkModeEnabled(data, hostname) {
  const siteConfig = data.siteSettings[hostname];
  if (siteConfig && typeof siteConfig.enabled === "boolean") {
    return siteConfig.enabled;
  }
  return data.enabled;
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getState") {
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      sendResponse(data);
    });
    return true;
  }

  if (message.action === "setGlobalEnabled") {
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      data.enabled = message.enabled;
      chrome.storage.local.set(data, () => {
        // Notify all tabs
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (!tab.url || tab.url.startsWith("chrome://")) continue;
            const hostname = new URL(tab.url).hostname;
            const effective = isDarkModeEnabled(data, hostname);
            chrome.tabs
              .sendMessage(tab.id, {
                action: effective ? "enable" : "disable",
              })
              .catch(() => {});
            updateBadge(tab.id, effective);
          }
        });
        sendResponse(data);
      });
    });
    return true;
  }

  if (message.action === "setSiteEnabled") {
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      if (message.enabled === null) {
        delete data.siteSettings[message.hostname];
      } else {
        data.siteSettings[message.hostname] = { enabled: message.enabled };
      }
      chrome.storage.local.set(data, () => {
        // Notify tabs matching this hostname
        chrome.tabs.query({}, (tabs) => {
          for (const tab of tabs) {
            if (!tab.url || tab.url.startsWith("chrome://")) continue;
            const hostname = new URL(tab.url).hostname;
            if (hostname === message.hostname) {
              const effective = isDarkModeEnabled(data, hostname);
              chrome.tabs
                .sendMessage(tab.id, {
                  action: effective ? "enable" : "disable",
                })
                .catch(() => {});
              updateBadge(tab.id, effective);
            }
          }
        });
        sendResponse(data);
      });
    });
    return true;
  }

  if (message.action === "removeSiteSetting") {
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      delete data.siteSettings[message.hostname];
      chrome.storage.local.set(data, () => {
        sendResponse(data);
      });
    });
    return true;
  }
});

// Update badge when tab is activated or updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === "complete" && tab.url && !tab.url.startsWith("chrome://")) {
    const hostname = new URL(tab.url).hostname;
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      updateBadge(tabId, isDarkModeEnabled(data, hostname));
    });
  }
});

chrome.tabs.onActivated.addListener(({ tabId }) => {
  chrome.tabs.get(tabId, (tab) => {
    if (chrome.runtime.lastError || !tab.url || tab.url.startsWith("chrome://")) return;
    const hostname = new URL(tab.url).hostname;
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, (data) => {
      updateBadge(tabId, isDarkModeEnabled(data, hostname));
    });
  });
});
