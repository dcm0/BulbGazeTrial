# Third-party libraries
from flask import Flask, redirect, request, url_for, current_app
from flask_login import (
LoginManager,
current_user,
login_required,
login_user,
logout_user,
)
import os

def create_app():

    app = Flask(__name__)
    app.app_context().push()
    app.config['SECRET_KEY'] = os.environ.get("SECRET_KEY") or os.urandom(24)

    # from oauthlib.oauth2 import WebApplicationClient
    import requests
    os.environ['OAUTHLIB_INSECURE_TRANSPORT'] = '1'

    with app.app_context():
        # Naive database setup


        from .views import views

        app.register_blueprint(views, url_prefix='/')


    return app
