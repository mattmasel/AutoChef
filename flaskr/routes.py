"""Page routes. Add new views here; split into feature blueprints as we grow."""

from flask import Blueprint, render_template

main = Blueprint("main", __name__)


@main.route("/")
def home():
    return render_template("home.html")


@main.route("/checklist")
def checklist():
    return render_template("checklist.html")
