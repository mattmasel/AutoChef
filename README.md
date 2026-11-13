# AutoChef

A small Flask starter for building guided workflows, checklists and ticket notes.
Includes a responsive Bootstrap home page and a persistent light/dark toggle.
The recall checklist is available at `/checklist` and from the navbar. Other
home-page features remain planned.

## Get started on Windows

Install Python 3.10 or newer, extract the ZIP, and open a terminal inside the
`autochef` folder (the one containing this README and requirements.txt).

These commands work in PowerShell or Command Prompt without activating a virtual
environment or changing PowerShell's execution policy:

```powershell
py -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app flaskr run --debug
```

Open http://127.0.0.1:5000 in your browser. Stop the server with Ctrl+C.
If `py` is unavailable but `python` works, use `python -m venv .venv` instead.
On later runs, only the final command is needed.

## macOS / Linux

```sh
python3 -m venv .venv
.venv/bin/python -m pip install -r requirements.txt
.venv/bin/python -m flask --app flaskr run --debug
```

Debug mode reloads Python changes during local development. It is not a production
server; turn debug off and choose a production WSGI server when deploying later.
Bootstrap 5.3.8 is loaded from jsDelivr with integrity checks, so styling and the
mobile navbar need internet access. Python dependency installation also needs internet.

## Where things live

| File | Purpose |
| --- | --- |
| `flaskr/__init__.py` | `create_app()` factory: configuration and blueprint registration |
| `flaskr/routes.py` | `main` blueprint and page routes |
| `flaskr/templates/base.html` | Shared Bootstrap layout, navbar, footer and template blocks |
| `flaskr/templates/home.html` | Home page extending the shared layout |
| `flaskr/static/css/style.css` | AutoChef styling and theme colours |
| `flaskr/static/js/theme.js` | Theme selection and browser storage |
| `requirements.txt` | Python dependencies |

The package is named `flaskr`. Run commands from its parent `autochef` folder.
Flask discovers the `create_app` function automatically; no separate `app.py`
or `run.py` is required.

## Checklist update

If you already have AutoChef installed, extract this ZIP and copy the contents
of its `autochef` folder into your existing `autochef` folder, choosing to replace
matching files. Keep your existing `.venv`; it is not included in the ZIP.
No new dependencies are needed. Restart Flask and open
http://127.0.0.1:5000/checklist.

If you have made your own code changes, merge those before replacing files.
The CRN now has its own full-width first section, followed by a separate recall
set name section and then the current recall types and schedule.

The checklist contains CRN and recall set name text fields, a recall type count,
and independent schedule and selection controls for each recall type. Weekly
shows weekdays; Monthly shows dates 1–31. Advanced mode has comparison, unit and
direction dropdowns plus a typed positive whole-number amount with no upper
limit, with an optional second condition joined by “and”. This applies to both
current and requested recall types in both checklists. Rows wrap on small
screens. Switching modes or temporarily reducing the count preserves inputs in
the current page, but inactive fields are excluded from FormData.

The form and ticket output run in the browser. There is no server submission,
database or draft persistence. Refreshing or leaving clears entries. Month-end execution
behaviour is not inferred; this page records the current schedule only.

## Additional checklist sections

- Upcoming recall batches: one date/type/patient-count row per current recall
  type. Names stay linked to section 3 as you type. Reducing and restoring the
  recall count preserves batch dates and patient totals during the current visit.
- Manual recalls: a free-text patient total.
- Test patients: three independent records with ID, recall set, recall period,
  date and recall type. IDs remain text, including any leading zeros.
- Recall period totals: an adjustable number of rows with free-text months and
  a non-negative whole-number patient count. Hidden entries can be restored.

Dates use explicit `dd/mm/yyyy` text entry and validate real calendar dates.
Patient counts allow zero. Test patient set, period and type are independently
editable text fields. Data is still held only in the current page, with no
submission or saving yet. No additional Python dependencies are required.

