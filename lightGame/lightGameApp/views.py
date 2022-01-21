from flask import Flask, Blueprint, render_template, jsonify, after_this_request, send_from_directory, current_app
from flask_login import login_user, login_required, logout_user, current_user
import requests
import json
import os


views = Blueprint('views', __name__)

# @views.route('/')
# def home():
#     return render_template("home.html", current_user=current_user)
@views.route('/')
def base():
    return send_from_directory('client/public','index.html')
    #return send_from_directory('./client/public/','index.html')
@views.route("/<path:path>")
def home(path):
    return send_from_directory('client/public', path)
