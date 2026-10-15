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
shows weekdays; Monthly shows dates 1–31. Advanced mode has four dropdowns per
condition, with an optional second condition joined by “and”. Rows wrap on small
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
