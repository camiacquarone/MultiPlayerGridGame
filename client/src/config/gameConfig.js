// Modern configuration system combining all original configs

// Helper function to safely get environment variables
const getEnvVar = (key, defaultValue) => {
  try {
    return import.meta.env?.[key] || defaultValue;
  } catch (error) {
    // Fallback for when import.meta.env is not available (e.g., direct HTML loading)
    console.warn(`Environment variable ${key} not available, using default: ${defaultValue}`);
    return defaultValue;
  }
};

const defaultServerUrl = (typeof window !== 'undefined' && window.location && window.location.origin)
  ? window.location.origin
  : 'http://localhost:3001';

export const CONFIG = {
  // Debug / logging configuration
  debug: {
    // When true, mutes console.log/info/debug in the browser
    // Can also be toggled via env var VITE_DISABLE_DEBUG_LOGS
    disableConsoleLogs: getEnvVar('VITE_DISABLE_DEBUG_LOGS', 'false') === 'true'
  },

  // Server configuration
  server: {
    // Point to same-origin server by default (single-service deploy)
    url: getEnvVar('VITE_SERVER_URL', defaultServerUrl),
    reconnectAttempts: 3,
    reconnectDelay: 1000,
    // Optional: Google Apps Script endpoint for saving data to Google Drive (legacy-compatible)
    // Example: 'https://script.google.com/macros/s/AKfycb.../exec'
    // Default to the legacy Apps Script endpoint; override via VITE_GOOGLE_APPS_SCRIPT_URL
    googleAppsScriptUrl: getEnvVar(
      'VITE_GOOGLE_APPS_SCRIPT_URL',
      'https://script.google.com/macros/s/AKfycbyfQ-XKsoFbmQZGM7c741rEXh2ZUpVK-uUIu9ycooXKnaxM5-hRSzIUhQ-uWZ668Qql/exec'
    ),
    enableGoogleDriveSave: getEnvVar('VITE_ENABLE_GOOGLE_DRIVE_SAVE', 'true') === 'true'
  },

  // Game settings (from original NODEGAME_CONFIG)
  game: {
    name: 'GridWorldExperiment',
    version: '2.0.0',
    prolificCompletionCode: getEnvVar('VITE_PROLIFIC_COMPLETION_CODE', 'CTNDR8GV'),
    matrixSize: 15,
    maxGameLength: 60,

    // Player configuration
    players: {
      player1: {
        type: 'human',
        color: 'red',
        description: 'Human player (you)'
      },
      player2: {
        // Types: 'human' | 'gpt' | 'rl_individual' | 'rl_joint'
        // Legacy alias 'ai' is treated as 'rl_joint'
        type: 'gpt',
          color: 'purple',
        description: 'Human, GPT, or RL partner'
      }
    },

    // Experiment configuration
    experiments: {
      // order: ['1P1G'],
      // order: ['1P2G'],
      // order: [ '2P3G'],
      // order: ['1P2G','2P3G'],
      // order: ['2P2G', '2P3G'],
      order: ['1P1G', '1P2G', '2P2G', '2P3G'], // Full experiment order

      numTrials: {
        '1P1G': 1, // 3
        '1P2G': 1, // 12
        '2P2G': 1, // 8
        '2P3G': 1, // 12
      }
    },

    // Success threshold for collaboration games
    successThreshold: {
      enabled: false,
      consecutiveSuccessesRequired: 5,
      minTrialsBeforeCheck: 12,
      maxTrials: 24,
      randomSamplingAfterTrial: 12
    },

    // Timing configurations
  timing: {
      trialToFeedbackDelay: 500,
      feedbackDisplayDuration: 1000,
      preTrialDisplayDuration: 2000,
      fixationDuration: 1000,
      newGoalMessageDuration: 0,
      // Optional hard wall-clock cap for a trial (ms). 0 disables.
      // Legacy behavior had no time cap; only step-based via maxGameLength.
      maxTrialDurationMs: 60 * 1000,
      // Minimum and maximum time to wait for partner (ms)
      waitingForPartnerMinDuration: 3 * 1000, // 9*1000, 9s
      waitingForPartnerMaxDuration: 3 * 1000 // 300*1000, 5mins
    },

    // AI agent settings
    agent: {
      // RL mode for player2 when using RL: 'individual' or 'joint'
      type: 'joint',
      delay: 500,
      independentDelay: 300,
      // When true, AI/GPT moves are synchronized with the human input
      // i.e., on each human key press, AI/GPT generates a move and both apply before a single redraw
      synchronizedMoves: true,
      // Optional GPT agent client defaults (non-sensitive)
      gpt: {
        // If set, forwarded to server; server may override model
        model: 'gpt',
        temperature: 0,
        // Include past trajectories in GPT prompt
        memory: {
          enabled: true,
          // Limit steps appended to prompt per player to control token usage
          maxSteps: 50
        }
      }
    }
  },

  // Visual settings
  visual: {
    canvasSize: 632, // (cellSize + padding) * matrixSize + padding = (40 + 2) * 15 + 2 = 632
    cellSize: 40,
    padding: 2,
    colors: {
      background: '#ffffff',
      grid: '#cccccc',
      player1: '#ff0000',
      player2: '#8000ff',
      goal: '#0066ff',
      obstacle: '#333333'
    }
  },

  // Text-to-Speech settings
  tts: {
    // Use OpenAI TTS API for more natural voices (requires OPENAI_API_KEY on server)
    // Falls back to browser TTS if OpenAI is unavailable
    useOpenAI: getEnvVar('VITE_USE_OPENAI_TTS', 'true') === 'true',
    // OpenAI TTS voice options: 'alloy', 'echo', 'fable', 'onyx', 'nova', 'shimmer'
    openAIVoice: getEnvVar('VITE_OPENAI_TTS_VOICE', 'nova'),
    // Server endpoint for TTS (defaults to same origin)
    ttsServerUrl: getEnvVar('VITE_TTS_SERVER_URL', defaultServerUrl),
    // Use custom recorded audio files instead of TTS
    useCustomAudio: getEnvVar('VITE_USE_CUSTOM_AUDIO', 'true') === 'true',
    // Base path for custom audio files
    customAudioPath: getEnvVar('VITE_CUSTOM_AUDIO_PATH', '/audio/questionnaire/')
  },

  // 1P2G specific configuration
  oneP2G: {
    minStepsBeforeNewGoal: 1,
    distanceConditions: {
      CLOSER_TO_PLAYER1: 'closer_to_player1',
      FARTHER_TO_PLAYER1: 'farther_to_player1',
      EQUAL_TO_PLAYER1: 'equal_to_player1',
      NO_NEW_GOAL: 'no_new_goal'
    },
    distanceConstraint: {
      closerThreshold: 2,
      fartherThreshold: 2,
      equalTolerance: false,
      allowEqualDistance: false
    },
    goalConstraints: {
      minDistanceFromHuman: 1,
      maxDistanceFromHuman: 12,
      minDistanceBetweenGoals: 3,
      avoidRectangleArea: false,
      blockPathCheck: false
    }
  },

  // 2P3G specific configuration
  twoP3G: {
    minStepsBeforeNewGoal: 1,
    newGoalMessageDuration: 5000,
    distanceConditions: {
      CLOSER_TO_PLAYER2: 'closer_to_player2',
      CLOSER_TO_PLAYER1: 'closer_to_player1',
      EQUAL_TO_BOTH: 'equal_to_both',
      NO_NEW_GOAL: 'no_new_goal'
    },
    distanceConstraint: {
      closerThreshold: 2,
      allowEqualDistance: false,
      maxDistanceIncrease: 5
    },
    goalConstraints: {
      minDistanceFromHuman: 1,
      maxDistanceFromHuman: 12,
      avoidRectangleArea: false,
      maintainDistanceSum: false,
      blockPathCheck: false
    }
  },

  // Multiplayer settings for human-human mode
  multiplayer: {
    maxWaitTime: 60000,
    roomTimeout: 300000,
    reconnectAttempts: 3,
    syncInterval: 100,
    moveTimeout: 10000,
    // Human-human synchronized turns: both players input a move, then both apply together
    synchronizedHumanTurns: false, // false for free movement
    // Max wait (ms) on the "Game is Ready! Press SPACE" screen for the other
    // human to press space before falling back to AI partner
    matchPlayReadyTimeout: 10000,
    // Fallback AI partner type when human-human matching fails
    // Allowed: 'gpt' | 'rl_individual' | 'rl_joint'
    fallbackAIType: 'gpt',
    // Partner inactivity settings
    inactivityFallback: {
      // Enable automatic fallback to AI when partner is inactive
      enabled: true,
      // Time in milliseconds after which partner is considered inactive
      timeoutMs: 40000, // 40s-1 minute
      // How often to check for partner inactivity (ms)
      checkIntervalMs: 5000 // 5 seconds
    },
    // Real-time movement stabilization settings
    realTimeMovement: {
      // Minimum delay between moves to prevent spam (ms)
      moveThrottleDelay: 100,
      // Enable immediate local updates for responsiveness
      immediateLocalUpdates: true,
      // Periodic state synchronization interval (ms) - increased to reduce conflicts
      stateSyncInterval: 300,
      // Move validation timeout (ms)
      moveValidationTimeout: 1000,
      // Time window to protect recent local moves from being overwritten (ms)
      localMoveProtectionWindow: 300
    }
  }
};

