// synth-engine.js - Enhanced audio engine for HeadSynth
// Optimized for users with limited mobility

import i18n from './i18n.js';

export class SynthEngine {
  constructor() {
    // Initialize audio context and components
    this.audioContext = null;
    this.synth = null;
    this.currentInstrument = 'synth';

    // Audio effects
    this.reverb = null;
    this.delay = null;
    this.volume = null;
    this.limiter = null; // Added limiter to prevent audio clipping

    // Musical scales with both English and Hebrew note names
    this.scales = {
      major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
      minor: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
      pentatonic: ['C', 'D', 'E', 'G', 'A'],
      blues: ['C', 'Eb', 'F', 'F#', 'G', 'Bb'],
      chromatic: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
    };

    // Current musical settings
    this.currentScale = 'major';
    this.octave = 4;
    this.baseNote = 'C';

    // Note playing state
    this.activeNotes = new Set();
    this.lastNotePlayed = null;
    this.isPlaying = false;

    // Performance settings
    this.noteReleaseDuration = 0.4; // Extended for better overlap between notes
    this.glideEnabled = false;
    this.glideTime = 0.1;

    // Accessibility settings
    this.autoReleaseEnabled = true; // Auto-release notes for users who can't control release
    this.velocitySensitivity = 1.0; // How responsive the velocity is to head movements
    this.effectSensitivity = 1.0;   // How responsive effects are to head movements

    // Event callbacks
    this.onNotePlay = null;
    this.onNoteRelease = null;
    this.onInstrumentChange = null;

    // Instrument presets with improved settings for each type
    this.instrumentPresets = {
      synth: {
        oscillator: {
          type: 'triangle8'
        },
        envelope: {
          attack: 0.05,
          decay: 0.3,
          sustain: 0.6, // Increased sustain for better sound with limited mobility
          release: 1.0
        }
      },
      amSynth: {
        harmonicity: 2,
        oscillator: {
          type: 'triangle'
        },
        modulation: {
          type: 'square'
        },
        envelope: {
          attack: 0.1,
          decay: 0.2,
          sustain: 0.7,
          release: 1.2
        }
      },
      fmSynth: {
        harmonicity: 3,
        modulationIndex: 10,
        oscillator: {
          type: 'sine'
        },
        envelope: {
          attack: 0.01,
          decay: 0.2,
          sustain: 0.8,
          release: 1.5
        },
        modulation: {
          type: 'triangle'
        },
        modulationEnvelope: {
          attack: 0.5,
          decay: 0.1,
          sustain: 0.3,
          release: 0.5
        }
      },
      pluck: {
        attackNoise: 1,
        dampening: 4000,
        resonance: 0.7
      },
      piano: {
        urls: {
          A0: "A0.mp3",
          C1: "C1.mp3",
          Ds1: "Ds1.mp3",
          Fs1: "Fs1.mp3",
          A1: "A1.mp3",
          C2: "C2.mp3",
          Ds2: "Ds2.mp3",
          Fs2: "Fs2.mp3",
          A2: "A2.mp3",
          C3: "C3.mp3",
          Ds3: "Ds3.mp3",
          Fs3: "Fs3.mp3",
          A3: "A3.mp3",
          C4: "C4.mp3",
          Ds4: "Ds4.mp3",
          Fs4: "Fs4.mp3",
          A4: "A4.mp3",
          C5: "C5.mp3",
          Ds5: "Ds5.mp3",
          Fs5: "Fs5.mp3",
          A5: "A5.mp3",
          C6: "C6.mp3",
          Ds6: "Ds6.mp3",
          Fs6: "Fs6.mp3",
          A6: "A6.mp3",
          C7: "C7.mp3",
          Ds7: "Ds7.mp3",
          Fs7: "Fs7.mp3",
          A7: "A7.mp3",
          C8: "C8.mp3"
        },
        baseUrl: "https://tonejs.github.io/audio/salamander/",
        release: 1
      }
    };
  }

  /**
   * Initialize the audio engine
   */
  async init() {
    try {
      // Start audio context - must be triggered by user interaction
      await Tone.start();
      console.log('Audio context started');

      // Create master limiter to prevent clipping
      this.limiter = new Tone.Limiter(-3).toDestination();

      // Create reverb effect
      this.reverb = new Tone.Reverb({
        decay: 2.5,
        wet: 0.3,
        preDelay: 0.01
      }).connect(this.limiter);

      // Create delay effect
      this.delay = new Tone.FeedbackDelay({
        delayTime: 0.25,
        feedback: 0.2,
        wet: 0.2
      }).connect(this.reverb);

      // Create volume control
      this.volume = new Tone.Volume(-6).connect(this.delay);

      // Create default synth
      await this._createSynth('synth');

      // Wait for reverb to initialize
      await this.reverb.generate();

      console.log('Synth engine initialized');
      return true;
    } catch (error) {
      console.error('Error initializing synth engine:', error);
      throw new Error('Failed to initialize audio system. Please make sure your browser supports Web Audio API.');
    }
  }

