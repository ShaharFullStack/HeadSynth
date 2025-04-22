// calibration.js - Enhanced calibration system for head tracker
// Optimized for users with limited mobility

import i18n from './i18n.js';

export class Calibration {
  constructor(calibrationModal, headTracker) {
    // DOM elements
    this.modal = calibrationModal;
    this.headTracker = headTracker;
    this.calibrationSteps = document.getElementById('calibrationSteps');
    this.calibrationStatus = document.getElementById('calibrationStatus');
    this.calibrationProgress = document.getElementById('calibrationProgress');
    this.directionIndicator = document.getElementById('directionIndicator');
    this.calibrationAnimation = document.getElementById('calibrationAnimation');
    this.completeButton = document.getElementById('completeCalibrationBtn');
    this.skipButton = document.getElementById('skipCalibrationBtn');
    
    // Calibration state
    this.currentStep = 0;
    this.isCalibrating = false;
    this.cancelRequested = false;
    this.calibrationComplete = false;
    
    // Calibration settings
    this.minSamplesPerStep = 10;   // Minimum samples per position
    this.sampleInterval = 50;      // Time between samples (ms)
    this.stepDuration = 1500;      // Duration for each sample collection (ms)
    this.pauseBetweenSteps = 1000; // Pause between steps (ms)
    this.progress = 0;             // Overall progress (0-100)
    
    // Calibration data collection
    this.samples = {
      center: [],
      up: [],
      down: [],
      left: [],
      right: [],
      tiltLeft: [],
      tiltRight: []
    };
    
    // Calibration steps sequence
    this.steps = [
      { name: 'center', icon: '⚪', animation: 'center', instructions: 'lookStraight' },
      { name: 'up', icon: '⬆️', animation: 'up', instructions: 'lookUp' },
      { name: 'down', icon: '⬇️', animation: 'down', instructions: 'lookDown' },
      { name: 'left', icon: '⬅️', animation: 'left', instructions: 'lookLeft' },
      { name: 'right', icon: '➡️', animation: 'right', instructions: 'lookRight' },
      { name: 'tiltLeft', icon: '↪️', animation: 'tiltLeft', instructions: 'tiltLeft' },
      { name: 'tiltRight', icon: '↩️', animation: 'tiltRight', instructions: 'tiltRight' }
    ];
    
    // Sample collection interval
    this.sampleTimer = null;
    
    // Step transition timeout
    this.stepTimeout = null;
    
    // Callback functions
    this.onCalibrationComplete = null;
    this.onCalibrationFailed = null;
    this.onCalibrationProgress = null;
    
    // Binding methods
    this._collectSample = this._collectSample.bind(this);
    this._updateAnimation = this._updateAnimation.bind(this);
    
    // Event listeners
    this.skipButton.addEventListener('click', () => {
      this.skipCalibration();
    });
    
    this.completeButton.addEventListener('click', () => {
      this.finishCalibration();
    });
    
    // Listen for language changes to update UI
    i18n.onLanguageChange(() => {
      if (this.isCalibrating) {
        this._updateStepUI();
        this._updateStatusMessage(this.steps[this.currentStep].instructions);
      }
    });
  }
  
  /**
   * Start the calibration process
   */
  start() {
    if (this.isCalibrating) return;
    
    this.isCalibrating = true;
    this.cancelRequested = false;
    this.calibrationComplete = false;
    this.currentStep = 0;
    this.progress = 0;
    
    // Reset UI
    this._updateProgress(0);
    this.completeButton.disabled = true;
    
    // Clear previous samples
    Object.keys(this.samples).forEach(key => {
      this.samples[key] = [];
    });
    
    // Update UI
    this._updateStepUI();
    this._updateStatusMessage('startingCalibration');
    
    // Make sure head tracker is started
    this._startHeadTracker()
      .then(() => {
        // Start with a short delay to let the user prepare
        setTimeout(() => {
          this._runCalibrationSequence();
        }, 1000);
      })
      .catch(error => {
        console.error('Calibration error:', error);
        this._updateStatusMessage('calibrationFailed');
        
        if (typeof this.onCalibrationFailed === 'function') {
          this.onCalibrationFailed(error.message);
        }
        
        this.isCalibrating = false;
      });
  }
  
  /**
   * Cancel the ongoing calibration
   */
  cancel() {
    this.cancelRequested = true;
    this.isCalibrating = false;
    
    // Clear any active timers
    this._clearTimers();
    
    console.log('Calibration cancelled');
  }
  
