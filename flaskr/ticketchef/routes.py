"""TicketChef routes; all database queries use bound parameters."""
import re
import secrets
from datetime import datetime, timezone
from flask import jsonify, Blueprint, abort, redirect, render_template, request, session, url_for
from . import get_connection
from .search import find_best_match

bp = Blueprint('ticketchef', __name__, url_prefix='/ticketchef')


@bp.before_request
def protect_forms():
    if 'ticketchef_csrf' not in session:
        session['ticketchef_csrf'] = secrets.token_urlsafe(32)
    if request.method == 'POST' and not secrets.compare_digest(
        session['ticketchef_csrf'], request.form.get('csrf_token', '')
    ):
        abort(400, description='Your form has expired. Reload the page and try again.')


@bp.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store'
    return response


@bp.route('/', methods=['GET', 'POST'])
def home():
    values = request.form if request.method == 'POST' else {}
    context = dict(form_data=values)
    if request.method == 'POST':
        required = ['customer_name', 'customer_query', 'teamviewer_id', 'teamviewer_password', 'customer_hostname']
        if any(not values.get(key, '').strip() for key in required):
            context['error'] = 'Complete the customer, query and connection fields.'
            return render_template('ticketchef/index.html', **context), 400
        conn = get_connection()
        rows = conn.execute('SELECT Id, Keywords FROM solutions').fetchall()
        best, score = find_best_match(values['customer_query'], rows)
        ticket = f"{values['customer_name']}\n\n{values['customer_query']}\n\nLogged in with TeamViewer\n{values['teamviewer_id']}:{values['teamviewer_password']}\n{values['customer_hostname']}"
        if best is None or score < 60:
            context.update(no_match=True, ticket=ticket, score=score)
        else:
            solution = conn.execute('SELECT * FROM solutions WHERE Id = ?', (best['Id'],)).fetchone()
            ticket += f"\n\n{solution['SolutionSteps'] or ''}"
            context.update(solution_found=True, ticket=ticket, solution=solution, score=score)
    return render_template('ticketchef/index.html', **context)


@bp.route('/add-solution', methods=['GET', 'POST'])
def add_solution():
    values = request.form if request.method == 'POST' else {}
    context = dict(form_data=values)
    if request.method == 'POST':
        required = ['issue', 'category', 'subcategory', 'keywords', 'solution']
        if any(not values.get(key, '').strip() for key in required):
            context['error'] = 'Complete all required solution fields.'
            return render_template('ticketchef/add_solution.html', **context), 400
        keywords = ' '.join(re.sub(',', ' ', values['keywords']).split())
        if len(keywords.split()) < 3:
            context['error'] = 'New solutions require at least 3 keywords.'
            return render_template('ticketchef/add_solution.html', **context)
        conn = get_connection()
        best, score = find_best_match(values['issue'], conn.execute('SELECT Id, Keywords FROM solutions').fetchall())
        if best is not None and score >= 60 and values.get('force_add') != 'true':
            closest = conn.execute('SELECT * FROM solutions WHERE Id = ?', (best['Id'],)).fetchone()
            context.update(duplicate_warning=True, closest_solution=closest, score=score)
            return render_template('ticketchef/add_solution.html', **context)
        conn.execute('''INSERT INTO solutions (IssueTag, Category, SubCategory, Issue, SolutionSteps, Keywords, Notes)
                        VALUES (?, ?, ?, ?, ?, ?, ?)''',
                     (values['issue'].strip().lower().replace(' ', '_'), values['category'].strip(),
                      values['subcategory'].strip(), values['issue'].strip(), values['solution'],
                      keywords, values.get('notes', '')))
        conn.commit()
        return redirect(url_for('ticketchef.home', added=1))
    return render_template('ticketchef/add_solution.html', **context)