## Requested changes

Section 8 records Requested Recall Set Types and Schedule with its own count,
names, Daily/Weekly/Monthly schedules, Simple periods and Advanced conditions.
The optional “and” checkbox reveals the second condition row. Both current and
requested sections use the same reusable Jinja macro and conditional behaviour,
with separate field names and IDs. Requested changes do not modify the current
setup or upcoming batches. Reducing/restoring the requested count retains entries
within the current page. No actual automation changes are executed by this form.

## Job type

The dropdown at the start defaults to **Basic Checklist**. Basic hides and
disables Step 8; Step 9 takes its count and type names from the current types in
Step 3. **Modify Recall Setup** shows Step 8 and links Step 9 to the requested
types, as before. Switching modes preserves both sets of entries and keeps
separate date-range drafts for each mode during the current page visit.

The pre-SQL ticket template stays the same in both modes. Switching jobs marks
previously generated notes stale until regenerated. No new dependencies needed.

## Requested recall date ranges

Section 9 has one row per type from section 3 in Basic mode, or section 8 in
Modify mode, in the same order.
Type names are linked. Enter From dates using `dd-mm-yyyy`, newest first.
The first To date is fixed at `01-01-3000`. Each later To date is calculated
from the preceding From date minus one calendar day. The last From date is
fixed at `01-01-1900`; a single type covers both fixed endpoints.

For three types, entering `25-10-2026` and `14-08-2026` produces:

| Type | From | To |
| --- | --- | --- |
| 1 | 25-10-2026 | 01-01-3000 |
| 2 | 14-08-2026 | 24-10-2026 |
| 3 | 01-01-1900 | 13-08-2026 |

Calculations use UTC calendar dates to avoid daylight-saving errors. Invalid
or out-of-order boundaries show inline errors and leave dependent To dates
blank. Reducing/restoring the count retains manually entered boundaries for
this page visit, including when a row temporarily becomes the fixed last row.
The original batch and test-patient date fields still use `dd/mm/yyyy`.

## Ticket output

At the bottom of the checklist, choose **Generate ticket notes**. The formatted
preview follows the supplied Automation Testing Phase / Pre-SQL Testing template,
including the four fixed Steps Performed bullets, automation set, three test
patients, current upcoming batches, current setup, recall-period totals and manual
recall count. Requested changes and CRN are not included in this output template.

Review the fixed Steps Performed statements to ensure they describe work you
actually performed. Blank values show `Not recorded`; zero-row lists show
`None recorded`. Numeric zero is preserved. Invalid entered dates and patient
counts included in the output must be corrected before generation. Requested
changes do not block this pre-SQL output.

**Copy formatted notes** places HTML and plain text on the clipboard for pasting
into a rich-text editor such as the ticket note editor. **Copy plain text** provides
a text-only alternative. If automatic copying is unavailable, the preview is
selected for manual copying with Ctrl+C / Command+C. Actual formatting retention
must be checked in your Zoho Desk editor; it has not been tested in that service.

Checklist edits disable copy until you regenerate, preventing accidental copying
of an outdated preview. Make edits in the checklist, then generate again. The
output uses text nodes for field values so entered HTML is displayed as text.
No customer data is sent to an external service by the generator. No new Python
dependencies are required. Generated output, like the form, clears on refresh.

## Add your next page

Follow the checklist's pattern: add a function decorated with
`@main.route("/your-page")` in `routes.py`, render a new template that extends
`base.html`, and add its `url_for('main.your_function')` link to the navbar.
Use `@main.route`, not `@main.routes`.

## Grow when needed

Keep page routes in `routes.py` initially. As workflows grow, move business logic
into a `services/` package and create separate feature blueprints. A database can
be added later, with its extension initialised inside `create_app()`.
Use the `extra_css` and `extra_js` template blocks for page-specific assets.

