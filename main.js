// main.js - Enhanced entry point for HeadSynth application
// Optimized for users with limited mobility

import { HeadTracker } from './src/js/head-tracker.js';
import { SynthEngine } from './src/js/synth-engine.js';
import { NotesGrid } from './src/js/notes-grid.js';
import { Looper } from './src/js/looper.js';
import { UIController } from './src/js/ui-controller.js';
import { Calibration } from './src/js/calibration.js';
import i18n from './src/js/i18n.js';

document.addEventListener('DOMContentLoaded', () => {
  // Initialize i18n first to ensure proper localization
  i18n.init();
  
  // Get DOM elements
  const elements = {
    // Video and canvas elements
    video: document.getElementById('webcam'),
    canvas: document.getElementById('output-canvas'),
    headPositionIndicator: document.getElementById('head-position-indicator'),
    cameraContainer: document.querySelector('.camera-container'),
    
    // Main interface elements
    notesGrid: document.getElementById('notesGrid'),
    sensitivitySlider: document.getElementById('sensitivitySlider'),
    
    // Control buttons
    startBtn: document.getElementById('startBtn'),
    calibrateBtn: document.getElementById('calibrateBtn'),
    helpBtn: document.getElementById('helpBtn'),
    
    // Instrument and scale controls
    instrumentSelect: document.getElementById('instrumentSelect'),
    scaleSelect: document.getElementById('scaleSelect'),
    
    // Audio control sliders
    volumeSlider: document.getElementById('volumeSlider'),
    reverbSlider: document.getElementById('reverbSlider'),
    delaySlider: document.getElementById('delaySlider'),
    
    // Status displays
    currentNoteDisplay: document.getElementById('current-note'),
    modeDisplay: document.getElementById('mode-display'),
    headPositionDisplay: document.getElementById('head-position'),
    trackingStatusIndicator: document.getElementById('trackingStatusIndicator'),
    trackingStatusText: document.getElementById('trackingStatusText'),
    
    // Value displays
    volumeValue: document.getElementById('volumeValue'),
    reverbValue: document.getElementById('reverbValue'),
    delayValue: document.getElementById('delayValue'),
    
    // Looper controls
    recordLoopBtn: document.getElementById('recordLoopBtn'),
    playLoopBtn: document.getElementById('playLoopBtn'),
    stopLoopBtn: document.getElementById('stopLoopBtn'),
    clearLoopBtn: document.getElementById('clearLoopBtn'),
    loopTracks: document.getElementById('loopTracks')
  };
  
  // Modal elements
  const modals = {
    helpModal: document.getElementById('helpModal'),
    calibrationModal: document.getElementById('calibrationModal'),
    errorModal: document.getElementById('errorModal'),
    
    // Modal buttons
    closeHelpBtn: document.getElementById('closeHelpBtn'),
    cancelCalibrationBtn: document.getElementById('cancelCalibrationBtn'),
    skipCalibrationBtn: document.getElementById('skipCalibrationBtn'),
    completeCalibrationBtn: document.getElementById('completeCalibrationBtn'),
    closeErrorBtn: document.getElementById('dismissErrorBtn')
  };
  
  // Application state
  const appState = {
    isInitialized: false,
    isRunning: false,
    isCalibrating: false,
    isCalibrated: false,
    isRecording: false,
    isPlaying: false,
    
    // Sensitivity settings
    headSensitivity: 1.0,
    velocitySensitivity: 1.0,
    effectSensitivity: 1.0,
    
    // Note mapping settings
    currentNoteIndex: -1,
    
    // Error state
    hasError: false,
    errorMessage: '',
    
    // Camera state
    hasCameraPermission: false,
    isCameraInitialized: false
  };
  
  // Initialize modules
  let headTracker, synthEngine, notesGridController, looper, uiController, calibration;
  
  // Initialize modules and set up event handlers
  async function init() {
    try {
      // Create module instances
      headTracker = new HeadTracker(elements.video, elements.canvas);
      synthEngine = new SynthEngine();
      notesGridController = new NotesGrid(elements.notesGrid);
      looper = new Looper(elements.loopTracks);
      uiController = new UIController(elements);
      calibration = new Calibration(modals.calibrationModal, headTracker);
      
      // Initialize the audio engine
      await synthEngine.init();
      console.log('Synth engine initialized');
      
      // Setup the notes grid with the current scale
      notesGridController.setupGrid(synthEngine.getCurrentScale());
      
      // Register head tracker callbacks
      headTracker.onHeadMove = handleHeadMove;
      headTracker.onTrackingStatus = handleTrackingStatus;
      
      // Register calibration callbacks
      calibration.onCalibrationComplete = handleCalibrationComplete;
      calibration.onCalibrationFailed = handleCalibrationFailed;
      calibration.onCalibrationProgress = handleCalibrationProgress;
      
      // Register synth engine callbacks
      synthEngine.onNotePlay = handleNotePlay;
      synthEngine.onNoteRelease = handleNoteRelease;
      synthEngine.onInstrumentChange = handleInstrumentChange;
      
      // Set up event listeners
      setupEventListeners();
      
      // Add keyboard controls for accessibility
      notesGridController.addKeyboardNavigation();
      setupKeyboardShortcuts();
      
      // Update initial slider values
      updateSliderValues();
      
      // Apply default settings
      applyDefaultSettings();
      
      // Show welcome toast
      uiController.showToast(i18n.translate('welcomeMessage') || 'Welcome to HeadSynth!', 'info', 3000);
      
      // Update app state
      appState.isInitialized = true;
      
      // Show help modal on first run (check localStorage)
      const firstRun = localStorage.getItem('headSynthFirstRun') !== 'false';
      if (firstRun) {
        // Delay showing to allow UI to render
        setTimeout(() => {
          showHelpModal();
          localStorage.setItem('headSynthFirstRun', 'false');
        }, 500);
      }
      
      // Initialize camera preview when the user clicks on the camera container
      if (elements.cameraContainer) {
        elements.cameraContainer.addEventListener('click', () => {
          if (!appState.isCameraInitialized) {
            initializeCamera();
          }
        });
      }
      
      console.log('HeadSynth initialized successfully');
    } catch (error) {
      showError('Error initializing application: ' + error.message);
      console.error('Initialization error:', error);
    }
  }
  
  // Initialize camera and request permissions explicitly
// Initialize camera and request permissions explicitly
async function initializeCamera() {
    try {
      // Update the UI to show we're requesting camera
      const cameraPlaceholder = document.getElementById('camera-placeholder');
      if (cameraPlaceholder) {
        cameraPlaceholder.innerHTML = '<i class="fas fa-spinner fa-spin fa-3x"></i><p>Accessing camera...</p>';
      }
      
      // Show a message to the user
      uiController.showToast(i18n.translate('requestingCameraAccess') || 'Requesting camera access...', 'info', 2000);
      
      // Request camera access
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        }
      });
      
      // Set up video element
      elements.video.srcObject = stream;
      
      // Make sure autoplay and playsinline attributes are set
      elements.video.setAttribute('autoplay', '');
      elements.video.setAttribute('playsinline', '');
      elements.video.muted = true; // Mute to ensure autoplay works
      
      // Force play() as some browsers require this
      try {
        await elements.video.play();
      } catch (err) {
        console.error('Error playing video:', err);
        // Try to recover - show manual play button
        if (cameraPlaceholder) {
          cameraPlaceholder.innerHTML = '<i class="fas fa-play-circle fa-3x"></i><p>Tap to start camera</p>';
          cameraPlaceholder.addEventListener('click', async () => {
            try {
              await elements.video.play();
              cameraPlaceholder.classList.add('hidden');
            } catch (e) {
              showError('Unable to start video: ' + e.message);
            }
          });
        }
      }
      
      // Show loading indicator until video is ready
      elements.video.onloadedmetadata = () => {
        console.log('Video metadata loaded, dimensions:', elements.video.videoWidth, 'x', elements.video.videoHeight);
        
        // Hide the placeholder
        if (cameraPlaceholder) {
          cameraPlaceholder.classList.add('hidden');
        }
        
        // Update camera container to indicate camera is active
        if (elements.cameraContainer) {
          elements.cameraContainer.classList.add('camera-active');
        }
        
        appState.isCameraInitialized = true;
        appState.hasCameraPermission = true;
        
        // Show success message
        uiController.showToast(i18n.translate('cameraInitialized') || 'Camera initialized successfully', 'success', 2000);
        
        // Ensure video display is visible
        elements.video.style.display = 'block';
        
        // Set canvas dimensions to match video
        resizeCanvas();
        
        // Add resize observer for responsive canvas
        const resizeObserver = new ResizeObserver(() => {
          resizeCanvas();
        });
        resizeObserver.observe(elements.cameraContainer);
      };
      
      // Handle errors that might occur after initialization
      elements.video.onerror = (error) => {
        console.error('Video element error:', error);
        showError('Video error: ' + (error.message || 'Unknown error'));
      };
      
    } catch (error) {
      console.error('Camera initialization error:', error);
      appState.hasCameraPermission = false;
      
      // Update placeholder to show error
      const cameraPlaceholder = document.getElementById('camera-placeholder');
      if (cameraPlaceholder) {
        cameraPlaceholder.innerHTML = '<i class="fas fa-exclamation-triangle fa-3x"></i>' +
                                     '<p>Camera access denied</p>' +
                                     '<button class="btn btn-small">Try Again</button>';
        
        // Add retry button functionality
        const retryButton = cameraPlaceholder.querySelector('button');
        if (retryButton) {
          retryButton.addEventListener('click', (e) => {
            e.stopPropagation();
            initializeCamera();
          });
        }
      }
      
      // Show error message with instructions
      showError(i18n.translate('cameraAccessDenied') || 
        'Camera access was denied. Please ensure your browser has permission to use the camera and try again.');
    }
  }
  
  // Resize canvas to match video dimensions while maintaining aspect ratio
  function resizeCanvas() {
    if (!elements.video || !elements.canvas || !elements.cameraContainer) return;
    
    const containerWidth = elements.cameraContainer.clientWidth;
    const containerHeight = elements.cameraContainer.clientHeight;
    
    // Get the video's intrinsic dimensions
    const videoWidth = elements.video.videoWidth || containerWidth;
    const videoHeight = elements.video.videoHeight || containerHeight;
    
    // Calculate aspect ratio
    const aspectRatio = videoWidth / videoHeight;
    
    // Determine dimensions to fill container while maintaining aspect ratio
    let width, height;
    const containerRatio = containerWidth / containerHeight;
    
    if (containerRatio > aspectRatio) {
      // Container is wider than video
      height = containerHeight;
      width = height * aspectRatio;
    } else {
      // Container is taller than video
      width = containerWidth;
      height = width / aspectRatio;
    }
    
    // Apply dimensions to video and canvas
    elements.video.style.width = `${width}px`;
    elements.video.style.height = `${height}px`;
    
    // Canvas needs actual dimensions set, not just CSS
    elements.canvas.width = width;
    elements.canvas.height = height;
    elements.canvas.style.width = `${width}px`;
    elements.canvas.style.height = `${height}px`;
  }
  
  function setupEventListeners() {
    // Main controls
    elements.startBtn.addEventListener('click', toggleStart);
    elements.calibrateBtn.addEventListener('click', startCalibration);
    elements.helpBtn.addEventListener('click', showHelpModal);
    
    // Synth controls
    elements.instrumentSelect.addEventListener('change', changeInstrument);
    elements.scaleSelect.addEventListener('change', changeScale);
    elements.volumeSlider.addEventListener('input', changeVolume);
    elements.reverbSlider.addEventListener('input', changeReverb);
    elements.delaySlider.addEventListener('input', changeDelay);
    elements.sensitivitySlider.addEventListener('input', changeSensitivity);
    
    // Looper controls
    elements.recordLoopBtn.addEventListener('click', toggleRecordLoop);
    elements.playLoopBtn.addEventListener('click', playLoop);
    elements.stopLoopBtn.addEventListener('click', stopLoop);
    elements.clearLoopBtn.addEventListener('click', clearLoop);
    
    // Notes grid event listener
    elements.notesGrid.addEventListener('note-clicked', (e) => {
      if (appState.isRunning) {
        const noteIndex = e.detail.noteIndex;
        playNote(noteIndex);
      }
    });
    
    // Modal event listeners
    modals.closeHelpBtn.addEventListener('click', closeHelpModal);
    modals.cancelCalibrationBtn.addEventListener('click', cancelCalibration);
    modals.skipCalibrationBtn.addEventListener('click', skipCalibration);
    modals.completeCalibrationBtn.addEventListener('click', completeCalibration);
    modals.closeErrorBtn.addEventListener('click', closeErrorModal);
    
    // Listen for resize events to update the UI
    window.addEventListener('resize', handleResize);
    
    // Handle camera permission status change
    navigator.permissions?.query({name: 'camera'}).then(permissionStatus => {
      permissionStatus.onchange = () => {
        if (permissionStatus.state === 'granted') {
          appState.hasCameraPermission = true;
          if (!appState.isCameraInitialized) {
            initializeCamera();
          }
        } else {
          appState.hasCameraPermission = false;
        }
      };
    }).catch(error => {
      console.log('Permission API not supported', error);
    });
  }
  
  function setupKeyboardShortcuts() {
    // Add keyboard shortcuts
    uiController.addKeyboardShortcuts({
      toggleStart: toggleStart,
      calibrate: startCalibration,
      toggleRecord: toggleRecordLoop,
      playLoop: playLoop,
      stopLoop: stopLoop,
      increaseVolume: () => {
        const newValue = Math.min(1, parseFloat(elements.volumeSlider.value) + 0.05);
        elements.volumeSlider.value = newValue;
        changeVolume();
      },
      decreaseVolume: () => {
        const newValue = Math.max(0, parseFloat(elements.volumeSlider.value) - 0.05);
        elements.volumeSlider.value = newValue;
        changeVolume();
      }
    });
  }
  
  function applyDefaultSettings() {
    // Set default settings for audio
    synthEngine.setVolume(parseFloat(elements.volumeSlider.value) || 0.5);
    synthEngine.setReverbAmount(parseFloat(elements.reverbSlider.value) || 0.3);
    synthEngine.setDelayAmount(parseFloat(elements.delaySlider.value) || 0.2);
    
    // Set auto-release for better usability for those with limited mobility
    synthEngine.setAutoRelease(true, 0.4);
    
    // Set default sensitivity level
    appState.headSensitivity = parseFloat(elements.sensitivitySlider.value) || 1.0;
    headTracker.setSensitivity({
      sensitivityX: appState.headSensitivity,
      sensitivityY: appState.headSensitivity,
      sensitivityZ: appState.headSensitivity
    });
    
    // Set smoother tracking for limited mobility
    headTracker.setSmoothingFactor(0.8);
    
    // Update UI with defaults
    updateSliderValues();
  }
  
  function updateSliderValues() {
    // Update slider value displays
    uiController.updateSliderValue('volume', parseFloat(elements.volumeSlider.value));
    uiController.updateSliderValue('reverb', parseFloat(elements.reverbSlider.value));
    uiController.updateSliderValue('delay', parseFloat(elements.delaySlider.value));
  }
  
  async function toggleStart() {
    if (appState.isRunning) {
      stopApplication();
    } else {
      await startApplication();
    }
  }
  
  async function startApplication() {
    try {
      // Check if camera is initialized
      if (!appState.isCameraInitialized) {
        await initializeCamera();
        if (!appState.hasCameraPermission) {
          // If camera permission is denied, show error and return
          return;
        }
      }
      
      // Check if calibration is needed
      if (!appState.isCalibrated) {
        const shouldCalibrate = await showCalibrationPrompt();
        if (shouldCalibrate) {
          startCalibration();
          return;
        } else {
          // Use default calibration
          skipCalibration();
        }
      }
      
      // Start head tracking
      await headTracker.start();
      
      // Start synth engine
      synthEngine.start();
      
      // Update state
      appState.isRunning = true;
      uiController.setMode(i18n.translate('playing') || 'Playing');
      
      // Update UI controls
      uiController.updateControlsState({
        isRunning: true,
        isRecording: appState.isRecording,
        isPlaying: appState.isPlaying
      });
      
      // Show notification
      uiController.showToast(i18n.translate('startedPlaying') || 'Started playing', 'success', 2000);
    } catch (error) {
      showError(i18n.translate('startError') || 'Error starting application: ' + error.message);
      console.error('Start application error:', error);
    }
  }
  
  function stopApplication() {
    // Stop head tracking
    headTracker.stop();
    
    // Stop synth engine
    synthEngine.stop();
    
    // Update state
    appState.isRunning = false;
    uiController.setMode(i18n.translate('paused') || 'Paused');
    
    // Update UI controls
    uiController.updateControlsState({
      isRunning: false,
      isRecording: appState.isRecording,
      isPlaying: appState.isPlaying
    });
    
    // Show notification
    uiController.showToast(i18n.translate('stoppedPlaying') || 'Stopped playing', 'info', 2000);
  }
  
  function startCalibration() {
    // Check if camera is initialized
    if (!appState.isCameraInitialized) {
      initializeCamera().then(() => {
        if (appState.hasCameraPermission) {
          startCalibrationProcess();
        }
      });
    } else {
      startCalibrationProcess();
    }
  }
  
  function startCalibrationProcess() {
    // Stop application if running
    if (appState.isRunning) {
      stopApplication();
    }
    
    // Start calibration process
    appState.isCalibrating = true;
    uiController.showModal('calibration');
    calibration.start();
  }
  
  function cancelCalibration() {
    if (appState.isCalibrating) {
      calibration.cancel();
      appState.isCalibrating = false;
      uiController.hideModal('calibration');
    }
  }
  
  function skipCalibration() {
    // Skip calibration and use default settings
    calibration.skipCalibration();
    appState.isCalibrated = true;
    appState.isCalibrating = false;
    uiController.hideModal('calibration');
    
    // Show notification
    uiController.showToast(i18n.translate('usingDefaultSettings') || 'Using default settings', 'info', 2000);
  }
  
  function completeCalibration() {
    // Complete the calibration process
    calibration.finishCalibration();
    appState.isCalibrated = true;
    appState.isCalibrating = false;
    uiController.hideModal('calibration');
  }
  
  function handleCalibrationComplete(calibrationData) {
    // Calibration successfully completed
    appState.isCalibrated = true;
    appState.isCalibrating = false;
    
    // Show success message
    uiController.showToast(i18n.translate('calibrationSuccessful') || 'Calibration successful!', 'success', 3000);
    
    // Ask user if they want to start playing
    setTimeout(() => {
      if (!appState.isRunning) {
        startApplication();
      }
    }, 500);
  }
  
  function handleCalibrationFailed(error) {
    appState.isCalibrating = false;
    
    // Show error message
    showError(i18n.translate('calibrationFailed') || 'Calibration failed: ' + error);
  }
  
  function handleCalibrationProgress(progress) {
    // Update progress UI if needed
    console.log(`Calibration progress: ${progress}%`);
  }
  
  function handleHeadMove(headData) {
    if (!appState.isRunning || appState.isCalibrating) return;
    
    // Update UI with head position
    uiController.updateHeadPosition(headData);
    
    // Map head movement to musical parameters
    const noteIndex = mapHeadXToNoteIndex(headData.x);
    const velocity = mapHeadYToVelocity(headData.y);
    const effectValue = mapHeadZToEffect(headData.z);
    
    // Update note grid
    notesGridController.highlightNoteFromPosition(headData.x);
    
    // Play note if changed
    if (noteIndex !== appState.currentNoteIndex) {
      playNote(noteIndex, velocity);
      appState.currentNoteIndex = noteIndex;
    }
    
    // Apply effect based on head rotation
    synthEngine.setEffectValue(effectValue);
    
    // Record note to looper if recording
    if (appState.isRecording) {
      looper.recordEvent({
        type: 'note',
        noteIndex,
        velocity,
        effectValue,
        timestamp: Date.now()
      });
    }
  }
  
  function handleTrackingStatus(isActive, confidence) {
    // Update UI with tracking status
    uiController.updateTrackingStatus(isActive, confidence);
    
    // If tracking is lost and we're playing, show a notification
    if (!isActive && appState.isRunning) {
      uiController.showToast(i18n.translate('trackingLost') || 'Face tracking lost. Please adjust your position.', 'warning', 3000);
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
    // Apply sensitivity adjustment for users with limited range of motion
    return Math.max(0.1, Math.min(1.0, (y + 1) / 2));
  }
  
  function mapHeadZToEffect(z) {
    // Map the head rotation to an effect value
    // z (rotation) is normalized from -1 to 1
    return (z + 1) / 2;
  }
  
  function playNote(noteIndex, velocity = 0.7) {
    if (!appState.isRunning || noteIndex < 0) return;
    
    // Play the note through the synth engine
    const fullNoteName = synthEngine.playNote(noteIndex, velocity);
    if (fullNoteName) {
      // Update current note display
      uiController.setCurrentNote(synthEngine.getDisplayNoteNameAtIndex(noteIndex));
    }
  }
  
  function handleNotePlay(noteIndex, noteName, velocity) {
    // Called when a note is played - can be used for visual feedback
    // console.log(`Note played: ${noteName}, index: ${noteIndex}, velocity: ${velocity}`);
  }
  
  function handleNoteRelease(noteIndex, noteName) {
    // Called when a note is released - can be used for visual feedback
    // console.log(`Note released: ${noteName}, index: ${noteIndex}`);
  }
  
  function changeInstrument() {
    const instrument = elements.instrumentSelect.value;
    synthEngine.setInstrument(instrument).then(() => {
      const instrumentName = elements.instrumentSelect.options[elements.instrumentSelect.selectedIndex].text;
      uiController.showToast(i18n.translate('instrumentChanged') + ' ' + instrumentName, 'info', 2000);
    });
  }
  
  function handleInstrumentChange(instrument) {
    // Called when the instrument is changed
    console.log(`Instrument changed to: ${instrument}`);
  }
  
  function changeScale() {
    const scale = elements.scaleSelect.value;
    synthEngine.setScale(scale);
    
    // Update the notes grid with the new scale
    notesGridController.setupGrid(synthEngine.getCurrentScale());
    
    // Notify user
    const scaleName = elements.scaleSelect.options[elements.scaleSelect.selectedIndex].text;
    uiController.showToast(i18n.translate('scaleChanged') + ' ' + scaleName, 'info', 2000);
  }
  
  function changeVolume() {
    const volume = parseFloat(elements.volumeSlider.value);
    synthEngine.setVolume(volume);
    uiController.updateSliderValue('volume', volume);
  }
  
  function changeReverb() {
    const reverbAmount = parseFloat(elements.reverbSlider.value);
    synthEngine.setReverbAmount(reverbAmount);
    uiController.updateSliderValue('reverb', reverbAmount);
  }
  
  function changeDelay() {
    const delayAmount = parseFloat(elements.delaySlider.value);
    synthEngine.setDelayAmount(delayAmount);
    uiController.updateSliderValue('delay', delayAmount);
  }
  
  function changeSensitivity() {
    const sensitivity = parseFloat(elements.sensitivitySlider.value);
    appState.headSensitivity = sensitivity;
    
    // Update head tracker sensitivity
    headTracker.setSensitivity({
      sensitivityX: sensitivity,
      sensitivityY: sensitivity,
      sensitivityZ: sensitivity
    });
    
    // Also adjust synth engine sensitivity
    synthEngine.setVelocitySensitivity(sensitivity);
    synthEngine.setEffectSensitivity(sensitivity);
    
    // Show notification
    uiController.showToast(i18n.translate('sensitivityChanged') || `Sensitivity set to ${Math.round(sensitivity * 100)}%`, 'info', 2000);
  }
  
  function toggleRecordLoop() {
    if (appState.isRecording) {
      // Stop recording
      const track = looper.stopRecording();
      appState.isRecording = false;
      
      // Show notification
      if (track) {
        uiController.showToast(i18n.translate('loopRecorded') || 'Loop recorded successfully', 'success', 2000);
      }
    } else {
      // Start recording if possible
      const success = looper.startRecording();
      
      if (success) {
        appState.isRecording = true;
        
        // Show notification
        uiController.showToast(i18n.translate('recordingStarted') || 'Recording started', 'info', 2000);
      } else {
        // Maximum tracks reached or other error
        uiController.showToast(i18n.translate('cannotRecord') || 'Cannot record. Maximum number of tracks reached.', 'warning', 2000);
      }
    }
    
    // Update UI controls
    uiController.updateControlsState({
      isRunning: appState.isRunning,
      isRecording: appState.isRecording,
      isPlaying: appState.isPlaying
    });
  }
  
  function playLoop() {
    if (appState.isPlaying) return;
    
    // Start loop playback
    const success = looper.play(handleLoopEvent);
    
    if (success) {
      appState.isPlaying = true;
      
      // Show notification
      uiController.showToast(i18n.translate('playbackStarted') || 'Loop playback started', 'info', 2000);
      
      // Update UI controls
      uiController.updateControlsState({
        isRunning: appState.isRunning,
        isRecording: appState.isRecording,
        isPlaying: appState.isPlaying
      });
    }
  }
  
  function stopLoop() {
    if (!appState.isPlaying) return;
    
    // Stop loop playback
    looper.stop();
    appState.isPlaying = false;
    
    // Show notification
    uiController.showToast(i18n.translate('playbackStopped') || 'Loop playback stopped', 'info', 2000);
    
    // Update UI controls
    uiController.updateControlsState({
      isRunning: appState.isRunning,
      isRecording: appState.isRecording,
      isPlaying: appState.isPlaying
    });
  }
  
  function clearLoop() {
    // Stop playback if active
    if (appState.isPlaying) {
      stopLoop();
    }
    
    // Clear all loops
    looper.clear();
    
    // Show notification
    uiController.showToast(i18n.translate('loopsCleared') || 'All loops cleared', 'info', 2000);
  }
  
  function handleLoopEvent(event) {
    // Called for events during loop playback
    if (event.type === 'note') {
      // Play the note through the synth engine
      synthEngine.playNote(event.noteIndex, event.velocity);
      
      // Highlight the note in the UI
      notesGridController.highlightNote(event.noteIndex, event.velocity);
      
      // Update current note display
      uiController.setCurrentNote(synthEngine.getDisplayNoteNameAtIndex(event.noteIndex));
      
      // Apply effect if present
      if (event.effectValue !== undefined) {
        synthEngine.setEffectValue(event.effectValue);
      }
    }
  }
  
  function showHelpModal() {
    // Update keyboard shortcuts in the help modal
    uiController.createKeyboardShortcutsHelp();
    
    // Show the help modal
    uiController.showModal('help');
  }
  
  function closeHelpModal() {
    uiController.hideModal('help');
  }
  
  function showError(message) {
    appState.hasError = true;
    appState.errorMessage = message;
    uiController.showErrorMessage(message);
  }
  
  function closeErrorModal() {
    appState.hasError = false;
    uiController.hideModal('error');
  }
  
  function handleResize() {
    // Update UI elements that depend on window size
    if (appState.isCameraInitialized) {
      // Resize canvas to match video
      resizeCanvas();
    }
  }
  
  function showCalibrationPrompt() {
    return new Promise((resolve) => {
      // In a real application, this would show a dialog
      // For now, we'll just resolve with true to encourage calibration
      resolve(true);
    });
  }
  
  // Initialize the application
  init();
});