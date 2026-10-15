/* Retain controls while hiding them, so switching options never erases entries. */
(() => {
  "use strict";
  const form = document.getElementById("checklist-form");
  const count = document.getElementById("recall-count");
  const container = document.getElementById("recall-types");
  const template = document.getElementById("recall-type-template");
  const status = document.getElementById("recall-status");
  const entries = [];
  const batches = [];
  const periods = [];
  const periodCount = document.getElementById("period-count");
  const requestedCount = document.getElementById("requested-count");
  const requestedContainer = document.getElementById("requested-types");
  const requestedEntries = [];
  const jobType = document.getElementById("job-type");
  const draftsByJob = { basic: [], modify: [] };
  const isBasic = () => jobType.value === "basic";
  const ranges = [];
  let rangeDrafts = draftsByJob.basic;
  let activeRangeCount = 0;

  function updateJobType() {
    const basic = isBasic();
    document.getElementById("requested-section").hidden = basic;
    document.getElementById("requested-fields").disabled = basic;
    rangeDrafts = draftsByJob[basic ? "basic" : "modify"];
    const section = basic ? "3" : "8";
    document.getElementById("range-heading").textContent = basic ? "9. Recall date ranges" : "9. Requested recall date ranges";
    document.getElementById("range-help").textContent = `Types follow the order in section ${section}, newest dates first. Enter each From date except the last. Each following To date is calculated as the previous From date minus one day.`;
    document.getElementById("range-empty").textContent = `Add ${basic ? "current" : "requested"} recall types in section ${section} to enter their date ranges.`;
    updateCount();
    updateRequestedCount();
    updateRanges((basic ? entries : requestedEntries).filter(row => !row.hidden).length);
  }

  function parseRangeDate(value) {
    const match = /^(\d{2})-(\d{2})-(\d{4})$/.exec(value);
    if (!match) return null;
    const [, day, month, year] = match.map(Number);
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    return year >= 1900 && year <= 3000 && date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? date : null;
  }

  function formatRangeDate(date) {
    return [String(date.getUTCDate()).padStart(2, "0"),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCFullYear()).padStart(4, "0")].join("-");
  }

  function syncRanges() {
    let previous = null;
    const minimum = parseRangeDate("01-01-1900");
    const maximum = parseRangeDate("01-01-3000");
    for (let index = 0; index < activeRangeCount; index++) {
      const from = document.getElementById(`range-${index}-from`);
      const to = document.getElementById(`range-${index}-to`);
      const last = index === activeRangeCount - 1;
      document.getElementById(`range-${index}-name`).value =
        document.getElementById(`${isBasic() ? "recall" : "requested"}-${index}-name`).value;
      document.getElementById(`range-${index}-name`).placeholder = `Enter type name in section ${isBasic() ? "3" : "8"}`;
      from.readOnly = last;
      from.value = last ? "01-01-1900" : rangeDrafts[index];
      let end = null;
      if (index === 0) end = maximum;
      else if (previous) {
        end = new Date(previous);
        end.setUTCDate(end.getUTCDate() - 1);
      }
      to.value = end ? formatRangeDate(end) : "";
      const start = parseRangeDate(from.value);
      let error = "";
      if (!last && from.value) {
        if (!start) error = "Enter a valid date in dd-mm-yyyy format.";
        else if (start <= minimum || start > maximum) error = "Enter a date after 01-01-1900 and on or before 01-01-3000.";
        else if (end && start > end) error = "This From date must be earlier than the preceding From date.";
      }
      from.setCustomValidity(error);
      from.setAttribute("aria-invalid", String(Boolean(error)));
      document.getElementById(`range-${index}-error`).textContent = error;
      // Never propagate an invalid or out-of-order boundary into later rows.
      previous = !error && start && (index === 0 || previous) ? start : null;
    }
  }

  function updateRanges(total) {
    while (ranges.length < total) {
      ranges.push(addRow("range-template", "requested-ranges", ranges.length));
    }
    while (rangeDrafts.length < total) rangeDrafts.push("");
    activeRangeCount = total;
    setVisibleRows(ranges, total);
    document.getElementById("range-empty").hidden = total !== 0;
    syncRanges();
  }

  function updateRequestedCount() {
    if (!requestedCount.checkValidity() || !Number.isSafeInteger(requestedCount.valueAsNumber)) return;
    const total = requestedCount.valueAsNumber;
    while (requestedEntries.length < total) {
      const entry = addRow("requested-type-template", "requested-types", requestedEntries.length);
      requestedEntries.push(entry);
      updateEntry(entry);
    }
    setVisibleRows(requestedEntries, total);
    document.getElementById("requested-status").textContent = `${total} requested recall ${total === 1 ? "type" : "types"}`;
    if (!isBasic()) updateRanges(total);
  }

  function addRow(templateId, containerId, index) {
    const copy = document.createElement("template");
    copy.innerHTML = document.getElementById(templateId).innerHTML
      .replaceAll("__INDEX__", String(index)).replaceAll("__NUMBER__", String(index + 1));
    const row = copy.content.firstElementChild;
    document.getElementById(containerId).append(row);
    return row;
  }

  function setVisibleRows(rows, total) {
    rows.forEach((row, index) => {
      row.hidden = index >= total;
      row.disabled = index >= total;
    });
  }

  function syncBatchNames() {
    batches.forEach((batch, index) => {
      document.getElementById(`batch-${index}-type`).value =
        document.getElementById(`recall-${index}-name`).value;
    });
  }

  function updatePeriods() {
    if (!periodCount.checkValidity() || !Number.isSafeInteger(periodCount.valueAsNumber)) return;
    const total = periodCount.valueAsNumber;
    while (periods.length < total) {
      periods.push(addRow("period-template", "recall-periods", periods.length));
    }
    setVisibleRows(periods, total);
    document.getElementById("period-status").textContent = `${total} recall period ${total === 1 ? "entry" : "entries"}`;
  }

  function validateDate(input) {
    const value = input.value;
    const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
    const zeroDate = input.hasAttribute("data-allow-zero-date") && value === "00/00/0000";
    let valid = value === "" || zeroDate;
    if (match && !zeroDate) {
      const [, day, month, year] = match.map(Number);
      const date = new Date(0);
      date.setUTCFullYear(year, month - 1, day);
      valid = year >= 1 && date.getUTCFullYear() === year &&
        date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
    }
    input.setCustomValidity(valid ? "" : input.hasAttribute("data-allow-zero-date")
      ? "Enter a valid date in dd/mm/yyyy format or 00/00/0000."
      : "Enter a valid date in dd/mm/yyyy format.");
    input.setAttribute("aria-invalid", String(!valid));
  }

  function showPanel(entry, name, visible) {
    const panel = entry.querySelector(`[data-panel="${name}"]`);
    panel.hidden = !visible;
    // Exclude inactive fields from a future FormData submission.
    panel.disabled = !visible;
  }

  function updateEntry(entry) {
    const schedule = entry.querySelector('[data-field="schedule"]').value;
    const advanced = entry.querySelector('[data-field="mode"]').value === "Advanced";
    const and = entry.querySelector('[data-field="and"]');
    showPanel(entry, "weekly", schedule === "Weekly");
    showPanel(entry, "monthly", schedule === "Monthly");
    showPanel(entry, "simple", !advanced);
    showPanel(entry, "advanced", advanced);
    showPanel(entry, "second", advanced && and.checked);
    and.setAttribute("aria-expanded", String(advanced && and.checked));
  }

  function updateCount() {
    if (!count.checkValidity() || !Number.isSafeInteger(count.valueAsNumber)) return;
    const total = count.valueAsNumber;
    while (entries.length < total) {
      const index = entries.length;
      const copy = document.createElement("template");
      // Only generated numeric indices enter this HTML; user input never does.
      copy.innerHTML = template.innerHTML.replaceAll("__INDEX__", String(index)).replaceAll("__NUMBER__", String(index + 1));
      const entry = copy.content.firstElementChild;
      container.append(entry);
      entries.push(entry);
      updateEntry(entry);
    }
    entries.forEach((entry, index) => {
      entry.hidden = index >= total;
      entry.disabled = index >= total;
    });
    status.textContent = `${total} recall ${total === 1 ? "type" : "types"}`;
    while (batches.length < total) {
      batches.push(addRow("batch-template", "recall-batches", batches.length));
    }
    setVisibleRows(batches, total);
    document.getElementById("batch-empty").hidden = total !== 0;
    syncBatchNames();
    if (isBasic()) updateRanges(total);
  }

  // Use change rather than every keystroke so multi-digit counts can be entered.
  count.addEventListener("change", updateCount);
  jobType.addEventListener("change", updateJobType);
  periodCount.addEventListener("change", updatePeriods);
  requestedCount.addEventListener("change", updateRequestedCount);
  requestedContainer.addEventListener("input", syncRanges);
  requestedContainer.addEventListener("change", (event) => {
    const entry = event.target.closest("[data-recall]");
    if (entry) updateEntry(entry);
    syncRanges();
  });
  document.getElementById("requested-ranges").addEventListener("input", (event) => {
    if (!event.target.matches("[data-range-from]") || event.target.readOnly) return;
    rangeDrafts[Number(event.target.dataset.rangeFrom)] = event.target.value;
    syncRanges();
  });
  container.addEventListener("input", () => { syncBatchNames(); syncRanges(); });
  container.addEventListener("change", (event) => {
    const entry = event.target.closest("[data-recall]");
    if (entry) updateEntry(entry);
    syncBatchNames();
    syncRanges();
  });
  form.addEventListener("input", (event) => {
    if (event.target.matches("[data-date]")) validateDate(event.target);
  });
  form.addEventListener("focusout", (event) => {
    if (event.target.matches("[data-date]")) {
      validateDate(event.target);
      if (!event.target.validity.valid) event.target.reportValidity();
    }
  });
  function syncTestPatients() {
    form.querySelectorAll("[data-patient-source]").forEach(field => {
      field.value = document.getElementById(field.dataset.patientSource).value;
    });
  }
  form.addEventListener("input", syncTestPatients);
  form.addEventListener("change", syncTestPatients);
  syncTestPatients();

  // Enter must not navigate away and discard a partially completed checklist.
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    updateCount();
    updatePeriods();
    updateRequestedCount();
  });
  updateCount();
  updatePeriods();
  updateRequestedCount();
  updateJobType();
})();
