// ui-controller.js - Manages the user interface components
export class UIController {
    constructor(elements) {
      this.currentNoteDisplay = elements.currentNoteDisplay;
      this.modeDisplay = elements.modeDisplay;
      this.headPositionDisplay = elements.headPositionDisplay;
      this.headPositionIndicator = elements.headPositionIndicator;
      
      // Note display mapping
      this.noteDisplayNames = {
        'C': 'דו',
        'C#': 'דו#',
        'Db': 'רה♭',
        'D': 'רה',
        'D#': 'רה#',
        'Eb': 'מי♭',
        'E': 'מי',
        'F': 'פה',
        'F#': 'פה#',
        'Gb': 'סול♭',
        'G': 'סול',
        'G#': 'סול#',
        'Ab': 'לה♭',
        'A': 'לה',
        'A#': 'לה#',
        'Bb': 'סי♭',
        'B': 'סי'
      };
      
      // Modal elements
      this.modals = {
        help: document.getElementById('helpModal'),
        calibration: document.getElementById('calibrationModal'),
        error: document.getElementById('errorModal')
      };
      
      // Latest values
      this.currentNote = '';
      this.currentMode = 'מושהה';
      this.headPosition = { x: 0, y: 0, z: 0 };
      
      // Initialize
      this._updateUI();
      
      // Add CSS for temporary messages
      this._addMessageStyles();
    }
    
    setCurrentNote(note) {
      this.currentNote = note;
      const displayName = this.noteDisplayNames[note] || note;
      this.currentNoteDisplay.textContent = `נוטה: ${displayName}`;
    }
    
    setMode(mode) {
      this.currentMode = mode;
      this.modeDisplay.textContent = `מצב: ${mode}`;
    }
    
    updateHeadPosition(position) {
      this.headPosition = position;
      
      // Update text display
      this.headPositionDisplay.textContent = `מיקום ראש: X: ${position.x.toFixed(2)}, Y: ${position.y.toFixed(2)}, Z: ${position.z.toFixed(2)}`;
      
      // Update visual indicator position on screen
      // Map normalized coordinates (-1 to 1) to screen position
      if (this.headPositionIndicator) {
        const parentRect = this.headPositionIndicator.parentElement.getBoundingClientRect();
        const centerX = parentRect.width / 2;
        const centerY = parentRect.height / 2;
        
        // Calculate position (flip X for proper left/right)
        const indicatorX = centerX + (position.x * centerX * -1);
        const indicatorY = centerY + (position.y * centerY * -1);
        
        // Apply position
        this.headPositionIndicator.style.left = `${indicatorX}px`;
        this.headPositionIndicator.style.top = `${indicatorY}px`;
        
        // Apply rotation effect based on z value
        const rotation = position.z * 30; // -30 to 30 degrees
        this.headPositionIndicator.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;
      }
    }
    
    showModal(modalName) {
      if (this.modals[modalName]) {
        this.modals[modalName].style.display = 'flex';
      }
    }
    
    hideModal(modalName) {
      if (this.modals[modalName]) {
        this.modals[modalName].style.display = 'none';
      }
    }
    
    showErrorMessage(message) {
      const errorMessage = document.getElementById('errorMessage');
      if (errorMessage) {
        errorMessage.textContent = message;
        this.showModal('error');
      }
    }
    
    showTemporaryMessage(message, duration = 2000) {
      // Create temporary message element
      const messageEl = document.createElement('div');
      messageEl.className = 'temp-message';
      messageEl.textContent = message;
      document.body.appendChild(messageEl);
      
      // Fade out and remove after duration
      setTimeout(() => {
        messageEl.classList.add('fade-out');
        setTimeout(() => {
          if (messageEl.parentNode) {
            document.body.removeChild(messageEl);
          }
        }, 500);
      }, duration);
    }
    
    _updateUI() {
      this.setCurrentNote(this.currentNote);
      this.setMode(this.currentMode);
      this.updateHeadPosition(this.headPosition);
    }
    
    _addMessageStyles() {
      // Add CSS for temporary messages if not already present
      if (!document.getElementById('temp-message-styles')) {
        const style = document.createElement('style');
        style.id = 'temp-message-styles';
        style.textContent = `
          .temp-message {
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            background-color: rgba(0, 0, 0, 0.7);
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 1000;
            font-weight: bold;
            opacity: 1;
            transition: opacity 0.5s ease;
          }
          .temp-message.fade-out {
            opacity: 0;
          }
          
          /* Animation for note highlighting */
          @keyframes pulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); }
            100% { transform: scale(1); }
          }
          
          .note.pulse {
            animation: pulse 0.3s ease;
          }
          
          /* Styling for muted track */
          .loop-track.muted {
            opacity: 0.5;
          }
        `;
        document.head.appendChild(style);
      }
    }
    
    // UI animations and effects
    animateNotePlay(noteElement) {
      if (!noteElement) return;
      
      noteElement.classList.add('pulse');
      setTimeout(() => {
        noteElement.classList.remove('pulse');
      }, 300);
    }
    
    updateControlsState(state) {
      // Update UI controls based on application state
      const startBtn = document.getElementById('startBtn');
      const calibrateBtn = document.getElementById('calibrateBtn');
      const recordLoopBtn = document.getElementById('recordLoopBtn');
      const playLoopBtn = document.getElementById('playLoopBtn');
      
      if (startBtn) {
        if (state.isRunning) {
          startBtn.textContent = 'עצור נגינה';
          startBtn.classList.add('active');
        } else {
          startBtn.textContent = 'התחל נגינה';
          startBtn.classList.remove('active');
        }
      }
      
      if (calibrateBtn) {
        calibrateBtn.disabled = state.isRunning;
      }
      
      if (recordLoopBtn) {
        if (state.isRecording) {
          recordLoopBtn.textContent = 'עצור הקלטה';
          recordLoopBtn.classList.add('active');
        } else {
          recordLoopBtn.textContent = 'הקלט לופ';
          recordLoopBtn.classList.remove('active');
        }
      }
      
      if (playLoopBtn) {
        if (state.isPlaying) {
          playLoopBtn.classList.add('active');
        } else {
          playLoopBtn.classList.remove('active');
        }
      }
    }
    
    createKeyboardShortcutsHelp() {
      // Create and display a keyboard shortcuts helper
      const shortcuts = [
        { key: 'מקש רווח', action: 'הפעל/עצור' },
        { key: 'C', action: 'כיול' },
        { key: 'R', action: 'הקלט לופ' },
        { key: 'P', action: 'נגן לופ' },
        { key: 'S', action: 'עצור לופ' },
        { key: 'חיצים', action: 'שליטה ידנית בנוטות' },
        { key: '+/-', action: 'שינוי עוצמת קול' }
      ];
      
      const shortcutsContainer = document.createElement('div');
      shortcutsContainer.className = 'keyboard-shortcuts';
      
      const title = document.createElement('h3');
      title.textContent = 'קיצורי מקלדת';
      shortcutsContainer.appendChild(title);
      
      const list = document.createElement('ul');
      shortcuts.forEach(shortcut => {
        const item = document.createElement('li');
        item.innerHTML = `<span class="key">${shortcut.key}</span>: ${shortcut.action}`;
        list.appendChild(item);
      });
      
      shortcutsContainer.appendChild(list);
      
      return shortcutsContainer;
    }
  }