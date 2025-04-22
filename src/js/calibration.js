// calibration.js - Calibration system for the head tracker
export class Calibration {
    constructor(calibrationModal, headTracker) {
      this.modal = calibrationModal;
      this.headTracker = headTracker;
      this.calibrationSteps = document.getElementById('calibrationSteps');
      this.calibrationStatus = document.getElementById('calibrationStatus');
      
      this.currentStep = 0;
      this.isCalibrating = false;
      this.cancelRequested = false;
      
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
      
      // Callback functions
      this.onCalibrationComplete = null;
      this.onCalibrationFailed = null;
      
      // Binding methods
      this._collectSample = this._collectSample.bind(this);
    }
    
    start() {
      if (this.isCalibrating) return;
      
      this.isCalibrating = true;
      this.cancelRequested = false;
      this.currentStep = 0;
      
      // Clear previous samples
      Object.keys(this.samples).forEach(key => {
        this.samples[key] = [];
      });
      
      // Update UI
      this._updateStepUI();
      this.calibrationStatus.textContent = 'מסתכל ישירות למצלמה, שומר על ראש ישר...';
      
      // Start the calibration process
      this._startHeadTracker()
        .then(() => this._runCalibrationSequence())
        .catch(error => {
          console.error('Calibration error:', error);
          if (typeof this.onCalibrationFailed === 'function') {
            this.onCalibrationFailed(error.message);
          }
        });
    }
    
    cancel() {
      this.cancelRequested = true;
      this.isCalibrating = false;
    }
    
    async _startHeadTracker() {
      if (!this.headTracker.isRunning) {
        await this.headTracker.start();
      }
    }
    
    async _runCalibrationSequence() {
      if (this.cancelRequested) return;
      
      try {
        // Step 1: Center position (neutral)
        await this._calibratePosition('center', 'מסתכל ישירות למצלמה, שומר על ראש ישר...', 2000);
        if (this.cancelRequested) return;
        
        // Step 2: Up and Down calibration
        this.currentStep = 1;
        this._updateStepUI();
        
        await this._calibratePosition('up', 'הרם את הראש כלפי מעלה...', 1500);
        if (this.cancelRequested) return;
        
        await this._calibratePosition('down', 'הורד את הראש כלפי מטה...', 1500);
        if (this.cancelRequested) return;
        
        // Step 3: Left and Right calibration
        this.currentStep = 2;
        this._updateStepUI();
        
        await this._calibratePosition('left', 'הזז את ראשך שמאלה...', 1500);
        if (this.cancelRequested) return;
        
        await this._calibratePosition('right', 'הזז את ראשך ימינה...', 1500);
        if (this.cancelRequested) return;
        
        // Step 4: Tilt Left and Right calibration
        this.currentStep = 3;
        this._updateStepUI();
        
        await this._calibratePosition('tiltLeft', 'הטה את ראשך שמאלה...', 1500);
        if (this.cancelRequested) return;
        
        await this._calibratePosition('tiltRight', 'הטה את ראשך ימינה...', 1500);
        if (this.cancelRequested) return;
        
        // Process calibration data
        const calibrationData = this._processCalibrationData();
        
        // Calibration completed
        this.calibrationStatus.textContent = 'הכיול הושלם בהצלחה!';
        
        // Call the callback function if available
        if (typeof this.onCalibrationComplete === 'function') {
          this.onCalibrationComplete(calibrationData);
        }
        
        this.isCalibrating = false;
        
      } catch (error) {
        console.error('Calibration sequence error:', error);
        this.calibrationStatus.textContent = 'שגיאה בכיול: ' + error.message;
        
        if (typeof this.onCalibrationFailed === 'function') {
          this.onCalibrationFailed(error.message);
        }
        
        this.isCalibrating = false;
      }
    }
    
    async _calibratePosition(positionName, statusMessage, duration) {
      return new Promise((resolve, reject) => {
        // Update status
        this.calibrationStatus.textContent = statusMessage;
        
        // Start collecting samples
        const sampleInterval = 100; // Collect sample every 100ms
        const sampleTimer = setInterval(() => {
          this._collectSample(positionName);
        }, sampleInterval);
        
        // End collection after specified duration
        setTimeout(() => {
          clearInterval(sampleTimer);
          
          // Check if we got enough samples
          if (this.samples[positionName].length < 5) {
            reject(new Error(`לא הצלחתי לאסוף מספיק נתונים עבור מיקום ${positionName}`));
          } else {
            resolve();
          }
        }, duration);
      });
    }
    
    _collectSample(positionName) {
      if (!this.headTracker.lastHeadData) return;
      
      // Clone the head data to avoid reference issues
      const sample = {
        x: this.headTracker.lastHeadData.x,
        y: this.headTracker.lastHeadData.y,
        z: this.headTracker.lastHeadData.z
      };
      
      this.samples[positionName].push(sample);
    }
    
    _processCalibrationData() {
      // Calculate average for each position
      const positions = {};
      
      Object.keys(this.samples).forEach(positionName => {
        const samples = this.samples[positionName];
        if (samples.length === 0) return;
        
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
      
      // Calculate center position from the neutral position
      const centerX = positions.center.x;
      const centerY = positions.center.y;
      const centerZ = positions.center.z;
      
      // Calculate ranges for each axis
      const rangeX = Math.max(
        Math.abs(positions.left.x - centerX),
        Math.abs(positions.right.x - centerX)
      ) * 2;
      
      const rangeY = Math.max(
        Math.abs(positions.up.y - centerY),
        Math.abs(positions.down.y - centerY)
      ) * 2;
      
      const rangeZ = Math.max(
        Math.abs(positions.tiltLeft.z - centerZ),
        Math.abs(positions.tiltRight.z - centerZ)
      ) * 2;
      
      // Create calibration data object
      return {
        centerX,
        centerY,
        centerZ,
        rangeX: Math.max(0.1, rangeX), // Ensure non-zero range
        rangeY: Math.max(0.1, rangeY),
        rangeZ: Math.max(0.1, rangeZ)
      };
    }
    
    _updateStepUI() {
      // Update the current step in the UI
      const steps = this.calibrationSteps.querySelectorAll('li');
      steps.forEach((step, index) => {
        if (index === this.currentStep) {
          step.classList.add('current-step');
        } else {
          step.classList.remove('current-step');
        }
      });
    }
  }