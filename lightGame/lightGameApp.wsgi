#!/usr/bin/python3
# 
# from os.path import dirname, realpath, abspath
# from inspect import getsourcefile
# import sys

# # Hack för att inte behöva känna till sökvägen till applikationen på filsystemet
# # Förutsätter att all egen kod ligger i samma katalog som den här filen
# scriptpath = dirname(realpath(abspath(getsourcefile(lambda:0))))
# if scriptpath not in sys.path:
#     sys.path.insert(0, scriptpath)

# activate_this = '/env/bin/activate.py'
# with open(activate_this) as file_:
#     exec(file_.read(), dict(__file__=activate_this))

# Projektets Flask-objekt ska importeras under namnet 'application'
# from app import app as application
from lightGameApp import create_app
application = create_app()
