// looper.js - Handles recording and playback of loops
export class Looper {
    constructor(loopTracksElement) {
      this.tracksContainer = loopTracksElement;
      this.tracks = [];
      this.maxTracks = 4;
      this.currentTrack = null;
      
      this.isRecording = false;
      this.isPlaying = false;
      this.recordStartTime = 0;
      this.loopDuration = 0;
      this.playbackStartTime = 0;
      
      // Looping interval
      this.playbackInterval = null;
      this.updateInterval = null;
      
      // Track counter for IDs
      this.trackCounter = 0;
    }
    
    startRecording() {
      if (this.isRecording) return;
      
      // Check if we've reached the maximum number of tracks
      if (this.tracks.length >= this.maxTracks) {
        console.warn('Maximum number of tracks reached');
        return;
      }
      
      // Create a new track
      const trackId = `track-${this.trackCounter++}`;
      this.currentTrack = {
        id: trackId,
        events: [],
        duration: 0
      };
      
      this.recordStartTime = Date.now();
      this.isRecording = true;
      
      // Create visual track element
      this._createTrackElement(trackId);
      
      console.log('Started recording loop');
    }
    
    stopRecording() {
      if (!this.isRecording) return;
      
      const now = Date.now();
      this.loopDuration = now - this.recordStartTime;
      
      // Update the track with final duration
      this.currentTrack.duration = this.loopDuration;
      
      // Add the track to our collection
      this.tracks.push(this.currentTrack);
      
      // Update the visual representation
      this._updateTrackVisualization(this.currentTrack);
      
      this.isRecording = false;
      this.currentTrack = null;
      
      console.log(`Stopped recording loop, duration: ${this.loopDuration}ms`);
    }
    
    recordEvent(event) {
      if (!this.isRecording || !this.currentTrack) return;
      
      // Calculate relative timestamp
      const relativeTime = Date.now() - this.recordStartTime;
      
      // Add the event to the current track
      this.currentTrack.events.push({
        ...event,
        time: relativeTime
      });
    }
    
    play(eventCallback) {
      if (this.isPlaying || this.tracks.length === 0) return;
      
      this.isPlaying = true;
      this.playbackStartTime = Date.now();
      
      // Start the playback loop
      this.playbackInterval = setInterval(() => {
        const elapsedTime = (Date.now() - this.playbackStartTime) % this.loopDuration;
        
        // Go through all tracks and check for events that should be triggered
        this.tracks.forEach(track => {
          track.events.forEach(event => {
            // If an event should happen at this time (with a small tolerance)
            if (Math.abs(event.time - elapsedTime) < 20) {
              // Callback to actually perform the action
              if (typeof eventCallback === 'function') {
                eventCallback(event);
              }
            }
          });
        });
      }, 10); // Check for events every 10ms
      
      // Update track visuals
      this.updateInterval = setInterval(() => {
        this._updatePlaybackPosition();
      }, 30); // Update visualization less frequently for better performance
      
      console.log('Started loop playback');
    }
    
    stop() {
      if (!this.isPlaying) return;
      
      clearInterval(this.playbackInterval);
      clearInterval(this.updateInterval);
      this.isPlaying = false;
      
      // Reset progress indicators
      this._resetPlaybackVisuals();
      
      console.log('Stopped loop playback');
    }
    
    clear() {
      this.stop();
      
      // Clear all tracks
      this.tracks = [];
      this.currentTrack = null;
      this.tracksContainer.innerHTML = '';
      
      console.log('Cleared all loops');
    }
    
    getTrackCount() {
      return this.tracks.length;
    }
    
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
      muteButton.textContent = 'השתק';
      muteButton.addEventListener('click', () => this._toggleTrackMute(trackId));
      
      // Delete button
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-small';
      deleteButton.textContent = 'מחק';
      deleteButton.addEventListener('click', () => this._deleteTrack(trackId));
      
      controlsElement.appendChild(muteButton);
      controlsElement.appendChild(deleteButton);
      
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
      
      // Assemble track
      trackElement.appendChild(controlsElement);
      trackElement.appendChild(timelineElement);
      
      // Add to tracks container
      this.tracksContainer.appendChild(trackElement);
    }
    
    _updateTrackVisualization(track) {
      const trackElement = document.getElementById(track.id);
      if (!trackElement) return;
      
      const eventsElement = trackElement.querySelector('.loop-track-events');
      eventsElement.innerHTML = '';
      
      // Create visual elements for each event
      track.events.forEach((event, index) => {
        const eventElement = document.createElement('div');
        eventElement.className = 'loop-track-event';
        
        // Position the event based on its relative time
        const positionPercent = (event.time / track.duration) * 100;
        eventElement.style.left = `${positionPercent}%`;
        
        // Width could be based on event duration if applicable
        eventElement.style.width = '4px';
        
        // Color based on event type or other properties
        if (event.type === 'note') {
          // Could color based on note value
          eventElement.style.backgroundColor = `hsl(${(event.noteIndex * 30) % 360}, 70%, 60%)`;
          
          // Height based on velocity
          if (event.velocity) {
            const height = 40 + (event.velocity * 40); // 40-80% height
            eventElement.style.height = `${height}%`;
            eventElement.style.top = `${(100 - height) / 2}%`;
          }
        }
        
        eventsElement.appendChild(eventElement);
      });
    }
    
    _updatePlaybackPosition() {
      if (!this.isPlaying) return;
      
      const elapsedTime = (Date.now() - this.playbackStartTime) % this.loopDuration;
      const positionPercent = (elapsedTime / this.loopDuration) * 100;
      
      // Update progress indicators for all tracks
      this.tracks.forEach(track => {
        const trackElement = document.getElementById(track.id);
        if (trackElement) {
          const progressElement = trackElement.querySelector('.loop-track-progress');
          progressElement.style.width = `${positionPercent}%`;
        }
      });
    }
    
    _resetPlaybackVisuals() {
      // Reset all progress indicators
      const progressElements = document.querySelectorAll('.loop-track-progress');
      progressElements.forEach(el => {
        el.style.width = '0%';
      });
    }
    
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
          muteButton.textContent = 'בטל השתקה';
          trackElement.classList.add('muted');
        } else {
          muteButton.textContent = 'השתק';
          trackElement.classList.remove('muted');
        }
      }
    }
    
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
    }
    
    // Getters for state
    isRecording() {
      return this.isRecording;
    }
    
    isPlaying() {
      return this.isPlaying;
    }
  }