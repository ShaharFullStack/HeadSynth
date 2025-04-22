// looper.js - Enhanced loop recording and playback system
// Optimized for users with limited mobility

import i18n from './i18n.js';

export class Looper {
  constructor(loopTracksElement) {
    // DOM elements
    this.tracksContainer = loopTracksElement;
    
    // Loop state
    this.tracks = [];
    this.maxTracks = 4;
    this.currentTrack = null;
    this.isRecording = false;
    this.isPlaying = false;
    this.quantizeEnabled = true; // Enable quantization for better timing accuracy
    
    // Recording parameters
    this.recordStartTime = 0;
    this.loopDuration = 0;
    this.playbackStartTime = 0;
    this.minimumLoopDuration = 2000; // Minimum loop duration in ms
    this.maximumLoopDuration = 20000; // Maximum loop duration in ms
    
    // Timing and intervals
    this.playbackInterval = null;
    this.updateInterval = null;
    this.quantizeResolution = 10; // Quantize resolution in ms
    
    // Track counter for IDs
    this.trackCounter = 0;
    
    // Accessibility features
    this.useHighContrastTracks = false;
    this.useSimplifiedVisuals = false;
    this.useColorCoding = true;
    
    // Callback functions
    this.onLoopStart = null;
    this.onLoopStop = null;
    this.onRecordingStart = null;
    this.onRecordingStop = null;
    this.onTrackAdded = null;
    this.onTrackRemoved = null;
    
    // Initialize animation frames
    this.animationFrameId = null;
    this.lastAnimationTime = 0;
  }
  
  /**
   * Start recording a new loop
   * @returns {boolean} - Whether recording started successfully
   */
  startRecording() {
    if (this.isRecording) return false;
    
    // Check if we've reached the maximum number of tracks
    if (this.tracks.length >= this.maxTracks) {
      console.warn('Maximum number of tracks reached');
      return false;
    }
    
    // Create a new track
    const trackId = `track-${this.trackCounter++}`;
    this.currentTrack = {
      id: trackId,
      events: [],
      duration: 0,
      muted: false,
      color: this._generateTrackColor(this.tracks.length),
      createdAt: Date.now()
    };
    
    this.recordStartTime = Date.now();
    this.isRecording = true;
    
    // Create visual track element
    this._createTrackElement(trackId);
    
    // Notify listeners
    if (typeof this.onRecordingStart === 'function') {
      this.onRecordingStart(this.currentTrack);
    }
    
    console.log('Started recording loop');
    return true;
  }
  
  /**
   * Stop the current recording and save the loop
   * @returns {Object|null} - The recorded track or null if recording wasn't active
   */
  stopRecording() {
    if (!this.isRecording) return null;
    
    const now = Date.now();
    const recordedDuration = now - this.recordStartTime;
    
    // Check if recording was too short or too long
    if (recordedDuration < this.minimumLoopDuration) {
      // Recording was too short, apply minimum duration
      this.loopDuration = this.minimumLoopDuration;
    } else if (recordedDuration > this.maximumLoopDuration) {
      // Recording was too long, apply maximum duration
      this.loopDuration = this.maximumLoopDuration;
    } else {
      // Recording was within acceptable range
      this.loopDuration = recordedDuration;
    }
    
    // Update the track with final duration
    this.currentTrack.duration = this.loopDuration;
    
    // Add the track to our collection
    this.tracks.push(this.currentTrack);
    
    // Update the visual representation
    this._updateTrackVisualization(this.currentTrack);
    
    // Store completed track before resetting
    const completedTrack = this.currentTrack;
    
    // Reset recording state
    this.isRecording = false;
    this.currentTrack = null;
    
    // Notify listeners
    if (typeof this.onRecordingStop === 'function') {
      this.onRecordingStop(completedTrack);
    }
    
    console.log(`Stopped recording loop, duration: ${this.loopDuration}ms`);
    return completedTrack;
  }
  