The app accepts `FLASK_`-prefixed environment settings and optional factory config
overrides for testing. No database, login or secret key is needed for this starter.
Before adding sessions, flash messages or protected forms, configure a private
`FLASK_SECRET_KEY` environment variable and add appropriate form/CSRF protection.
`.env` files are not automatically loaded by this starter.

Theme preference is stored only in the browser under `autochef-theme`. On first
visit the operating-system preference is used. The toggle uses `aria-pressed`
to communicate whether dark mode is on. If storage is blocked, the toggle still
works for the current page.

## References

- https://flask.palletsprojects.com/en/stable/patterns/appfactories/
- https://flask.palletsprojects.com/en/stable/blueprints/
- https://getbootstrap.com/docs/5.3/getting-started/introduction/
- https://getbootstrap.com/docs/5.3/customize/color-modes/

## Agent instructions

Use **Generate agent instructions** beneath the ticket notes. This creates a separate preview with formatted and plain-text copy buttons. Basic Checklist includes Current Setup; Modify Recall Setup also includes New Setup. Bulk modification lines use the active Step 9 ranges and names. All three During Booking steps remain in both jobs.

The script window starts on the generation date in Australia/Perth and ends one calendar day before the earliest current upcoming batch date in Step 4. Complete all batch dates, active names and range boundaries before generating. A batch on or before today blocks generation; update the batch information and obtain updated SQL. This output does not generate, attach, approve or execute SQL: review the fixed approval wording and supply the attachments before sending.

Editing the checklist disables copying until regeneration. Copying after the Perth date changes also requires regeneration. Entries still clear on refresh. No new Python dependencies.

## Post-SQL test patients

Section 10 follows the same three patient IDs and recall sets from section 6. Enter separate post-SQL period, date and type values. Both pre- and post-SQL patient dates accept `00/00/0000`. Generated ticket notes include these records under Post-SQL Testing; blank fields use Not recorded.

## TicketChef integration

TicketChef is available from the navbar before Checklist, at `/ticketchef/`.
It shares AutoChef's layout, Bootstrap styling and dark-mode toggle. Search and
matching preserve the original RapidFuzz scoring and 60-point threshold. Ticket
previews can be edited before copying. Add Solution retains the minimum-three-keywords
rule and duplicate review with an explicit Add anyway button.

### Updating to this release (Windows)

Stop Flask, merge this project into your existing AutoChef folder, then run:

```powershell
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m flask --app flaskr run --debug
```

RapidFuzz is the new dependency. Continue using the same Flask command and port;
you no longer need a separate TicketChef process.

### Your solutions database

The uploaded database's 121 solutions are included in
`flaskr/ticketchef/seed-solutions.db`. On first launch, AutoChef copies this into
`instance/ticketchef/solutions.db`. Search and Add Solution use that working copy.
The seed is copied only when the working database does not already exist.
**Keep and back up your entire `instance` folder when updating AutoChef**, along
with your existing `.venv`. Update ZIPs exclude the working database, so merging
an update preserves your added solutions. Do not replace the instance folder with
a fresh folder if you want to retain those additions.

If you later import a newer database from the original app, stop Flask and back up
the working database first, then replace `instance/ticketchef/solutions.db` with
your chosen compatible copy. This is a replacement, not an automatic merge.
You can override its location with `FLASK_TICKETCHEF_DATABASE`.

TicketChef customer/connection fields are used for the generated response, not
saved in the solutions database. The original ticket wording includes the
TeamViewer credentials; review the editable preview before copying. Internal
solution notes remain excluded from ticket output. Form submissions use CSRF
tokens. Restarting Flask invalidates open form sessions; reload the page before
submitting. For a stable deployment, set a private `FLASK_SECRET_KEY` environment
variable. Keep using the default local-only Flask address for local work.

Checks performed: all routes and navbar order; search and no-match outcomes;
form retention; HTML escaping; duplicate review and insertion; database persistence
across application creation; edited-preview copying and manual-copy fallback;
existing agent-instruction generation. Visual browser QA was not performed.

