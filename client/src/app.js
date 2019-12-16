import React, { Component } from 'react';
import classNames from 'classnames';
import _ from 'lodash';

import api from 'api';
import { randomId } from 'misc';

import './app.scss';

class App extends Component {
  constructor(props) {
    super(props);

    const initialPersonId = randomId();
    this.state = {
      gameId: randomId(),
      currentPersonId: initialPersonId,
      personOrder: [initialPersonId],
      people: {
        [initialPersonId]: {
          id: initialPersonId,
          name: '',
          charsTyped: 0,
        },
      },
      lastChar: '',
      predictedMasherId: null,
    };
  }

  mashInput = null;
  nameInput = null;

  render() {
    const {
      lastChar,
      currentPersonId,
      personOrder,
      people,
      predictedMasherId,
    } = this.state;
    const predictedMasher = people[predictedMasherId];
    const predictedMasherName = predictedMasher ? predictedMasher.name : '?';
    const currentPerson = people[currentPersonId] || {};
    const currentHasEnoughData = this.personHasEnoughData(currentPerson);
    const everyoneHasEnoughData = _.every(
      _.mapValues(people, this.personHasEnoughData)
    );
    const currentHasName = Boolean(currentPerson.name);
    const everyoneHasName = _.every(_.mapValues(people, 'name'));
    const isMultiplePeople = personOrder.length >= 2;
    const resetButtonClasses = classNames('reset-button', 'buttonish');
    let mashPromptWarning = '';
    if (currentPerson.charsTyped === 0) {
      mashPromptWarning = '';
    } else if (!currentHasEnoughData) {
      mashPromptWarning = 'Need more mashing. Keep going!';
    } else if (!everyoneHasEnoughData) {
      mashPromptWarning =
        'Need more mashing from the red people in the sidebar.';
    } else if (!currentHasName) {
      mashPromptWarning = 'Name the current masher.';
    } else if (!everyoneHasName) {
      mashPromptWarning = 'Name the unnamed people in the sidebar';
    }
    const disableNextStepButtons =
      Boolean(mashPromptWarning) || !currentHasEnoughData;
    const nextMasherButtonClasses = classNames('next-masher-button', {
      disabled: disableNextStepButtons,
    });
    const startPredictingButtonClasses = classNames('start-predicting-button', {
      disabled: disableNextStepButtons,
    });
    const mashPromptWarningClasses = classNames('mash-prompt-message', {
      invisible: !mashPromptWarning,
    });
    const personList = _.map(personOrder, personId => {
      const person = people[personId];
      const { name } = person;
      const hasEnoughData = this.personHasEnoughData(person);
      const personButtonClasses = classNames('person-button', 'buttonish', {
        'current-person': personId === currentPersonId,
        'person-not-enough-data': !hasEnoughData,
      });
      return (
        <div
          className={personButtonClasses}
          onClick={this.getSetCurrentPersonFunc(personId)}
          key={personId}
        >
          {name || 'Unnamed...'}
        </div>
      );
    });
    return (
      <div className="app">
        <div className="mash-prompt-container">
          {!_.isNull(currentPersonId) ? (
            <input
              className="mash-prompt-name-input"
              placeholder="Your name here"
              value={currentPerson.name}
              onChange={this.updateName}
              ref={el => (this.nameInput = el)}
            />
          ) : (
            <div className="predicted-masher">{predictedMasherName}</div>
          )}
          is currently mashing.
        </div>
        <input
          className="mash-text"
          placeholder="Start mashing..."
          value={lastChar}
          onKeyPress={this.handleKeyPress}
          ref={el => (this.mashInput = el)}
          onChange={() => {}}
        />
        {!_.isNull(this.state.currentPersonId) && (
          <div className="next-masher-container">
            <div className="next-masher-buttons-container">
              <div
                className={nextMasherButtonClasses}
                onClick={this.clickNextMasher}
              >
                Next Masher
              </div>
              {isMultiplePeople && (
                <div
                  className={startPredictingButtonClasses}
                  onClick={this.clickStartPredicting}
                >
                  Start Guessing
                </div>
              )}
            </div>
            <div className={mashPromptWarningClasses}>
              {mashPromptWarning || 'dummy'}
            </div>
          </div>
        )}
        <div className={resetButtonClasses} onClick={this.reloadPage}>
          Reset
        </div>
        <div className="person-list-container">
          <div className="person-list-header">Mashers So Far</div>
          {personList}
        </div>
      </div>
    );
  }

  componentDidMount() {
    this.mashInput.focus();
  }

  handleKeyPress = evt => {
    const { charCode } = evt;
    const char = String.fromCharCode(charCode).toLowerCase();
    const isValidChar = Boolean(char) && this.ALLOWED_CHARS.includes(char);

    if (isValidChar) {
      const { gameId, currentPersonId, people } = this.state;
      api
        .sendTypedChar({ char, gameId, personId: currentPersonId })
        .then(res => {
          if (res.prediction) {
            this.setState({ predictedMasherId: res.prediction });
          }
        });
      if (!_.isNull(currentPersonId)) {
        const currentPerson = people[currentPersonId];
        const newCharsTyped = currentPerson.charsTyped + 1;
        const newPeople = {
          ...people,
          [currentPersonId]: {
            ...currentPerson,
            charsTyped: newCharsTyped,
          },
        };
        this.setState({ lastChar: char, people: newPeople });
      } else {
        this.setState({ lastChar: char });
      }
    }
  };

  ALLOWED_CHARS = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./ ";

  personHasEnoughData = person => {
    if (!person.charsTyped) {
      return false;
    }
    return person.charsTyped >= 180;
  };

  getSetCurrentPersonFunc = personId => {
    return () => {
      this.mashInput.focus();
      this.setState({
        currentPersonId: personId,
        lastChar: '',
      });
    };
  };

  updateName = evt => {
    const newName = evt.target.value;
    const { currentPersonId, people } = this.state;
    const currentPerson = people[currentPersonId];
    const newPeople = {
      ...people,
      [currentPersonId]: {
        ...currentPerson,
        name: newName,
      },
    };
    this.setState({ people: newPeople });
  };

  clickNextMasher = () => {
    const { currentPersonId, personOrder, people } = this.state;
    const currentPerson = people[currentPersonId];
    if (!currentPerson.name) {
      this.nameInput.focus();
      return;
    }
    this.mashInput.focus();
    const newPersonId = randomId();
    const newPerson = {
      id: newPersonId,
      name: '',
      charsTyped: 0,
    };
    this.setState({
      currentPersonId: newPersonId,
      people: {
        ...people,
        [newPersonId]: newPerson,
      },
      personOrder: [...personOrder, newPersonId],
      lastChar: '',
    });
  };

  clickStartPredicting = () => {
    this.mashInput.focus();
    this.setState({ currentPersonId: null, lastChar: '' });
  };

  reloadPage = () => window.location.reload(false);
}

export default App;
