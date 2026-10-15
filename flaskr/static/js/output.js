/* Ticket output stays in the browser. User values always enter as text nodes. */
(() => {
  "use strict";
  const form = document.getElementById("checklist-form");
  const preview = document.getElementById("notes-preview");
  const status = document.getElementById("output-status");
  const richButton = document.getElementById("copy-notes");
  const plainButton = document.getElementById("copy-notes-plain");
  let plainText = "";
  let generated = false;
  let stale = false;

  function markStale() {
    if (!generated) return;
    stale = true;
    richButton.disabled = plainButton.disabled = true;
    status.textContent = "Checklist changed. Generate ticket notes again to refresh the preview before copying.";
  }
  form.addEventListener("input", markStale);
  form.addEventListener("change", markStale);

  function generate() {
    // Commit pending count edits before reading dynamically created rows.
    for (const id of ["recall-count", "period-count"]) {
      document.getElementById(id).dispatchEvent(new Event("change", { bubbles: true }));
    }
    // Only validate fields included in the testing output, not requested changes.
    const relevant = [...form.querySelectorAll("input, select")].filter((field) => {
      return !field.matches(":disabled") && /^(recall_count|period_count|recalls\[|batches\[|periods\[|Px\d|PostPx\d)/.test(field.name);
    });
    for (const field of relevant) {
      if (field.matches("[data-date]")) field.dispatchEvent(new Event("input", { bubbles: true }));
      if (!field.checkValidity()) {
        let parent = field.parentElement;
        while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
        field.reportValidity();
        status.textContent = "Check the highlighted field before generating notes.";
        return;
      }
    }
    const data = new FormData(form);
    const value = (key) => String(data.get(key) ?? "").trim() || "Not recorded";
    const total = Number(data.get("recall_count"));
    const periods = Number(data.get("period_count"));
    const fragment = document.createDocumentFragment();
    const text = [];
    function line(tag, content) {
      const element = document.createElement(tag);
      element.textContent = content;
      if (/^h[123]$/.test(tag)) {
        element.style.cssText = `font-size:${{h1:24,h2:20,h3:16}[tag]}px;font-weight:bold;margin:20px 0 10px;`;
      } else element.style.cssText = "margin:0 0 8px;";
      fragment.append(element);
      text.push(content, "");
    }
    line("h1", "Automation Testing Phase");
    line("h2", "Steps Performed");
    const list = document.createElement("ul");
    list.style.cssText = "margin:0 0 16px;padding-left:24px;";
    for (const step of [
      "Ran select statement to check patient recall type including period",
      "Created manual batch to see if any patients are on both automation and manual",
      "Viewed 3 test patients recall information",
      "Viewed upcoming batches"
    ]) {
      const item = document.createElement("li"); item.textContent = step; list.append(item);
      text.push(`- ${step}`);
    }
    fragment.append(list); text.push("");
    line("h2", "Pre-SQL Testing");
    line("h3", "Automation Set");
    line("p", value("recall_set_name"));
    line("h3", "Test Patients");
    for (let i = 1; i <= 3; i++) {
      line("p", `[${value(`Px${i}ID`)}] ${["RecallSet", "RecallPeriod", "RecallDate", "RecallType"].map(key => value(`Px${i}${key}`)).join(" - ")}`);
    }
    line("h3", "Upcoming Recall Batches - Before Changes");
    for (let i = 0; i < total; i++) {
      line("p", `${value(`batches[${i}][date]`)} - ${value(`recalls[${i}][name]`)} - ${value(`batches[${i}][patients]`)} Patients`);
    }
    if (!total) line("p", "None recorded");
    line("h3", "Current Automation Recall Setup");
    function condition(prefix, row) {
      return `${value(`${prefix}[${row}][comparison]`)} ${value(`${prefix}[${row}][amount]`)} ${value(`${prefix}[${row}][unit]`)} in the ${value(`${prefix}[${row}][direction]`)}`;
    }
    for (let i = 0; i < total; i++) {
      const prefix = `recalls[${i}]`;
      let schedule = value(`${prefix}[schedule]`);
      if (schedule === "Weekly") schedule += ` ${value(`${prefix}[weekday]`)}`;
      if (schedule === "Monthly") schedule += ` ${value(`${prefix}[monthday]`)}`;
      let period = value(`${prefix}[period]`);
      if (data.get(`${prefix}[mode]`) === "Advanced") {
        period = condition(prefix, "first");
        period = period.charAt(0).toUpperCase() + period.slice(1);
        if (data.has(`${prefix}[and]`)) period += ` AND ${condition(prefix, "second")}`;
      }
      line("p", `${value(`${prefix}[name]`)} - ${schedule} - ${period}`);
    }
    if (!total) line("p", "None recorded");
    line("h3", "Number of Patients for Each Recall Period");
    for (let i = 0; i < periods; i++) {
      line("p", `Patients on ${value(`periods[${i}][months]`)} month period - ${value(`periods[${i}][patients]`)}`);
    }
    if (!periods) line("p", "None recorded");
    line("h3", "Number of Patients on Manual Recalls");
    line("p", value("manual_patients"));
    line("h2", "Post-SQL Testing");
    line("h3", "Test Patients");
    for (let i = 1; i <= 3; i++) {
      // Read shared identity directly from pre-SQL fields so it cannot diverge.
      line("p", `[${value(`Px${i}ID`)}] ${value(`Px${i}RecallSet`)} - ${["RecallPeriod", "RecallDate", "RecallType"].map(key => value(`PostPx${i}${key}`)).join(" - ")}`);
    }
    preview.replaceChildren(fragment);
    preview.hidden = false;
    plainText = text.join("\n").trim();
    generated = true; stale = false;
    richButton.disabled = plainButton.disabled = false;
    status.textContent = "Notes generated. Review the values and Steps Performed before copying.";
  }

  function selectPreview() {
    preview.focus();
    const range = document.createRange(); range.selectNodeContents(preview);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }

  async function copy(formatted) {
    if (!generated || stale) return;
    try {
      if (formatted) {
        if (!navigator.clipboard?.write || !window.ClipboardItem) throw new Error("Rich clipboard unavailable");
        const html = `<div style="font-family:Arial,sans-serif;font-size:14px;line-height:1.5;color:#202124;background-color:#ffffff;">${preview.innerHTML}</div>`;
        await navigator.clipboard.write([new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([plainText], { type: "text/plain" })
        })]);
      } else {
        await navigator.clipboard.writeText(plainText);
      }
      status.textContent = formatted ? "Formatted notes copied. Paste into your ticket and check the formatting." : "Plain-text notes copied.";
    } catch (_) {
      selectPreview();
      status.textContent = "Automatic copy is unavailable. Notes are selected: press Ctrl+C (or Command+C) to copy, then paste into your ticket.";
    }
  }
  document.getElementById("generate-notes").addEventListener("click", generate);
  richButton.addEventListener("click", () => copy(true));
  plainButton.addEventListener("click", () => copy(false));
})();
