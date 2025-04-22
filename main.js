// main.js - Entry point for the HeadSynth application
import { HeadTracker } from './src/js/head-tracker.js';
import { SynthEngine } from './src/js/synth-engine.js';
import { NotesGrid } from './src/js/notes-grid.js';
import { Looper } from './src/js/looper.js';
import { UIController } from './src/js/ui-controller.js';
import { Calibration } from './src/js/calibration.js';

document.addEventListener('DOMContentLoaded', () => {
  // Get DOM elements
  const video = document.getElementById('webcam');
  const canvas = document.getElementById('output-canvas');
  const headPositionIndicator = document.getElementById('head-position-indicator');
  const notesGrid = document.getElementById('notesGrid');
  const startBtn = document.getElementById('startBtn');
  const calibrateBtn = document.getElementById('calibrateBtn');
  const instrumentSelect = document.getElementById('instrumentSelect');
  const scaleSelect = document.getElementById('scaleSelect');
  const volumeSlider = document.getElementById('volumeSlider');
  const reverbSlider = document.getElementById('reverbSlider');
  const currentNoteDisplay = document.getElementById('current-note');
  const modeDisplay = document.getElementById('mode-display');
  const headPositionDisplay = document.getElementById('head-position');
  const cameraStatus = document.getElementById('camera-status');
  
  // Looper controls
  const recordLoopBtn = document.getElementById('recordLoopBtn');
  const playLoopBtn = document.getElementById('playLoopBtn');
  const stopLoopBtn = document.getElementById('stopLoopBtn');
  const clearLoopBtn = document.getElementById('clearLoopBtn');
  const loopTracks = document.getElementById('loopTracks');
  
  // Modal controls
  const helpBtn = document.getElementById('helpBtn');
  const closeHelpBtn = document.getElementById('closeHelpBtn');
  const helpModal = document.getElementById('helpModal');
  const calibrationModal = document.getElementById('calibrationModal');
  const cancelCalibrationBtn = document.getElementById('cancelCalibrationBtn');
  const errorModal = document.getElementById('errorModal');
  const closeErrorBtn = document.getElementById('closeErrorBtn');
  const errorMessage = document.getElementById('errorMessage');
  
  // Application state
  let isRunning = false;
  let isCalibrating = false;
  
  // Initialize modules
  const headTracker = new HeadTracker(video, canvas);
  const synthEngine = new SynthEngine();
  const notesGridController = new NotesGrid(notesGrid);
  const looper = new Looper(loopTracks);
  const uiController = new UIController({
    currentNoteDisplay,
    modeDisplay,
    headPositionDisplay,
    headPositionIndicator
  });
  const calibration = new Calibration(calibrationModal, headTracker);
  
  // Setup event listeners
  startBtn.addEventListener('click', toggleStart);
  calibrateBtn.addEventListener('click', startCalibration);
  cancelCalibrationBtn.addEventListener('click', cancelCalibration);
  instrumentSelect.addEventListener('change', changeInstrument);
  scaleSelect.addEventListener('change', changeScale);
  volumeSlider.addEventListener('input', changeVolume);
  reverbSlider.addEventListener('input', changeReverb);
  
  // Looper event listeners
  recordLoopBtn.addEventListener('click', toggleRecordLoop);
  playLoopBtn.addEventListener('click', playLoop);
  stopLoopBtn.addEventListener('click', stopLoop);
  clearLoopBtn.addEventListener('click', clearLoop);
  
  // Modal event listeners
  helpBtn.addEventListener('click', showHelpModal);
  closeHelpBtn.addEventListener('click', closeHelpModal);
  closeErrorBtn.addEventListener('click', closeErrorModal);
  
  // Application initialization
  init();
  
  // Functions
  async function init() {
    try {
      // Update button text to explicitly mention camera
      startBtn.textContent = 'הפעל מצלמה';
      
      // Initialize the synth engine
      await synthEngine.init();
      
      // Setup the notes grid with the current scale
      notesGridController.setupGrid(synthEngine.getCurrentScale());
      
      // Register head tracker callbacks
      headTracker.onHeadMove = handleHeadMove;
      
      // Register calibration callbacks
      calibration.onCalibrationComplete = handleCalibrationComplete;
      calibration.onCalibrationFailed = handleCalibrationFailed;
      
      // Show help modal on first run
      showHelpModal();
      
      console.log('HeadSynth initialized successfully');
    } catch (error) {
      showError('שגיאה באתחול המערכת: ' + error.message);
      console.error('Initialization error:', error);
    }
  }
  
  function toggleStart() {
    if (isRunning) {
      stopApplication();
    } else {
      startApplication();
    }
  }
  
  async function startApplication() {
    try {
      // Update button state to show we're trying to access the camera
      startBtn.textContent = 'מפעיל מצלמה...';
      startBtn.disabled = true;
      
      // Update camera status
      if (cameraStatus) {
        cameraStatus.textContent = 'מבקש גישה למצלמה...';
        cameraStatus.style.display = 'block';
      }
      
      // Show a temporary message
      showMessage('מבקש גישה למצלמה...');
      
      // Start camera with more explicit error handling
      await headTracker.start();
      
      // Start the synth engine
      synthEngine.start();
      
      // Update the UI
      isRunning = true;
      startBtn.textContent = 'עצור מצלמה';
      startBtn.classList.add('active');
      startBtn.disabled = false;
      uiController.setMode('נגינה');
      
      // Hide camera status message
      if (cameraStatus) {
        cameraStatus.style.display = 'none';
      }
      
      showMessage('המצלמה הופעלה בהצלחה!');
    } catch (error) {
      // Reset button state
      startBtn.textContent = 'הפעל מצלמה';
      startBtn.disabled = false;
      
      // Update camera status for error
      if (cameraStatus) {
        cameraStatus.textContent = 'שגיאה בהפעלת המצלמה, נסה שוב';
        cameraStatus.style.display = 'block';
      }
      
      showError('שגיאה בהפעלת המצלמה: ' + error.message);
      console.error('Start application error:', error);
    }
  }
  
  function stopApplication() {
    headTracker.stop();
    synthEngine.stop();
    isRunning = false;
    startBtn.textContent = 'הפעל מצלמה';
    startBtn.classList.remove('active');
    uiController.setMode('מושהה');
    
    // Show camera status message
    if (cameraStatus) {
      cameraStatus.textContent = 'לחץ על "הפעל מצלמה" כדי להתחיל';
      cameraStatus.style.display = 'block';
    }
  }
  
  function startCalibration() {
    try {
      if (isRunning) {
        stopApplication();
      }
      
      // Update button state during calibration
      calibrateBtn.disabled = true;
      calibrateBtn.textContent = 'מפעיל כיול...';
      
      isCalibrating = true;
      calibrationModal.style.display = 'flex';
      calibration.start();
    } catch (error) {
      calibrateBtn.disabled = false;
      calibrateBtn.textContent = 'כיול מצלמה';
      
      showError('שגיאה בהפעלת הכיול: ' + error.message);
      console.error('Calibration error:', error);
    }
  }
  
  function cancelCalibration() {
    if (isCalibrating) {
      calibration.cancel();
      isCalibrating = false;
      calibrationModal.style.display = 'none';
      
      // Reset button state
      calibrateBtn.disabled = false;
      calibrateBtn.textContent = 'כיול מצלמה';
    }
  }
  
  function handleCalibrationComplete(calibrationData) {
    isCalibrating = false;
    calibrationModal.style.display = 'none';
    headTracker.setCalibrationData(calibrationData);
    showMessage('הכיול הושלם בהצלחה!');
    
    // Reset button state
    calibrateBtn.disabled = false;
    calibrateBtn.textContent = 'כיול מצלמה';
    
    // Automatically start the application after successful calibration
    if (!isRunning) {
      startApplication();
    }
  }
  
  function handleCalibrationFailed(error) {
    isCalibrating = false;
    calibrationModal.style.display = 'none';
    showError('שגיאה בכיול: ' + error);
    
    // Reset button state
    calibrateBtn.disabled = false;
    calibrateBtn.textContent = 'כיול מצלמה';
  }
  
  function handleHeadMove(headData) {
    if (!isRunning || isCalibrating) return;
    
    // Update UI with head position
    uiController.updateHeadPosition(headData);
    
    // Map head movement to musical parameters
    const noteIndex = mapHeadXToNoteIndex(headData.x);
    const velocity = mapHeadYToVelocity(headData.y);
    const effectValue = mapHeadZToEffect(headData.z);
    
    // Update the current note in the UI
    if (noteIndex >= 0 && noteIndex < synthEngine.getCurrentScale().length) {
      const currentNote = synthEngine.getCurrentScale()[noteIndex];
      uiController.setCurrentNote(currentNote);
      notesGridController.highlightNote(noteIndex);
      
      // Play the note
      synthEngine.playNote(noteIndex, velocity);
      
      // Apply effect based on head rotation
      synthEngine.setEffectValue(effectValue);
      
      // Record note to looper if recording
      // FIX: Use the isRecording() method correctly
      if (looper.isRecording()) {
        looper.recordEvent({
          type: 'note',
          noteIndex,
          velocity,
          effectValue,
          timestamp: Date.now()
        });
      }
    }
  }
  
  function mapHeadXToNoteIndex(x) {
    // Map the horizontal head position to a note index
    // x is normalized from -1 (left) to 1 (right)
    const scaleLength = synthEngine.getCurrentScale().length;
    const index = Math.floor(((x + 1) / 2) * scaleLength);
    return Math.max(0, Math.min(scaleLength - 1, index));
  }
  
  function mapHeadYToVelocity(y) {
    // Map the vertical head position to a velocity value
    // y is normalized from -1 (down) to 1 (up)
    return Math.max(0.1, Math.min(1.0, (y + 1) / 2));
  }
  
  function mapHeadZToEffect(z) {
    // Map the head rotation to an effect value
    // z (rotation) is normalized from -1 to 1
    return (z + 1) / 2;
  }
  
  function changeInstrument() {
    const instrument = instrumentSelect.value;
    synthEngine.setInstrument(instrument);
    showMessage(`כלי נגינה: ${instrument}`);
  }
  
  function changeScale() {
    const scale = scaleSelect.value;
    synthEngine.setScale(scale);
    notesGridController.setupGrid(synthEngine.getCurrentScale());
    showMessage(`סולם: ${scale}`);
  }
  
  function changeVolume() {
    const volume = parseFloat(volumeSlider.value);
    synthEngine.setVolume(volume);
  }
  
  function changeReverb() {
    const reverbAmount = parseFloat(reverbSlider.value);
    synthEngine.setReverbAmount(reverbAmount);
  }
  
  // Looper functions
  function toggleRecordLoop() {
    // FIX: Use the isRecording() method correctly
    if (looper.isRecording()) {
      looper.stopRecording();
      recordLoopBtn.textContent = 'הקלט לופ';
      recordLoopBtn.classList.remove('active');
    } else {
      looper.startRecording();
      recordLoopBtn.textContent = 'עצור הקלטה';
      recordLoopBtn.classList.add('active');
    }
  }
  
  function playLoop() {
    looper.play(event => {
      if (event.type === 'note') {
        synthEngine.playNote(event.noteIndex, event.velocity);
        synthEngine.setEffectValue(event.effectValue);
        notesGridController.highlightNote(event.noteIndex);
      }
    });
    playLoopBtn.classList.add('active');
  }
  
  function stopLoop() {
    looper.stop();
    playLoopBtn.classList.remove('active');
  }
  
  function clearLoop() {
    looper.clear();
  }
  
  // Modal functions
  function showHelpModal() {
    helpModal.style.display = 'flex';
  }
  
  function closeHelpModal() {
    helpModal.style.display = 'none';
  }
  
  function showError(message) {
    errorMessage.textContent = message;
    errorModal.style.display = 'flex';
  }
  
  function closeErrorModal() {
    errorModal.style.display = 'none';
  }
  
  function showMessage(message) {
    // Simple temporary message display
    const messageEl = document.createElement('div');
    messageEl.className = 'temp-message';
    messageEl.textContent = message;
    document.body.appendChild(messageEl);
    
    setTimeout(() => {
      messageEl.classList.add('fade-out');
      setTimeout(() => {
        if (messageEl.parentNode) {
          document.body.removeChild(messageEl);
        }
      }, 500);
    }, 2000);
  }
});