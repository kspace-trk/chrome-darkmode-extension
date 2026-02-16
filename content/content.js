(() => {
  const DARK_MODE_STYLE_ID = "chrome-darkmode-ext-style";
  const DARK_MODE_CLASS = "chrome-darkmode-ext-active";
  const LUMINANCE_THRESHOLD = 0.3;

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

  // Parse "rgb(r, g, b)" or "rgba(r, g, b, a)" to [r, g, b]
  function parseRgb(str) {
    const m = str.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (!m) return null;
    return [Number(m[1]), Number(m[2]), Number(m[3])];
  }

  // Relative luminance (sRGB) per WCAG definition
  function relativeLuminance(r, g, b) {
    const [rs, gs, bs] = [r, g, b].map((c) => {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  }

  // Detect if the site is already dark
  function isSiteAlreadyDark() {
    // 1. Check <meta name="color-scheme"> for "dark"
    const meta = document.querySelector('meta[name="color-scheme"]');
    if (meta) {
      const content = meta.getAttribute("content") || "";
      if (content.includes("dark") && !content.includes("light")) {
        return true;
      }
    }

    // 2. Check CSS color-scheme property on :root / html
    const htmlStyle = getComputedStyle(document.documentElement);
    if (htmlStyle.colorScheme === "dark") {
      return true;
    }

    // 3. Check background color luminance of html and body
    for (const el of [document.documentElement, document.body]) {
      if (!el) continue;
      const bg = getComputedStyle(el).backgroundColor;
      const rgb = parseRgb(bg);
      if (!rgb) continue;
      // Skip transparent / fully transparent backgrounds
      const alphaMatch = bg.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
      if (alphaMatch && Number(alphaMatch[1]) === 0) continue;
      const lum = relativeLuminance(rgb[0], rgb[1], rgb[2]);
      if (lum < LUMINANCE_THRESHOLD) {
        return true;
      }
    }

    return false;
  }

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
    } else if (message.action === "getState") {
      return document.documentElement.classList.contains(DARK_MODE_CLASS);
    }
  });

  // Apply dark mode considering auto-detection
  function applyIfNeeded(data) {
    const hostname = location.hostname;
    const siteConfig = data.siteSettings[hostname];
    const siteEnabled = siteConfig ? siteConfig.enabled : null;

    // Explicit site setting always takes priority (user override)
    if (siteEnabled === false) {
      disable();
      return;
    }
    if (siteEnabled === true) {
      enable();
      return;
    }

    // Global off → disable
    if (!data.enabled) {
      disable();
      return;
    }

    // Auto-detect: skip if site is already dark
    if (isSiteAlreadyDark()) {
      return;
    }

    enable();
  }

  // Wait for DOM to be ready so we can read computed styles
  function onReady() {
    chrome.storage.local.get({ enabled: true, siteSettings: {} }, applyIfNeeded);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", onReady);
  } else {
    onReady();
  }
})();