### No-match tickets

If no solution matches, TicketChef still generates an editable, copyable ticket with the customer name, query and TeamViewer details. The no-match notice is outside the copied text. Matched solutions continue to append their solution steps. The TeamViewer password field displays plain text, as requested. No dependency changes for this update.

### Manage Solutions

Open TicketChef > Manage Solutions to browse or search the working database. Search checks titles, keywords, solution steps, categories and internal notes; all entered words must match somewhere in a record. Edit opens the existing fields. Save changes updates that record in place; Cancel returns to your search without saving. Editing uses the same required fields and minimum of three keywords as adding a solution. Updated steps and keywords are immediately used by ticket generation. There is no delete action. No new dependencies or database migration are required. Keep the instance folder when merging this update.

## Recall schedules

Current and requested recall types each support One time, Daily (repeat every
number of days), Weekly (repeat every number of weeks on selected weekdays),
and Monthly. Monthly schedules let you choose months and either day numbers
1–31 plus Last, or First/Second/Third/Fourth/Last with selected weekdays.
Last means the final calendar day of the month; selecting 31 alone does not
mean the last day of shorter months. Select all days toggles all seven weekdays
in the monthly On option. Repeat intervals must be positive whole numbers,
and each active checkbox group needs at least one selection.

Selections are retained when switching schedules or monthly options. Only
active options appear in generated ticket notes and agent instructions.
One time has no repeat settings. This checklist documents schedules; it does
not run automation or calculate its execution dates. No new dependencies.

## Draft solutions

When a query has no match, the preview separates customer/TeamViewer details
from troubleshooting steps. Write the solution in the steps box. Copy ticket
combines both sections; Save draft solution sends only the original query as a
suggested title and the steps to the draft queue. Customer-specific text typed
into the query or steps is not automatically redacted: keep it reusable.
Saving again on the same page updates the same draft, without leaving the ticket.

Open TicketChef > Draft Solutions to review pending drafts. Edit any field and
Save draft changes, Approve solution, or Discard draft. Draft saving requires
only title and steps; approval also requires category, subcategory and at least
three keywords. Approval checks for similar existing solutions and offers an
explicit override. Approved drafts enter the existing solutions collection;
pending/discarded drafts never participate in matching or Manage Solutions.
Discard removes a draft from the pending queue; its record stays in the local
database. Repeated approval does not create another solution. Revision checks
prevent an older open tab overwriting a draft that was edited elsewhere.

The first start adds a separate solution_drafts table to the existing working
database without replacing existing solutions. No new dependencies. Stop Flask,
back up instance, merge the update while keeping instance and .venv, and restart.
Drafts persist in instance/ticketchef/solutions.db. Unsaved ticket text remains
page-only, so save a draft or copy your ticket before navigating away.

Validation: tested creation on an existing database, persistence, save/retry,
updates and stale revisions, approval and duplicate review, repeated approval,
discard, CSRF, escaping, matching exclusion, approved-step matching, and copy/save
payload separation. Visual browser testing was not performed.

Modify Recall Setup also includes Existing recall date ranges directly below
Current Recall Set Types and Schedule. These follow the current type names and
count, independently of the requested ranges. Both use newest-first From dates,
calculate each following To date as the preceding From date minus one day, and
use 01-01-3000 / 01-01-1900 for the outer boundaries. Existing ranges appear in
Pre-SQL ticket notes for Modify Recall Setup only. Entries survive count and
job-type changes while the page remains open.

## Automation Todo

Open Todo beside Checklist in the navbar. Create one issue per ticket with its
CRN and a short title; multiple tickets can share a CRN. Select an issue to edit
its ticket number, http(s) ticket link, tasks and working notes. Add tasks one
per line, tick Completed, or mark individual tasks for removal. Click Save
changes to persist all edits. The issue list shows completed/total task counts.
Unsaved edits trigger a browser navigation warning. Concurrent stale saves are
rejected; copy your unsaved text before reloading the latest issue.

