/* Apply the saved theme early; otherwise follow the operating system. */
(() => {
  "use strict";
  const storageKey = "autochef-theme";
  const systemTheme = window.matchMedia("(prefers-color-scheme: dark)");
  let preference = null;
  let button;

  try {
    const saved = localStorage.getItem(storageKey);
    if (saved === "light" || saved === "dark") preference = saved;
  } catch (_) {
    // Theme switching still works when browser storage is unavailable.
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    document.documentElement.style.colorScheme = theme;
    if (button) button.setAttribute("aria-pressed", String(theme === "dark"));
  }

  applyTheme(preference || (systemTheme.matches ? "dark" : "light"));

  systemTheme.addEventListener("change", (event) => {
    if (!preference) applyTheme(event.matches ? "dark" : "light");
  });

  document.addEventListener("DOMContentLoaded", () => {
    button = document.getElementById("theme-toggle");
    if (!button) return;
    button.hidden = false;
    applyTheme(document.documentElement.getAttribute("data-bs-theme"));
    button.addEventListener("click", () => {
      preference = document.documentElement.getAttribute("data-bs-theme") === "dark" ? "light" : "dark";
      applyTheme(preference);
      try { localStorage.setItem(storageKey, preference); } catch (_) { /* Optional persistence. */ }
    });
  });
})();
