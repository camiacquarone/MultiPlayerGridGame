import { CONFIG, GAME_OBJECTS } from '../config/gameConfig.js';
import { GameRenderer } from './GameRenderer.js';

export class UIManager {
  constructor(container) {
    this.container = container;
    this.renderer = new GameRenderer();
    this.eventHandlers = new Map();
    this.currentScreen = null;
    this.gameCanvas = null;
    this.keyboardHandler = null;
    this.playerIndex = 0; // 0 = red player, 1 = purple player
    this.gameMode = 'human-ai'; // 'human-ai' or 'human-human'
    this.lastGameState = null;
    this.handleResize = null;
  }

  cleanupCanvas() {
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      this.handleResize = null;
    }
    this.gameCanvas = null;
    this.lastGameState = null;
  }

  // Event system
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach(handler => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in UI event handler for ${event}:`, error);
        }
      });
    }
  }

  // Player configuration
  setPlayerInfo(playerIndex, gameMode) {
    this.playerIndex = playerIndex;
    this.gameMode = gameMode;
  }

  // Screen management
  showMainScreen() {
    this.cleanupCanvas();
    this.currentScreen = 'main';
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
        <div style="text-align: center; max-width: 600px; padding: 20px;">
          <h1 style="margin-bottom: 20px;">Grid World Collaboration Experiment</h1>
          <p style="font-size: 18px; margin-bottom: 30px;">
            Welcome to the grid-based collaboration game. You'll work with an AI partner
            to navigate through different scenarios and reach goals together.
          </p>
          <div style="margin-bottom: 30px;">
            <h3>Instructions:</h3>
            <ul style="text-align: left; display: inline-block;">
              <li>Use arrow keys (↑ ↓ ← →) to move</li>
              <li>You are the red player ⚫</li>
              <li>Your partner is the purple player ⚫</li>
              <li>Work together to reach the green goals ⚫</li>
            </ul>
          </div>
          <button id="start-experiment" style="
            padding: 15px 30px;
            font-size: 18px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          ">
            Start Experiment
          </button>
        </div>
      </div>
    `;

    // Add event listener
    document.getElementById('start-experiment').addEventListener('click', () => {
      this.emit('start-experiment', CONFIG.game.experiments.order[0]);
    });
  }

  showLobbyScreen() {
    this.cleanupCanvas();
    this.currentScreen = 'lobby';
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
        <div style="text-align: center; max-width: 500px; padding: 20px;">
          <h1 style="margin-bottom: 20px;">Multiplayer Lobby</h1>
          <div id="lobby-info" style="margin-bottom: 30px;">
            <p>Connecting to game room...</p>
          </div>
          <div id="player-list" style="margin-bottom: 30px;">
            <!-- Player list will be populated here -->
          </div>
          <button id="ready-button" style="
            padding: 15px 30px;
            font-size: 18px;
            background: #28a745;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            display: none;
          ">
            Ready to Play
          </button>
          <div id="waiting-message" style="display: none; color: #666; margin-top: 20px;">
            Waiting for other player to be ready...
          </div>
        </div>
      </div>
    `;

    // Add event listener
    document.getElementById('ready-button').addEventListener('click', () => {
      this.emit('player-ready');
      document.getElementById('ready-button').style.display = 'none';
      document.getElementById('waiting-message').style.display = 'block';
    });
  }

  showGameScreen() {
    this.currentScreen = 'game';

    // Determine player color based on playerIndex
    const playerColor = this.playerIndex === 0 ? CONFIG.visual.colors.player1 : CONFIG.visual.colors.player2;
    const playerName = this.playerIndex === 0 ? 'Player 1 (Red)' : 'Player 2 (Purple)';

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
        <div style="text-align: center;">
          <h3 id="game-title" style="margin-bottom: 10px;">Game</h3>
          <h4 id="trial-info" style="margin-bottom: 20px;">Round 1</h4>
          <div id="gameCanvas" style="margin-bottom: 20px;"></div>
          <p style="font-size: 20px;">You are ${playerName} <span style="display: inline-block; width: 18px; height: 18px; background-color: ${playerColor}; border-radius: 50%; vertical-align: middle;"></span>. Press ↑ ↓ ← → to move.</p>
        </div>
      </div>
    `;

    // Create game canvas
    this.createGameCanvas();
    this.setupKeyboardControls();
  }


  createGameCanvas() {
    const container = document.getElementById('gameCanvas');
    if (container) {
      // Cleanup any previous resize handler
      if (this.handleResize) {
        window.removeEventListener('resize', this.handleResize);
        this.handleResize = null;
      }

      this.gameCanvas = this.renderer.createCanvas();
      container.appendChild(this.gameCanvas);

      // Apply initial responsive sizing and re-render if we have state
      const doResize = () => {
        this.renderer.applyResponsiveSizing();
        if (this.lastGameState) {
          this.renderer.render(this.gameCanvas, this.lastGameState);
        }
      };

      // Save and bind handler
      this.handleResize = () => doResize();
      window.addEventListener('resize', this.handleResize);

      // Initial call after insertion to ensure correct parent sizes
      setTimeout(doResize, 0);
    }
  }

  setupKeyboardControls() {
    // Remove existing handler if any
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    this.keyboardHandler = (event) => {
      const key = event.code;
      const validKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

      if (validKeys.includes(key)) {
        event.preventDefault();
        const direction = key.replace('Arrow', '').toLowerCase();
        this.emit('player-move', direction);
      }
    };

    document.addEventListener('keydown', this.keyboardHandler);
    document.body.focus();
  }

  // Lobby updates
  updateLobbyInfo(roomData) {
    const lobbyInfo = document.getElementById('lobby-info');
    if (lobbyInfo) {
      lobbyInfo.innerHTML = `
        <h3>Room: ${roomData.roomId.substring(0, 8)}...</h3>
        <p>Game Mode: ${roomData.gameMode === 'human-human' ? 'Human vs Human' : 'Human vs AI'}</p>
        <p>Experiment: ${roomData.experimentType}</p>
      `;

      // Show ready button if room has players
      if (roomData.players && roomData.players.length > 0) {
        document.getElementById('ready-button').style.display = 'inline-block';
      }
    }
  }

  updatePlayerList(players) {
    const playerList = document.getElementById('player-list');
    if (playerList && players) {
      playerList.innerHTML = `
        <h4>Players (${players.length}/2):</h4>
        <div style="text-align: left; display: inline-block;">
          ${players.map((player, index) => `
            <div style="margin: 5px 0;">
              Player ${index + 1}: ${player.id.substring(0, 8)}...
              ${player.isReady ? '✅ Ready' : '⏳ Not Ready'}
            </div>
          `).join('')}
        </div>
      `;
    }
  }

  // Game display updates
  updateGameDisplay(gameState) {
    if (this.gameCanvas && gameState) {
      this.lastGameState = gameState;
      this.renderer.render(this.gameCanvas, gameState);
    }
  }

  updateGameInfo(experimentIndex, trialIndex, experimentType) {
    const gameTitle = document.getElementById('game-title');
    const trialInfo = document.getElementById('trial-info');

    if (gameTitle) {
      gameTitle.textContent = `Game ${experimentIndex + 1}`;
    }

    if (trialInfo) {
      trialInfo.textContent = `Round ${trialIndex + 1}`;
    }
  }

  showGameStatus(message, type = 'info') {
    const statusElement = document.getElementById('game-status');
    if (statusElement) {
      const colors = {
        info: '#666',
        success: '#28a745',
        warning: '#ffc107',
        error: '#dc3545'
      };

      statusElement.innerHTML = `
        <div style="color: ${colors[type] || colors.info}; font-weight: bold;">
          ${message}
        </div>
      `;
    }
  }

  showWaitingMessage() {
    this.showGameStatus('Waiting for partner to finish...', 'info');
  }

  // Feedback and results
  showTrialFeedback(result) {
    const success = result.success || result.collaborationSucceeded;
    const experimentType = result.experimentType || '2P2G'; // Default to collaboration type

    // Determine message type based on experiment type
    const messageType = experimentType.startsWith('1P') ? 'single' : 'collaboration';

    const message = success ?
      (messageType === 'single' ? '🎉 Goal reached!' : '🎉 Collaboration succeeded!') :
      (messageType === 'single' ? '❌ Time up!' : '❌ Collaboration failed!');

    this.showGameStatus(message, success ? 'success' : 'warning');

    // Auto-hide after delay
    setTimeout(() => {
      this.showGameStatus('');
    }, CONFIG.game.timing.feedbackDisplayDuration);
  }

  showExperimentComplete(results) {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
        <div style="text-align: center; max-width: 600px; padding: 20px;">
          <h1 style="margin-bottom: 20px;">🎉 Experiment Complete!</h1>
          <div style="background: white; padding: 20px; border-radius: 10px; margin-bottom: 30px;">
            <h3>Results Summary:</h3>
            <p><strong>Total Trials:</strong> ${results.totalTrials}</p>
            <p><strong>Successful Trials:</strong> ${results.successfulTrials}</p>
            <p><strong>Success Rate:</strong> ${results.successRate}%</p>
            <p><strong>Total Time:</strong> ${results.totalTime}</p>
          </div>
          <button onclick="window.location.reload()" style="
            padding: 15px 30px;
            font-size: 18px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          ">
            Start New Experiment
          </button>
        </div>
      </div>
    `;
  }

  // Notifications and errors
  showNotification(message, duration = 3000) {
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: #007bff;
      color: white;
      padding: 15px;
      border-radius: 5px;
      z-index: 1000;
      box-shadow: 0 2px 10px rgba(0,0,0,0.3);
    `;
    notification.textContent = message;

    document.body.appendChild(notification);

    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, duration);
  }

  showError(message) {
    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; height: 100vh;">
        <div style="text-align: center; color: #dc3545; max-width: 500px; padding: 20px;">
          <h2>⚠️ Error</h2>
          <p style="margin: 20px 0;">${message}</p>
          <button onclick="window.location.reload()" style="
            padding: 10px 20px;
            font-size: 16px;
            background: #dc3545;
            color: white;
            border: none;
            border-radius: 5px;
            cursor: pointer;
          ">
            Retry
          </button>
        </div>
      </div>
    `;
  }

  // Timeline integration methods
  showFixation() {
    // Create a simple fixation cross display
    console.log('⚡ Showing fixation display');

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: center; min-height: 100vh; background: #f8f9fa;">
        <div style="font-size: 48px; font-weight: bold; color: #333;">
          +
        </div>
      </div>
    `;
  }

  showTrialFeedbackInContainer(success, canvasContainer, messageType = 'collaboration') {
    // Show trial feedback in a specific container (used by timeline)
    console.log(`📊 Showing trial feedback in container: ${success ? 'SUCCESS' : 'FAILURE'}`);

    if (!canvasContainer) {
      console.warn('No canvas container provided for trial feedback');
      return;
    }

    // Validate messageType
    if (messageType !== 'single' && messageType !== 'collaboration') {
      console.warn('Invalid messageType. Must be "single" or "collaboration"');
      messageType = 'collaboration';
    }

    // Create visual feedback based on success
    let visualFeedback;
    if (success) {
      // Smile face for success
      visualFeedback = `
        <div style="display: flex; justify-content: center; margin: 30px 0;">
          <div style="
            width: 120px;
            height: 120px;
            background-color: #28a745;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          ">
            <svg width="80" height="80" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12,1A11,11,0,1,0,23,12,11.013,11.013,0,0,0,12,1Zm0,20a9,9,0,1,1,9-9A9.011,9.011,0,0,1,12,21Zm6-8A6,6,0,0,1,6,13a1,1,0,0,1,2,0,4,4,0,0,0,8,0,1,1,0,0,1,2,0ZM8,10V9a1,1,0,0,1,2,0v1a1,1,0,0,1-2,0Zm6,0V9a1,1,0,0,1,2,0v1a1,1,0,0,1-2,0Z" fill="white"/>
            </svg>
          </div>
        </div>
      `;
    } else {
      // Sad face for failure
      visualFeedback = `
        <div style="display: flex; justify-content: center; margin: 30px 0;">
          <div style="
            width: 120px;
            height: 120px;
            background-color: #dc3545;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 8px rgba(0,0,0,0.2);
          ">
            <svg width="80" height="80" viewBox="0 0 30 30" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M19.5 10c.277 0 .5.223.5.5v3c0 .277-.223.5-.5.5s-.5-.223-.5-.5v-3c0-.277.223-.5.5-.5zm-9 0c.277 0 .5.223.5.5v3c0 .277-.223.5-.5.5s-.5-.223-.5-.5v-3c0-.277.223-.5.5-.5zM15 20c-2.104 0-4.186.756-5.798 2.104-.542.4.148 1.223.638.76C11.268 21.67 13.137 21 15 21s3.732.67 5.16 1.864c.478.45 1.176-.364.638-.76C19.186 20.756 17.104 20 15 20zm0-20C6.722 0 0 6.722 0 15c0 8.278 6.722 15 15 15 8.278 0 15-6.722 15-15 0-8.278-6.722-15-15-15zm0 1c7.738 0 14 6.262 14 14s-6.262 14-14 14S1 22.738 1 15 7.262 1 15 1z" fill="white"/>
            </svg>
          </div>
        </div>
      `;
    }

    // Determine message based on messageType
    let message;
    if (messageType === 'single') {
      message = success ? 'Goal reached!' : 'Time up!';
    } else if (messageType === 'collaboration') {
      message = success ? 'Collaboration succeeded!' : 'Collaboration failed!';
    }

    // Create overlay div positioned absolutely over the canvas
    const overlay = document.createElement('div');
    overlay.innerHTML = `
      <div style="
        text-align: center;
        background: rgba(255, 255, 255, 0.95);
        border: 3px solid ${success ? '#28a745' : '#dc3545'};
        border-radius: 15px;
        padding: 30px 40px;
        box-shadow: 0 8px 16px rgba(0, 0, 0, 0.3);
        backdrop-filter: blur(5px);
      ">
        <div style="font-size: 32px; font-weight: bold; margin-bottom: 20px; color: ${success ? '#28a745' : '#dc3545'};">
          ${message}
        </div>
        ${visualFeedback}
      </div>
    `;
    overlay.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1000;
      pointer-events: none;
      width: auto;
      height: auto;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Add overlay to canvas container
    canvasContainer.style.position = 'relative';
    canvasContainer.appendChild(overlay);

    // Auto-remove after delay
    setTimeout(() => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    }, 2000);
  }

  setupGameCanvasInContainer(container) {
    // Set up game canvas within a specific container (used by timeline)
    // Matches legacy nodeGameCreateGameCanvas function
    console.log('🎨 Setting up game canvas in timeline container');

    if (!container) {
      console.error('No container provided for game canvas');
      return;
    }

    // Cleanup any previous resize handler
    if (this.handleResize) {
      window.removeEventListener('resize', this.handleResize);
      this.handleResize = null;
    }

    // Create responsive canvas using shared renderer
    const canvas = this.renderer.createCanvas();
    canvas.id = 'gameCanvas';

    // Clear container and add canvas
    container.innerHTML = '';
    container.appendChild(canvas);

    // Store reference to canvas
    this.gameCanvas = canvas;

    // Apply initial responsive sizing and re-render if we have state
    const doResize = () => {
      this.renderer.applyResponsiveSizing();
      if (this.lastGameState) {
        this.renderer.render(this.gameCanvas, this.lastGameState);
      }
    };
    this.handleResize = () => doResize();
    window.addEventListener('resize', this.handleResize);
    setTimeout(doResize, 0);

    // Set up keyboard controls for the game
    this.setupKeyboardControls();

    console.log('✅ Game canvas set up in timeline container');
  }

  // Connection lost error with retry option
  showConnectionLostError(message, onRetry) {
    this.container.innerHTML = `
      <div style="text-align: center; padding: 20px; background: #f8d7da; border: 1px solid #f5c6cb; border-radius: 8px; margin: 20px;">
        <h3 style="color: #721c24; margin-bottom: 15px;">⚠️ Connection Lost</h3>
        <p style="color: #721c24; margin-bottom: 20px;">${message}</p>
        <div style="display: flex; gap: 10px; justify-content: center;">
          <button onclick="location.reload()" style="background: #6c757d; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Refresh Page
          </button>
          <button id="retry-connection-btn" style="background: #007bff; color: white; border: none; padding: 10px 20px; border-radius: 4px; cursor: pointer;">
            Try Reconnecting
          </button>
        </div>
      </div>
    `;

    // Add retry button event listener
    const retryBtn = document.getElementById('retry-connection-btn');
    if (retryBtn && onRetry) {
      retryBtn.addEventListener('click', onRetry);
    }
  }

  // Reconnecting message
  showReconnectingMessage(message) {
    this.showGameStatus(message, 'info');
  }

  // Success message
  showSuccessMessage(message) {
    this.showGameStatus(message, 'success');
    // Auto-hide after 3 seconds
    setTimeout(() => {
      this.showGameStatus('');
    }, 3000);
  }

  // Cleanup
  destroy() {
    if (this.keyboardHandler) {
      document.removeEventListener('keydown', this.keyboardHandler);
    }

    this.eventHandlers.clear();
    this.gameCanvas = null;
    this.keyboardHandler = null;
  }
}
