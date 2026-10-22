(() => {
  "use strict";
  const button = document.getElementById("copy-ticket");
  if (!button) return;
  const output = document.getElementById("ticket-output");
  const header = document.getElementById("ticket-header");
  button.addEventListener("click", async () => {
    const text = header ? header.value.trimEnd() + (output.value ? "\n\n" + output.value : "") : output.value;
    const status = document.getElementById("ticket-copy-status");
    try {
      await navigator.clipboard.writeText(text);
      status.textContent = "Ticket copied. Paste it into your ticketing system.";
    } catch (_) {
      let fallback = document.getElementById("ticket-copy-fallback");
      if (!fallback) {
        fallback = document.createElement("textarea"); fallback.id = "ticket-copy-fallback";
        fallback.className = "form-control mt-3"; fallback.readOnly = true;
        fallback.setAttribute("aria-label", "Full ticket for manual copying");
        status.after(fallback);
      }
      fallback.value = text; fallback.focus(); fallback.select();
      status.textContent = "Full ticket selected below. Press Ctrl+C (or Command+C) to copy.";
    }
  });
  const save = document.getElementById("save-draft");
  if (!save) return;
  // Stable across retries on this page; never store customer details locally.
  const bytes = crypto.getRandomValues(new Uint8Array(24));
  const key = Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
  let version = "", saving = false;
  const status = document.getElementById("draft-save-status");
  output.addEventListener("input", () => {
    if (version) status.textContent = "Steps changed. Save again to update the draft.";
  });
  save.addEventListener("click", async () => {
    if (saving) return;
    if (!output.value.trim()) { status.textContent = "Write your troubleshooting steps first."; output.focus(); return; }
    saving = true; save.disabled = true;
    const steps = output.value;
    const data = new FormData();
    data.set("csrf_token", save.dataset.csrf);
    data.set("issue", save.dataset.title);
    data.set("solution", steps);
    data.set("capture_key", key); data.set("version", version);
    try {
      const response = await fetch(save.dataset.url, {method: "POST", body: data});
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Draft could not be saved. Your steps are still on this page. Copy them before reloading.");
      version = String(result.version); save.textContent = "Update draft solution";
      status.textContent = output.value === steps ? "Draft saved. Review it later in Draft Solutions." : "Draft saved, but you have newer edits. Save again to include them.";
    } catch (error) { status.textContent = error.message || "Could not save. Please try again."; }
    finally { saving = false; save.disabled = false; }
  });
})();
