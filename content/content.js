(() => {
  const DARK_MODE_STYLE_ID = "chrome-darkmode-ext-style";
  const DARK_MODE_CLASS = "chrome-darkmode-ext-active";

  const CSS = `
    html.${DARK_MODE_CLASS} {
      filter: invert(1) hue-rotate(180deg) !important;
    }
    html.${DARK_MODE_CLASS} img,
    html.${DARK_MODE_CLASS} video,
    html.${DARK_MODE_CLASS} canvas,
    html.${DARK_MODE_CLASS} svg,
    html.${DARK_MODE_CLASS} picture,
    html.${DARK_MODE_CLASS} iframe,
    html.${DARK_MODE_CLASS} [style*="background-image"] {
      filter: invert(1) hue-rotate(180deg) !important;
    }
  `;

  let styleEl = null;

  function enable() {
    if (document.getElementById(DARK_MODE_STYLE_ID)) return;
    styleEl = document.createElement("style");
    styleEl.id = DARK_MODE_STYLE_ID;
    styleEl.textContent = CSS;
    (document.head || document.documentElement).appendChild(styleEl);
    document.documentElement.classList.add(DARK_MODE_CLASS);
  }

  function disable() {
    const el = document.getElementById(DARK_MODE_STYLE_ID);
    if (el) el.remove();
    document.documentElement.classList.remove(DARK_MODE_CLASS);
    styleEl = null;
  }

  // Listen for messages from background
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action === "enable") {
      enable();
    } else if (message.action === "disable") {
      disable();
    }
  });

  // Apply dark mode only if this site has been explicitly enabled
  function applyIfNeeded(data) {
    const hostname = location.hostname;
    const siteConfig = data.siteSettings[hostname];
    if (siteConfig && siteConfig.enabled === true) {
      enable();
    }
  }

  // Wait for DOM to be ready
  function onReady() {
    chrome.storage.local.get({ siteSettings: {} }, applyIfNeeded);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
