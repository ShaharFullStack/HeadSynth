// ui-controller.js - Enhanced user interface management for HeadSynth
// Optimized for users with limited mobility

import i18n from './i18n.js';

export class UIController {
  constructor(elements) {
    // Main UI elements
    this.currentNoteDisplay = elements.currentNoteDisplay;
    this.modeDisplay = elements.modeDisplay;
    this.headPositionDisplay = elements.headPositionDisplay;
    this.headPositionIndicator = elements.headPositionIndicator;
    this.trackingStatusIndicator = elements.trackingStatusIndicator;
    this.trackingStatusText = elements.trackingStatusText;
    
    // Sliders and value displays
    this.volumeValue = elements.volumeValue;
    this.reverbValue = elements.reverbValue;
    this.delayValue = elements.delayValue;
    
    // Modal elements
    this.modals = {
      help: document.getElementById('helpModal'),
      calibration: document.getElementById('calibrationModal'),
      error: document.getElementById('errorModal')
    };
    
    // State values
    this.currentNote = '';
    this.currentMode = i18n.translate('modeDisplay');
    this.headPosition = { x: 0, y: 0, z: 0 };
    this.isTrackingActive = false;
    
    // Animation frames
    this.animationFrameId = null;
    
    // Toast notification system
    this.toastContainer = document.getElementById('toastContainer');
    this.toastDuration = 3000; // Default duration
    this.toastQueue = [];
    this.activeToasts = 0;
    this.maxToasts = 3; // Maximum number of visible toasts
    
    // Accessibility settings
    this.highContrastMode = false;
    this.reduceMotion = false;
    this.useSimplifiedUI = false;
    this.useLargeText = false;
    
    // Theme settings
    this.darkTheme = true; // Default to dark theme
    
    // Initialize UI
    this._initializeUI();
    
    // Listen for language changes
    i18n.onLanguageChange(() => {
      this._updateUI();
    });
    
    // Listen for custom toast notifications
    document.addEventListener('notification', (event) => {
      const { message, type, duration } = event.detail;
      this.showToast(message, type, duration);
    });
    
    // Listen for theme toggle
    const themeToggleBtn = document.getElementById('themeToggleBtn');
    if (themeToggleBtn) {
      themeToggleBtn.addEventListener('click', () => {
        this.toggleTheme();
      });
    }
  }
  
  /**
   * Initialize the UI
   */
  _initializeUI() {
    // Add message styles if needed
    this._addMessageStyles();
    
    // Check for stored preferences
    this._loadUserPreferences();
    
    // Initialize toasts container if it doesn't exist
    if (!this.toastContainer) {
      this.toastContainer = document.createElement('div');
      this.toastContainer.id = 'toastContainer';
      this.toastContainer.className = 'toast-container';
      document.body.appendChild(this.toastContainer);
    }
    
    // Apply initial UI state
    this._updateUI();
  }
  
  /**
   * Set the currently playing note
   * @param {string} note - Note name
   */
  setCurrentNote(note) {
    // Skip update if note hasn't changed
    if (this.currentNote === note) return;
    
    this.currentNote = note;
    
    if (this.currentNoteDisplay) {
      const displayName = i18n.getNoteDisplayName(note) || note;
      const currentNoteText = i18n.translate('currentNote').replace('--', displayName);
      this.currentNoteDisplay.textContent = currentNoteText;
      
      // Add a brief highlight animation for better visibility
      this.currentNoteDisplay.classList.remove('highlight');
      // Trigger reflow to restart animation
      void this.currentNoteDisplay.offsetWidth;
      this.currentNoteDisplay.classList.add('highlight');
      
      // Update ARIA live region for screen readers
      this._announceForScreenReaders(displayName);
    }
  }
  
  /**
   * Set the current application mode
   * @param {string} mode - Mode name
   */
  setMode(mode) {
    this.currentMode = mode;
    
    if (this.modeDisplay) {
      const modeText = i18n.translate('modeDisplay').replace('Paused', mode);
      this.modeDisplay.textContent = modeText;
    }
  }
  
