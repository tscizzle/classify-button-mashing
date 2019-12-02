import socket
import json

from flask import Flask, request
from flask_cors import CORS

DEBUG = True

app = Flask(__name__)
app.config.from_object(__name__)

CORS(app, supports_credentials=True)


@app.route("/keyPress", methods=["POST"])
def keypress():
    """
    Incorporate the typed char, and possibly send back a prediction for the current masher
    """
    # make sure the request includes the required params
    requiredParams = ["char", "gameId"]
    isMissingParam = any(param not in request.json for param in requiredParams)
    if isMissingParam:
        errMsg = f"Must have required parameters {requiredParams}"
        return {"message": errMsg}, 422
    char = request.json["char"]
    gameId = request.json["gameId"]
    personId = request.json.get("personId")

    # create a message to send to the classifierProcess. include char, personId, gameId.
    msgDict = {"char": char, "gameId": gameId, "personId": personId}
    msgStr = json.dumps(msgDict)
    msgBytes = bytes(msgStr, "utf-8")

    # send the message to the classifierProcess
    HOST = "127.0.0.1"
    PORT = 65432
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
        sock.connect((HOST, PORT))
        sock.sendall(msgBytes)

        # see the response from the classifierProcess
        sockRespBytes = sock.recv(1024)
        if sockRespBytes:
            sockRespDict = json.loads(sockRespBytes)
        else:
            errMsg = f"Classifier's response was empty."
            return {"message": errMsg}, 500

    # given the classifierProcess's response, respond to the client
    respDict = {"success": True}
    if sockRespDict.get("prediction"):
        prediction = sockRespDict["prediction"]
        respDict["prediction"] = prediction
    return respDict, 200


if __name__ == "__main__":
    app.run()
