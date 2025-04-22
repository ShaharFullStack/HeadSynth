// notes-grid.js - Visual representation of notes in the synth interface
export class NotesGrid {
    constructor(gridElement) {
      this.gridElement = gridElement;
      this.notes = [];
      this.noteElements = [];
      this.activeNoteIndex = -1;
      
      // Mapping for note display names (for better readability)
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
      
      // Colors for different note types
      this.noteColors = {
        'C': '#FF5252', // Red
        'D': '#FF9800', // Orange
        'E': '#FFEB3B', // Yellow
        'F': '#4CAF50', // Green
        'G': '#2196F3', // Blue
        'A': '#9C27B0', // Purple
        'B': '#E91E63', // Pink
      };
    }
    
    setupGrid(notes) {
      // Clear the grid
      this.gridElement.innerHTML = '';
      this.noteElements = [];
      this.notes = notes;
      
      // Create note elements
      notes.forEach((note, index) => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note';
        noteElement.dataset.index = index;
        
        // Get the base note (without accidentals)
        const baseNote = note.charAt(0);
        
        // Set the background color based on the base note
        if (this.noteColors[baseNote]) {
          noteElement.style.backgroundColor = this._adjustColorOpacity(this.noteColors[baseNote], 0.7);
        }
        
        // Set the display name
        const displayName = this.noteDisplayNames[note] || note;
        noteElement.textContent = displayName;
        
        // Add event listener for click (for testing and manual playing)
        noteElement.addEventListener('click', () => {
          this._onNoteClick(index);
        });
        
        // Add to the grid
        this.gridElement.appendChild(noteElement);
        this.noteElements.push(noteElement);
      });
      
      // Reset active note
      this.activeNoteIndex = -1;
    }
    
    highlightNote(index) {
      // Remove highlight from the previously active note
      if (this.activeNoteIndex >= 0 && this.activeNoteIndex < this.noteElements.length) {
        this.noteElements[this.activeNoteIndex].classList.remove('active');
      }
      
      // Highlight the new active note
      if (index >= 0 && index < this.noteElements.length) {
        this.noteElements[index].classList.add('active');
        this.activeNoteIndex = index;
        
        // Add pulsating animation effect
        this._addPulseEffect(this.noteElements[index]);
      }
    }
    
    _addPulseEffect(element) {
      // Add a pulsating animation when a note is played
      element.classList.add('pulse');
      
      // Remove the pulse effect after animation completes
      setTimeout(() => {
        element.classList.remove('pulse');
      }, 300);
    }
    
    _onNoteClick(index) {
      // This could be used for manual note triggering or testing
      this.highlightNote(index);
      
      // Dispatch a custom event that the main app can listen for
      const event = new CustomEvent('note-clicked', { 
        detail: { noteIndex: index }
      });
      this.gridElement.dispatchEvent(event);
    }
    
    _adjustColorOpacity(hexColor, opacity) {
      // Convert hex to RGB
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      
      // Return as rgba
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    getNoteNameAtIndex(index) {
      if (index >= 0 && index < this.notes.length) {
        return this.notes[index];
      }
      return '';
    }
    
    getDisplayNameAtIndex(index) {
      const note = this.getNoteNameAtIndex(index);
      return this.noteDisplayNames[note] || note;
    }
    
    addKeyboardNavigation() {
      // Add keyboard navigation for testing
      document.addEventListener('keydown', (event) => {
        let newIndex = -1;
        
        switch (event.key) {
          case 'ArrowLeft':
            newIndex = Math.max(0, this.activeNoteIndex - 1);
            break;
          case 'ArrowRight':
            newIndex = Math.min(this.notes.length - 1, this.activeNoteIndex + 1);
            break;
          case 'ArrowUp':
            newIndex = Math.max(0, this.activeNoteIndex - Math.floor(Math.sqrt(this.notes.length)));
            break;
          case 'ArrowDown':
            newIndex = Math.min(this.notes.length - 1, this.activeNoteIndex + Math.floor(Math.sqrt(this.notes.length)));
            break;
          case ' ':
          case 'Enter':
            if (this.activeNoteIndex >= 0) {
              this._onNoteClick(this.activeNoteIndex);
            }
            break;
          default:
            return; // Exit for other keys
        }
        
        if (newIndex >= 0) {
          this.highlightNote(newIndex);
          this._onNoteClick(newIndex);
          event.preventDefault();
        }
      });
    }
    
    // Optional animation methods
    animateSequence(noteIndices, duration = 200) {
      let delay = 0;
      
      noteIndices.forEach(index => {
        setTimeout(() => {
          this.highlightNote(index);
        }, delay);
        
        delay += duration;
      });
    }
  }