Finished issues can be permanently deleted using the confirmation checkbox;
this also deletes their tasks and notes. There is no archive. Zoho tickets are
not modified. Checklist outputs remain in Zoho rather than being duplicated.

Data lives in instance/todo.db (override with FLASK_TODO_DATABASE if needed).
The database is created automatically on first start. Keep your existing
instance and .venv folders when merging updates, and restart Flask. No new
Python dependencies. Checklist has been removed from the planned On the menu
cards; its navbar link is retained.

Verified issue/task lifecycle, restart persistence, separate issues for one
CRN, stale saves, CSRF, unsafe links, escaped notes and cascade deletion.

## Automatic recall coverage checks (Basic 4a and Modify 8a)

Enter schedules and recall conditions as usual. Section 4 now needs just ONE
next batch per current type: send date, Recall From, Recall To, and the batch
time (practice local time, default 09:00). For Modify, enter ONE proposed next
batch per requested type in 8a as well. No assessment start/end dates, manual
starting scopes or repeated preview rows are required.

The entered next batch is a cross-check, not a pattern to blindly repeat.
AutoChef calculates its range from the condition and refuses automatic results
if it does not exactly match the entered D4W From/To. It then generates later
runs using the selected daily/weekly interval or monthly dates/patterns. Weekly
intervals are anchored to the week containing the supplied next run. Missing
monthly day numbers are skipped; Last means the actual final day. Multiple
weekdays/monthdays and monthly ordinal weekdays are supported. A one-time
schedule has only its supplied run and cannot establish recurring continuity.

Confirmed calendar rules:

- Next Week and Advanced IS 1 week in the future cover the whole next
  Monday–Sunday week. IS 1 week in the past covers the previous calendar week.
- Month selections cover whole calendar months; IS 1 month in the past is
  the whole previous month. Month 3 Months ago is the complete month three
  calendar months earlier. Month lengths and leap years are preserved.
- Simple Today/Tomorrow, Next/This/Last Month, Next Quarter (calendar quarter),
  and the 3/6/12-month selections are calculated from calendar boundaries.
- Advanced IS days selects the exact offset date. Bounded AND conditions with
  more/less-than days use strict day boundaries on the selected past/future
  side. More/less-than weeks use seven-day offsets from the send date.
  More/less-than months shift by calendar months from the send date, preserving
  the day number or clamping to the last day of the target month. For the
  verified >1 AND <3 patterns, past endpoints are offset(-3)-1 day through
  offset(-1)-1 day; future endpoints are offset(+1) through offset(+3)-1 day,
  inclusive. The same comparator boundaries are applied to other amounts.
  The asymmetry is intentional and matches eight supplied D4W observations.
  Advanced IS remains a whole-calendar-period selection. Open-ended conditions
  still require review. Each entered next range must match before forecasting.

The checking horizon is automatic: one year of starting cohorts from the latest
next batch, plus a tail calculated from offsets and recurrence spacing. It is
limited to six years and 2,000 generated batches per setup. Cases beyond these
limits return incomplete/manual review, never an all-clear. The first six
calculated runs per type are visible under Calculated upcoming batches. Review
these against D4W before relying on results, especially calendar edge cases.

Basic checks for holes between generated ranges and traces hypothetical cohorts
leaving non-final batches through subsequent types. Advancing occurs at batch
creation without changing the recall date. Completing the final reminder ends
the sequence even though the type is retained. Dates before the initial final
range are not automatically treated as missed. Possible repeat final reminders
require review. Boundary-limited cohorts are reported separately, not labelled
as gaps merely because the forecast ends.