// Game objects (from original setup.js)
export const GAME_OBJECTS = {
  blank: 0,
  player: 1,
  ai_player: 2,
  goal: 3,
  obstacle: 4
};

// Movement directions (from original setup.js)
export const DIRECTIONS = {
  arrowup: { movement: [-1, 0], name: 'up' },
  arrowdown: { movement: [1, 0], name: 'down' },
  arrowleft: { movement: [0, -1], name: 'left' },
  arrowright: { movement: [0, 1], name: 'right' }
};

// Apply debug logging configuration by silencing non-error console output if requested
(() => {
  try {
    const silent = CONFIG?.debug?.disableConsoleLogs;
    if (silent) {
      const noop = () => {};
      // Preserve warnings and errors, silence info/debug/log
      if (typeof console !== 'undefined') {
        console.log = noop;
        console.info = noop;
        console.debug = noop;
      }
    }
  } catch (_) {
    // Do nothing if configuration not yet available
  }
})();

// Export utility functions
export const GameConfigUtils = {
  setPlayerType(playerIndex, type) {
    // Normalize legacy alias
    const normalized = (type === 'ai') ? 'rl_joint' : type;
    const allowed = ['human', 'gpt', 'rl_individual', 'rl_joint'];
    if (!allowed.includes(normalized)) return;
    CONFIG.game.players[`player${playerIndex}`].type = normalized;

    // Keep RL agent mode consistent when setting player2 to RL types
    if (playerIndex === 2) {
      if (normalized === 'rl_joint') CONFIG.game.agent.type = 'joint';
      if (normalized === 'rl_individual') CONFIG.game.agent.type = 'individual';
    }
  },

  getPlayerType(playerIndex) {
    return CONFIG.game.players[`player${playerIndex}`].type;
  },

  isHumanAIMode() {
    const t = CONFIG.game.players.player2.type;
    return t !== 'human';
  },

  isHumanHumanMode() {
    return CONFIG.game.players.player2.type === 'human';
  },

  setExperimentOrder(order) {
    CONFIG.game.experiments.order = order;
  },

  getNumTrials(experimentType) {
    return CONFIG.game.experiments.numTrials[experimentType] || 12;
  },

  // Only enable synchronized human turns for two-player experiments
  isSynchronizedHumanTurnsEnabled(experimentType) {
    try {
      const exp = String(experimentType || '').toUpperCase();
      const isTwoPlayer = exp.includes('2P');
      return isTwoPlayer && !!(CONFIG?.multiplayer?.synchronizedHumanTurns);
    } catch (_) {
      return false;
    }
  }
};