  /**
   * Start the synth engine
   */
  start() {
    if (this.isPlaying) return;
    this.isPlaying = true;

    // Ensure audio context is resumed
    if (Tone.context.state !== 'running') {
      Tone.context.resume();
    }
  }

  /**
   * Stop the synth engine and release all notes
   */
  stop() {
    if (!this.isPlaying) return;

    // Stop all active notes
    this.releaseAllNotes();
    this.isPlaying = false;

    // Suspend audio context to save resources
    // Tone.context.suspend();
  }

  /**
   * Play a note based on scale index
   * @param {number} noteIndex - Index of the note in the current scale
   * @param {number} velocity - Velocity of the note (0-1)
   * @returns {string} The full note name that was played
   */
  playNote(noteIndex, velocity = 0.7) {
    if (!this.isPlaying || !this.synth || noteIndex < 0) return null;

    const scale = this.getCurrentScale();
    if (noteIndex >= scale.length) return null;

    // Adjust velocity based on sensitivity
    velocity = this._adjustVelocity(velocity);

    // Get the note to play
    const noteName = scale[noteIndex];
    const fullNoteName = `${noteName}${this.octave}`;

    // If this note is already active and we don't have auto-release,
    // don't retrigger it to prevent stuttering
    if (this.activeNotes.has(fullNoteName) && !this.autoReleaseEnabled) {
      return fullNoteName;
    }

    // Determine if we should release the last note
    if (this.autoReleaseEnabled && this.lastNotePlayed &&
      this.lastNotePlayed !== fullNoteName) {
      this.synth.triggerRelease(this.lastNotePlayed);
      this.activeNotes.delete(this.lastNotePlayed);
    }

    // Special handling for different instruments
    let now = Tone.now();

    // Trigger the new note - different handling for Sampler vs other synths
    if (this.currentInstrument === 'piano') {
      // For sampler, we don't need triggerAttack, just trigger with note duration
      this.synth.triggerAttackRelease(fullNoteName, this.noteReleaseDuration * 2, now, velocity);
    } else {
      // For synthesizers, we use triggerAttack for sustain
      this.synth.triggerAttack(fullNoteName, now, velocity);
    }

    // Add to active notes
    this.activeNotes.add(fullNoteName);
    this.lastNotePlayed = fullNoteName;

    // If auto-release is enabled, schedule the release
    if (this.autoReleaseEnabled && this.currentInstrument !== 'piano') {
      Tone.Transport.scheduleOnce(() => {
        if (this.activeNotes.has(fullNoteName)) {
          this.synth.triggerRelease(fullNoteName);
          this.activeNotes.delete(fullNoteName);

          // Notify about release
          if (typeof this.onNoteRelease === 'function') {
            this.onNoteRelease(noteIndex, fullNoteName);
          }
        }
      }, `+${this.noteReleaseDuration}`);
    }

    // Notify about note play
    if (typeof this.onNotePlay === 'function') {
      this.onNotePlay(noteIndex, fullNoteName, velocity);
    }

    return fullNoteName;
  }

  /**
   * Manually release a note
   * @param {number} noteIndex - Index of the note to release
   */
  releaseNote(noteIndex) {
    if (!this.isPlaying || !this.synth) return;

    const scale = this.getCurrentScale();
    if (noteIndex < 0 || noteIndex >= scale.length) return;

    const noteName = scale[noteIndex];
    const fullNoteName = `${noteName}${this.octave}`;

    if (this.activeNotes.has(fullNoteName)) {
      this.synth.triggerRelease(fullNoteName);
      this.activeNotes.delete(fullNoteName);
      this.lastNotePlayed = null;

      // Notify about release
      if (typeof this.onNoteRelease === 'function') {
        this.onNoteRelease(noteIndex, fullNoteName);
      }
    }
  }

