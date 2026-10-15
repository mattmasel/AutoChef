/* Agent output stays in the browser. User values always enter as text nodes. */
(() => {
  "use strict";
  const form = document.getElementById("checklist-form");
  const preview = document.getElementById("agent-preview");
  const status = document.getElementById("agent-status");
  const richButton = document.getElementById("copy-agent");
  const plainButton = document.getElementById("copy-agent-plain");
  let plainText = "";
  let generated = false;
  let stale = false;
  let generatedDay = "";
  const perthDay = () => new Intl.DateTimeFormat("en-GB", {timeZone: "Australia/Perth"}).format(new Date());

  function markStale() {
    if (!generated) return;
    stale = true;
    richButton.disabled = plainButton.disabled = true;
    status.textContent = "Checklist changed. Generate agent instructions again to refresh the preview before copying.";
  }
  form.addEventListener("input", markStale);
  form.addEventListener("change", markStale);

  function generate() {
    richButton.disabled = plainButton.disabled = true;
    stale = true;
    for (const id of ["recall-count", "requested-count"]) {
      document.getElementById(id).dispatchEvent(new Event("change", { bubbles: true }));
    }
    const modify = document.getElementById("job-type").value === "modify";
    const fields = [...form.querySelectorAll("input, select")].filter(field =>
      !field.matches(":disabled") && /^(recall_count|requested_recall_count|recalls\[|requested_recalls\[|requested_ranges\[|batches\[.*\[date\])/.test(field.name));
    function fail(message, field) {
      status.textContent = message;
      if (field) {
        let parent = field.parentElement;
        while (parent) { if (parent.tagName === "DETAILS") parent.open = true; parent = parent.parentElement; }
        field.focus(); field.reportValidity();
      }
    }
    for (const field of fields) {
      if (field.matches("[data-date]")) field.dispatchEvent(new Event("input", { bubbles: true }));
      if (!field.checkValidity()) { fail("Check the highlighted field before generating instructions.", field); return; }
    }
    const data = new FormData(form);
    const value = key => String(data.get(key) ?? "").trim();
    const total = Number(data.get("recall_count"));
    const targetTotal = modify ? Number(data.get("requested_recall_count")) : total;
    if (!total || !targetTotal) { fail("Add at least one current recall type and one active date-range type."); return; }
    for (const field of fields) {
      if ((/\[(name|from|to|date)\]$/.test(field.name)) && !field.value.trim()) {
        fail("Complete recall type names, all upcoming batch dates and active date ranges before generating instructions.", field); return;
      }
    }
    function parseDate(value) {
      const [day, month, year] = value.split(/[/-]/).map(Number);
      const date = new Date(0); date.setUTCFullYear(year, month - 1, day); return date;
    }
    function formatDate(date) {
      return [date.getUTCDate(), date.getUTCMonth() + 1, date.getUTCFullYear()].map((n, i) => String(n).padStart(i === 2 ? 4 : 2, "0")).join("/");
    }
    const todayText = new Intl.DateTimeFormat("en-GB", {timeZone: "Australia/Perth", day: "2-digit", month: "2-digit", year: "numeric"}).format(new Date());
    const today = parseDate(todayText);
    const expiry = new Date(Math.min(...Array.from({length: total}, (_, i) => parseDate(value(`batches[${i}][date]`)).getTime())));
    expiry.setUTCDate(expiry.getUTCDate() - 1);
    if (expiry < today) { fail("The earliest batch leaves no valid SQL window from today. Update upcoming batch dates and obtain updated SQL before generating instructions."); return; }
    const fragment = document.createDocumentFragment();
    const text = [];
    function line(tag, content, italic = false) {
      const element = document.createElement(tag);
      if (italic) { const em = document.createElement("em"); em.textContent = content; element.append(em); }
      else element.textContent = content;
      element.style.cssText = /^h[1-4]$/.test(tag)
        ? `font-size:${{h1:24,h3:16,h4:14}[tag]}px;font-weight:bold;margin:20px 0 10px;`
        : "margin:0 0 8px;";
      fragment.append(element); text.push(content, "");
    }
    function setup(collection, count) {
      function condition(prefix, row) {
        return `${value(`${prefix}[${row}][comparison]`)} ${value(`${prefix}[${row}][amount]`)} ${value(`${prefix}[${row}][unit]`)} in the ${value(`${prefix}[${row}][direction]`)}`;
      }
      for (let i = 0; i < count; i++) {
        const prefix = `${collection}[${i}]`;
        let schedule = value(`${prefix}[schedule]`);
        if (schedule === "Weekly") schedule += ` ${value(`${prefix}[weekday]`)}`;
        if (schedule === "Monthly") schedule += ` ${value(`${prefix}[monthday]`)}`;
        let period = value(`${prefix}[period]`);
        if (value(`${prefix}[mode]`) === "Advanced") {
          period = condition(prefix, "first");
          period = period.charAt(0).toUpperCase() + period.slice(1);
          if (data.has(`${prefix}[and]`)) period += ` AND ${condition(prefix, "second")}`;
        }
        line("p", `${value(`${prefix}[name]`)} - ${schedule} - ${period}`);
      }
    }
    line("h1", "Agent Instructions");
    line("p", "Below checklist approved and SQL supplied.");
    line("h3", "Current Setup");
    setup("recalls", total);
    if (modify) { line("h3", "New Setup"); setup("requested_recalls", targetTotal); }
    line("h4", "Script Expiry Warning");
    line("p", `The attached SQL is only usable between ${todayText} and ${formatDate(expiry)}. If running outside those dates, please contact the automation team for an updated SQL.`);
    line("h3", "Prior to Booking");
    line("p", "Have customer sign attached bulk mod form requesting the following:");
    const names = [];
    for (let i = 0; i < targetTotal; i++) {
      const prefix = `requested_ranges[${i}]`;
      const name = value(`${prefix}[name]`); names.push(name);
      line("p", `Move all patients with recall dates between ${value(`${prefix}[from]`)} and ${value(`${prefix}[to]`)} to ${name}`, true);
    }
    const typeList = names.length === 1 ? names[0] : `${names.slice(0, -1).join(", ")} or ${names.at(-1)}`;
    line("p", `Adjust patient's recall type and dates to be ${names.length > 1 ? "either " : ""}${typeList} depending on last treatment date.`, true);
    line("p", "Book a time with customer to run SQL and make changes to schedule");
    line("h3", "During Booking");
    // Keep job-specific booking steps in one place for future job requirements.
    const bookingSteps = [
      "Backup the database",
      'Make changes to automation (if required - see "New Setup")',
      "Run attached SQL (run 35005 first then 31628 second)"
    ];
    const list = document.createElement("ol");
    list.style.cssText = "margin:0 0 16px;padding-left:24px;";
    bookingSteps.forEach((step, i) => {
      const item = document.createElement("li"); item.textContent = step; list.append(item); text.push(`${i + 1}. ${step}`);
    });
    fragment.append(list);
    preview.replaceChildren(fragment);
    preview.hidden = false;
    plainText = text.join("\n").trim();
    generated = true; stale = false; generatedDay = perthDay();
    richButton.disabled = plainButton.disabled = false;
    status.textContent = "Instructions generated. Review the approval wording, attachments and dates before copying.";
  }

  function selectPreview() {
    preview.focus();
    const range = document.createRange(); range.selectNodeContents(preview);
    const selection = window.getSelection(); selection.removeAllRanges(); selection.addRange(range);
  }

  async function copy(formatted) {
    if (generatedDay !== perthDay()) markStale();
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
      status.textContent = formatted ? "Formatted instructions copied. Paste into your ticket and check the formatting." : "Plain-text instructions copied.";
    } catch (_) {
      selectPreview();
      status.textContent = "Automatic copy is unavailable. Instructions are selected: press Ctrl+C (or Command+C) to copy, then paste into your ticket.";
    }
  }
  document.getElementById("generate-agent").addEventListener("click", generate);
  richButton.addEventListener("click", () => copy(true));
  plainButton.addEventListener("click", () => copy(false));
})();
