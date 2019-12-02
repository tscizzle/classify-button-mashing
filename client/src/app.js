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
      predictedMasher: '',
    };
  }

  mashInput = null;
  nameInput = null;

  render() {
    const { lastChar, currentPersonId, personOrder, people } = this.state;
    const currentPerson = people[currentPersonId];
    const hasEnoughData = this.currentPersonHasEnoughData();
    const nextMasherButtonClasses = classNames('next-masher-button', {
      disabled: !hasEnoughData,
    });
    const resetButtonClasses = classNames('reset-button', 'buttonish');
    const personButtonClasses = classNames('person-button', 'buttonish');
    let mashPromptMessage = '';
    if (currentPerson.charsTyped === 0) {
      mashPromptMessage = '';
    } else if (!hasEnoughData) {
      mashPromptMessage = 'Need more data. Keep mashing!';
    } else if (!currentPerson.name) {
      mashPromptMessage = 'Name the current masher.';
    }
    const mashPromptMessageClasses = classNames('mash-prompt-message', {
      invisible: !mashPromptMessage,
    });
    const personList = _.map(personOrder, personId => {
      const { name } = people[personId];
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
          <div>
            <input
              className="mash-prompt-name-input"
              placeholder="Your name here"
              value={currentPerson.name}
              onChange={this.updateName}
              ref={el => (this.nameInput = el)}
            />
            is currently mashing.
          </div>
        </div>
        <input
          className="mash-text"
          placeholder="Start mashing..."
          value={lastChar}
          onKeyPress={this.handleKeyPress}
          ref={el => (this.mashInput = el)}
          onChange={() => {}}
        />
        <div className="next-masher-container">
          <div
            className={nextMasherButtonClasses}
            onClick={this.clickNextMasher}
          >
            Next Masher
          </div>
          <div className={mashPromptMessageClasses}>
            {mashPromptMessage || 'dummy'}
          </div>
        </div>
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
          console.log(res);
          if (res.prediction) {
            this.setState({ predictedMasher: res.prediction });
          }
        });
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
    }
  };

  ALLOWED_CHARS = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./ ";

  personHasEnoughData = person => {
    return person.charsTyped >= 180;
  };

  currentPersonHasEnoughData = () => {
    const { currentPersonId, people } = this.state;
    const currentPerson = people[currentPersonId];
    return this.personHasEnoughData(currentPerson);
  };

  getSetCurrentPersonFunc = personId => {
    return () => {
      this.mashInput.focus();
      this.setState({ currentPersonId: personId, lastChar: '' });
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

  reloadPage = () => window.location.reload(false);
}

export default App;
