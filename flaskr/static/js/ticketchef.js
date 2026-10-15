(() => {
  "use strict";
  const button = document.getElementById("copy-ticket");
  if (!button) return;
  button.addEventListener("click", async () => {
    const output = document.getElementById("ticket-output");
    const status = document.getElementById("ticket-copy-status");
    try {
      await navigator.clipboard.writeText(output.value);
      status.textContent = "Ticket copied. Paste it into your ticketing system.";
    } catch (_) {
      output.focus(); output.select();
      status.textContent = "Ticket selected. Press Ctrl+C (or Command+C) to copy.";
    }
  });
})();
