"""
Process where we maintain the button mashes of every person, train on those mashes, and classify unlabeled button mash
strings.

To support multiple clients, the state is split by Game ("gameId").

Each game has multiple phases: training phase, and prediction phase.
    - During training phase, a personId is included with each char, so the data is labeled and we can train on it.
    - During prediction phase, no personId is included with each char, so the data is unlabeled and we need to figure
    out who it is using ButtonMashClassifier trained on the data collected during training phase.

The web server (a Flask app) is hosting the web page and routing user input to this process for the above purposes.
Communication between the server and this process is over sockets.

Since we don't need data to persist beyond a given session, in place of a database we store the working datasets in
memory in this process, in the dict called `state`.
"""


import socketserver
import threading
import json

from button_mash_classifier import ButtonMashClassifier

"""
State fields:
- games
    Keyed on gameId. An open client is a Game, and the people and button mashes are stored within this "games" field.
- games.[gameId].id
    Same as the gameId key
- games.[gameId].button_mash_classifier
    ButtonMashClassifier object which has some state of its own, namely self.vectorizer and self.classifier, and does
    the predicition of the current button masher.
    Only exists if we have already collected training data and begun the prediction phase
- games.[gameId].unlabeled_mash
    Characters that have been typed during the prediction phase, i.e. no longer the training phase where the masher is
    explicitly identified. Only need to store the most recent X chars, so it doesn't build up indefinitely, and we only
    want to classify based on recent mashing anyway.
- games.[gameId].people
    Keyed on personId. Each person is created during the training phase just before they start mashing.
- games.[gameId].people.[personId].mash
    String of chars that person has typed.
"""
state = {"games": {}}

stateLock = threading.Lock()


## State modifiers


# length of both the training strings and the string we classify (the most recent X chars)
MASH_CHUNK_SIZE = 30


def initNewGameAndPerson(gameId, personId):
    """
    For each of game and person, checks if they exist and creates them if they don't

    :param string gameId:
    :param string personId:
    """
    with stateLock:
        if gameId not in state["games"]:
            emptyGame = {"id": gameId, "people": {}}
            state["games"][gameId] = emptyGame
        if personId and personId not in state["games"][gameId]["people"]:
            emptyPerson = {"id": personId, "mash": ""}
            state["games"][gameId]["people"][personId] = emptyPerson


def storeLatestChar(gameId, personId, char):
    """
    Stores the char that was just received, either with a person's current mash, or the current unlabeled mash

    :param string gameId:
    :param string personId:
    :param string char:
    """
    with stateLock:
        if personId:
            # a person is explicitly specified, so we're in training phase. add the char to that person's mash string.
            currentMash = state["games"][gameId]["people"][personId]["mash"]
            newMash = currentMash + char
            state["games"][gameId]["people"][personId]["mash"] = newMash
        else:
            # no person explicitly specified, so we're in prediction phase, not training phase. add the char to the
            # current unlabeled mash string, and only keep the most recent 50.
            currentMash = state["games"][gameId]["unlabeled_mash"]
            newMash = (currentMash + char)[-MASH_CHUNK_SIZE:]
            state["games"][gameId]["unlabeled_mash"] = newMash


def getOrCreateClassifier(gameId):
    """
    Checks if a classifier already exists for this game, and creates it if not, by training on the training data

    :param string gameId:

    :return ButtonMashClassifier:
    """
    with stateLock:
        if not state["games"][gameId].get("button_mash_classifier"):
            allMashes, allLabels = [], []
            for personId, longMash in state["games"][gameId]["people"].items():
                # for each person's long string of chars, chunk into shorter strings to train on (may leave off some
                # chars at the end)
                numPersonMashes = len(longMash) // MASH_CHUNK_SIZE
                personMashes = [
                    longMash[idx : idx + MASH_CHUNK_SIZE]
                    for idx in range(numPersonMashes)
                ]
                for mash in personMashes:
                    allMashes.append(mash)
                    allLabels.append(personId)
            classifier = ButtonMashClassifier(allMashes, allLabels)

            state["games"][gameId]["button_mash_classifier"] = classifier

        return state["games"][gameId]["button_mash_classifier"]


## Websocket communication


class MyTCPHandler(socketserver.BaseRequestHandler):
    """
    The RequestHandler class for our server. I  t is instantiated once per connection to the server.
    """

    def handle(self):
        sock = self.request
        msgBytes = sock.recv(1024)
        msgDict = json.loads(msgBytes)
        char = msgDict["char"]
        gameId = msgDict["gameId"]
        personId = msgDict.get("personId")

        # create the game and person if they don't already exist
        initNewGameAndPerson(gameId, personId)

        # incorporate the typed char into the data
        storeLatestChar(gameId, personId, char)

        respDict = {}

        # if not person explicitly specified, we're in prediction phase.
        if not personId:
            mash = state["games"][gameId]["unlabeled_mash"]
            classifier = getOrCreateClassifier(gameId)
            predictions = classifier.predict([mash])
            prediction = predictions[0]
            respDict["prediction"] = prediction

        respStr = json.dumps(respDict)
        respBytes = bytes(respStr, "utf-8")

        sock.sendall(respBytes)


## main method (websocket listener)


def listen():
    HOST = "127.0.0.1"
    PORT = 65432

    # so when rerunning this script, don't have to wait some seconds
    socketserver.TCPServer.allow_reuse_address = True

    with socketserver.TCPServer((HOST, PORT), MyTCPHandler) as server:
        print(f"Listening for socket messages on {(HOST, PORT)}")
        server.serve_forever()


if __name__ == "__main__":
    listen()
