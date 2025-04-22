// head-tracker.js - Enhanced head tracking with MediaPipe Face Mesh
// Optimized for users with limited mobility

export class HeadTracker {
    constructor(videoElement, canvasElement) {
      // DOM elements
      this.video = videoElement;
      this.canvas = canvasElement;
      this.canvasCtx = this.canvas.getContext('2d');
      
      // MediaPipe components
      this.faceMesh = null;
      this.camera = null;
      
      // Tracking state
      this.isRunning = false;
      this.isCalibrated = false;
      this.isReady = false;
      
      // Head position data
      this.lastHeadData = { x: 0, y: 0, z: 0, confidence: 0 };
      this.rawHeadData = { x: 0, y: 0, z: 0 };
      this.landmarks = null;
      
      // Calibration parameters
      this.calibrationData = {
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        rangeX: 0.3, // Default range for X axis (smaller for users with limited mobility)
        rangeY: 0.3, // Default range for Y axis
        rangeZ: 0.2  // Default range for Z axis (head tilt)
      };
      
      // Configuration
      this.config = {
        // Sensitivity multiplier (higher = more sensitive)
        sensitivityX: 1.0,
        sensitivityY: 1.0,
        sensitivityZ: 1.0,
        
        // Smoothing factors (lower = more responsive, higher = smoother)
        smoothingFactor: 0.7,
        
        // Detection confidence thresholds
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      };
      
      // Event callbacks
      this.onHeadMove = null;
      this.onTrackingStatus = null;
      
      // Movement detection
      this.movementThreshold = 0.01; // Minimum movement to trigger an event
      this.lastNotifiedPosition = { x: 0, y: 0, z: 0 };
      
      // Face detection status
      this.faceDetectedTimer = null;
      this.noFaceTimeout = 1000; // ms to wait before reporting face lost
      this.isFaceDetected = false;
      
      // Initialize face mesh
      this._initFaceMesh();
    }
    