  /**
   * Record an event during loop recording
   * @param {Object} event - Event data to record
   */
  recordEvent(event) {
    if (!this.isRecording || !this.currentTrack) return;
    
    // Calculate relative timestamp
    const now = Date.now();
    const relativeTime = now - this.recordStartTime;
    
    // Apply quantization if enabled to improve rhythmic accuracy
    let quantizedTime = relativeTime;
    if (this.quantizeEnabled && this.quantizeResolution > 0) {
      quantizedTime = Math.round(relativeTime / this.quantizeResolution) * this.quantizeResolution;
    }
    
    // Add the event to the current track
    this.currentTrack.events.push({
      ...event,
      time: quantizedTime,
      timestamp: now,
      // Add additional metadata for visualization
      duration: event.duration || 100, // Default event duration in ms
      velocity: event.velocity || 0.7, // Default velocity
      visualSize: event.velocity ? Math.max(4, Math.floor(event.velocity * 8)) : 4 // Size based on velocity
    });
    
    // Update visualization in real-time
    this._updateTrackVisualization(this.currentTrack);
  }
  
  /**
   * Start playback of all loops
   * @param {Function} eventCallback - Callback function for event playback
   * @returns {boolean} - Whether playback started successfully
   */
  play(eventCallback) {
    if (this.isPlaying || this.tracks.length === 0) return false;
    
    this.isPlaying = true;
    this.playbackStartTime = Date.now();
    
    // Cancel any existing animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
    
    // Track the last time events were processed
    this.lastAnimationTime = performance.now();
    
    // Use requestAnimationFrame for smoother playback
    const animate = (currentTime) => {
      // Calculate precise elapsed time
      const elapsedTime = (Date.now() - this.playbackStartTime) % this.loopDuration;
      
      // Calculate time since last frame
      const deltaTime = currentTime - this.lastAnimationTime;
      this.lastAnimationTime = currentTime;
      
      // Check if enough time has passed to process events
      if (deltaTime >= this.quantizeResolution || elapsedTime < this.quantizeResolution) {
        // Find events that should be triggered based on elapsed time
        this._processEventsAtTime(elapsedTime, eventCallback);
      }
      
      // Update visual indicators
      this._updatePlaybackPosition(elapsedTime);
      
      // Continue animation if still playing
      if (this.isPlaying) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    // Start the animation loop
    this.animationFrameId = requestAnimationFrame(animate);
    
    // Notify listeners
    if (typeof this.onLoopStart === 'function') {
      this.onLoopStart();
    }
    
    console.log('Started loop playback');
    return true;
  }
  
  /**
   * Process events at the current playback time
   * @param {number} elapsedTime - Current playback position in ms
   * @param {Function} eventCallback - Callback function for event playback
   */
  _processEventsAtTime(elapsedTime, eventCallback) {
    if (!eventCallback) return;
    
    // Time window for events (compensate for timing jitter)
    const earlyWindow = 15; // ms before theoretical time
    const lateWindow = 15;  // ms after theoretical time
    
    // Go through all tracks and check for events that should be triggered
    this.tracks.forEach(track => {
      // Skip muted tracks
      if (track.muted) return;
      
      track.events.forEach(event => {
        // If an event should happen at this time (with tolerance window)
        if (
          (event.time >= elapsedTime - earlyWindow && event.time <= elapsedTime + lateWindow) ||
          // Also check for wraparound at end of loop
          (event.time >= this.loopDuration - earlyWindow && elapsedTime <= lateWindow)
        ) {
          // Callback to actually perform the action
          eventCallback(event, track);
        }
      });
    });
  }
  
  /**
   * Stop loop playback
   */
  stop() {
    if (!this.isPlaying) return;
    
    // Cancel animation frame
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.isPlaying = false;
    
    // Reset progress indicators
    this._resetPlaybackVisuals();
    
    // Notify listeners
    if (typeof this.onLoopStop === 'function') {
      this.onLoopStop();
    }
    
    console.log('Stopped loop playback');
  }
  
  /**
   * Clear all tracks and reset the looper
   */
  clear() {
    // Stop playback
    this.stop();
    
    // If recording, stop recording
    if (this.isRecording) {
      this.stopRecording();
    }
    
    // Get track IDs before clearing for callbacks
    const trackIds = this.tracks.map(track => track.id);
    
    // Clear all tracks
    this.tracks = [];
    this.currentTrack = null;
    this.loopDuration = 0;
    
    // Clear the DOM
    this.tracksContainer.innerHTML = '';
    
    // Notify listeners for each removed track
    if (typeof this.onTrackRemoved === 'function') {
      trackIds.forEach(id => this.onTrackRemoved(id));
    }
    
    console.log('Cleared all loops');
  }
  
  /**
   * Get the number of tracks
   * @returns {number} Number of tracks
   */
  getTrackCount() {
    return this.tracks.length;
  }
  
  /**
   * Set the quantization (timing snap) for recording
   * @param {boolean} enabled - Whether quantization is enabled
   * @param {number} resolution - Quantization resolution in ms
   */
  setQuantization(enabled, resolution = 10) {
    this.quantizeEnabled = enabled;
    this.quantizeResolution = Math.max(1, resolution);
  }
  
  /**
   * Set high contrast mode for track visualization
   * @param {boolean} enabled - Whether high contrast mode is enabled
   */
  setHighContrast(enabled) {
    this.useHighContrastTracks = enabled;
    
    // Update all track visualizations
    this.tracks.forEach(track => {
      this._updateTrackVisualization(track);
    });
  }
  
  /**
   * Set simplified visual mode for reduced visual complexity
   * @param {boolean} enabled - Whether simplified visual mode is enabled
   */
  setSimplifiedVisuals(enabled) {
    this.useSimplifiedVisuals = enabled;
    
    // Update class on container
    if (enabled) {
      this.tracksContainer.classList.add('simplified');
    } else {
      this.tracksContainer.classList.remove('simplified');
    }
    
    // Update all track visualizations
    this.tracks.forEach(track => {
      this._updateTrackVisualization(track);
    });
  }
  
  /**
   * Create DOM element for a track
   * @param {string} trackId - ID of the track
   */
  _createTrackElement(trackId) {
    const trackElement = document.createElement('div');
    trackElement.className = 'loop-track';
    trackElement.id = trackId;
    
    // Track controls (mute, delete)
    const controlsElement = document.createElement('div');
    controlsElement.className = 'loop-track-controls';
    
    // Mute button
    const muteButton = document.createElement('button');
    muteButton.className = 'btn btn-small';
    muteButton.setAttribute('aria-label', i18n.translate('mute'));
    muteButton.innerHTML = `<i class="fas fa-volume-mute"></i>`;
    muteButton.addEventListener('click', () => this._toggleTrackMute(trackId));
    
    // Delete button
    const deleteButton = document.createElement('button');
    deleteButton.className = 'btn btn-small btn-danger';
    deleteButton.setAttribute('aria-label', i18n.translate('delete'));
    deleteButton.innerHTML = `<i class="fas fa-trash"></i>`;
    deleteButton.addEventListener('click', () => this._deleteTrack(trackId));
    
    controlsElement.appendChild(muteButton);
    controlsElement.appendChild(deleteButton);
    
    // Track info
    const infoElement = document.createElement('div');
    infoElement.className = 'loop-track-info';
    infoElement.innerHTML = `<span>${i18n.translate('track')} ${this.tracks.length + 1}</span>`;
    
    // Timeline
    const timelineElement = document.createElement('div');
    timelineElement.className = 'loop-track-timeline';
    
    // Progress indicator
    const progressElement = document.createElement('div');
    progressElement.className = 'loop-track-progress';
    
    // Events container
    const eventsElement = document.createElement('div');
    eventsElement.className = 'loop-track-events';
    
    timelineElement.appendChild(progressElement);
    timelineElement.appendChild(eventsElement);
    
    // Add to track element
    trackElement.appendChild(controlsElement);
    trackElement.appendChild(infoElement);
    trackElement.appendChild(timelineElement);
    
    // Add to tracks container
    this.tracksContainer.appendChild(trackElement);
    
    // Return the created element for reference
    return trackElement;
  }
  
  /**
   * Update visual representation of a track
   * @param {Object} track - Track data
   */
  _updateTrackVisualization(track) {
    const trackElement = document.getElementById(track.id);
    if (!trackElement) return;
    
    const eventsElement = trackElement.querySelector('.loop-track-events');
    if (!eventsElement) return;
    
    // Clear existing events
    eventsElement.innerHTML = '';
    
    // Set track color if applicable
    if (this.useColorCoding && track.color) {
      // Apply color to various elements based on track color
      const progressElement = trackElement.querySelector('.loop-track-progress');
      if (progressElement) {
        progressElement.style.backgroundColor = this._adjustColorOpacity(track.color, 0.7);
      }
    }
    
    // Create visual elements for each event
    track.events.forEach((event, index) => {
      const eventElement = document.createElement('div');
      eventElement.className = 'loop-track-event';
      
      // Position the event based on its relative time
      const positionPercent = track.duration > 0 ? (event.time / track.duration) * 100 : 0;
      eventElement.style.left = `${positionPercent}%`;
      
      // Set width and height based on event properties
      eventElement.style.width = `${this.useSimplifiedVisuals ? 8 : event.visualSize}px`;
      
      // Set height based on velocity
      if (event.velocity !== undefined) {
        const height = 40 + (event.velocity * 40); // 40-80% height
        eventElement.style.height = `${height}%`;
        eventElement.style.top = `${(100 - height) / 2}%`;
      }
      
      // Set color based on event type and track color
      if (event.type === 'note') {
        // Use track color or note-specific color
        const baseColor = track.color || this._generateEventColor(event.noteIndex);
        eventElement.style.backgroundColor = this.useHighContrastTracks 
          ? this._getHighContrastColor(index) 
          : baseColor;
        
        // Add glow effect for accessibility
        eventElement.style.boxShadow = `0 0 5px ${this._adjustColorOpacity(baseColor, 0.8)}`;
      }
      
      eventsElement.appendChild(eventElement);
    });
    
    // For screen readers - add count of events
    trackElement.setAttribute('aria-label', 
      `${i18n.translate('track')} ${this.tracks.indexOf(track) + 1}, ${track.events.length} ${i18n.translate('events')}`
    );
  }
  
  /**
   * Update playback position indicator for all tracks
   * @param {number} elapsedTime - Current playback position in ms
   */
  _updatePlaybackPosition(elapsedTime) {
    const positionPercent = this.loopDuration > 0 ? (elapsedTime / this.loopDuration) * 100 : 0;
    
    // Update progress indicators for all tracks
    this.tracks.forEach(track => {
      const trackElement = document.getElementById(track.id);
      if (trackElement) {
        const progressElement = trackElement.querySelector('.loop-track-progress');
        if (progressElement) {
          progressElement.style.width = `${positionPercent}%`;
        }
      }
    });
  }
  
  /**
   * Reset playback position indicators
   */
  _resetPlaybackVisuals() {
    // Reset all progress indicators
    const progressElements = document.querySelectorAll('.loop-track-progress');
    progressElements.forEach(el => {
      el.style.width = '0%';
    });
  }
  
  /**
   * Toggle mute state for a track
   * @param {string} trackId - ID of the track to toggle
   */
  _toggleTrackMute(trackId) {
    const trackIndex = this.tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    const track = this.tracks[trackIndex];
    track.muted = !track.muted;
    
    // Update visual state
    const trackElement = document.getElementById(trackId);
    if (trackElement) {
      const muteButton = trackElement.querySelector('.loop-track-controls button:first-child');
      if (track.muted) {
        trackElement.classList.add('muted');
        if (muteButton) {
          muteButton.innerHTML = `<i class="fas fa-volume-up"></i>`;
          muteButton.setAttribute('aria-label', i18n.translate('unmute'));
        }
      } else {
        trackElement.classList.remove('muted');
        if (muteButton) {
          muteButton.innerHTML = `<i class="fas fa-volume-mute"></i>`;
          muteButton.setAttribute('aria-label', i18n.translate('mute'));
        }
      }
    }
  }
  
  /**
   * Delete a track
   * @param {string} trackId - ID of the track to delete
   */
  _deleteTrack(trackId) {
    const trackIndex = this.tracks.findIndex(t => t.id === trackId);
    if (trackIndex === -1) return;
    
    // Remove from array
    this.tracks.splice(trackIndex, 1);
    
    // Remove from DOM
    const trackElement = document.getElementById(trackId);
    if (trackElement) {
      this.tracksContainer.removeChild(trackElement);
    }
    
    // If that was the last track, reset loop duration
    if (this.tracks.length === 0) {
      this.loopDuration = 0;
    }
    
    // Notify listeners
    if (typeof this.onTrackRemoved === 'function') {
      this.onTrackRemoved(trackId);
    }
  }
  
  /**
   * Generate a color for a track based on its index
   * @param {number} index - Track index
   * @returns {string} CSS color string
   */
  _generateTrackColor(index) {
    // Generate colors with good contrast and accessibility
    const colors = [
      '#4e54c8', // Indigo
      '#43cea2', // Teal
      '#f39c12', // Orange
      '#9d50bb', // Purple
      '#e74c3c', // Red
      '#3498db', // Blue
      '#2ecc71', // Green
      '#e67e22'  // Dark Orange
    ];
    
    return colors[index % colors.length];
  }
  
  /**
   * Generate a color for an event based on its properties
   * @param {number} value - Value to base color on (e.g., note index)
   * @returns {string} CSS color string
   */
  _generateEventColor(value = 0) {
    // Generate a hue based on the value (for notes, different colors for different notes)
    const hue = (value * 30) % 360;
    return `hsl(${hue}, 70%, 60%)`;
  }
  
  /**
   * Get a high contrast color for accessibility
   * @param {number} index - Index in sequence
   * @returns {string} CSS color string
   */
  _getHighContrastColor(index) {
    // Limited set of high contrast colors
    const highContrastColors = [
      '#ffffff', // White
      '#ffff00', // Yellow
      '#00ffff', // Cyan
      '#ff00ff', // Magenta
      '#ff0000', // Red
      '#00ff00'  // Green
    ];
    
    return highContrastColors[index % highContrastColors.length];
  }
  
  /**
   * Adjust color opacity
   * @param {string} color - CSS color string
   * @param {number} opacity - Opacity value (0-1)
   * @returns {string} CSS rgba color string
   */
  _adjustColorOpacity(color, opacity) {
    // If color is already rgba, adjust its opacity
    if (color.startsWith('rgba')) {
      return color.replace(/rgba\((.+?),\s*[\d.]+\)/, `rgba($1, ${opacity})`);
    }
    
    // If color is rgb, convert to rgba
    if (color.startsWith('rgb')) {
      return color.replace(/rgb\((.+?)\)/, `rgba($1, ${opacity})`);
    }
    
    // If color is hex
    if (color.startsWith('#')) {
      let r, g, b;
      
      // Handle both #RGB and #RRGGBB formats
      if (color.length === 4) {
        r = parseInt(color[1] + color[1], 16);
        g = parseInt(color[2] + color[2], 16);
        b = parseInt(color[3] + color[3], 16);
      } else {
        r = parseInt(color.slice(1, 3), 16);
        g = parseInt(color.slice(3, 5), 16);
        b = parseInt(color.slice(5, 7), 16);
      }
      
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    
    // For other color formats, return with default opacity
    return color;
  }
  
  /**
   * Check if looper is currently recording
   * @returns {boolean}
   */
  isRecording() {
    return this.isRecording;
  }
  
  /**
   * Check if looper is currently playing
   * @returns {boolean}
   */
  isPlaying() {
    return this.isPlaying;
  }
  
  /**
   * Get all track data
   * @returns {Array} Array of track objects
   */
  getTracks() {
    return [...this.tracks];
  }
  
  /**
   * Get the current loop duration
   * @returns {number} Duration in milliseconds
   */
  getDuration() {
    return this.loopDuration;
  }
}