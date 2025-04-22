// i18n.js - Internationalization support for HeadSynth

// Define translations
const translations = {
    en: {
      // App title and main UI
      subtitle: "Head-Controlled Music Synthesizer",
      startBtn: "Start",
      calibrateBtn: "Calibrate",
      helpBtn: "Help",
      
      // Tracking status
      trackingInactive: "Tracking Inactive",
      trackingActive: "Tracking Active",
      headPosition: "Head Position: X: 0.00, Y: 0.00, Z: 0.00",
      sensitivity: "Sensitivity",
      
      // Instrument and scale selection
      instrument: "Instrument",
      basicSynth: "Basic Synthesizer",
      amSynth: "AM Synth",
      fmSynth: "FM Synth",
      pluck: "Pluck",
      piano: "Piano",
      
      scale: "Scale",
      majorScale: "Major Scale",
      minorScale: "Minor Scale",
      pentatonicScale: "Pentatonic",
      bluesScale: "Blues",
      chromaticScale: "Chromatic",
      
      // Controls
      volume: "Volume",
      reverb: "Reverb",
      delay: "Delay",
      
      // Status panel
      currentNote: "Note: --",
      modeDisplay: "Mode: Paused",
      
      // Looper section
      looper: "Looper",
      recordLoop: "Record Loop",
      playLoop: "Play Loop",
      stopLoop: "Stop Loop",
      clearLoop: "Clear Loop",
      
      // Calibration modal
      calibrationTitle: "System Calibration",
      calibrationInstructions: "Please look straight at the camera and follow these movements:",
      calibStep1: "Look up and down",
      calibStep2: "Look left and right",
      calibStep3: "Tilt your head to both sides",
      startingCalibration: "Starting calibration...",
      lookStraight: "Look straight at the camera...",
      lookUp: "Look up...",
      lookDown: "Look down...",
      lookLeft: "Look left...",
      lookRight: "Look right...",
      tiltLeft: "Tilt your head left...",
      tiltRight: "Tilt your head right...",
      calibrationComplete: "Calibration complete!",
      calibrationFailed: "Calibration failed. Please try again.",
      skipCalibration: "Use Default Settings",
      completeCalibration: "Complete",
      
      // Help modal
      helpTitle: "How to Use HeadSynth",
      helpIntro: "Welcome to HeadSynth - a musical instrument you can play with head movements!",
      gettingStarted: "Getting Started",
      helpStep1: "Click \"Calibrate\" and follow the instructions to set up head tracking.",
      helpStep2: "Click \"Start\" to begin making music.",
      helpStep3: "Use head movements to control sounds:",
      leftRightDesc: "Moving your head left/right selects different notes",
      upDownDesc: "Moving your head up/down controls volume and intensity",
      tiltDesc: "Tilting your head controls effects",
      accessibilityOptions: "Accessibility Options",
      sensitivityDesc: "Use the sensitivity slider to adjust how much head movement is needed to control the instrument.",
      assistiveTechDesc: "HeadSynth works with screen readers and other assistive technology.",
      keyboardShortcuts: "Keyboard Shortcuts",
      shortcutStart: "Start/Stop",
      shortcutCalibrate: "Calibrate",
      shortcutRecord: "Record Loop",
      shortcutPlay: "Play Loop",
      shortcutStop: "Stop Loop",
      shortcutLanguage: "Change Language",
      shortcutVolume: "Change Volume",
      
      // Error modal
      errorTitle: "Error",
      dismiss: "Dismiss",
      
      // General messages
      cameraError: "Cannot access camera. Please make sure your camera is connected and you've granted camera permissions.",
      cannotRecord: "Cannot record. Maximum number of tracks reached.",
      scaleChanged: "Scale changed to: ",
      instrumentChanged: "Instrument changed to: ",
      calibrationSuccessful: "Calibration successful!",
      
      // Footer
      developedBy: "Developed by Shahar Maoz"
    },
    
    he: {
      // App title and main UI
      subtitle: "סינתיסייזר בשליטת ראש",
      startBtn: "התחל",
      calibrateBtn: "כיול",
      helpBtn: "עזרה",
      
      // Tracking status
      trackingInactive: "מעקב לא פעיל",
      trackingActive: "מעקב פעיל",
      headPosition: "מיקום ראש: X: 0.00, Y: 0.00, Z: 0.00",
      sensitivity: "רגישות",
      
      // Instrument and scale selection
      instrument: "כלי נגינה",
      basicSynth: "סינתיסייזר בסיסי",
      amSynth: "סינת AM",
      fmSynth: "סינת FM",
      pluck: "פלאק",
      piano: "פסנתר",
      
      scale: "סולם",
      majorScale: "סולם מז'ורי",
      minorScale: "סולם מינורי",
      pentatonicScale: "פנטטוני",
      bluesScale: "בלוז",
      chromaticScale: "כרומטי",
      
      // Controls
      volume: "עוצמת קול",
      reverb: "הדהוד",
      delay: "השהייה",
      
      // Status panel
      currentNote: "נוטה: --",
      modeDisplay: "מצב: מושהה",
      
      // Looper section
      looper: "לופר",
      recordLoop: "הקלט לופ",
      playLoop: "נגן לופ",
      stopLoop: "עצור לופ",
      clearLoop: "נקה לופ",
      
      // Calibration modal
      calibrationTitle: "כיול מערכת",
      calibrationInstructions: "אנא הבט ישירות למצלמה ובצע את התנועות הבאות:",
      calibStep1: "הבט למעלה ולמטה",
      calibStep2: "הבט שמאלה וימינה",
      calibStep3: "הטה את ראשך לשני הצדדים",
      startingCalibration: "מתחיל כיול...",
      lookStraight: "הבט ישירות למצלמה...",
      lookUp: "הבט למעלה...",
      lookDown: "הבט למטה...",
      lookLeft: "הבט שמאלה...",
      lookRight: "הבט ימינה...",
      tiltLeft: "הטה את ראשך שמאלה...",
      tiltRight: "הטה את ראשך ימינה...",
      calibrationComplete: "הכיול הושלם!",
      calibrationFailed: "הכיול נכשל. אנא נסה שוב.",
      skipCalibration: "השתמש בהגדרות ברירת מחדל",
      completeCalibration: "השלם",
      
      // Help modal
      helpTitle: "כיצד להשתמש ב-HeadSynth",
      helpIntro: "ברוכים הבאים ל-HeadSynth - כלי נגינה שניתן לנגן בו בעזרת תנועות ראש!",
      gettingStarted: "תחילת העבודה",
      helpStep1: "לחץ על \"כיול\" ועקוב אחר ההוראות להגדרת מעקב ראש.",
      helpStep2: "לחץ על \"התחל\" כדי להתחיל ליצור מוזיקה.",
      helpStep3: "השתמש בתנועות ראש כדי לשלוט בצלילים:",
      leftRightDesc: "הזזת הראש שמאלה/ימינה בוחרת תווים שונים",
      upDownDesc: "הזזת הראש למעלה/למטה שולטת בעוצמה ובאינטנסיביות",
      tiltDesc: "הטיית הראש שולטת באפקטים",
      accessibilityOptions: "אפשרויות נגישות",
      sensitivityDesc: "השתמש במחוון הרגישות כדי להתאים את כמות תנועת הראש הנדרשת לשליטה במכשיר.",
      assistiveTechDesc: "HeadSynth עובד עם קוראי מסך וטכנולוגיות סיוע אחרות.",
      keyboardShortcuts: "קיצורי מקלדת",
      shortcutStart: "התחל/עצור",
      shortcutCalibrate: "כיול",
      shortcutRecord: "הקלט לופ",
      shortcutPlay: "נגן לופ",
      shortcutStop: "עצור לופ",
      shortcutLanguage: "שנה שפה",
      shortcutVolume: "שנה עוצמת קול",
      
      // Error modal
      errorTitle: "שגיאה",
      dismiss: "סגור",
      
      // General messages
      cameraError: "לא ניתן לגשת למצלמה. אנא ודא שהמצלמה מחוברת ושהענקת הרשאות למצלמה.",
      cannotRecord: "לא ניתן להקליט. הגעת למספר המקסימלי של הקלטות.",
      scaleChanged: "הסולם שונה ל: ",
      instrumentChanged: "כלי הנגינה שונה ל: ",
      calibrationSuccessful: "הכיול הושלם בהצלחה!",
      
      // Footer
      developedBy: "פותח על ידי שחר מעוז"
    }
  };
  
  // Note display names for each language
  const noteDisplayNames = {
    en: {
      'C': 'C',
      'C#': 'C#',
      'Db': 'Db',
      'D': 'D',
      'D#': 'D#',
      'Eb': 'Eb',
      'E': 'E',
      'F': 'F',
      'F#': 'F#',
      'Gb': 'Gb',
      'G': 'G',
      'G#': 'G#',
      'Ab': 'Ab',
      'A': 'A',
      'A#': 'A#',
      'Bb': 'Bb',
      'B': 'B'
    },
    he: {
      'C': 'דו',
      'C#': 'דו#',
      'Db': 'רה♭',
      'D': 'רה',
      'D#': 'רה#',
      'Eb': 'מי♭',
      'E': 'מי',
      'F': 'פה',
      'F#': 'פה#',
      'Gb': 'סול♭',
      'G': 'סול',
      'G#': 'סול#',
      'Ab': 'לה♭',
      'A': 'לה',
      'A#': 'לה#',
      'Bb': 'סי♭',
      'B': 'סי'
    }
  };
  
  // I18n controller class
  class I18nController {
    constructor() {
      this.currentLanguage = 'en'; // Default language
      this.translations = translations;
      this.noteDisplayNames = noteDisplayNames;
      this.listeners = [];
    }
    
    // Initialize language based on user preference or stored settings
    init() {
      // Try to get language from localStorage
      const storedLang = localStorage.getItem('headSynthLanguage');
      if (storedLang && this.translations[storedLang]) {
        this.currentLanguage = storedLang;
      }
      
      // Apply language to the document
      this.applyLanguage();
      
      // Setup language toggle
      const languageToggle = document.getElementById('languageToggle');
      if (languageToggle) {
        languageToggle.addEventListener('click', () => {
          this.toggleLanguage();
        });
        // Set initial text
        this.updateLanguageButton();
      }
      
      // Add keyboard shortcut for language toggle
      document.addEventListener('keydown', (e) => {
        if (e.key === 'l' && !e.ctrlKey && !e.altKey && !e.metaKey) {
          this.toggleLanguage();
        }
      });
    }
    
    // Toggle between languages
    toggleLanguage() {
      this.currentLanguage = this.currentLanguage === 'en' ? 'he' : 'en';
      this.applyLanguage();
      
      // Store preference
      localStorage.setItem('headSynthLanguage', this.currentLanguage);
      
      // Show toast notification
      this.showLanguageChangeNotification();
    }
    
    // Apply translations to all elements with data-i18n attribute
    applyLanguage() {
      const elements = document.querySelectorAll('[data-i18n]');
      
      elements.forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (this.translations[this.currentLanguage][key]) {
          element.textContent = this.translations[this.currentLanguage][key];
        }
      });
      
      // Update HTML direction for RTL support
      document.body.classList.remove('rtl');
      if (this.currentLanguage === 'he') {
        document.body.classList.add('rtl');
        document.dir = 'rtl';
      } else {
        document.dir = 'ltr';
      }
      
      // Update the language button
      this.updateLanguageButton();
      
      // Notify listeners of language change
      this.notifyListeners();
    }
    
    // Update the language toggle button text
    updateLanguageButton() {
      const languageIcon = document.getElementById('languageIcon');
      if (languageIcon) {
        languageIcon.textContent = this.currentLanguage === 'en' ? 'EN' : 'עב';
      }
    }
    
    // Show notification for language change
    showLanguageChangeNotification() {
      const event = new CustomEvent('notification', {
        detail: {
          message: this.currentLanguage === 'en' ? 'Language changed to English' : 'השפה שונתה לעברית',
          type: 'info',
          duration: 2000
        }
      });
      document.dispatchEvent(event);
    }
    
    // Get translation by key
    translate(key) {
      return this.translations[this.currentLanguage][key] || key;
    }
    
    // Get note name in current language
    getNoteDisplayName(noteName) {
      return this.noteDisplayNames[this.currentLanguage][noteName] || noteName;
    }
    
    // Register listener for language changes
    onLanguageChange(callback) {
      if (typeof callback === 'function') {
        this.listeners.push(callback);
      }
    }
    
    // Notify all listeners about language change
    notifyListeners() {
      this.listeners.forEach(callback => callback(this.currentLanguage));
    }
  }
  
  // Create and export instance
  const i18n = new I18nController();
  export default i18n;