  /**
   * Update head position display
   * @param {Object} position - Position object with x, y, z coordinates
   */
  updateHeadPosition(position) {
    this.headPosition = position;
    
    // Update text display
    if (this.headPositionDisplay) {
      const formattedPosition = `X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
      const positionText = i18n.translate('headPosition').replace('X: 0.00, Y: 0.00, Z: 0.00', formattedPosition);
      this.headPositionDisplay.textContent = positionText;
    }
    
    // Update visual indicator position on screen
    this._updateHeadIndicator(position);
  }
  
  /**
   * Update the head position indicator
   * @param {Object} position - Position object with x, y, z coordinates
   */
  _updateHeadIndicator(position) {
    // Cancel any existing animation frame to prevent queuing
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Use requestAnimationFrame for smoother animation
    this.animationFrameId = requestAnimationFrame(() => {
      if (!this.headPositionIndicator) return;
      
      const parentRect = this.headPositionIndicator.parentElement.getBoundingClientRect();
      const centerX = parentRect.width / 2;
      const centerY = parentRect.height / 2;
      
      // Calculate position (flip X for proper left/right)
      const indicatorX = centerX + (position.x * centerX * -1);
      const indicatorY = centerY + (position.y * centerY * -1);
      
      // Apply position with transform for better performance
      this.headPositionIndicator.style.transform = `translate(${indicatorX}px, ${indicatorY}px) rotate(${position.z * 30}deg)`;
      
      // Apply glow intensity based on confidence or activity
      const confidence = position.confidence !== undefined ? position.confidence : 1;
      const glowIntensity = Math.max(0.2, confidence);
      this.headPositionIndicator.style.boxShadow = `0 0 ${10 * glowIntensity}px rgba(78, 84, 200, ${glowIntensity})`;
      
      // Scale based on Z position for depth effect (if not using for rotation)
      // const scale = 1 + (position.z * 0.2);
      // this.headPositionIndicator.style.transform += ` scale(${scale})`;
    });
  }
  
  /**
   * Update tracking status indicator
   * @param {boolean} isActive - Whether tracking is active
   * @param {number} confidence - Confidence level (0-1)
   */
  updateTrackingStatus(isActive, confidence = 1) {
    this.isTrackingActive = isActive;
    
    if (this.trackingStatusIndicator) {
      if (isActive) {
        this.trackingStatusIndicator.classList.add('active');
      } else {
        this.trackingStatusIndicator.classList.remove('active');
      }
    }
    
    if (this.trackingStatusText) {
      const key = isActive ? 'trackingActive' : 'trackingInactive';
      this.trackingStatusText.textContent = i18n.translate(key);
    }
  }
  
  /**
   * Update slider value display
   * @param {string} slider - Slider ID ('volume', 'reverb', 'delay')
   * @param {number} value - Slider value (0-1)
   */
  updateSliderValue(slider, value) {
    const percentage = Math.round(value * 100);
    
    switch (slider) {
      case 'volume':
        if (this.volumeValue) {
          this.volumeValue.textContent = `${percentage}%`;
        }
        break;
      case 'reverb':
        if (this.reverbValue) {
          this.reverbValue.textContent = `${percentage}%`;
        }
        break;
      case 'delay':
        if (this.delayValue) {
          this.delayValue.textContent = `${percentage}%`;
        }
        break;
    }
  }
  
  /**
   * Show a modal dialog
   * @param {string} modalName - Name of the modal
   */
  showModal(modalName) {
    if (this.modals[modalName]) {
      // Using classes for transitions
      this.modals[modalName].classList.add('visible');
      document.body.classList.add('modal-open');
      
      // Focus on the first interactive element
      setTimeout(() => {
        const focusable = this.modals[modalName].querySelector('button, [tabindex="0"]');
        if (focusable) {
          focusable.focus();
        }
      }, 100);
    }
  }
  
  /**
   * Hide a modal dialog
   * @param {string} modalName - Name of the modal
   */
  hideModal(modalName) {
    if (this.modals[modalName]) {
      this.modals[modalName].classList.remove('visible');
      document.body.classList.remove('modal-open');
      
      // Return focus to the element that was focused before
      if (this.lastFocusedElement) {
        this.lastFocusedElement.focus();
      }
    }
  }
  
  /**
   * Show an error message
   * @param {string} message - Error message
   */
  showErrorMessage(message) {
    const errorMessage = document.getElementById('errorMessage');
    if (errorMessage) {
      errorMessage.textContent = message;
      this.showModal('error');
    } else {
      // Fallback to toast notification
      this.showToast(message, 'error');
    }
  }
  
  /**
   * Show a toast notification
   * @param {string} message - Message to display
   * @param {string} type - Notification type ('success', 'error', 'info', 'warning')
   * @param {number} duration - Duration in milliseconds
   */
  showToast(message, type = 'info', duration = this.toastDuration) {
    // Add to queue if too many active toasts
    if (this.activeToasts >= this.maxToasts) {
      this.toastQueue.push({ message, type, duration });
      return;
    }
    
    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    
    // Add icon based on type
    let icon = '';
    switch (type) {
      case 'success':
        icon = '<i class="fas fa-check-circle toast-icon"></i>';
        break;
      case 'error':
        icon = '<i class="fas fa-exclamation-circle toast-icon"></i>';
        break;
      case 'warning':
        icon = '<i class="fas fa-exclamation-triangle toast-icon"></i>';
        break;
      case 'info':
      default:
        icon = '<i class="fas fa-info-circle toast-icon"></i>';
        break;
    }
    
    // Create toast content
    toast.innerHTML = `
      ${icon}
      <div class="toast-message">${message}</div>
      <button class="toast-close" aria-label="${i18n.translate('dismiss')}">
        <i class="fas fa-times"></i>
      </button>
    `;
    
    // Add to DOM
    this.toastContainer.appendChild(toast);
    this.activeToasts++;
    
    // Add close button handler
    const closeBtn = toast.querySelector('.toast-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        this._removeToast(toast);
      });
    }
    
    // Make toast visible (for animation)
    setTimeout(() => {
      toast.classList.add('visible');
    }, 10);
    
    // Automatically remove after duration
    setTimeout(() => {
      this._removeToast(toast);
    }, duration);
    
    // For screen readers
    this._announceForScreenReaders(message);
  }
  
  /**
   * Remove a toast and display next in queue if any
   * @param {HTMLElement} toast - Toast element to remove
   */
  _removeToast(toast) {
    if (!toast) return;
    
    // Start fade out animation
    toast.classList.remove('visible');
    
    // Remove from DOM after animation completes
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
        this.activeToasts--;
        
        // Display next toast in queue if any
        if (this.toastQueue.length > 0) {
          const nextToast = this.toastQueue.shift();
          this.showToast(nextToast.message, nextToast.type, nextToast.duration);
        }
      }
    }, 300); // Match the CSS transition duration
  }
  
  /**
   * Announce a message for screen readers
   * @param {string} message - Message to announce
   */
  _announceForScreenReaders(message) {
    // Create or get the live region
    let announcer = document.getElementById('sr-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'sr-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
    }
    
    // Set the message (clear first to ensure announcement)
    announcer.textContent = '';
    setTimeout(() => {
      announcer.textContent = message;
    }, 10);
  }
  
  /**
   * Update UI elements based on current state
   */
  _updateUI() {
    // Update the text-based elements
    this.setCurrentNote(this.currentNote);
    this.setMode(this.currentMode);
    this.updateHeadPosition(this.headPosition);
    this.updateTrackingStatus(this.isTrackingActive);
    
    // Apply accessibility settings
    this._applyAccessibilitySettings();
  }
  
  /**
   * Add CSS styles for UI components if not already present
   */
  _addMessageStyles() {
    // Add CSS for screen reader only content
    if (!document.getElementById('ui-controller-styles')) {
      const style = document.createElement('style');
      style.id = 'ui-controller-styles';
      style.textContent = `
        /* Screen reader only */
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border-width: 0;
        }
        
        /* Status item highlight animation */
        @keyframes highlight-pulse {
          0% { background-color: var(--dark-accent); }
          50% { background-color: var(--dark-surface-lighter); }
          100% { background-color: var(--dark-surface-lighter); }
        }
        
        .theme-light .status-item.highlight {
          animation: highlight-pulse-light 1s ease;
        }
        
        @keyframes highlight-pulse-light {
          0% { background-color: var(--light-accent); }
          50% { background-color: var(--light-surface); }
          100% { background-color: var(--light-surface); }
        }
        
        .status-item.highlight {
          animation: highlight-pulse 1s ease;
        }
        
        /* Large text mode */
        .large-text {
          font-size: 120%;
        }
        
        .large-text .btn,
        .large-text .status-item,
        .large-text .note-label {
          font-size: 120%;
        }
        
        /* Simplified UI mode */
        .simplified-ui .notes-grid {
          gap: 15px;
        }
        
        .simplified-ui .loop-track-events .loop-track-event {
          width: 8px !important;
        }
        
        /* Reduced motion */
        @media (prefers-reduced-motion: reduce) {
          * {
            animation-duration: 0.001ms !important;
            transition-duration: 0.001ms !important;
          }
        }
        
        .reduce-motion * {
          animation-duration: 0.001ms !important;
          transition-duration: 0.001ms !important;
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  /**
   * Apply accessibility settings to the UI
   */
  _applyAccessibilitySettings() {
    // Apply high contrast
    document.body.classList.toggle('high-contrast', this.highContrastMode);
    
    // Apply reduced motion
    document.body.classList.toggle('reduce-motion', this.reduceMotion);
    
    // Apply simplified UI
    document.body.classList.toggle('simplified-ui', this.useSimplifiedUI);
    
    // Apply large text
    document.body.classList.toggle('large-text', this.useLargeText);
    
    // Apply theme
    document.body.classList.toggle('theme-dark', this.darkTheme);
    document.body.classList.toggle('theme-light', !this.darkTheme);
    
    // Update theme toggle icon
    const themeIcon = document.querySelector('#themeToggleBtn i');
    if (themeIcon) {
      themeIcon.className = this.darkTheme ? 'fas fa-sun' : 'fas fa-moon';
    }
  }
  
  /**
   * Toggle between light and dark themes
   */
  toggleTheme() {
    this.darkTheme = !this.darkTheme;
    this._applyAccessibilitySettings();
    
    // Store preference
    localStorage.setItem('headSynthDarkTheme', this.darkTheme ? 'true' : 'false');
    
    // Show toast notification
    const message = this.darkTheme ? 
      i18n.translate('darkThemeEnabled') || 'Dark theme enabled' : 
      i18n.translate('lightThemeEnabled') || 'Light theme enabled';
    
    this.showToast(message, 'info', 2000);
  }
  
  /**
   * Set high contrast mode
   * @param {boolean} enabled - Whether high contrast mode is enabled
   */
  setHighContrastMode(enabled) {
    this.highContrastMode = enabled;
    this._applyAccessibilitySettings();
    localStorage.setItem('headSynthHighContrast', enabled ? 'true' : 'false');
  }
  
  /**
   * Set reduced motion mode
   * @param {boolean} enabled - Whether reduced motion mode is enabled
   */
  setReduceMotion(enabled) {
    this.reduceMotion = enabled;
    this._applyAccessibilitySettings();
    localStorage.setItem('headSynthReduceMotion', enabled ? 'true' : 'false');
  }
  
  /**
   * Set simplified UI mode
   * @param {boolean} enabled - Whether simplified UI mode is enabled
   */
  setSimplifiedUI(enabled) {
    this.useSimplifiedUI = enabled;
    this._applyAccessibilitySettings();
    localStorage.setItem('headSynthSimplifiedUI', enabled ? 'true' : 'false');
  }
  
  /**
   * Set large text mode
   * @param {boolean} enabled - Whether large text mode is enabled
   */
  setLargeText(enabled) {
    this.useLargeText = enabled;
    this._applyAccessibilitySettings();
    localStorage.setItem('headSynthLargeText', enabled ? 'true' : 'false');
  }
  
  /**
   * Load user preferences from localStorage
   */
  _loadUserPreferences() {
    // Load theme preference
    const storedTheme = localStorage.getItem('headSynthDarkTheme');
    if (storedTheme !== null) {
      this.darkTheme = storedTheme === 'true';
    } else {
      // Check for system preference
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      this.darkTheme = prefersDark;
    }
    
    // Load accessibility preferences
    this.highContrastMode = localStorage.getItem('headSynthHighContrast') === 'true';
    this.reduceMotion = localStorage.getItem('headSynthReduceMotion') === 'true';
    this.useSimplifiedUI = localStorage.getItem('headSynthSimplifiedUI') === 'true';
    this.useLargeText = localStorage.getItem('headSynthLargeText') === 'true';
    
    // Check for system preference for reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.reduceMotion = true;
    }
  }
  
  /**
   * Update controls state based on application state
   * @param {Object} state - Application state
   */
  updateControlsState(state) {
    // Update UI controls based on application state
    const startBtn = document.getElementById('startBtn');
    const calibrateBtn = document.getElementById('calibrateBtn');
    const recordLoopBtn = document.getElementById('recordLoopBtn');
    const playLoopBtn = document.getElementById('playLoopBtn');
    const stopLoopBtn = document.getElementById('stopLoopBtn');
    
    if (startBtn) {
      if (state.isRunning) {
        startBtn.innerHTML = `<i class="fas fa-stop"></i> <span>${i18n.translate('stop')}</span>`;
        startBtn.classList.add('active');
        startBtn.setAttribute('aria-label', i18n.translate('stop'));
      } else {
        startBtn.innerHTML = `<i class="fas fa-play"></i> <span>${i18n.translate('start')}</span>`;
        startBtn.classList.remove('active');
        startBtn.setAttribute('aria-label', i18n.translate('start'));
      }
    }
    
    if (calibrateBtn) {
      calibrateBtn.disabled = state.isRunning;
    }
    
    if (recordLoopBtn) {
      if (state.isRecording) {
        recordLoopBtn.innerHTML = `<i class="fas fa-square"></i> <span>${i18n.translate('stopRecording')}</span>`;
        recordLoopBtn.classList.add('active');
        recordLoopBtn.setAttribute('aria-label', i18n.translate('stopRecording'));
      } else {
        recordLoopBtn.innerHTML = `<i class="fas fa-circle"></i> <span>${i18n.translate('recordLoop')}</span>`;
        recordLoopBtn.classList.remove('active');
        recordLoopBtn.setAttribute('aria-label', i18n.translate('recordLoop'));
      }
    }
    
    if (playLoopBtn) {
      playLoopBtn.disabled = state.isRecording;
      if (state.isPlaying) {
        playLoopBtn.classList.add('active');
      } else {
        playLoopBtn.classList.remove('active');
      }
    }
    
    if (stopLoopBtn) {
      stopLoopBtn.disabled = !state.isPlaying;
    }
  }
  
  /**
   * Create and display keyboard shortcuts help
   * @returns {HTMLElement} Shortcuts container element
   */
  createKeyboardShortcutsHelp() {
    // Create shortcuts list - this would be used in help modal
    const shortcuts = [
      { key: 'Space', action: i18n.translate('shortcutStart') },
      { key: 'C', action: i18n.translate('shortcutCalibrate') },
      { key: 'R', action: i18n.translate('shortcutRecord') },
      { key: 'P', action: i18n.translate('shortcutPlay') },
      { key: 'S', action: i18n.translate('shortcutStop') },
      { key: 'L', action: i18n.translate('shortcutLanguage') },
      { key: '+/-', action: i18n.translate('shortcutVolume') }
    ];
    
    const shortcutsContainer = document.querySelector('.shortcuts-grid');
    if (shortcutsContainer) {
      shortcutsContainer.innerHTML = '';
      
      shortcuts.forEach(shortcut => {
        const item = document.createElement('div');
        item.className = 'shortcut-item';
        item.innerHTML = `<span class="key">${shortcut.key}</span>
                          <span>${shortcut.action}</span>`;
        shortcutsContainer.appendChild(item);
      });
    }
    
    return shortcutsContainer;
  }
  
  /**
   * Add keyboard shortcuts functionality
   * @param {Object} callbacks - Callback functions for different actions
   */
  addKeyboardShortcuts(callbacks) {
    document.addEventListener('keydown', (event) => {
      // Skip if inside input field or if modifiers are pressed
      if (event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA' || 
          event.ctrlKey || event.altKey || event.metaKey) {
        return;
      }
      
      switch (event.key.toLowerCase()) {
        case ' ': // Space
          if (callbacks.toggleStart) {
            callbacks.toggleStart();
            event.preventDefault();
          }
          break;
        case 'c':
          if (callbacks.calibrate) {
            callbacks.calibrate();
          }
          break;
        case 'r':
          if (callbacks.toggleRecord) {
            callbacks.toggleRecord();
          }
          break;
        case 'p':
          if (callbacks.playLoop) {
            callbacks.playLoop();
          }
          break;
        case 's':
          if (callbacks.stopLoop) {
            callbacks.stopLoop();
          }
          break;
        case 'l':
          // Language toggle is handled by i18n controller
          break;
        case '+':
        case '=':
          if (callbacks.increaseVolume) {
            callbacks.increaseVolume();
          }
          break;
        case '-':
          if (callbacks.decreaseVolume) {
            callbacks.decreaseVolume();
          }
          break;
      }
    });
  }
}