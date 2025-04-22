// notes-grid.js - Enhanced visual representation of notes in the synth interface
// Optimized for users with limited mobility with clear visual feedback

import i18n from './i18n.js';

export class NotesGrid {
  constructor(gridElement) {
    // DOM elements
    this.gridElement = gridElement;
    
    // Grid state
    this.notes = [];
    this.noteElements = [];
    this.activeNoteIndex = -1;
    this.lastPlayedNotes = []; // Track recently played notes for UI feedback
    
    // Visual settings
    this.maxRecentNotes = 3; // Number of recently played notes to highlight
    this.animationDuration = 800; // Duration of note animations in ms
    this.useGradientColors = true; // Whether to use gradient colors for notes
    
    // Accessibility features
    this.showNoteLabels = true; // Show note names inside the elements
    this.useHighContrast = false; // High contrast mode for better visibility
    this.useColorBlindSafe = true; // Color-blind friendly palette
    
    // Base colors for notes (color-blind friendly palette)
    this.noteBaseColors = {
      'C': { hue: 200, label: '#ffffff' }, // Blue
      'C#': { hue: 230, label: '#ffffff' }, // Indigo
      'Db': { hue: 230, label: '#ffffff' }, // Indigo
      'D': { hue: 260, label: '#ffffff' }, // Purple
      'D#': { hue: 290, label: '#ffffff' }, // Pink
      'Eb': { hue: 290, label: '#ffffff' }, // Pink
      'E': { hue: 320, label: '#ffffff' }, // Magenta
      'F': { hue: 350, label: '#ffffff' }, // Red
      'F#': { hue: 15, label: '#ffffff' }, // Orange-Red
      'Gb': { hue: 15, label: '#ffffff' }, // Orange-Red
      'G': { hue: 30, label: '#000000' }, // Orange
      'G#': { hue: 45, label: '#000000' }, // Yellow-Orange
      'Ab': { hue: 45, label: '#000000' }, // Yellow-Orange
      'A': { hue: 60, label: '#000000' }, // Yellow
      'A#': { hue: 90, label: '#000000' }, // Yellow-Green
      'Bb': { hue: 90, label: '#000000' }, // Yellow-Green
      'B': { hue: 170, label: '#000000' }  // Teal
    };
    
    // High contrast palette override
    this.highContrastColors = {
      'C': { hue: 0, label: '#ffffff' }, // Red
      'C#': { hue: 0, label: '#ffffff' }, // Red (darker)
      'Db': { hue: 0, label: '#ffffff' }, // Red (darker)
      'D': { hue: 45, label: '#000000' }, // Yellow
      'D#': { hue: 45, label: '#000000' }, // Yellow (darker)
      'Eb': { hue: 45, label: '#000000' }, // Yellow (darker)
      'E': { hue: 120, label: '#000000' }, // Green
      'F': { hue: 120, label: '#000000' }, // Green (darker)
      'F#': { hue: 240, label: '#ffffff' }, // Blue
      'Gb': { hue: 240, label: '#ffffff' }, // Blue (darker)
      'G': { hue: 240, label: '#ffffff' }, // Blue (darker)
      'G#': { hue: 280, label: '#ffffff' }, // Purple
      'Ab': { hue: 280, label: '#ffffff' }, // Purple (darker)
      'A': { hue: 280, label: '#ffffff' }, // Purple (darker)
      'A#': { hue: 0, label: '#ffffff' }, // Loop back to red
      'Bb': { hue: 0, label: '#ffffff' }, // Loop back to red
      'B': { hue: 0, label: '#ffffff' }  // Loop back to red
    };
    
    // Event listeners
    this._onLanguageChange = this._onLanguageChange.bind(this);
    i18n.onLanguageChange(this._onLanguageChange);
  }
  
