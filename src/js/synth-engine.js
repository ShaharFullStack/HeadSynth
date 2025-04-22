// synth-engine.js - Audio engine for the HeadSynth application
export class SynthEngine {
    constructor() {
      // Initialize Tone.js components
      this.synth = null;
      this.currentInstrument = 'synth';
      
      // Effects
      this.reverb = null;
      this.delay = null;
      this.volume = null;
      
      // Scales and notes
      this.scales = {
        major: ['C', 'D', 'E', 'F', 'G', 'A', 'B'],
        minor: ['C', 'D', 'Eb', 'F', 'G', 'Ab', 'Bb'],
        pentatonic: ['C', 'D', 'E', 'G', 'A'],
        blues: ['C', 'Eb', 'F', 'F#', 'G', 'Bb'],
        chromatic: ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
      };
      
      this.currentScale = 'major';
      this.octave = 4;
      this.baseNote = 'C';
      
      // Note playing state
      this.activeNotes = new Set();
      this.lastNotePlayed = null;
      this.isPlaying = false;
      
      // Performance settings
      this.noteReleaseDuration = 0.3; // seconds
      this.glideEnabled = false;
      this.glideTime = 0.1; // seconds
    }
    
    async init() {
      // Start audio context
      await Tone.start();
      console.log('Audio context started');
      
      // Create effects chain
      this.reverb = new Tone.Reverb({
        decay: 2,
        wet: 0.3
      }).toDestination();
      
      this.delay = new Tone.FeedbackDelay({
        delayTime: 0.25,
        feedback: 0.2,
        wet: 0.2
      }).connect(this.reverb);
      
      this.volume = new Tone.Volume(-6).connect(this.delay);
      
      // Create default synth
      this._createSynth('synth');
      
      // Wait for reverb to initialize
      await this.reverb.generate();
      console.log('Synth engine initialized');
    }
    
    start() {
      if (this.isPlaying) return;
      this.isPlaying = true;
    }
    
    stop() {
      if (!this.isPlaying) return;
      
      // Stop all active notes
      this.synth.triggerRelease(Array.from(this.activeNotes));
      this.activeNotes.clear();
      
      this.isPlaying = false;
    }
    
    playNote(noteIndex, velocity = 0.7) {
      if (!this.isPlaying || noteIndex < 0) return;
      
      const scale = this.getCurrentScale();
      if (noteIndex >= scale.length) return;
      
      // Get the note to play
      const noteName = scale[noteIndex];
      const fullNoteName = `${noteName}${this.octave}`;
      
      // If this note is already active, don't retrigger it
      if (this.activeNotes.has(fullNoteName)) {
        return;
      }
      
      // Release the last played note if it exists
      if (this.lastNotePlayed) {
        this.synth.triggerRelease(this.lastNotePlayed);
        this.activeNotes.delete(this.lastNotePlayed);
      }
      
      // Trigger the new note
      this.synth.triggerAttack(fullNoteName, Tone.now(), velocity);
      this.activeNotes.add(fullNoteName);
      this.lastNotePlayed = fullNoteName;
      
      // Schedule auto-release after a short duration to avoid notes getting stuck
      Tone.Transport.scheduleOnce(() => {
        if (this.activeNotes.has(fullNoteName)) {
          this.synth.triggerRelease(fullNoteName);
          this.activeNotes.delete(fullNoteName);
        }
      }, `+${this.noteReleaseDuration}`);
      
      return fullNoteName;
    }
    
    releaseNote(noteIndex) {
      const scale = this.getCurrentScale();
      if (noteIndex < 0 || noteIndex >= scale.length) return;
      
      const noteName = scale[noteIndex];
      const fullNoteName = `${noteName}${this.octave}`;
      
      if (this.activeNotes.has(fullNoteName)) {
        this.synth.triggerRelease(fullNoteName);
        this.activeNotes.delete(fullNoteName);
      }
    }
    
    releaseAllNotes() {
      this.synth.triggerRelease(Array.from(this.activeNotes));
      this.activeNotes.clear();
      this.lastNotePlayed = null;
    }
    
    setInstrument(instrument) {
      if (this.currentInstrument === instrument) return;
      
      // Release all active notes
      this.releaseAllNotes();
      
      // Create the new instrument
      this._createSynth(instrument);
      this.currentInstrument = instrument;
    }
    
    _createSynth(instrument) {
      // Dispose of the old synth if it exists
      if (this.synth) {
        this.synth.dispose();
      }
      
      // Create the new synth based on the instrument type
      switch (instrument) {
        case 'amSynth':
          this.synth = new Tone.AMSynth({
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
              release: 1
            }
          }).connect(this.volume);
          break;
          
        case 'fmSynth':
          this.synth = new Tone.FMSynth({
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
              sustain: 0.2,
              release: 0.5
            }
          }).connect(this.volume);
          break;
          
        case 'pluck':
          this.synth = new Tone.PluckSynth({
            attackNoise: 1,
            dampening: 4000,
            resonance: 0.7
          }).connect(this.volume);
          break;
          
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
            baseUrl: "https://github.com/Tonejs/audio/tree/master/salamander/",
            onload: () => {
              console.log('Piano samples loaded');
            }
          }).connect(this.volume);
          break;
          
        case 'synth':
        default:
          // Default polyphonic synth
          this.synth = new Tone.PolySynth(Tone.Synth, {
            oscillator: {
              type: 'triangle8'
            },
            envelope: {
              attack: 0.05,
              decay: 0.3,
              sustain: 0.4,
              release: 0.8
            }
          }).connect(this.volume);
          break;
      }
    }
    
    setScale(scale) {
      if (this.scales[scale]) {
        this.currentScale = scale;
      }
    }
    
    getCurrentScale() {
      return this.scales[this.currentScale] || this.scales.major;
    }
    
    setOctave(octave) {
      this.octave = Math.max(2, Math.min(6, octave));
    }
    
    setVolume(volume) {
      // Volume in decibels, convert from 0-1 to appropriate dB range
      const dbVolume = Tone.gainToDb(volume);
      this.volume.volume.value = dbVolume;
    }
    
    setReverbAmount(amount) {
      this.reverb.wet.value = amount;
    }
    
    setDelayAmount(amount) {
      this.delay.wet.value = amount;
    }
    
    setEffectValue(value) {
      // Map effect value (0-1) to various effect parameters
      this.setReverbAmount(value * 0.7); // Max 70% wet reverb
      this.setDelayAmount(value * 0.5); // Max 50% wet delay
      
      // Adjust other parameters based on the effect value
      this.delay.feedback.value = value * 0.4; // Max 40% feedback
      this.delay.delayTime.value = 0.1 + value * 0.4; // 0.1 to 0.5 seconds
    }
    
    enableGlide(enabled, time = 0.1) {
      this.glideEnabled = enabled;
      this.glideTime = time;
      
      // Apply portamento if the synth supports it
      if (this.synth && this.synth.portamento !== undefined) {
        this.synth.portamento = enabled ? time : 0;
      }
    }
  }