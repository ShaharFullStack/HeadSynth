// head-tracker.js - Tracks head movements using MediaPipe Face Mesh
export class HeadTracker {
    constructor(videoElement, canvasElement) {
      this.video = videoElement;
      this.canvas = canvasElement;
      this.canvasCtx = this.canvas.getContext('2d');
      this.faceMesh = null;
      this.camera = null;
      this.isRunning = false;
      this.lastHeadData = { x: 0, y: 0, z: 0 };
      this.calibrationData = {
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        rangeX: 1,
        rangeY: 1,
        rangeZ: 1
      };
      
      // Callback function for head movement
      this.onHeadMove = null;
      
      // Smoothing factors
      this.smoothingFactor = 0.7; // Higher values mean more smoothing
      
      // Initialize face mesh
      this._initFaceMesh();
    }
    
    _initFaceMesh() {
      this.faceMesh = new FaceMesh({
        locateFile: (file) => {
          return `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`;
        }
      });
      
      this.faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });
      
      this.faceMesh.onResults((results) => this._handleResults(results));
    }
    
    async start() {
      if (this.isRunning) return;
      
      try {
        // Setup camera
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
        console.log('Head tracker started');
        
      } catch (error) {
        console.error('Error starting head tracker:', error);
        throw new Error('לא ניתן לגשת למצלמה. אנא ודא שהמצלמה מחוברת ושהענקת הרשאות גישה למצלמה.');
      }
    }
    
    stop() {
      if (!this.isRunning) return;
      
      if (this.camera) {
        this.camera.stop();
      }
      
      if (this.video.srcObject) {
        const tracks = this.video.srcObject.getTracks();
        tracks.forEach(track => track.stop());
        this.video.srcObject = null;
      }
      
      this.isRunning = false;
      console.log('Head tracker stopped');
    }
    
    setCalibrationData(calibrationData) {
      this.calibrationData = calibrationData;
      console.log('Calibration data set:', calibrationData);
    }
    
    _handleResults(results) {
      if (!this.isRunning) return;
      
      // Clear canvas
      this.canvasCtx.save();
      this.canvasCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
      
      if (results.multiFaceLandmarks && results.multiFaceLandmarks.length > 0) {
        const landmarks = results.multiFaceLandmarks[0];
        
        // Draw face mesh landmarks for visualization
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_TESSELATION, 
                      { color: '#C0C0C070', lineWidth: 1 });
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_RIGHT_EYE, 
                      { color: '#FF3030', lineWidth: 2 });
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_LEFT_EYE, 
                      { color: '#30FF30', lineWidth: 2 });
        drawConnectors(this.canvasCtx, landmarks, FACEMESH_FACE_OVAL, 
                      { color: '#E0E0E0', lineWidth: 2 });
        
        // Extract head position and orientation
        const headData = this._extractHeadData(landmarks);
        
        // Apply smoothing to head data
        this._smoothHeadData(headData);
        
        // Apply calibration
        const normalizedHeadData = this._applyCalibration(this.lastHeadData);
        
        // Call the callback function if available
        if (typeof this.onHeadMove === 'function') {
          this.onHeadMove(normalizedHeadData);
        }
      }
      
      this.canvasCtx.restore();
    }
    
    _extractHeadData(landmarks) {
      // Important landmark indices for head tracking
      const NOSE_TIP = 1;  // Nose tip
      const LEFT_EYE = 33;  // Left eye
      const RIGHT_EYE = 263;  // Right eye
      const LEFT_CHEEK = 93;  // Left cheek
      const RIGHT_CHEEK = 323;  // Right cheek
      const FOREHEAD = 10;  // Forehead
      const CHIN = 152;  // Chin
      
      // Get nose position for horizontal movement (left-right)
      const noseX = landmarks[NOSE_TIP].x;
      
      // Calculate vertical position (up-down) using eyes and chin
      const eyesY = (landmarks[LEFT_EYE].y + landmarks[RIGHT_EYE].y) / 2;
      const chinY = landmarks[CHIN].y;
      const verticalRatio = (eyesY - landmarks[FOREHEAD].y) / (chinY - landmarks[FOREHEAD].y);
      
      // Calculate head rotation/tilt using eye positions
      const leftEye = landmarks[LEFT_EYE];
      const rightEye = landmarks[RIGHT_EYE];
      const eyeDistance = Math.sqrt(
        Math.pow(rightEye.x - leftEye.x, 2) + 
        Math.pow(rightEye.y - leftEye.y, 2)
      );
      
      // Calculate cheek distance to estimate depth and head rotation
      const cheekDistance = Math.sqrt(
        Math.pow(landmarks[RIGHT_CHEEK].x - landmarks[LEFT_CHEEK].x, 2) + 
        Math.pow(landmarks[RIGHT_CHEEK].y - landmarks[LEFT_CHEEK].y, 2)
      );
      
      // Calculate head tilt (Z-axis rotation)
      const eyeSlope = (rightEye.y - leftEye.y) / (rightEye.x - leftEye.x);
      const tiltZ = Math.atan(eyeSlope);
      
      return {
        x: noseX,
        y: verticalRatio,
        z: tiltZ,
        eyeDistance: eyeDistance,
        cheekDistance: cheekDistance
      };
    }
    
    _smoothHeadData(headData) {
      // Apply exponential smoothing
      this.lastHeadData.x = this.smoothingFactor * this.lastHeadData.x + (1 - this.smoothingFactor) * headData.x;
      this.lastHeadData.y = this.smoothingFactor * this.lastHeadData.y + (1 - this.smoothingFactor) * headData.y;
      this.lastHeadData.z = this.smoothingFactor * this.lastHeadData.z + (1 - this.smoothingFactor) * headData.z;
    }
    
    _applyCalibration(headData) {
      // Normalize values based on calibration data
      const normalizedX = (headData.x - this.calibrationData.centerX) / this.calibrationData.rangeX;
      const normalizedY = (headData.y - this.calibrationData.centerY) / this.calibrationData.rangeY;
      const normalizedZ = (headData.z - this.calibrationData.centerZ) / this.calibrationData.rangeZ;
      
      // Clamp values to range [-1, 1]
      return {
        x: Math.max(-1, Math.min(1, normalizedX * 2)),
        y: Math.max(-1, Math.min(1, normalizedY * 2)),
        z: Math.max(-1, Math.min(1, normalizedZ * 2))
      };
    }
    
    getCameraFeed() {
      return this.video;
    }
    
    getCanvasElement() {
      return this.canvas;
    }
  }