  /**
   * Set up the notes grid with the provided notes
   * @param {Array} notes - Array of note names
   */
  setupGrid(notes) {
    // Clear the grid
    this.gridElement.innerHTML = '';
    this.noteElements = [];
    this.notes = notes;
    this.lastPlayedNotes = [];
    this.activeNoteIndex = -1;
    
    // Create note elements
    notes.forEach((note, index) => {
      const noteElement = this._createNoteElement(note, index);
      
      // Add to the grid
      this.gridElement.appendChild(noteElement);
      this.noteElements.push(noteElement);
    });
    
    // Apply initial state
    this._updateNotesAppearance();
  }
  
  /**
   * Create a single note element
   * @param {string} note - Note name (e.g., 'C', 'D#')
   * @param {index} index - Index of the note in the grid
   * @returns {HTMLElement} The created note element
   */
  _createNoteElement(note, index) {
    const noteElement = document.createElement('div');
    noteElement.className = 'note';
    noteElement.dataset.index = index;
    noteElement.dataset.note = note;
    
    // Set background color based on note
    this._setNoteColor(noteElement, note);
    
    // Create label element
    if (this.showNoteLabels) {
      const label = document.createElement('span');
      label.className = 'note-label';
      label.textContent = i18n.getNoteDisplayName(note);
      noteElement.appendChild(label);
    }
    
    // Add event listener for click (for manual testing and activation)
    noteElement.addEventListener('click', () => {
      this._onNoteClick(index);
    });
    
    // For screen readers - improve accessibility
    noteElement.setAttribute('role', 'button');
    noteElement.setAttribute('aria-label', i18n.getNoteDisplayName(note));
    
    return noteElement;
  }
  
  /**
   * Set the background color for a note element
   * @param {HTMLElement} element - The note element
   * @param {string} note - Note name
   */
  _setNoteColor(element, note) {
    // Get the base note (without accidentals)
    const baseNote = note.charAt(0);
    
    // Get color settings
    const colorSet = this.useHighContrast ? this.highContrastColors : this.noteBaseColors;
    const colorInfo = colorSet[note] || colorSet[baseNote] || { hue: 200, label: '#ffffff' };
    
    // Apply color
    if (this.useGradientColors) {
      element.style.background = this._createGradient(colorInfo.hue);
    } else {
      element.style.backgroundColor = `hsl(${colorInfo.hue}, 70%, 60%)`;
    }
    
    // Set text color for contrast
    const labelElements = element.querySelectorAll('.note-label');
    labelElements.forEach(label => {
      label.style.color = colorInfo.label;
    });
  }
  
  /**
   * Create a gradient background for a note
   * @param {number} hue - HSL hue value
   * @returns {string} CSS gradient string
   */
  _createGradient(hue) {
    if (this.useHighContrast) {
      return `linear-gradient(135deg, hsl(${hue}, 100%, 35%), hsl(${hue}, 100%, 50%))`;
    } else {
      return `linear-gradient(135deg, hsl(${hue}, 70%, 40%), hsl(${hue}, 70%, 60%))`;
    }
  }
  
  /**
   * Highlight a note as the currently active one
   * @param {number} index - Index of the note to highlight
   * @param {number} velocity - Velocity of the note (0-1)
   */
  highlightNote(index, velocity = 0.7) {
    // Make sure index is valid
    if (index < 0 || index >= this.noteElements.length) return;
    
    // Remove highlight from the previously active note
    if (this.activeNoteIndex >= 0 && this.activeNoteIndex < this.noteElements.length) {
      this.noteElements[this.activeNoteIndex].classList.remove('active');
    }
    
    // Highlight the new active note
    const noteElement = this.noteElements[index];
    noteElement.classList.add('active');
    this.activeNoteIndex = index;
    
    // Add pulsating animation effect with intensity based on velocity
    this._addPulseEffect(noteElement, velocity);
    
    // Add to recently played notes for visual trail effect
    this._addToRecentNotes(index);
    
    // Update the ARIA live region for screen readers
    this._announceNoteForAccessibility(index);
  }
  
