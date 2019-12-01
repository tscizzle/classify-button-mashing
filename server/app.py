from flask import Flask, request, jsonify
from flask_cors import CORS

DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)

CORS(app, supports_credentials=True)


@app.route("/keyPress", methods=["POST"])
def keypress():
    """ Incorporate the typed character, and possibly send back a current guess """
    print(request.json)
    return jsonify(request.json)


if __name__ == "__main__":
    app.run()