@bp.get('/solutions')
def manage_solutions():
    query = request.args.get('q', '').strip()
    # Literal, case-insensitive terms: SQL wildcard characters remain ordinary text.
    columns = ['Issue', 'Keywords', 'SolutionSteps', 'Category', 'SubCategory', 'Notes']
    clauses, params = [], []
    for term in query.lower().split():
        clauses.append('(' + ' OR '.join(f"instr(lower(COALESCE({col}, '')), ?) > 0" for col in columns) + ')')
        params.extend([term] * len(columns))
    sql = 'SELECT * FROM solutions'
    if clauses:
        sql += ' WHERE ' + ' AND '.join(clauses)
    sql += ' ORDER BY Issue COLLATE NOCASE, Id'
    rows = get_connection().execute(sql, params).fetchall()
    return render_template('ticketchef/solutions.html', solutions=rows, query=query)


@bp.route('/solutions/<int:solution_id>/edit', methods=['GET', 'POST'])
def edit_solution(solution_id):
    conn = get_connection()
    row = conn.execute('SELECT * FROM solutions WHERE Id = ?', (solution_id,)).fetchone()
    if row is None:
        abort(404)
    query = request.args.get('q', '')
    fields = {'issue': 'Issue', 'category': 'Category', 'subcategory': 'SubCategory',
              'keywords': 'Keywords', 'solution': 'SolutionSteps', 'notes': 'Notes'}
    values = request.form if request.method == 'POST' else {key: row[column] or '' for key, column in fields.items()}
    context = dict(editing=True, solution_id=solution_id, query=query, form_data=values)
    if request.method == 'POST':
        if any(not values.get(key, '').strip() for key in fields if key != 'notes'):
            context['error'] = 'Complete all required solution fields.'
            return render_template('ticketchef/add_solution.html', **context), 400
        keywords = ' '.join(values['keywords'].replace(',', ' ').split())
        if len(keywords.split()) < 3:
            context['error'] = 'Solutions require at least 3 keywords.'
            return render_template('ticketchef/add_solution.html', **context), 400
        conn.execute('''UPDATE solutions SET IssueTag = ?, Category = ?, SubCategory = ?,
                        Issue = ?, SolutionSteps = ?, Keywords = ?, Notes = ? WHERE Id = ?''',
                     (values['issue'].strip().lower().replace(' ', '_'), values['category'].strip(),
                      values['subcategory'].strip(), values['issue'].strip(), values['solution'],
                      keywords, values.get('notes', ''), solution_id))
        conn.commit()
        return redirect(url_for('ticketchef.manage_solutions', q=query, updated=1))
    return render_template('ticketchef/add_solution.html', **context)


def draft_time():
    return datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')


@bp.post('/drafts/save')
def save_draft():
    issue = request.form.get('issue', '').strip()
    steps = request.form.get('solution', '').strip()
    key = request.form.get('capture_key', '')
    if not issue or not steps or not re.fullmatch(r'[a-zA-Z0-9_-]{16,100}', key):
        return jsonify(error='Enter troubleshooting steps before saving the draft.'), 400
    conn = get_connection()
    # A stable key makes retries safe without creating duplicate drafts.
    with conn:
        row = conn.execute('SELECT * FROM solution_drafts WHERE capture_key = ?', (key,)).fetchone()
        if row:
            if row['status'] != 'pending':
                return jsonify(error='This draft has already been reviewed. Start a new ticket for a new draft.'), 409
            if row['issue'] == issue and row['solution'] == steps:
                return jsonify(id=row['id'], version=row['version'])
            version = request.form.get('version', type=int)
            result = conn.execute("""UPDATE solution_drafts SET issue=?, solution=?, updated_at=?,
                version=version+1 WHERE id=? AND status='pending' AND version=?""",
                (issue, steps, draft_time(), row['id'], version))
            if not result.rowcount:
                return jsonify(error='This draft changed elsewhere. Review it in Draft Solutions before saving again.'), 409
            return jsonify(id=row['id'], version=version + 1)
        now = draft_time()
        result = conn.execute('''INSERT INTO solution_drafts
            (capture_key, issue, solution, created_at, updated_at) VALUES (?, ?, ?, ?, ?)''',
            (key, issue, steps, now, now))
        return jsonify(id=result.lastrowid, version=1), 201