  /**
   * Create a visual trail effect for recently played notes
   * @param {number} index - Index of the note to add
   */
  _addToRecentNotes(index) {
    // Remove current index from the list if it's already there
    this.lastPlayedNotes = this.lastPlayedNotes.filter(item => item.index !== index);
    
    // Add the new note to the beginning of the list
    this.lastPlayedNotes.unshift({
      index: index,
      timestamp: Date.now()
    });
    
    // Limit the number of recent notes to track
    if (this.lastPlayedNotes.length > this.maxRecentNotes) {
      this.lastPlayedNotes.pop();
    }
    
    // Update visual state of all notes
    this._updateNotesAppearance();
  }
  
  /**
   * Update the appearance of all notes based on current state
   */
  _updateNotesAppearance() {
    // First reset all notes
    this.noteElements.forEach(element => {
      element.style.opacity = '1';
      element.classList.remove('recent-1', 'recent-2', 'recent-3');
    });
    
    // Apply classes for recent notes
    this.lastPlayedNotes.forEach((item, i) => {
      if (i > 0 && item.index >= 0 && item.index < this.noteElements.length) {
        // Skip the most recent note (index 0) as it's the active one
        const element = this.noteElements[item.index];
        element.classList.add(`recent-${i}`);
        
        // Calculate fade based on time elapsed
        const elapsed = Date.now() - item.timestamp;
        const fade = Math.max(0.4, 1 - (elapsed / this.animationDuration));
        element.style.opacity = fade.toString();
      }
    });
  }
  
  /**
   * Add a pulsating animation to a note element
   * @param {HTMLElement} element - The note element
   * @param {number} velocity - Intensity of the pulse (0-1)
   */
  _addPulseEffect(element, velocity) {
    // Remove any existing pulse
    element.classList.remove('pulse');
    
    // Set custom property for animation intensity
    element.style.setProperty('--pulse-scale', `${1 + velocity * 0.15}`);
    
    // Trigger reflow to restart animation
    void element.offsetWidth;
    
    // Add pulse class to trigger animation
    element.classList.add('pulse');
  }
  
  /**
   * Handle click on a note
   * @param {number} index - Index of the clicked note
   */
  _onNoteClick(index) {
    // Dispatch a custom event for the main app to handle
    const event = new CustomEvent('note-clicked', { 
      detail: { noteIndex: index }
    });
    this.gridElement.dispatchEvent(event);
  }
  
  /**
   * Handle language change event
   */
  _onLanguageChange() {
    // Update note labels
    if (this.showNoteLabels) {
      this.noteElements.forEach((element, index) => {
        const note = this.notes[index];
        const label = element.querySelector('.note-label');
        if (label) {
          label.textContent = i18n.getNoteDisplayName(note);
        }
        
        // Update ARIA label
        element.setAttribute('aria-label', i18n.getNoteDisplayName(note));
      });
    }
  }
  
  /**
   * Announce the current note for screen readers
   * @param {number} index - Index of the note to announce
   */
  _announceNoteForAccessibility(index) {
    // Create or update a live region for screen readers
    let announcer = document.getElementById('note-announcer');
    if (!announcer) {
      announcer = document.createElement('div');
      announcer.id = 'note-announcer';
      announcer.className = 'sr-only';
      announcer.setAttribute('aria-live', 'polite');
      document.body.appendChild(announcer);
    }
    
    // Announce the note
    const note = this.getNoteNameAtIndex(index);
    const displayName = i18n.getNoteDisplayName(note);
    announcer.textContent = displayName;
  }
  
  /**
   * Get the note name at a specific index
   * @param {number} index - Index of the note
   * @returns {string} Note name
   */
  getNoteNameAtIndex(index) {
    if (index >= 0 && index < this.notes.length) {
      return this.notes[index];
    }
    return '';
  }
  
  /**
   * Get the display name of a note at a specific index
   * @param {number} index - Index of the note
   * @returns {string} Localized display name of the note
   */
  getDisplayNameAtIndex(index) {
    const note = this.getNoteNameAtIndex(index);
    return i18n.getNoteDisplayName(note);
  }
  