  /**
   * Release all currently playing notes
   */
  releaseAllNotes() {
    if (!this.synth) return;

    // Release all notes based on instrument type
    if (this.currentInstrument === 'piano') {
      // For sampler, we rely on the natural release
      this.activeNotes.clear();
      this.lastNotePlayed = null;
    } else {
      // For synths, explicitly release all notes
      const notes = Array.from(this.activeNotes);
      if (notes.length > 0) {
        this.synth.triggerRelease(notes);
        this.activeNotes.clear();
        this.lastNotePlayed = null;
      }
    }
  }

  /**
   * Change the current instrument
   * @param {string} instrument - Instrument name
   */
  async setInstrument(instrument) {
    if (this.currentInstrument === instrument || !this.instrumentPresets[instrument]) return;

    // Release all active notes
    this.releaseAllNotes();

    try {
      // Create the new instrument
      await this._createSynth(instrument);
      this.currentInstrument = instrument;

      // Notify about instrument change
      if (typeof this.onInstrumentChange === 'function') {
        this.onInstrumentChange(instrument);
      }

      return true;
    } catch (error) {
      console.error('Error changing instrument:', error);
      return false;
    }
  }

  /**
   * Create a synth with the specified instrument type
   * @param {string} instrument - Instrument name
   */
  async _createSynth(instrument) {
    // Dispose of the old synth if it exists
    if (this.synth) {
      this.synth.dispose();
    }

    // Get preset settings for the instrument
    const preset = this.instrumentPresets[instrument];

    switch (instrument) {
      case 'amSynth':
        this.synth = new Tone.AMSynth(preset).connect(this.volume);
        break;

      case 'fmSynth':
        this.synth = new Tone.FMSynth(preset).connect(this.volume);
        break;

      case 'pluck':
        this.synth = new Tone.PluckSynth(preset).connect(this.volume);
        break;

      // Updated piano sample URL in the _createSynth method
      case 'piano':
        this.synth = new Tone.Sampler({
          urls: {
            A0: "A0.mp3",
            C1: "C1.mp3",
            Ds1: "Ds1.mp3",
            Fs1: "Fs1.mp3",
            A1: "A1.mp3",
            C2: "C2.mp3",
            Ds2: "Ds2.mp3",
            Fs2: "Fs2.mp3",
            A2: "A2.mp3",
            C3: "C3.mp3",
            Ds3: "Ds3.mp3",
            Fs3: "Fs3.mp3",
            A3: "A3.mp3",
            C4: "C4.mp3",
            Ds4: "Ds4.mp3",
            Fs4: "Fs4.mp3",
            A4: "A4.mp3",
            C5: "C5.mp3",
            Ds5: "Ds5.mp3",
            Fs5: "Fs5.mp3",
            A5: "A5.mp3",
            C6: "C6.mp3",
            Ds6: "Ds6.mp3",
            Fs6: "Fs6.mp3",
            A6: "A6.mp3",
            C7: "C7.mp3",
            Ds7: "Ds7.mp3",
            Fs7: "Fs7.mp3",
            A7: "A7.mp3",
            C8: "C8.mp3"
          },
          // Updated URL to correctly point to raw files
          baseUrl: "https://raw.githubusercontent.com/Tonejs/audio/master/salamander/",
          onload: () => {
            console.log('Piano samples loaded');
          }
        }).connect(this.volume);
        break;
        
      case 'synth':
      default:
        // Default polyphonic synth
        this.synth = new Tone.PolySynth(Tone.Synth, preset).connect(this.volume);
        break;
    }

    // Apply portamento/glide if enabled
    this.enableGlide(this.glideEnabled, this.glideTime);

    return Promise.resolve();
  }

  /**
   * Set the current musical scale
   * @param {string} scale - Scale name
   */
  setScale(scale) {
    if (this.scales[scale]) {
      // Release all notes when changing scale
      this.releaseAllNotes();
      this.currentScale = scale;
      return true;
    }
    return false;
  }

  /**
   * Get the current scale notes
   * @returns {Array} Array of note names in the current scale
   */
  getCurrentScale() {
    return this.scales[this.currentScale] || this.scales.major;
  }

  /**
   * Set the octave for notes
   * @param {number} octave - Octave number (2-6)
   */
  setOctave(octave) {
    const newOctave = Math.max(2, Math.min(6, octave));

    if (this.octave !== newOctave) {
      this.releaseAllNotes();
      this.octave = newOctave;
    }
  }

  /**
   * Set the master volume
   * @param {number} volume - Volume level (0-1)
   */
  setVolume(volume) {
    // Convert 0-1 range to appropriate dB range (-60 to 0dB)
    const dbVolume = volume === 0 ? -Infinity : Tone.gainToDb(volume);
    this.volume.volume.value = dbVolume;
  }