  /**
   * Skip calibration and use default values
   */
  skipCalibration() {
    // Cancel any ongoing calibration
    this.cancel();
    
    // Use default calibration (suitable for limited mobility)
    const defaultCalibration = {
      centerX: 0.5,
      centerY: 0.5,
      centerZ: 0,
      
      // Smaller ranges for users with limited mobility
      rangeX: 0.2, // Reduced range for horizontal movement
      rangeY: 0.2, // Reduced range for vertical movement
      rangeZ: 0.15  // Reduced range for head tilt
    };
    
    // Apply the default calibration
    this.headTracker.setCalibrationData(defaultCalibration);
    
    // Notify about completion
    if (typeof this.onCalibrationComplete === 'function') {
      this.onCalibrationComplete(defaultCalibration);
    }
  }
  
  /**
   * Finish calibration with current data
   */
  finishCalibration() {
    if (!this.calibrationComplete) return;
    
    // Process collected data
    const calibrationData = this._processCalibrationData();
    
    // Apply the calibration
    this.headTracker.setCalibrationData(calibrationData);
    
    // Notify about completion
    if (typeof this.onCalibrationComplete === 'function') {
      this.onCalibrationComplete(calibrationData);
    }
    
    // Reset state
    this.isCalibrating = false;
    this.calibrationComplete = false;
  }
  
  /**
   * Ensure head tracker is started
   */
  async _startHeadTracker() {
    if (!this.headTracker.isRunning) {
      await this.headTracker.start();
    }
  }
  
  /**
   * Run the full calibration sequence
   */
  async _runCalibrationSequence() {
    if (this.cancelRequested) return;
    
    try {
      // Go through each calibration step
      for (let i = 0; i < this.steps.length; i++) {
        if (this.cancelRequested) return;
        
        this.currentStep = i;
        this._updateStepUI();
        this._updateAnimation(this.steps[i].animation);
        
        // Progress percentage per step
        const progressPerStep = 100 / this.steps.length;
        const baseProgress = i * progressPerStep;
        
        // Update progress bar
        this._updateProgress(baseProgress);
        
        // Wait for user to prepare
        if (i > 0) {
          await this._wait(this.pauseBetweenSteps);
          if (this.cancelRequested) return;
        }
        
        // Collect samples for this step
        await this._calibratePosition(
          this.steps[i].name,
          this.steps[i].instructions,
          this.stepDuration
        );
        
        // Update progress after step completes
        this._updateProgress(baseProgress + progressPerStep);
        
        if (this.cancelRequested) return;
      }
      
      // Calibration is complete
      this._updateStatusMessage('calibrationComplete');
      this._updateAnimation('success');
      this.calibrationComplete = true;
      
      // Enable the complete button
      this.completeButton.disabled = false;
      
    } catch (error) {
      console.error('Calibration sequence error:', error);
      this._updateStatusMessage('calibrationFailed');
      this._updateAnimation('error');
      
      if (typeof this.onCalibrationFailed === 'function') {
        this.onCalibrationFailed(error.message);
      }
      
      this.isCalibrating = false;
    }
  }
  
  /**
   * Calibrate a specific head position
   * @param {string} positionName - Name of the position to calibrate
   * @param {string} instructionKey - i18n key for instruction message
   * @param {number} duration - Duration for collecting samples (ms)
   * @returns {Promise} Resolves when calibration step is complete
   */
  async _calibratePosition(positionName, instructionKey, duration) {
    return new Promise((resolve, reject) => {
      // Update status message
      this._updateStatusMessage(instructionKey);
      
      // Start collecting samples
      this.sampleTimer = setInterval(() => {
        this._collectSample(positionName);
      }, this.sampleInterval);
      
      // End collection after specified duration
      this.stepTimeout = setTimeout(() => {
        clearInterval(this.sampleTimer);
        this.sampleTimer = null;
        
        // Check if we got enough samples
        if (this.samples[positionName].length < this.minSamplesPerStep) {
          reject(new Error(`Failed to collect enough data for ${positionName} position`));
        } else {
          resolve();
        }
      }, duration);
    });
  }
  
  /**
   * Collect a sample of head position data
   * @param {string} positionName - Name of the position being sampled
   */
  _collectSample(positionName) {
    if (!this.headTracker.isFaceTracking()) return;
    
    // Get the raw head data (before calibration)
    const rawData = this.headTracker.getRawPosition();
    
    // Only collect samples if we have valid data
    if (rawData) {
      // Clone the head data to avoid reference issues
      const sample = {
        x: rawData.x,
        y: rawData.y,
        z: rawData.z
      };
      
      this.samples[positionName].push(sample);
      
      // Update UI to show progress within step
      const progressPerStep = 100 / this.steps.length;
      const baseProgress = this.currentStep * progressPerStep;
      const stepProgress = (this.samples[positionName].length / this.minSamplesPerStep) * progressPerStep;
      this._updateProgress(Math.min(baseProgress + stepProgress, baseProgress + progressPerStep));
    }
  }
  