  /**
   * Enable high contrast mode for better visibility
   * @param {boolean} enable - Whether to enable high contrast
   */
  setHighContrast(enable) {
    if (this.useHighContrast !== enable) {
      this.useHighContrast = enable;
      
      // Update colors for all note elements
      this.noteElements.forEach((element, index) => {
        this._setNoteColor(element, this.notes[index]);
      });
    }
  }
  
  /**
   * Enable or disable note labels
   * @param {boolean} show - Whether to show note labels
   */
  setShowNoteLabels(show) {
    if (this.showNoteLabels !== show) {
      this.showNoteLabels = show;
      
      if (show) {
        // Add labels
        this.noteElements.forEach((element, index) => {
          if (!element.querySelector('.note-label')) {
            const label = document.createElement('span');
            label.className = 'note-label';
            label.textContent = i18n.getNoteDisplayName(this.notes[index]);
            element.appendChild(label);
          }
        });
      } else {
        // Remove labels
        const labels = this.gridElement.querySelectorAll('.note-label');
        labels.forEach(label => {
          label.remove();
        });
      }
    }
  }
  
  /**
   * Add keyboard navigation for testing and accessibility
   */
  addKeyboardNavigation() {
    // Add global keyboard handler
    document.addEventListener('keydown', (event) => {
      // Skip if modifiers are pressed or if we're inside an input field
      if (event.ctrlKey || event.altKey || event.metaKey || 
          event.target.tagName === 'INPUT' || event.target.tagName === 'TEXTAREA') {
        return;
      }
      
      let newIndex = -1;
      
      switch (event.key) {
        case 'ArrowLeft':
          // Move selection left
          newIndex = Math.max(0, this.activeNoteIndex - 1);
          break;
          
        case 'ArrowRight':
          // Move selection right
          newIndex = Math.min(this.notes.length - 1, this.activeNoteIndex + 1);
          break;
          
        case 'ArrowUp':
          // Jump multiple steps up (for grid layouts)
          const rowSize = Math.floor(Math.sqrt(this.notes.length));
          newIndex = Math.max(0, this.activeNoteIndex - rowSize);
          break;
          
        case 'ArrowDown':
          // Jump multiple steps down (for grid layouts)
          const colSize = Math.floor(Math.sqrt(this.notes.length));
          newIndex = Math.min(this.notes.length - 1, this.activeNoteIndex + colSize);
          break;
          
        case ' ':
        case 'Enter':
          // Activate the current note
          if (this.activeNoteIndex >= 0) {
            this._onNoteClick(this.activeNoteIndex);
          }
          break;
          
        default:
          return; // Exit for other keys
      }
      
      // Update selection if changed
      if (newIndex >= 0 && newIndex !== this.activeNoteIndex) {
        this.highlightNote(newIndex);
        this._onNoteClick(newIndex);
        event.preventDefault(); // Prevent scrolling
      }
    });
  }
  
  /**
   * Animate a sequence of notes (for demo or tutorial)
   * @param {Array} noteIndices - Array of note indices to animate
   * @param {number} duration - Duration between notes in milliseconds
   */
  async animateSequence(noteIndices, duration = 500) {
    let delay = 0;
    
    for (const index of noteIndices) {
      await new Promise(resolve => {
        setTimeout(() => {
          this.highlightNote(index);
          resolve();
        }, delay);
      });
      
      delay = duration;
    }
  }
  
  /**
   * Highlight the note corresponding to the current head position
   * @param {number} x - Normalized x position (-1 to 1)
   */
  highlightNoteFromPosition(x) {
    // Map the x position to a note index
    // x is normalized from -1 (left) to 1 (right)
    const noteIndex = Math.floor(((x + 1) / 2) * this.notes.length);
    const clampedIndex = Math.max(0, Math.min(this.notes.length - 1, noteIndex));
    
    // Highlight the note if it's different from the current one
    if (clampedIndex !== this.activeNoteIndex) {
      this.highlightNote(clampedIndex);
    }
    
    return clampedIndex;
  }
}