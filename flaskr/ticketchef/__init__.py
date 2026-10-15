"""TicketChef solution search and ticket generation blueprint."""
from pathlib import Path
import shutil
import sqlite3
from flask import current_app, g


def get_connection():
    if 'ticketchef_db' not in g:
        g.ticketchef_db = sqlite3.connect(current_app.config['TICKETCHEF_DATABASE'])
        g.ticketchef_db.row_factory = sqlite3.Row
    return g.ticketchef_db


def init_app(app):
    destination = Path(app.config['TICKETCHEF_DATABASE'])
    destination.parent.mkdir(parents=True, exist_ok=True)
    # Seed only on first launch. Never replace a user's working database.
    try:
        with destination.open('xb') as target, Path(__file__).with_name('seed-solutions.db').open('rb') as source:
            shutil.copyfileobj(source, target)
    except FileExistsError:
        pass

    @app.teardown_appcontext
    def close_connection(error=None):
        connection = g.pop('ticketchef_db', None)
        if connection is not None:
            connection.close()

    from .routes import bp
    app.register_blueprint(bp)
