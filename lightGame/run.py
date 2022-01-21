from lightGameApp import create_app
import sys

app = create_app()

if __name__ == '__main__':
    #scriptpath = ""
    # #sys.path.insert(0, scriptpath)
    # app.run(host="0.0.0.0",debug=True, use_reloader=False)
    app.run(debug=True, use_reloader=False)
    app.config["TEMPLATES_AUTO_RELOAD"] = True
