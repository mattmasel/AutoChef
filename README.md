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

## Modify Recall Setup: coverage assessment (section 8a)

Basic Checklist retains its existing behaviour. Modify Recall Setup now has a
separate finite-window coverage comparison. Sections 3a and 9 still calculate
adjoining ranges for script reassignment; these are NOT used as batch coverage.

1. Enter current and requested types in their reminder sequence.
2. In 8a, enter the changeover time and the assessment end, in practice local time.
   New automation is effective at the changeover instant. Current types refer
   to patient state after all batches created BEFORE that instant.
3. Enter the inclusive recall-date scope to assess for patients currently on
   EACH type. This may be the actual date span found in a read-only patient
   check, or a broader conservative span. These are not patient records.
4. Add the OLD upcoming preview as the unchanged baseline, and the NEW upcoming
   preview: type, creation/send date and time, Recall From and Recall To. Include
   all runs within the same window (both boundaries inclusive). Do not include
   old batches that have already been created. Multiple rows per type are allowed;
   no rows for a type means no run for it within that window. Remove unused rows.
5. Confirm preview completeness and that stages correspond in the same order.
6. Check coverage. Any potential gap automatically requires corrective scripts,
   even if no actual patients occupy the flagged ranges. No patient search or
   count is required, and a manual decision cannot override this requirement.
   When no gap is detected, record the review decision and notes; an incomplete
   assessment cannot approve a no-script change. Any coverage/schedule/range
   change resets manual decisions. Entries are page-only, like the existing checklist.

The engine partitions recall-date scopes at batch boundaries and follows each
hypothetical cohort chronologically from its starting type. Creating a batch
advances the patient one type without changing the recall date. Final type does
not advance; repeated final capture is flagged for review. No intervening
invoice/treatment is simulated. The compared outcome is reminders reached by
the assessment END, not the exact original send date. A later new batch inside
the window can resolve an earlier apparent gap. A delay beyond the window is
flagged as potentially missed OR delayed, not as a proven permanent omission.

A clear result means no ADDITIONAL loss versus the old preview within these
scopes and this window. It does not prove that either schedule covers all dates,
that existing shared gaps are absent, that no duplicates occur at other stages,
or that future patients, treatment resets, exclusions and later runs are safe.
Already-sent final reminders cannot be inferred from type/date alone. Review
patient history where relevant. Date comparison never proves patient counts.

Missing/invalid input, no meaningful old baseline, changed stage counts/order,
or ambiguous same-time overlapping batches require manual review. The first
version automatically compares unchanged stage sequences only. Added/removed/
reordered stages can be documented using Manual review — scripts required, but
cannot receive an automatic no-script approval. Same-time batches with disjoint
coverage do not require an ordering assumption.

Ticket notes include assessment status, window, scopes, potential ranges and
review evidence. Calculated existing/requested reassignment ranges appear when
there is an unresolved potential gap or a reviewer says scripts are required;
they are omitted after a valid no-script decision. Potential ranges are not an
automatically approved SQL scope. Agent booking instructions require a valid
script decision (automatic for a detected gap, otherwise reviewed with notes).
Script-required jobs keep the SQL expiry, bulk-mod
wording and execution order. No-script jobs omit these and include schedule
change/verification steps. Incomplete assessments cannot approve a no-script job.

No SQL is generated or executed. No new runtime dependencies. Verification
covered progression, later pickup, date boundaries, final-stage behaviour,
ambiguous ordering, invalid inputs, decision invalidation, conditional ticket
notes/agent instructions and unchanged Basic workflow. Visual browser testing
was not performed for this update.

## Basic Checklist: current-setup coverage (section 4a)

Use this when the customer is keeping their existing schedule. Enter the
assessment start/end (practice local time) and copy all upcoming runs inside it,
including each type, creation/send time, and inclusive Recall Date From/To.
Use at least two runs per type; six upcoming runs is a useful starting point.
These are actual preview ranges, not the reassignment ranges in section 9.
No patient records, searches or counts are required.

The checker merges the supplied ranges for each type and finds holes between
them. For example, fortnightly runs covering 1–7 October and 15–21 October flag
8–14 October. Adjacent inclusive ranges have no hole; a supplied catch-up run
can fill one. It also simulates hypothetical cohorts leaving each non-final
batch, advancing immediately through later runs with an unchanged recall date.
An earlier downstream batch cannot pick up a cohort that has not arrived yet.
If later runs move past a cohort without picking it up, this is a potential
progression gap. Finite-preview boundary cases are reported separately, not
mislabelled as gaps.

Any detected gap means scripts are required regardless of actual patient
counts, even if another type needs more preview rows. The result has no manual
no-script override. A recurring schedule gap also needs schedule correction;
a one-off reassignment cannot prevent future gaps. Flagged ranges are evidence
for review, not an automatically approved SQL reassignment scope.

The final type is special: sending its reminder completes the simulation even
though the patient stays on that type. Dates before its earliest supplied range
are not flagged. Internal holes in its preview apply only to hypothetical
patients still awaiting that reminder. This does not identify whether a real
final-type patient has already been sent their reminder. Do not re-enrol
completed patients based on this check.

A clear result is limited to the supplied preview. It cannot prove historical
coverage, detect all existing stranded patients outside the preview, or prove
future coverage beyond it. More runs may resolve a flagged delay. Missing or
invalid entries, unconfirmed completeness, unknown same-time ordering, or too
few runs prevent a clear result. A possible repeated final reminder from a
simulated cohort also requires review.

Basic ticket notes and agent instructions include the current result (or
explicitly say not assessed). Changes to the current schedule or coverage
inputs invalidate confirmation; generated outputs are regenerated before
copying. Basic's existing SQL booking workflow is retained for corrective
work: a clear preview does not cancel separately required SQL. Modify Recall
Setup keeps its separate old/new comparison unchanged. Entries remain page-only.

Verification:

```sh
node tests/current-coverage.cjs
node tests/current-coverage-ui.cjs
node tests/coverage-policy.cjs
```

The tests cover fortnightly holes, inclusive and leap-day boundaries, catch-up
runs, chronological stage hand-offs, final completion, preview limits, invalid
input and the mandatory-script policy. A browser-independent DOM harness also
covers Basic notes/instructions, stale results, switching job types and row
removal. Flask template rendering passed. Full visual browser testing could
not run in the development environment because Chromium launch was blocked.
