"""Application factory: create and configure AutoChef."""

from flask import Flask
from pathlib import Path
import secrets


def create_app(test_config=None):
    app = Flask(__name__, instance_relative_config=True)
    app.config.from_mapping(
        SECRET_KEY=secrets.token_hex(32),
        TICKETCHEF_DATABASE=str(Path(app.instance_path) / 'ticketchef' / 'solutions.db'),
        SESSION_COOKIE_HTTPONLY=True,
        SESSION_COOKIE_SAMESITE='Lax',
    )
    # Future environment settings use FLASK_ prefixes, e.g. FLASK_SECRET_KEY.
    app.config.from_prefixed_env()
    if test_config is not None:
        app.config.update(test_config)

    from .routes import main

    app.register_blueprint(main)
    from . import ticketchef
    ticketchef.init_app(app)
    return app