    /**
     * Initialize MediaPipe Face Mesh
     */
    _initFaceMesh() {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: this.config.minDetectionConfidence,
        minTrackingConfidence: this.config.minTrackingConfidence
      });
      
      this.faceMesh.onResults((results) => this._handleResults(results));
    }
    
    /**
     * Update sensitivity settings
     * @param {Object} sensitivity - Object containing sensitivityX, sensitivityY, sensitivityZ values
     */
    setSensitivity(sensitivity) {
      if (sensitivity.sensitivityX !== undefined) {
        this.config.sensitivityX = Number(sensitivity.sensitivityX);
      }
      
      if (sensitivity.sensitivityY !== undefined) {
        this.config.sensitivityY = Number(sensitivity.sensitivityY);
      }
      
      if (sensitivity.sensitivityZ !== undefined) {
        this.config.sensitivityZ = Number(sensitivity.sensitivityZ);
      }
      
      console.log('Sensitivity updated:', this.config);
    }
    
    /**
     * Update smoothing factor
     * @param {number} factor - Smoothing factor (0-1)
     */
    setSmoothingFactor(factor) {
      this.config.smoothingFactor = Math.max(0, Math.min(0.95, Number(factor)));
    }
    
    /**
     * Start head tracking
     */
    async start() {
      if (this.isRunning) return;
      
      try {
        // Setup camera with optimal settings for facial detection
        const constraints = {
          video: {
            width: { ideal: 1280 },
            height: { ideal: 720 },
            facingMode: 'user'
          }
        };
        
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        this.video.srcObject = stream;
        
        // Wait for video to be ready
        await new Promise((resolve) => {
          this.video.onloadedmetadata = () => {
            resolve();
          };
        });
        
        // Set canvas dimensions to match video
        this.canvas.width = this.video.videoWidth;
        this.canvas.height = this.video.videoHeight;
        
        // Setup camera utility from MediaPipe
        this.camera = new Camera(this.video, {
          onFrame: async () => {
            await this.faceMesh.send({ image: this.video });
          },
          width: this.video.videoWidth,
          height: this.video.videoHeight
        });
        
        // Start camera
        await this.camera.start();
        this.isRunning = true;
        this.isReady = true;
        
        console.log('Head tracker started');
        
        // If not calibrated, use default calibration data
        if (!this.isCalibrated) {
          this._applyDefaultCalibration();
        }
        
      } catch (error) {
        console.error('Error starting head tracker:', error);
        throw new Error('Cannot access camera. Please make sure your camera is connected and you have granted permission to use it.');
      }
    }
    
    /**
     * Stop head tracking
     */
    stop() {
      if (!this.isRunning) return;
      
      // Stop the MediaPipe camera
      if (this.camera) {
        this.camera.stop();
      }
      
      // Stop video stream
      if (this.video.srcObject) {
        const tracks = this.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        this.video.srcObject = null;
      }
      
      // Clear face detection timer
      if (this.faceDetectedTimer) {
        clearTimeout(this.faceDetectedTimer);
      }
      
      this.isRunning = false;
      this.isFaceDetected = false;
      
      // Update tracking status
      if (this.onTrackingStatus) {
        this.onTrackingStatus(false, 0);
      }
      
      console.log('Head tracker stopped');
    }
    
    /**
     * Set calibration data from calibration process
     * @param {Object} calibrationData - Calibration data with center and range values
     */
    setCalibrationData(calibrationData) {
      // Merge new calibration data with existing data, keeping defaults if not provided
      this.calibrationData = {
        ...this.calibrationData,
        ...calibrationData
      };
      
      // Ensure minimum values for ranges to prevent division by zero
      this.calibrationData.rangeX = Math.max(0.05, this.calibrationData.rangeX);
      this.calibrationData.rangeY = Math.max(0.05, this.calibrationData.rangeY);
      this.calibrationData.rangeZ = Math.max(0.05, this.calibrationData.rangeZ);
      
      this.isCalibrated = true;
      console.log('Calibration data set:', this.calibrationData);
    }
    
    /**
     * Apply default calibration for users who skip calibration
     */
    _applyDefaultCalibration() {
      // Default values that work reasonably well for most users
      this.calibrationData = {
        centerX: 0.5,
        centerY: 0.5,
        centerZ: 0,
        rangeX: 0.3,
        rangeY: 0.3,
        rangeZ: 0.2
      };
      
      this.isCalibrated = true;
      console.log('Default calibration applied');
    }
    
    /**
     * Handle face mesh detection results
     * @param {Object} results - MediaPipe face mesh detection results
     */
    _handleResults(results) {
      if (!this.isRunning) return;
      
      // Clear canvas
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      // Draw the video frame as the background (can be disabled for better performance)
      // this.canvasCtx.drawImage(results.image, 0, 0, this.canvas.width, this.canvas.height);
      
      const faceDetected = results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0;
      
      // Handle face detection status
      this._updateFaceDetectionStatus(faceDetected);
      
      if (faceDetected) {
        this.landmarks = results.multiFaceLandmarks[0];
        
        // Draw face mesh landmarks
        this._drawFaceMesh(this.landmarks);
        
        // Extract head position and orientation
        const headData = this._extractHeadData(this.landmarks);
        this.rawHeadData = { ...headData };
        
        // Apply smoothing to head data
        this._smoothHeadData(headData);
        
        // Apply calibration to get normalized position
        const normalizedHeadData = this._applyCalibration(this.lastHeadData);
        
        // Check if position changed significantly
        if (this._hasMovedSignificantly(normalizedHeadData)) {
          // Call the callback function if available
          if (typeof this.onHeadMove === 'function') {
            this.onHeadMove(normalizedHeadData);
          }
          
          // Update last notified position
          this.lastNotifiedPosition = { ...normalizedHeadData };
        }
      }
      
      this.canvasCtx.restore();
    }
    
    /**
     * Update face detection status and handle timeouts
     * @param {boolean} detected - Whether a face is currently detected
     */
    _updateFaceDetectionStatus(detected) {
      if (detected) {
        // Face is detected
        if (!this.isFaceDetected) {
          // Clear any existing timeout
          if (this.faceDetectedTimer) {
            clearTimeout(this.faceDetectedTimer);
            this.faceDetectedTimer = null;
          }
          this.isFaceDetected = true;
          
          // Notify about face detection
          if (this.onTrackingStatus) {
            this.onTrackingStatus(true, 1.0);
          }
        }
      } else {
        // Face is not detected
        if (this.isFaceDetected) {
          // Start a timeout to avoid flickering
          if (!this.faceDetectedTimer) {
            this.faceDetectedTimer = setTimeout(() => {
              this.isFaceDetected = false;
              
              // Notify about face loss
              if (this.onTrackingStatus) {
                this.onTrackingStatus(false, 0);
              }
              
              this.faceDetectedTimer = null;
            }, this.noFaceTimeout);
          }
        }
      }
    }
    
    /**
     * Draw face mesh landmarks on canvas
     * @param {Array} landmarks - Face mesh landmarks
     */
    _drawFaceMesh(landmarks) {
      // Draw face mesh landmarks for visualization
      drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION, 
                   { color: '#ffffff20', lineWidth: 0.5 });
      
      drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_EYE, 
                   { color: '#ff3030', lineWidth: 1 });
      
      drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_EYE, 
                   { color: '#30ff30', lineWidth: 1 });
      
      drawConnectors(this.canvasCtx, landmarks, FACEMESH_FACE_OVAL, 
                   { color: '#30a0ff', lineWidth: 1.5 });
    }
    
    /**
     * Extract head position and orientation from landmarks
     * Optimized for users with limited mobility by focusing on more precise detection
     * of small movements.
     * @param {Array} landmarks - Face mesh landmarks
     * @returns {Object} Head position and orientation data
     */
    _extractHeadData(landmarks) {
      // Important landmark indices
      const NOSE_TIP = 1;  // Nose tip
      const LEFT_EYE = 33;  // Left eye (inner corner)
      const RIGHT_EYE = 263;  // Right eye (inner corner)
      const LEFT_EAR = 234;  // Left ear
      const RIGHT_EAR = 454;  // Right ear
      const FOREHEAD = 10;  // Forehead
      const CHIN = 152;  // Chin
      const MOUTH_LEFT = 61; // Left corner of mouth
      const MOUTH_RIGHT = 291; // Right corner of mouth
      
      // Get reference points
      const nose = landmarks[NOSE_TIP];
      const leftEye = landmarks[LEFT_EYE];
      const rightEye = landmarks[RIGHT_EYE];
      const leftEar = landmarks[LEFT_EAR];
      const rightEar = landmarks[RIGHT_EAR];
      const forehead = landmarks[FOREHEAD];
      const chin = landmarks[CHIN];
      const mouthLeft = landmarks[MOUTH_LEFT];
      const mouthRight = landmarks[MOUTH_RIGHT];
      
      // Calculate horizontal position (left-right)
      // Using nose position relative to the eyes for more precision in limited movement
      const centerPoint = {
        x: (leftEye.x + rightEye.x) / 2,
        y: (leftEye.y + rightEye.y) / 2
      };
      
      const horizontalOffset = nose.x - centerPoint.x;
      
      // Calculate vertical position (up-down)
      // Using ratio of distances for more granular detection
      const eyesToChin = Math.abs(
        ((leftEye.y + rightEye.y) / 2) - chin.y
      );
      
      const foreheadToEyes = Math.abs(
        forehead.y - ((leftEye.y + rightEye.y) / 2)
      );
      
      const verticalRatio = foreheadToEyes / (foreheadToEyes + eyesToChin);
      
      // Calculate head tilt (Z-axis rotation)
      // Using mouth corners for more sensitive tilt detection
      const mouthAngle = Math.atan2(
        mouthRight.y - mouthLeft.y,
        mouthRight.x - mouthLeft.x
      );
      
      // Calculate confidence based on visibility of key facial features
      // Higher confidence when more of the face is visible and centered
      const faceWidth = Math.abs(rightEar.x - leftEar.x);
      const faceVisibility = Math.min(1, faceWidth * 3); // Scale up for better sensitivity
      
      return {
        x: horizontalOffset * 5, // Scale for better sensitivity
        y: verticalRatio * 2 - 1, // Convert to -1 to 1 range
        z: mouthAngle * 3, // Scale for better sensitivity
        confidence: faceVisibility
      };
    }
    
    /**
     * Apply exponential smoothing to head data
     * @param {Object} headData - Raw head position data
     */
    _smoothHeadData(headData) {
      // Apply smoothing based on configuration
      const smooth = this.config.smoothingFactor;
      
      // Apply smoothing only if we have previous data
      if (this.lastHeadData) {
        this.lastHeadData.x = smooth * this.lastHeadData.x + (1 - smooth) * headData.x;
        this.lastHeadData.y = smooth * this.lastHeadData.y + (1 - smooth) * headData.y;
        this.lastHeadData.z = smooth * this.lastHeadData.z + (1 - smooth) * headData.z;
        this.lastHeadData.confidence = headData.confidence; // Don't smooth confidence
      } else {
        // First time, just copy the data
        this.lastHeadData = { ...headData };
      }
    }
    
    /**
     * Apply calibration to normalize head data
     * @param {Object} headData - Smoothed head position data
     * @returns {Object} Normalized head position data
     */
    _applyCalibration(headData) {
      // Apply calibration and sensitivity settings
      const calibrated = {
        // X-axis (horizontal): -1 (left) to 1 (right)
        x: ((headData.x - this.calibrationData.centerX) / this.calibrationData.rangeX) * this.config.sensitivityX,
        
        // Y-axis (vertical): -1 (down) to 1 (up)
        y: ((headData.y - this.calibrationData.centerY) / this.calibrationData.rangeY) * this.config.sensitivityY,
        
        // Z-axis (rotation): -1 (tilt left) to 1 (tilt right)
        z: ((headData.z - this.calibrationData.centerZ) / this.calibrationData.rangeZ) * this.config.sensitivityZ,
        
        // Keep confidence value
        confidence: headData.confidence
      };
      
      // Clamp values to range [-1, 1]
      calibrated.x = Math.max(-1, Math.min(1, calibrated.x));
      calibrated.y = Math.max(-1, Math.min(1, calibrated.y));
      calibrated.z = Math.max(-1, Math.min(1, calibrated.z));
      
      return calibrated;
    }
    
    /**
     * Check if head position has changed significantly enough to trigger an event
     * @param {Object} position - Current normalized head position
     * @returns {boolean} Whether position changed significantly
     */
    _hasMovedSignificantly(position) {
      const last = this.lastNotifiedPosition;
      
      // Check if movement exceeds threshold in any dimension
      return (
        Math.abs(position.x - last.x) > this.movementThreshold ||
        Math.abs(position.y - last.y) > this.movementThreshold ||
        Math.abs(position.z - last.z) > this.movementThreshold
      );
    }
    
    /**
     * Get current head position
     * @returns {Object} Normalized head position
     */
    getCurrentPosition() {
      return { ...this.lastNotifiedPosition };
    }
    
    /**
     * Get raw (uncalibrated) head position
     * @returns {Object} Raw head position
     */
    getRawPosition() {
      return { ...this.rawHeadData };
    }
    
    /**
     * Set movement threshold for triggering events
     * @param {number} threshold - Movement threshold (0-1)
     */
    setMovementThreshold(threshold) {
      this.movementThreshold = Math.max(0.001, Math.min(0.1, threshold));
    }
    
    /**
     * Check if face tracking is active
     * @returns {boolean} Whether face is currently detected
     */
    isFaceTracking() {
      return this.isFaceDetected;
    }
    
    /**
     * Get video element
     * @returns {HTMLElement} Video element
     */
    getVideoElement() {
      return this.video;
    }
    
    /**
     * Get canvas element
     * @returns {HTMLElement} Canvas element
     */
    getCanvasElement() {
      return this.canvas;
    }
  }