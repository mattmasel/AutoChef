/* Shared controls and wording for current and requested recall schedules. */
(() => {
  "use strict";
  function update(entry, target) {
    const schedule = entry.querySelector('[data-field="schedule"]').value;
    const mode = entry.querySelector('input[name$="[monthly_mode]"]:checked').value;
    const panels = {
      daily: schedule === "Daily", weekly: schedule === "Weekly",
      monthly: schedule === "Monthly",
      "monthly-numbers": schedule === "Monthly" && mode === "numbers",
      "monthly-pattern": schedule === "Monthly" && mode === "on"
    };
    Object.entries(panels).forEach(([name, active]) => {
      const panel = entry.querySelector(`[data-panel="${name}"]`);
      panel.hidden = panel.disabled = !active;
    });
    const days = [...entry.querySelectorAll('[data-schedule-group="monthly_weekdays"] input')];
    const all = entry.querySelector("[data-select-all-days]");
    if (target === all) days.forEach(day => { day.checked = all.checked; });
    const selected = days.filter(day => day.checked).length;
    all.checked = selected === days.length;
    all.indeterminate = selected > 0 && selected < days.length;
    const activeGroups = new Set(schedule === "Weekly" ? ["weekdays"] : schedule === "Monthly"
      ? ["months", ...(mode === "numbers" ? ["monthdays"] : ["ordinals", "monthly_weekdays"])] : []);
    entry.querySelectorAll("[data-schedule-group]").forEach(group => {
      const inputs = [...group.querySelectorAll("input")];
      const error = activeGroups.has(group.dataset.scheduleGroup) && !inputs.some(input => input.checked)
        ? "Select at least one option." : "";
      inputs[0].setCustomValidity(error);
      inputs[0].setAttribute("aria-invalid", String(Boolean(error)));
      group.querySelector("[data-group-error]").textContent = error;
    });
  }

  function format(data, prefix) {
    const value = key => String(data.get(`${prefix}[${key}]`) ?? "");
    const list = key => data.getAll(`${prefix}[${key}]`).join(", ");
    const schedule = value("schedule");
    if (schedule === "Daily" || schedule === "Weekly") {
      const daily = schedule === "Daily";
      const interval = value(daily ? "daily_interval" : "weekly_interval");
      const unit = daily ? "day" : "week";
      return `${schedule} - Repeat every ${interval} ${unit}${Number(interval) === 1 ? "" : "s"}` +
        (daily ? "" : ` on ${list("weekdays")}`);
    }
    if (schedule === "Monthly") {
      const months = data.getAll(`${prefix}[months]`).length === 12 ? "Every month" : list("months");
      return `Monthly - ${months} - ` + (value("monthly_mode") === "numbers"
        ? `Day Number(s): ${list("monthdays")}`
        : `On: ${list("ordinals")}; Days: ${list("monthly_weekdays")}`);
    }
    return schedule;
  }
  window.AutoChefSchedule = { update, format };
})();
