"""TicketChef routes; all database queries use bound parameters."""
import re
import secrets
from flask import Blueprint, abort, redirect, render_template, request, session, url_for
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