  /**
   * Process all collected samples into calibration data
   * @returns {Object} Calibration data
   */
  _processCalibrationData() {
    // Calculate average values for each position
    const positions = {};
    
    Object.keys(this.samples).forEach(positionName => {
      const samples = this.samples[positionName];
      if (samples.length === 0) return;
      
      // Calculate average position from all samples
      const sum = samples.reduce((acc, sample) => {
        return {
          x: acc.x + sample.x,
          y: acc.y + sample.y,
          z: acc.z + sample.z
        };
      }, { x: 0, y: 0, z: 0 });
      
      positions[positionName] = {
        x: sum.x / samples.length,
        y: sum.y / samples.length,
        z: sum.z / samples.length
      };
    });
    
    // Use center position as reference point
    const centerX = positions.center.x;
    const centerY = positions.center.y;
    const centerZ = positions.center.z;
    
    // Calculate range for each axis based on extremes
    // This is key for adapting to users with limited mobility
    
    // For X-axis (horizontal movement)
    const rangeX = Math.max(
      Math.abs(positions.left.x - centerX),
      Math.abs(positions.right.x - centerX)
    ) * 2; // Double the range to account for both sides
    
    // For Y-axis (vertical movement)
    const rangeY = Math.max(
      Math.abs(positions.up.y - centerY),
      Math.abs(positions.down.y - centerY)
    ) * 2;
    
    // For Z-axis (head tilt)
    const rangeZ = Math.max(
      Math.abs(positions.tiltLeft.z - centerZ),
      Math.abs(positions.tiltRight.z - centerZ)
    ) * 2;
    
    // Create final calibration data
    // Ensure ranges are never zero to prevent division by zero
    return {
      centerX,
      centerY,
      centerZ,
      rangeX: Math.max(0.05, rangeX), // Minimum range of 0.05
      rangeY: Math.max(0.05, rangeY),
      rangeZ: Math.max(0.05, rangeZ)
    };
  }
  
  /**
   * Update the calibration step UI
   */
  _updateStepUI() {
    // Update step indicators in the list
    if (this.calibrationSteps) {
      const steps = this.calibrationSteps.querySelectorAll('li');
      
      steps.forEach((step, index) => {
        // Remove all classes
        step.classList.remove('current-step', 'completed-step');
        
        // Add appropriate class
        if (index === this.currentStep) {
          step.classList.add('current-step');
        } else if (index < this.currentStep) {
          step.classList.add('completed-step');
        }
      });
    }
  }
  
  /**
   * Update the status message
   * @param {string} key - i18n key for the message
   */
  _updateStatusMessage(key) {
    if (this.calibrationStatus) {
      this.calibrationStatus.textContent = i18n.translate(key);
    }
  }
  
  /**
   * Update the progress bar
   * @param {number} percent - Progress percentage (0-100)
   */
  _updateProgress(percent) {
    this.progress = percent;
    
    if (this.calibrationProgress) {
      this.calibrationProgress.style.width = `${percent}%`;
    }
    
    // Notify about progress
    if (typeof this.onCalibrationProgress === 'function') {
      this.onCalibrationProgress(percent);
    }
  }
  
  /**
   * Update the animation direction indicator
   * @param {string} direction - Direction to indicate
   */
  _updateAnimation(direction) {
    if (!this.directionIndicator || !this.calibrationAnimation) return;
    
    // Reset any existing animations
    this.calibrationAnimation.className = 'calibration-animation';
    this.directionIndicator.innerHTML = '';
    
    // Add appropriate animation class
    this.calibrationAnimation.classList.add(`anim-${direction}`);
    
    // Show appropriate icon based on direction
    let icon = '';
    
    switch (direction) {
      case 'center':
        icon = '👀';
        break;
      case 'up':
        icon = '⬆️';
        break;
      case 'down':
        icon = '⬇️';
        break;
      case 'left':
        icon = '⬅️';
        break;
      case 'right':
        icon = '➡️';
        break;
      case 'tiltLeft':
        icon = '↪️';
        break;
      case 'tiltRight':
        icon = '↩️';
        break;
      case 'success':
        icon = '✅';
        break;
      case 'error':
        icon = '❌';
        break;
      default:
        icon = '⚪';
    }
    
    this.directionIndicator.innerHTML = icon;
  }
  
  /**
   * Wait for a specified duration
   * @param {number} ms - Duration to wait in milliseconds
   * @returns {Promise} Resolves after the waiting period
   */
  _wait(ms) {
    return new Promise(resolve => {
      setTimeout(resolve, ms);
    });
  }
  
  /**
   * Clear all active timers
   */
  _clearTimers() {
    if (this.sampleTimer) {
      clearInterval(this.sampleTimer);
      this.sampleTimer = null;
    }
    
    if (this.stepTimeout) {
      clearTimeout(this.stepTimeout);
      this.stepTimeout = null;
    }
  }
}