Modify uses one shared generated period for both setups. Hypothetical starting
scopes are derived from the first year of old-schedule coverage for each type;
no patient records are needed. The proposed setup must take effect before all
entered next batches, and reminder stages must correspond in the same order.
If the actual changeover occurs later, update the next-batch information after
accounting for earlier batches. Added/removed/reordered stages need manual
review. Simultaneous overlapping same/adjacent stages have unknown processing
order: enter verified creation times or review manually.

Any detected potential gap forces scripts required, regardless of patient
counts and despite any manual no-script selection. Corrective reassignment
ranges remain in Modify output whenever scripts are required. A clear Modify
result still requires review notes and a no-script decision. Input changes reset
that decision. Basic retains its existing SQL booking workflow for corrective
work; its gap result does not cancel separately required SQL. An ongoing
schedule gap also needs schedule correction. No SQL is generated or run.

Results are explicitly bounded and do not establish historical coverage,
existing stranded patients outside the derived scopes, treatment resets,
patient eligibility/counts or perpetual coverage. A matching next range is a
cross-check, not proof of every D4W edge case. Form entries remain page-only.

Example: Monday Next Week, next batch 16/11/2026 covering 23–29/11/2026;
monthly day 1, Month 3 Months ago, next batch 01/12/2026 covering
01–30/09/2026. The generated next first-stage batch covers 30/11–06/12;
the next monthly batch covers 01–31/10. This setup passes the bounded check.
Changing the first stage to every two weeks creates uncovered weeks.

Verification:

```sh
node tests/preview-engine.cjs
node tests/current-coverage.cjs
node tests/current-coverage-ui.cjs
node tests/coverage-policy.cjs
```

Tests cover the example, generated old/new comparisons, recurrence, calendar and
leap-year boundaries, eight observed D4W week/month comparison ranges, gaps,
mismatch rejection, mandatory-script decisions,
output integration, state invalidation and job switching. Flask page rendering
passes. Full visual browser testing remains outstanding: Chromium could not
launch in the development environment.

### Suggest conditions while keeping the schedule

Both checklist assessments now include **Suggest changes — keep schedule**.
Basic searches alternatives for the current setup; Modify searches the proposed
setup. Up to three alternatives show exact Advanced conditions, original and
suggested next ranges, and three calculated upcoming batches per changed type.
All sending schedules, batch times, reminder names and order are preserved.

The initial search proposes bounded more/less-than **week** conditions on the
same past/future side as the existing range. It targets the longest generated
interval between runs and tries nearby timing alternatives, including coordinated
changes to affected types. Each offered alternative must pass the whole setup's
coverage and chronological progression checks, with no pending progression or
repeated-final warnings. This is a bounded, limited search, not an exhaustive
solver; one-time schedules, crossing-zero ranges and cases requiring different
units or processing order may need manual review. In particular, D4W's asymmetric
past-week endpoints can create overlap; alternatives causing repeated final
reminders are rejected rather than presented as fixes.

Suggestions are hypothetical calculations, **not D4W-confirmed ranges**. They do
not approve script decisions. Each option has a button to copy conditions into
Modify. From Basic, it creates a proposed draft from the current setup (replacing
an existing proposed draft); current inputs stay intact. From Modify, it updates
only the suggested conditions. Sending schedules remain unchanged. Changed
proposed From/To fields are cleared deliberately: enter the actual D4W preview,
confirm the type order and rerun the transition assessment. Previous review
notes and script decisions are reset. Agree the timing with the practice first. Historical catch-up remains a
separate requirement even when future coverage is clear. Input edits discard
stale suggestions. A clear proposed setup does not trigger unnecessary changes.

Validation: `node tests/suggestions.cjs` covers alternatives, progression and
repeated-final rejection; `node tests/current-coverage-ui.cjs` covers both buttons,
target selection, invalidation, proposed-setup handoff, required fresh D4W ranges,
unchanged current inputs/schedules, and stale-option rejection. All existing
Node suites and Flask page rendering pass. Visual browser testing remains
outstanding in the build environment (Chromium executable unavailable).
