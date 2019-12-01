import React, { Component } from 'react';

import api from 'api';

import './app.scss';

class App extends Component {
  state = {
    lastChar: '',
  };

  render() {
    const { lastChar } = this.state;
    return (
      <div className="app">
        <input
          className="mash-text"
          placeholder="Start mashing..."
          value={lastChar}
          onKeyPress={this.handleKeyPress}
          ref={el => (this.mashText = el)}
          onChange={() => {}}
        />
      </div>
    );
  }

  componentDidMount() {
    this.mashText.focus();
  }

  handleKeyPress = evt => {
    const { charCode } = evt;
    const char = String.fromCharCode(charCode).toLowerCase();
    const isValidChar = Boolean(char) && this.ALLOWED_CHARS.includes(char);
    if (isValidChar) {
      api.sendTypedChar({ char });
      this.setState({ lastChar: char });
    }
  };

  // on a sample keyboard, this is each row of characers, including spacebar
  ALLOWED_CHARS = "`1234567890-=qwertyuiop[]\\asdfghjkl;'zxcvbnm,./ ";
}

export default App;
