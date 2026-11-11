"""Local automation work tracker, one issue per ticket."""
import secrets
import sqlite3
from pathlib import Path
from urllib.parse import urlsplit
from flask import Blueprint, abort, current_app, g, redirect, render_template, request, session, url_for

bp = Blueprint('todo', __name__, url_prefix='/todo')

def db():
    if 'todo_db' not in g:
        g.todo_db = sqlite3.connect(current_app.config['TODO_DATABASE'])
        g.todo_db.row_factory = sqlite3.Row
        g.todo_db.execute('PRAGMA foreign_keys=ON')
    return g.todo_db

def init_app(app):
    app.config.setdefault('TODO_DATABASE', str(Path(app.instance_path) / 'todo.db'))
    Path(app.config['TODO_DATABASE']).parent.mkdir(parents=True, exist_ok=True)
    with sqlite3.connect(app.config['TODO_DATABASE']) as conn:
        conn.executescript('''
        CREATE TABLE IF NOT EXISTS automation_issues (
          id INTEGER PRIMARY KEY AUTOINCREMENT, crn TEXT NOT NULL, title TEXT NOT NULL,
          ticket TEXT NOT NULL DEFAULT '', ticket_url TEXT NOT NULL DEFAULT '',
          notes TEXT NOT NULL DEFAULT '', version INTEGER NOT NULL DEFAULT 1);
        CREATE TABLE IF NOT EXISTS automation_tasks (
          id INTEGER PRIMARY KEY AUTOINCREMENT, issue_id INTEGER NOT NULL REFERENCES automation_issues(id) ON DELETE CASCADE,
          text TEXT NOT NULL, done INTEGER NOT NULL DEFAULT 0);
        ''')
    @app.teardown_appcontext
    def close(error=None):
        conn = g.pop('todo_db', None)
        if conn is not None:
            conn.close()
    app.register_blueprint(bp)

@bp.before_request
def protect():
    session.setdefault('todo_csrf', secrets.token_urlsafe(32))
    if request.method == 'POST' and not secrets.compare_digest(session['todo_csrf'], request.form.get('csrf_token', '')):
        abort(400, 'Your form has expired. Reload the page and try again.')

@bp.after_request
def no_cache(response):
    response.headers['Cache-Control'] = 'no-store'
    return response

@bp.route('/', methods=['GET'])
@bp.route('/<int:issue_id>', methods=['GET', 'POST'])
def index(issue_id=None):
    conn = db()
    issue = conn.execute('SELECT * FROM automation_issues WHERE id=?', (issue_id,)).fetchone() if issue_id else None
    if issue_id and issue is None:
        abort(404)
    error = None
    if request.method == 'POST':
        action = request.form.get('action')
        with conn:
            updated = conn.execute('UPDATE automation_issues SET version=version+1 WHERE id=? AND version=?', (issue_id, request.form.get('version')))
            if updated.rowcount != 1:
                abort(409, 'This issue changed in another tab. Go back and copy any unsaved text, then reload before saving.')
            if action == 'delete':
                if request.form.get('confirm_delete') != 'yes':
                    abort(400, 'Confirm deletion first.')
                conn.execute('DELETE FROM automation_issues WHERE id=?', (issue_id,))
                return redirect(url_for('todo.index'))
            if action != 'save':
                abort(400)
            crn, title = (request.form.get(k, '').strip() for k in ('crn', 'title'))
            link = request.form.get('ticket_url', '').strip()
            try:
                valid_link = not link or (urlsplit(link).scheme in ('http', 'https') and bool(urlsplit(link).hostname))
            except ValueError:
                valid_link = False
            if not crn or not title or not valid_link:
                conn.rollback()
                error = 'Enter a CRN and issue title, and use a complete http:// or https:// ticket link.'
            else:
                conn.execute('UPDATE automation_issues SET crn=?, title=?, ticket=?, ticket_url=?, notes=? WHERE id=?',
                    (crn, title, request.form.get('ticket', '').strip(), link, request.form.get('notes', ''), issue_id))
                for task in conn.execute('SELECT id FROM automation_tasks WHERE issue_id=?', (issue_id,)).fetchall():
                    tid = str(task['id'])
                    if request.form.get('remove_' + tid):
                        conn.execute('DELETE FROM automation_tasks WHERE id=? AND issue_id=?', (tid, issue_id))
                    else:
                        text = request.form.get('task_' + tid, '').strip()
                        if not text:
                            abort(400, 'Tasks need text. Use Remove to delete a task; go back to keep your edits.')
                        conn.execute('UPDATE automation_tasks SET text=?, done=? WHERE id=? AND issue_id=?',
                                     (text, int(bool(request.form.get('done_' + tid))), tid, issue_id))
                for text in request.form.get('new_tasks', '').splitlines():
                    if text.strip():
                        conn.execute('INSERT INTO automation_tasks(issue_id,text) VALUES (?,?)', (issue_id, text.strip()))
                return redirect(url_for('todo.index', issue_id=issue_id, saved=1))
    issues = conn.execute('''SELECT i.*, COUNT(t.id) AS total, COALESCE(SUM(t.done),0) AS completed
        FROM automation_issues i LEFT JOIN automation_tasks t ON t.issue_id=i.id GROUP BY i.id ORDER BY i.id DESC''').fetchall()
    tasks = conn.execute('SELECT * FROM automation_tasks WHERE issue_id=? ORDER BY id', (issue_id,)).fetchall() if issue else []
    return render_template('todo.html', issues=issues, issue=issue, tasks=tasks, error=error,
                           values=request.form if error else issue), (400 if error else 200)

@bp.post('/create')
def create():
    crn, title = (request.form.get(k, '').strip() for k in ('crn', 'title'))
    if not crn or not title:
        abort(400, 'Enter a CRN and issue title. Go back to keep your entries.')
    with db() as conn:
        result = conn.execute('INSERT INTO automation_issues(crn,title,ticket) VALUES (?,?,?)',
                             (crn, title, request.form.get('ticket', '').strip()))
    return redirect(url_for('todo.index', issue_id=result.lastrowid))