  /**
   * Set the amount of reverb effect
   * @param {number} amount - Reverb wet amount (0-1)
   */
  setReverbAmount(amount) {
    this.reverb.wet.value = amount;
  }

  /**
   * Set the amount of delay effect
   * @param {number} amount - Delay wet amount (0-1)
   */
  setDelayAmount(amount) {
    this.delay.wet.value = amount;
  }

  /**
   * Set overall effect level (affects multiple parameters)
   * @param {number} value - Effect value (0-1)
   */
  setEffectValue(value) {
    // Adjust effect value based on sensitivity setting
    value = this._adjustEffectValue(value);

    // Apply effects
    this.setReverbAmount(value * 0.7); // Max 70% wet reverb
    this.setDelayAmount(value * 0.5); // Max 50% wet delay

    // Adjust other parameters based on the effect value
    this.delay.feedback.value = value * 0.4; // Max 40% feedback
    this.delay.delayTime.value = 0.1 + value * 0.4; // 0.1 to 0.5 seconds
  }

  /**
   * Enable or disable note gliding (portamento)
   * @param {boolean} enabled - Whether glide is enabled
   * @param {number} time - Glide time in seconds
   */
  enableGlide(enabled, time = 0.1) {
    this.glideEnabled = enabled;
    this.glideTime = time;

    // Apply portamento if the synth supports it
    if (this.synth && this.currentInstrument !== 'piano' &&
      this.synth.portamento !== undefined) {
      this.synth.portamento = enabled ? time : 0;
    }
  }

  /**
   * Set whether notes should auto-release
   * @param {boolean} enabled - Whether auto-release is enabled
   * @param {number} duration - Release duration in seconds
   */
  setAutoRelease(enabled, duration = 0.3) {
    this.autoReleaseEnabled = enabled;
    this.noteReleaseDuration = duration;
  }

  /**
   * Set velocity sensitivity
   * @param {number} sensitivity - Sensitivity multiplier (0.5-2)
   */
  setVelocitySensitivity(sensitivity) {
    this.velocitySensitivity = Math.max(0.5, Math.min(2, sensitivity));
  }

  /**
   * Set effect sensitivity
   * @param {number} sensitivity - Sensitivity multiplier (0.5-2)
   */
  setEffectSensitivity(sensitivity) {
    this.effectSensitivity = Math.max(0.5, Math.min(2, sensitivity));
  }

  /**
   * Adjust velocity based on sensitivity setting
   * @param {number} velocity - Raw velocity value (0-1)
   * @returns {number} Adjusted velocity value
   */
  _adjustVelocity(velocity) {
    // Apply power curve based on sensitivity
    // Higher sensitivity = more dynamic range
    return Math.pow(velocity, 1 / this.velocitySensitivity);
  }

  /**
   * Adjust effect value based on sensitivity setting
   * @param {number} value - Raw effect value (0-1)
   * @returns {number} Adjusted effect value
   */
  _adjustEffectValue(value) {
    // Apply power curve based on sensitivity
    return Math.pow(value, 1 / this.effectSensitivity);
  }

  /**
   * Get translated note name for display
   * @param {number} noteIndex - Index of the note in the current scale
   * @returns {string} Translated note name
   */
  getDisplayNoteNameAtIndex(noteIndex) {
    const scale = this.getCurrentScale();
    if (noteIndex < 0 || noteIndex >= scale.length) return '--';

    const noteName = scale[noteIndex];
    return i18n.getNoteDisplayName(noteName);
  }

  /**
   * Play a test pattern of notes
   * @param {Array} noteIndices - Array of note indices to play
   * @param {number} interval - Time between notes in milliseconds
   */
  async playTestPattern(noteIndices, interval = 300) {
    if (!this.isPlaying) this.start();

    for (const index of noteIndices) {
      this.playNote(index, 0.7);
      await new Promise(resolve => setTimeout(resolve, interval));
      this.releaseAllNotes();
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }

  /**
   * Check if a specific note is currently playing
   * @param {number} noteIndex - Index of the note to check
   * @returns {boolean} Whether the note is active
   */
  isNotePlaying(noteIndex) {
    const scale = this.getCurrentScale();
    if (noteIndex < 0 || noteIndex >= scale.length) return false;

    const noteName = scale[noteIndex];
    const fullNoteName = `${noteName}${this.octave}`;

    return this.activeNotes.has(fullNoteName);
  }
}