@bp.get('/drafts')
def draft_solutions():
    rows = get_connection().execute("SELECT * FROM solution_drafts WHERE status='pending' ORDER BY id DESC").fetchall()
    return render_template('ticketchef/drafts.html', drafts=rows)


@bp.route('/drafts/<int:draft_id>', methods=['GET', 'POST'])
def review_draft(draft_id):
    conn = get_connection()
    row = conn.execute('SELECT * FROM solution_drafts WHERE id=?', (draft_id,)).fetchone()
    if row is None:
        abort(404)
    if row['status'] != 'pending':
        return redirect(url_for('ticketchef.draft_solutions', result='reviewed'))
    values = request.form if request.method == 'POST' else dict(row)
    context = dict(draft=row, form_data=values, version=values.get('version', row['version']))
    if request.method == 'POST':
        action = request.form.get('action')
        version = request.form.get('version', type=int)
        if version != row['version']:
            context['error'] = 'This draft changed in another tab. Your text is below; reload to view the latest version before saving.'
            return render_template('ticketchef/review_draft.html', **context), 409
        if action not in ('save', 'approve', 'approve_anyway', 'discard'):
            abort(400)
        if action != 'discard':
            required = ['issue', 'solution'] if action == 'save' else ['issue', 'solution', 'category', 'subcategory', 'keywords']
            if any(not values.get(key, '').strip() for key in required):
                context['error'] = 'A draft needs a title and steps. Approval also needs category, subcategory and at least three keywords.'
                return render_template('ticketchef/review_draft.html', **context), 400
            keywords = ' '.join(values.get('keywords', '').replace(',', ' ').split())
            if action != 'save' and len(keywords.split()) < 3:
                context['error'] = 'Add at least three keywords before approving.'
                return render_template('ticketchef/review_draft.html', **context), 400
            if action == 'approve':
                best, score = find_best_match(values['issue'], conn.execute('SELECT Id, Keywords FROM solutions').fetchall())
                if best and score >= 60:
                    context.update(duplicate=conn.execute('SELECT * FROM solutions WHERE Id=?', (best['Id'],)).fetchone(), score=score)
                    return render_template('ticketchef/review_draft.html', **context)
        # Claim the revision and insert the approved solution in one transaction.
        with conn:
            status = 'discarded' if action == 'discard' else 'approved' if action.startswith('approve') else 'pending'
            result = conn.execute("""UPDATE solution_drafts SET status=?, version=version+1, updated_at=?
                WHERE id=? AND version=? AND status='pending'""", (status, draft_time(), draft_id, version))
            if not result.rowcount:
                abort(409, description='Draft changed elsewhere. Reload before continuing.')
            if action != 'discard':
                fields = [values.get(k, '').strip() for k in ['issue','category','subcategory']]
                fields += [keywords, values['solution'], values.get('notes', '')]
                conn.execute('UPDATE solution_drafts SET issue=?,category=?,subcategory=?,keywords=?,solution=?,notes=? WHERE id=?', (*fields, draft_id))
                if status == 'approved':
                    issue, category, subcategory, keywords, steps, notes = fields
                    new = conn.execute('''INSERT INTO solutions (IssueTag,Category,SubCategory,Issue,SolutionSteps,Keywords,Notes)
                        VALUES (?,?,?,?,?,?,?)''', (issue.lower().replace(' ', '_'),category,subcategory,issue,steps,keywords,notes))
                    conn.execute('UPDATE solution_drafts SET solution_id=? WHERE id=?', (new.lastrowid, draft_id))
        if action == 'save':
            return redirect(url_for('ticketchef.review_draft', draft_id=draft_id, saved=1))
        return redirect(url_for('ticketchef.draft_solutions', result=status))
    return render_template('ticketchef/review_draft.html', **context)
