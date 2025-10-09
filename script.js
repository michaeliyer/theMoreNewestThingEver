// Letter explosion animation system
class LetterExplosion {
  constructor() {
    this.colorPalettes = [
      ["#ff6b6b", "#4ecdc4", "#45b7d1", "#96ceb4", "#feca57"],
      ["#ff9ff3", "#54a0ff", "#5f27cd", "#00d2d3", "#ff9f43"],
      ["#ff6348", "#2ed573", "#3742fa", "#f368e0", "#ffa502"],
      ["#ff4757", "#2ed573", "#1e90ff", "#ff6348", "#ffa502"],
      ["#ff3838", "#2ecc71", "#3498db", "#9b59b6", "#f39c12"],
    ];
    this.dragState = {
      isDragging: false,
      element: null,
      startX: 0,
      startY: 0,
      elementStartX: 0,
      elementStartY: 0,
      hasMoved: false,
    };
    this.matchingState = {
      selectedElement: null,
      matchedPairs: new Set(),
      totalPairs: 0,
    };
    this.matchMessages = [
      "You found a match! ✨",
      "Perfect pair! 🌟",
      "Great job! 💫",
      "Match made! ⭐",
      "Brilliant! 🎯",
      "Awesome! 🔥",
      "Spectacular! 💥",
      "Amazing! 🌈",
      "Wonderful! 🎨",
      "Fantastic! 🚀",
    ];
    this.victoryMessages = [
      "🎉 You matched them all! 🎉",
      "🏆 Victory! Amazing work! 🏆",
      "⭐ Perfect! All pairs found! ⭐",
      "🌟 Incredible! You're a star! 🌟",
    ];

    // Settings for sound and speech
    this.settings = {
      soundEnabled: localStorage.getItem("soundEnabled") !== "false", // Default true
      speechEnabled: localStorage.getItem("speechEnabled") !== "false", // Default true
    };

    // Create shared audio context for better iOS compatibility
    this.audioContext = null;
    this.audioUnlocked = false;
    try {
      this.audioContext = new (window.AudioContext ||
        window.webkitAudioContext)();
    } catch (e) {
      console.log("Audio not available:", e);
    }

    // Store original HTML for game reset
    this.originalGameHTML = null;

    // Speech synthesis for reading messages
    this.speechSynthesis = window.speechSynthesis;

    // Track positioned elements to prevent overlap
    this.positionedElements = [];

    // Victory song audio element
    this.victorySong = null;
    this.initVictorySong();

    this.init();
  }

  init() {
    // Wait for DOM to be ready
    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => this.setupElements());
    } else {
      this.setupElements();
    }
  }

  initVictorySong() {
    // Create audio element for victory song
    // You can replace 'victory-song.mp3' with your own MP3 file path
    // Or use a URL: 'https://example.com/your-song.mp3'
    const songPath = "victory-song.mp3"; // <<< PUT YOUR MP3 FILE HERE

    this.victorySong = new Audio(songPath);
    this.victorySong.volume = 0.6; // Adjust volume (0.0 to 1.0)
    this.victorySong.preload = "auto";
    this.victorySongUnlocked = false;

    // Handle errors gracefully if file doesn't exist
    this.victorySong.addEventListener("error", (e) => {
      console.log(
        "Victory song not found. To add a victory song:",
        "\n1. Add an MP3 file named 'victory-song.mp3' to your project folder",
        "\n2. Or update the 'songPath' in initVictorySong() to point to your MP3"
      );
      this.victorySong = null; // Disable if file not found
    });

    // iOS audio unlock - play silent audio on first user interaction
    this.unlockVictorySongAudio();

    console.log("🎵 Victory song ready:", songPath);
  }

  unlockVictorySongAudio() {
    if (!this.victorySong) return;

    const unlockAudio = () => {
      if (this.victorySongUnlocked) return;

      // Play and immediately pause to unlock audio on iOS
      const playPromise = this.victorySong.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            this.victorySong.pause();
            this.victorySong.currentTime = 0;
            this.victorySongUnlocked = true;
            console.log("✓ Victory song audio unlocked for iOS");
          })
          .catch((e) => {
            console.log("Victory song unlock attempt:", e.message);
          });
      }
    };

    // Listen for first user interaction to unlock audio
    const events = ["touchstart", "touchend", "click", "keydown"];
    events.forEach((event) => {
      document.addEventListener(
        event,
        () => {
          unlockAudio();
        },
        { once: true, passive: true }
      );
    });
  }

  setupElements() {
    // Store original game HTML on first setup (before any modifications)
    if (!this.originalGameHTML) {
      const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");
      this.originalGameHTML = Array.from(headings).map((h) =>
        h.cloneNode(true)
      );
    }

    // Find all heading elements
    const headings = document.querySelectorAll("h1, h2, h3, h4, h5, h6");

    // Count unique match IDs for total pairs
    const matchIds = new Set();
    headings.forEach((heading) => {
      if (heading.dataset.matchId) {
        matchIds.add(heading.dataset.matchId);
      }
    });
    this.matchingState.totalPairs = matchIds.size;

    headings.forEach((heading) => {
      // Split text into individual letter spans
      this.wrapLetters(heading);

      // Position randomly on initial page load
      this.positionRandomlyOnLoad(heading);

      // Add drag and click event listeners
      this.setupDragAndClick(heading);
    });

    // Add document-level event listeners for dragging
    document.addEventListener("mousemove", (e) => this.handleMouseMove(e));
    document.addEventListener("mouseup", (e) => this.handleMouseUp(e));

    // Touch support for mobile
    document.addEventListener("touchmove", (e) => this.handleTouchMove(e), {
      passive: false,
    });
    document.addEventListener("touchend", (e) => this.handleTouchEnd(e));

    // Start subtle background animations
    this.startSubtleAnimations();

    // Create settings toggle buttons
    this.createSettingsButtons();

    // Unlock audio on first user interaction (iOS requirement)
    this.setupAudioUnlock();
  }

  setupAudioUnlock() {
    const unlockAudio = async () => {
      if (this.audioUnlocked || !this.audioContext) return;

      try {
        // Resume audio context on first interaction
        if (this.audioContext.state === "suspended") {
          await this.audioContext.resume();
        }

        // Play a silent tone to unlock audio on iOS
        const oscillator = this.audioContext.createOscillator();
        const gainNode = this.audioContext.createGain();
        gainNode.gain.value = 0; // Silent
        oscillator.connect(gainNode);
        gainNode.connect(this.audioContext.destination);
        oscillator.start(0);
        oscillator.stop(0.01);

        this.audioUnlocked = true;
        console.log("✓ Audio unlocked for iOS");

        // Remove listeners after unlocking
        document.removeEventListener("touchstart", unlockAudio);
        document.removeEventListener("touchend", unlockAudio);
        document.removeEventListener("click", unlockAudio);
      } catch (e) {
        console.log("Audio unlock failed:", e);
      }
    };

    // Try to unlock on any of these events
    document.addEventListener("touchstart", unlockAudio, {
      once: true,
      passive: true,
    });
    document.addEventListener("touchend", unlockAudio, {
      once: true,
      passive: true,
    });
    document.addEventListener("click", unlockAudio, { once: true });
  }

  createSettingsButtons() {
    // Container for settings buttons
    const settingsContainer = document.createElement("div");
    settingsContainer.className = "settings-container";
    settingsContainer.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      display: flex;
      gap: 8px;
      z-index: 10001;
      user-select: none;
      -webkit-user-select: none;
      -webkit-touch-callout: none;
    `;

    // New Game button
    const newGameButton = document.createElement("button");
    newGameButton.className = "settings-button";
    newGameButton.innerHTML = "🔄";
    newGameButton.title = "New Game";
    newGameButton.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.2s ease, transform 0.1s ease;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    newGameButton.addEventListener("mouseenter", () => {
      newGameButton.style.opacity = "0.8";
      newGameButton.style.transform = "scale(1.1)";
    });

    newGameButton.addEventListener("mouseleave", () => {
      newGameButton.style.opacity = "0.4";
      newGameButton.style.transform = "scale(1)";
    });

    newGameButton.addEventListener("click", () => {
      this.resetGame();
      this.playSound("toggle");
    });

    // Sound toggle button
    const soundButton = document.createElement("button");
    soundButton.className = "settings-button";
    soundButton.innerHTML = this.settings.soundEnabled ? "🔊" : "🔇";
    soundButton.title = "Toggle Sound";
    soundButton.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.2s ease, transform 0.1s ease;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    soundButton.addEventListener("mouseenter", () => {
      soundButton.style.opacity = "0.8";
      soundButton.style.transform = "scale(1.1)";
    });

    soundButton.addEventListener("mouseleave", () => {
      soundButton.style.opacity = "0.4";
      soundButton.style.transform = "scale(1)";
    });

    soundButton.addEventListener("click", () => {
      this.settings.soundEnabled = !this.settings.soundEnabled;
      localStorage.setItem("soundEnabled", this.settings.soundEnabled);
      soundButton.innerHTML = this.settings.soundEnabled ? "🔊" : "🔇";
      this.playSound("toggle");
    });

    // Speech toggle button
    const speechButton = document.createElement("button");
    speechButton.className = "settings-button";
    speechButton.innerHTML = this.settings.speechEnabled ? "🗣️" : "🔇";
    speechButton.title = "Toggle Voice";
    speechButton.style.cssText = `
      background: rgba(255, 255, 255, 0.15);
      border: 1px solid rgba(255, 255, 255, 0.3);
      border-radius: 8px;
      width: 32px;
      height: 32px;
      font-size: 16px;
      cursor: pointer;
      opacity: 0.4;
      transition: opacity 0.2s ease, transform 0.1s ease;
      padding: 0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    speechButton.addEventListener("mouseenter", () => {
      speechButton.style.opacity = "0.8";
      speechButton.style.transform = "scale(1.1)";
    });

    speechButton.addEventListener("mouseleave", () => {
      speechButton.style.opacity = "0.4";
      speechButton.style.transform = "scale(1)";
    });

    speechButton.addEventListener("click", () => {
      this.settings.speechEnabled = !this.settings.speechEnabled;
      localStorage.setItem("speechEnabled", this.settings.speechEnabled);
      speechButton.innerHTML = this.settings.speechEnabled ? "🗣️" : "🔇";
      this.playSound("toggle");
      if (this.settings.speechEnabled) {
        this.speak("Voice enabled!");
      }
    });

    settingsContainer.appendChild(newGameButton);
    settingsContainer.appendChild(soundButton);
    settingsContainer.appendChild(speechButton);
    document.body.appendChild(settingsContainer);
  }

  // Haptic feedback removed

  // Text-to-speech for messages (kid's voice)
  speak(text) {
    if (!this.settings.speechEnabled) return;
    if (!this.speechSynthesis) return;

    // Cancel any ongoing speech
    this.speechSynthesis.cancel();

    // Clean up text - remove emojis for more natural speech
    const cleanText = text.replace(/[🎉🏆⭐🌟💫🔥🎯🌈🎨🚀✨💥]/g, "").trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);

    // More natural voice settings - less robotic
    utterance.pitch = 1.3; // More moderate pitch (less extreme = more natural)
    utterance.rate = 0.95; // Slightly slower = more expressive and clear
    utterance.volume = 0.9; // Good volume

    // Try to select the highest quality, most natural-sounding voice
    const voices = this.speechSynthesis.getVoices();

    // Prioritize premium/natural voices that come with the OS
    // These tend to sound much more human
    const preferredVoiceNames = [
      "Samantha (Enhanced)", // macOS enhanced - very natural
      "Samantha", // macOS - natural and friendly
      "Alex", // macOS - very natural male voice
      "Siri Female", // iOS/macOS Siri voice
      "Karen", // macOS - warm and friendly
      "Moira", // macOS - natural Irish accent
      "Tessa", // macOS - South African, very natural
      "Google US English", // Chrome - good quality
      "Microsoft Zira", // Windows - natural
    ];

    let selectedVoice = null;

    // Try to find a preferred voice (exact or partial match)
    for (const voiceName of preferredVoiceNames) {
      selectedVoice = voices.find((voice) => voice.name.includes(voiceName));
      if (selectedVoice) {
        console.log("🗣️ Selected voice:", selectedVoice.name);
        break;
      }
    }

    // Fallback: prioritize local/premium voices (they sound better)
    if (!selectedVoice) {
      selectedVoice = voices.find(
        (voice) => voice.localService && voice.lang.startsWith("en")
      );
    }

    // Fallback: any English voice
    if (!selectedVoice) {
      selectedVoice = voices.find((voice) => voice.lang.startsWith("en"));
    }

    if (selectedVoice) {
      utterance.voice = selectedVoice;
    }

    this.speechSynthesis.speak(utterance);
    console.log("🗣️ Speaking:", cleanText);
  }

  // Reset game to initial state
  resetGame() {
    console.log("🔄 Resetting game...");

    // Clear game state
    this.matchingState.selectedElement = null;
    this.matchingState.matchedPairs.clear();

    // Clear positioned elements tracking
    this.positionedElements = [];

    // Remove all existing headings from the body
    const existingHeadings = document.querySelectorAll(
      "h1, h2, h3, h4, h5, h6"
    );
    existingHeadings.forEach((heading) => {
      if (heading.parentNode) {
        heading.parentNode.removeChild(heading);
      }
    });

    // Restore original headings from clones
    if (this.originalGameHTML) {
      this.originalGameHTML.forEach((originalHeading) => {
        const newHeading = originalHeading.cloneNode(true);
        document.body.appendChild(newHeading);

        // Set up drag, click, and position for the restored element
        this.setupDragAndClick(newHeading);
        this.positionRandomlyOnLoad(newHeading);
      });
    }

    console.log("✅ Game reset complete!");
  }

  // Sound system using Web Audio API (pure JavaScript, no files needed!)
  async playSound(type) {
    if (!this.settings.soundEnabled) return;
    if (!this.audioContext) return;

    try {
      // Ensure audio context is running
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
        console.log("Audio context resumed for:", type);
      }

      const now = this.audioContext.currentTime;

      switch (type) {
        case "select":
          // Quick high beep
          this.createTone(this.audioContext, 800, now, 0.05, 0.1, "sine");
          break;

        case "match":
          // Cork/suction pop sound (make it louder!)
          this.createPopSound(this.audioContext, now, 0.18); // Increased volume
          break;

        case "explosion":
          // Soft explosion whoosh (no harsh buzz)
          this.createExplosionSound(this.audioContext, now);
          break;

        case "victory":
          // Epic victory fanfare - triumphant ascending melody!
          // First phrase (C-E-G)
          this.createTone(this.audioContext, 523, now, 0.15, 0.25, "sine"); // C
          this.createTone(
            this.audioContext,
            659,
            now + 0.15,
            0.15,
            0.25,
            "sine"
          ); // E
          this.createTone(this.audioContext, 784, now + 0.3, 0.2, 0.3, "sine"); // G

          // Second phrase (G-A-B)
          this.createTone(
            this.audioContext,
            784,
            now + 0.5,
            0.12,
            0.25,
            "sine"
          ); // G
          this.createTone(
            this.audioContext,
            880,
            now + 0.62,
            0.12,
            0.25,
            "sine"
          ); // A
          this.createTone(
            this.audioContext,
            988,
            now + 0.74,
            0.15,
            0.28,
            "sine"
          ); // B

          // Grand finale (High C - triumphant!)
          this.createTone(
            this.audioContext,
            1047,
            now + 0.9,
            0.4,
            0.35,
            "sine"
          ); // High C

          // Add harmony for richness
          this.createTone(this.audioContext, 523, now + 0.9, 0.4, 0.2, "sine"); // Harmony C
          this.createTone(this.audioContext, 784, now + 0.9, 0.4, 0.2, "sine"); // Harmony G
          break;

        case "background":
          // Big background explosion (dramatic sweep)
          this.createTone(this.audioContext, 400, now, 0.3, 0.4, "triangle");
          this.createTone(
            this.audioContext,
            200,
            now + 0.1,
            0.3,
            0.3,
            "sawtooth"
          );
          this.createTone(
            this.audioContext,
            100,
            now + 0.2,
            0.2,
            0.25,
            "sawtooth"
          );
          break;

        case "toggle":
          // Soft click
          this.createTone(this.audioContext, 600, now, 0.03, 0.08, "square");
          break;

        case "error":
          // Quick sawtooth buzzer for incorrect match
          this.createTone(this.audioContext, 180, now, 0.08, 0.15, "sawtooth");
          this.createTone(
            this.audioContext,
            150,
            now + 0.08,
            0.08,
            0.12,
            "sawtooth"
          );
          break;

        default:
          // Generic beep
          this.createTone(this.audioContext, 440, now, 0.1, 0.1, "sine");
      }
    } catch (e) {
      console.log("Audio playback not available:", e);
    }
  }

  createTone(
    audioContext,
    frequency,
    startTime,
    duration,
    volume,
    type = "sine"
  ) {
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);

    oscillator.frequency.value = frequency;
    oscillator.type = type;

    // Envelope (fade in and out to avoid clicks)
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + duration - 0.02);
    gainNode.gain.linearRampToValueAtTime(0, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }

  createPopSound(audioContext, startTime, volume = 0.12) {
    // Create a gentle, soft pop sound (no harsh buzz)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    // Connect the audio nodes
    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Soft sine wave only
    oscillator.type = "sine";

    // Gentle pitch drop (lower frequencies, less harsh)
    oscillator.frequency.setValueAtTime(250, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(60, startTime + 0.06);

    // Heavy low-pass filter to remove any harsh frequencies
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(400, startTime); // Much lower cutoff
    filter.frequency.exponentialRampToValueAtTime(150, startTime + 0.06);
    filter.Q.value = 0.5; // Gentler resonance

    // Softer envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.003);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.05);
    gainNode.gain.linearRampToValueAtTime(0, startTime + 0.06);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.06);
  }

  createExplosionSound(audioContext, startTime) {
    // Soft whoosh sound (no harsh sawtooth buzz)
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    const filter = audioContext.createBiquadFilter();

    oscillator.connect(filter);
    filter.connect(gainNode);
    gainNode.connect(audioContext.destination);

    // Use sine wave instead of harsh sawtooth
    oscillator.type = "sine";

    // Descending whoosh
    oscillator.frequency.setValueAtTime(180, startTime);
    oscillator.frequency.exponentialRampToValueAtTime(40, startTime + 0.15);

    // Filter to keep it soft
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(600, startTime);
    filter.frequency.exponentialRampToValueAtTime(200, startTime + 0.15);
    filter.Q.value = 0.7;

    // Envelope
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(0.15, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + 0.12);
    gainNode.gain.linearRampToValueAtTime(0, startTime + 0.15);

    oscillator.start(startTime);
    oscillator.stop(startTime + 0.15);
  }

  setupDragAndClick(heading) {
    // Mouse events for desktop
    heading.addEventListener("mousedown", (e) => {
      e.preventDefault();
      this.startDrag(heading, e.clientX, e.clientY);
    });

    // Touch events for mobile - optimized for quick taps
    let touchStartTime = 0;
    let touchStartPos = { x: 0, y: 0 };
    let hasMoved = false;

    heading.addEventListener(
      "touchstart",
      (e) => {
        touchStartTime = Date.now();
        const touch = e.touches[0];
        touchStartPos = { x: touch.clientX, y: touch.clientY };
        hasMoved = false;
      },
      { passive: true }
    );

    heading.addEventListener(
      "touchmove",
      (e) => {
        const touch = e.touches[0];
        const deltaX = Math.abs(touch.clientX - touchStartPos.x);
        const deltaY = Math.abs(touch.clientY - touchStartPos.y);

        // If moved more than 10px, it's a drag
        if (deltaX > 10 || deltaY > 10) {
          hasMoved = true;
          // Start drag if not already dragging
          if (!this.dragState.isDragging) {
            this.startDrag(heading, touchStartPos.x, touchStartPos.y);
          }
        }
      },
      { passive: true }
    );

    heading.addEventListener("touchend", (e) => {
      const touchDuration = Date.now() - touchStartTime;

      // Quick tap (< 300ms and no movement) = instant selection
      if (touchDuration < 300 && !hasMoved) {
        e.preventDefault();
        this.handleQuickClick(heading);
      } else if (hasMoved) {
        // Was a drag, handle normally
        this.handleMouseUp(e);
      }

      hasMoved = false;
    });
  }

  startDrag(element, clientX, clientY) {
    this.dragState.isDragging = true;
    this.dragState.element = element;
    this.dragState.startX = clientX;
    this.dragState.startY = clientY;
    this.dragState.hasMoved = false;

    // Get current position
    const rect = element.getBoundingClientRect();
    this.dragState.elementStartX = rect.left;
    this.dragState.elementStartY = rect.top;

    // Add dragging class for visual feedback
    element.classList.add("dragging");
    element.style.cursor = "grabbing";
  }

  handleMouseMove(e) {
    if (!this.dragState.isDragging) return;

    e.preventDefault();
    this.updateDragPosition(e.clientX, e.clientY);
  }

  handleTouchMove(e) {
    if (!this.dragState.isDragging) return;

    e.preventDefault();
    const touch = e.touches[0];
    this.updateDragPosition(touch.clientX, touch.clientY);
  }

  updateDragPosition(clientX, clientY) {
    const deltaX = clientX - this.dragState.startX;
    const deltaY = clientY - this.dragState.startY;

    // If moved more than 5 pixels, consider it a drag (not a click)
    if (Math.abs(deltaX) > 5 || Math.abs(deltaY) > 5) {
      this.dragState.hasMoved = true;
    }

    const newX = this.dragState.elementStartX + deltaX;
    const newY = this.dragState.elementStartY + deltaY;

    this.dragState.element.style.left = `${newX}px`;
    this.dragState.element.style.top = `${newY}px`;
  }

  handleMouseUp(e) {
    if (!this.dragState.isDragging) return;

    const element = this.dragState.element;
    element.classList.remove("dragging");
    element.style.cursor = "grab";

    // If it was a click/tap (not a drag), handle selection
    if (!this.dragState.hasMoved) {
      this.handleQuickClick(element);
    }

    // Reset drag state
    this.dragState.isDragging = false;
    this.dragState.element = null;
    this.dragState.hasMoved = false;
  }

  handleTouchEnd(e) {
    this.handleMouseUp(e);
  }

  handleQuickClick(element) {
    // Check if already matched
    const matchId = element.dataset.matchId;
    if (this.matchingState.matchedPairs.has(matchId)) {
      return; // Already matched, do nothing
    }

    // If no element is selected, select this one
    if (!this.matchingState.selectedElement) {
      this.matchingState.selectedElement = element;
      element.classList.add("selected");
      this.playSound("select");
      console.log("✓ Selected:", element.textContent);
      return;
    }

    // If clicking the same element, deselect it
    if (this.matchingState.selectedElement === element) {
      element.classList.remove("selected");
      this.matchingState.selectedElement = null;
      console.log("✗ Deselected:", element.textContent);
      return;
    }

    // Check if it's a match
    const selectedMatchId = this.matchingState.selectedElement.dataset.matchId;
    if (selectedMatchId === matchId) {
      // It's a match!
      this.playSound("match");
      console.log("🎉 Match found!", element.textContent);
      this.handleMatch(this.matchingState.selectedElement, element);
    } else {
      // Not a match - show error feedback
      this.playSound("error");

      // Shake both elements briefly
      const prevElement = this.matchingState.selectedElement;
      prevElement.classList.add("shake-error");
      element.classList.add("shake-error");

      setTimeout(() => {
        prevElement.classList.remove("shake-error");
        element.classList.remove("shake-error");
      }, 500);

      // Then deselect previous and select new
      this.matchingState.selectedElement.classList.remove("selected");
      this.matchingState.selectedElement = element;
      element.classList.add("selected");

      console.log("❌ Not a match. Switched to:", element.textContent);
    }
  }

  handleMatch(element1, element2) {
    const matchId = element1.dataset.matchId;

    // Mark as matched
    this.matchingState.matchedPairs.add(matchId);
    element1.classList.remove("selected");
    element2.classList.remove("selected");
    element1.classList.add("matched");
    element2.classList.add("matched");

    // Show match message
    this.showMatchMessage();

    // Explode both elements with stardust!
    setTimeout(() => {
      this.explodeMatchedPair(element1, element2);
    }, 500);

    // Reset selection
    this.matchingState.selectedElement = null;

    // Check for victory
    if (
      this.matchingState.matchedPairs.size === this.matchingState.totalPairs
    ) {
      setTimeout(() => {
        this.showVictoryMessage();
      }, 3000); // Wait for explosions to finish
    }
  }

  explodeMatchedPair(element1, element2) {
    // Create stardust at both locations before removing
    this.createLingeringStardust(element1);
    this.createLingeringStardust(element2);

    this.playSound("explosion");

    // Explode both elements
    this.explodeAndReform(element1);
    this.explodeAndReform(element2);

    // Remove both elements after explosion
    setTimeout(() => {
      if (element1.parentNode) {
        element1.style.opacity = "0";
        element1.style.transition = "opacity 1s ease-out";
      }
      if (element2.parentNode) {
        element2.style.opacity = "0";
        element2.style.transition = "opacity 1s ease-out";
      }

      setTimeout(() => {
        if (element1.parentNode) element1.parentNode.removeChild(element1);
        if (element2.parentNode) element2.parentNode.removeChild(element2);
      }, 1000);
    }, 2500); // After explosion animation
  }

  showMatchMessage() {
    const message =
      this.matchMessages[Math.floor(Math.random() * this.matchMessages.length)];
    this.displayFloatingMessage(message, "#4ecdc4");
    this.speak(message);
  }

  showVictoryMessage() {
    const message =
      this.victoryMessages[
        Math.floor(Math.random() * this.victoryMessages.length)
      ];
    this.displayFloatingMessage(message, "#feca57", true);
    this.playSound("victory");
    this.speak(message);
    this.createVictoryConfetti();

    // Play victory song after fanfare (2 second delay)
    setTimeout(() => {
      this.playVictorySong();
    }, 2000);
  }

  playVictorySong() {
    if (!this.settings.soundEnabled) return;
    if (!this.victorySong) return;

    // Stop any currently playing song and restart from beginning
    this.victorySong.pause();
    this.victorySong.currentTime = 0;

    // Play the song
    const playPromise = this.victorySong.play();

    if (playPromise !== undefined) {
      playPromise
        .then(() => {
          console.log("🎵 Playing victory song!");
        })
        .catch((error) => {
          console.log(
            "⚠️ Victory song play blocked (iOS autoplay policy):",
            error.message
          );
          console.log(
            "💡 Tip: Tap the screen once after loading to enable audio on iOS"
          );

          // Try to unlock and play again after a moment
          setTimeout(() => {
            if (!this.victorySongUnlocked) {
              const retryPromise = this.victorySong.play();
              if (retryPromise !== undefined) {
                retryPromise
                  .then(() => {
                    console.log("🎵 Victory song playing after retry!");
                    this.victorySongUnlocked = true;
                  })
                  .catch(() => {
                    console.log("Still blocked - user interaction needed");
                  });
              }
            }
          }, 500);
        });
    }
  }

  displayFloatingMessage(text, color, isLarge = false) {
    const messageEl = document.createElement("div");
    messageEl.className = isLarge ? "victory-message" : "match-message";
    messageEl.textContent = text;

    const displayTime = isLarge ? 6000 : 2000; // Victory shows for 6 seconds
    const fadeTime = isLarge ? 2000 : 500; // Victory fades over 2 seconds

    messageEl.style.cssText = `
      position: fixed;
      left: 50%;
      top: ${isLarge ? "40%" : "30%"};
      transform: translate(-50%, -50%);
      font-size: ${isLarge ? "3rem" : "2rem"};
      font-weight: bold;
      color: white;
      background: ${color};
      padding: ${isLarge ? "20px 40px" : "15px 30px"};
      border-radius: 20px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      pointer-events: none;
      z-index: 10000;
      animation: floatMessage ${isLarge ? "2s" : "1.5s"} ease-out forwards;
      font-family: "Bangers", system-ui;
      text-align: center;
      max-width: 90vw;
      border: 4px solid white;
      -webkit-font-smoothing: antialiased;
      opacity: 1;
      transition: opacity ${fadeTime}ms ease-out;
    `;

    document.body.appendChild(messageEl);

    // Start fade out before removal
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.style.opacity = "0";
      }
    }, displayTime - fadeTime);

    // Remove after fade completes
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl);
      }
    }, displayTime);
  }

  createVictoryConfetti() {
    // Create lots of confetti particles
    for (let i = 0; i < 100; i++) {
      setTimeout(() => {
        const confetti = document.createElement("div");
        confetti.className = "confetti";

        const colors = [
          "#ff6b6b",
          "#4ecdc4",
          "#45b7d1",
          "#feca57",
          "#ff9ff3",
          "#54a0ff",
        ];
        const color = colors[Math.floor(Math.random() * colors.length)];

        const startX = Math.random() * window.innerWidth;
        const startY = -20;
        const endX = startX + (Math.random() - 0.5) * 400;
        const endY = window.innerHeight + 20;
        const rotation = Math.random() * 720;
        const duration = 2 + Math.random() * 2;

        confetti.style.cssText = `
          position: fixed;
          left: ${startX}px;
          top: ${startY}px;
          width: ${8 + Math.random() * 12}px;
          height: ${8 + Math.random() * 12}px;
          background: ${color};
          border-radius: ${Math.random() > 0.5 ? "50%" : "0%"};
          pointer-events: none;
          z-index: 9999;
          animation: confettiFall ${duration}s ease-out forwards;
          --end-x: ${endX}px;
          --end-y: ${endY}px;
          --rotation: ${rotation}deg;
        `;

        document.body.appendChild(confetti);

        setTimeout(() => {
          if (confetti.parentNode) {
            confetti.parentNode.removeChild(confetti);
          }
        }, duration * 1000);
      }, i * 30); // Stagger confetti creation
    }
  }

  positionRandomlyOnLoad(element) {
    // Calculate random position without overlap
    const newPosition = this.calculateRandomPositionNoOverlap(element);

    // Apply position immediately (no animation on load)
    element.style.top = `${newPosition.top}px`;
    element.style.left = `${newPosition.left}px`;

    // Track this position to prevent future overlaps
    this.positionedElements.push({
      element: element,
      top: newPosition.top,
      left: newPosition.left,
      width: element.offsetWidth,
      height: element.offsetHeight,
    });

    // Randomly choose layout orientation
    const orientationChoice = Math.random();
    let elementTransform = "";

    if (orientationChoice < 0.3) {
      // 30% chance: Vertical layout (letters stacked)
      this.applyVerticalLayout(element);
      const randomRotation = (Math.random() - 0.5) * 20; // -10 to 10 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    } else if (orientationChoice < 0.5) {
      // 20% chance: Diagonal layout
      this.applyDiagonalLayout(element);
      const randomRotation = 30 + (Math.random() - 0.5) * 60; // 0 to 60 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    } else if (orientationChoice < 0.7) {
      // 20% chance: Steep angle
      const steepAngle = 60 + Math.random() * 60; // 60 to 120 degrees
      elementTransform = `rotate(${steepAngle}deg)`;
    } else if (orientationChoice < 0.85) {
      // 15% chance: Upside down
      const upsideAngle = 150 + Math.random() * 60; // 150 to 210 degrees
      elementTransform = `rotate(${upsideAngle}deg)`;
    } else {
      // 15% chance: Slight angle (normal-ish)
      const randomRotation = (Math.random() - 0.5) * 30; // -15 to 15 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    }

    element.style.transform = elementTransform;
  }

  wrapLetters(element) {
    const text = element.textContent;
    element.innerHTML = "";

    [...text].forEach((char, index) => {
      const span = document.createElement("span");
      span.className = "letter";
      span.textContent = char === " " ? "\u00A0" : char; // Non-breaking space
      span.style.animationDelay = `${index * 0.05}s`;
      element.appendChild(span);
    });
  }

  explodeAndReform(element) {
    const letters = element.querySelectorAll(".letter");
    const randomColors = this.getRandomColorPalette();

    this.playSound("explosion");

    // Add glowing effect to the element
    element.classList.add("glowing");

    // Create enhanced sparkles with more particles
    this.createEnhancedSparkles(element);

    // Add screen shake for letter explosions too
    this.addLetterScreenShake();

    letters.forEach((letter, index) => {
      // Much more dramatic explosion properties
      const randomX = (Math.random() - 0.5) * 800; // Doubled from 400 to 800px
      const randomY = (Math.random() - 0.5) * 800; // Much bigger spread
      const randomRotation = (Math.random() - 0.5) * 1440; // Doubled rotation: -720 to 720 degrees

      // Dynamic font size changes during explosion
      const originalSize = parseFloat(getComputedStyle(letter).fontSize) || 16;
      const explosionSize = originalSize * (1.5 + Math.random() * 2); // 1.5x to 3.5x bigger
      const finalSize = originalSize * (0.8 + Math.random() * 0.6); // 0.8x to 1.4x final size

      letter.style.setProperty("--random-x", `${randomX}px`);
      letter.style.setProperty("--random-y", `${randomY}px`);
      letter.style.setProperty("--random-rotation", `${randomRotation}deg`);
      letter.style.setProperty("--explosion-size", `${explosionSize}px`);
      letter.style.setProperty("--final-size", `${finalSize}px`);

      // Add dramatic glow during explosion
      letter.style.setProperty(
        "--glow-color",
        randomColors[Math.floor(Math.random() * randomColors.length)]
      );

      // Start explosion with staggered timing
      setTimeout(() => {
        letter.classList.add("exploding");
        // Add individual letter shake
        this.addLetterShake(letter);
      }, index * 30); // Faster stagger for more chaos

      // Start reform with new color and enhanced flickering
      setTimeout(() => {
        letter.classList.remove("exploding");
        letter.classList.add("reforming");

        // Generate completely arbitrary reformation start positions
        const reformStartX = (Math.random() - 0.5) * 600; // -300 to 300px from final position
        const reformStartY = (Math.random() - 0.5) * 600; // -300 to 300px from final position
        const reformStartRotation = (Math.random() - 0.5) * 1080; // -540 to 540 degrees
        const reformStartScale = 0.1 + Math.random() * 0.4; // 0.1 to 0.5 scale

        // Set arbitrary reformation start properties
        letter.style.setProperty("--reform-start-x", `${reformStartX}px`);
        letter.style.setProperty("--reform-start-y", `${reformStartY}px`);
        letter.style.setProperty(
          "--reform-start-rotation",
          `${reformStartRotation}deg`
        );
        letter.style.setProperty("--reform-start-scale", reformStartScale);

        // Truly random color assignment
        const randomColorIndex = Math.floor(
          Math.random() * randomColors.length
        );
        letter.style.color = randomColors[randomColorIndex];
        letter.style.fontSize = `${finalSize}px`;

        // Add enhanced flickering effect during reformation
        this.addEnhancedFlickerEffect(letter, randomColors);

        // Remove animation classes after animation completes
        setTimeout(() => {
          letter.classList.remove("reforming");
        }, 1000); // Slightly longer for more dramatic effect
      }, 1000 + index * 40); // Longer explosion time
    });

    // Remove glowing effect and reposition element
    setTimeout(() => {
      element.classList.remove("glowing");
      // Leave behind stardust at the explosion location
      this.createLingeringStardust(element);
      // Reposition the entire element after letter animation completes
      this.repositionElement(element);
    }, 2200); // Extended timing for longer animations
  }

  repositionElement(element) {
    console.log("Repositioning element:", element.textContent);

    // Add repositioning class for smooth animation
    element.classList.add("repositioning");

    // Calculate random position
    const newPosition = this.calculateRandomPosition(element);

    // Apply new position
    element.style.top = `${newPosition.top}px`;
    element.style.left = `${newPosition.left}px`;

    // Randomly choose layout orientation
    const orientationChoice = Math.random();
    let elementTransform = "";

    if (orientationChoice < 0.3) {
      // 30% chance: Vertical layout (letters stacked)
      this.applyVerticalLayout(element);
      const randomRotation = (Math.random() - 0.5) * 20; // -10 to 10 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    } else if (orientationChoice < 0.5) {
      // 20% chance: Diagonal layout
      this.applyDiagonalLayout(element);
      const randomRotation = 30 + (Math.random() - 0.5) * 60; // 0 to 60 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    } else if (orientationChoice < 0.7) {
      // 20% chance: Steep angle
      const steepAngle = 60 + Math.random() * 60; // 60 to 120 degrees
      elementTransform = `rotate(${steepAngle}deg)`;
    } else if (orientationChoice < 0.85) {
      // 15% chance: Upside down
      const upsideAngle = 150 + Math.random() * 60; // 150 to 210 degrees
      elementTransform = `rotate(${upsideAngle}deg)`;
    } else {
      // 15% chance: Slight angle (normal-ish)
      const randomRotation = (Math.random() - 0.5) * 30; // -15 to 15 degrees
      elementTransform = `rotate(${randomRotation}deg)`;
    }

    element.style.transform = elementTransform;

    // Remove repositioning class after animation completes
    setTimeout(() => {
      element.classList.remove("repositioning");
    }, 1500);
  }

  applyVerticalLayout(element) {
    const letters = element.querySelectorAll(".letter");
    letters.forEach((letter, index) => {
      // Stack letters vertically with slight random offset
      const verticalOffset = index * (20 + Math.random() * 10); // 20-30px spacing
      const horizontalJitter = (Math.random() - 0.5) * 10; // -5 to 5px horizontal variation

      letter.style.position = "relative";
      letter.style.display = "block";
      letter.style.top = `${verticalOffset}px`;
      letter.style.left = `${horizontalJitter}px`;
      letter.style.lineHeight = "1";
    });
  }

  applyDiagonalLayout(element) {
    const letters = element.querySelectorAll(".letter");
    letters.forEach((letter, index) => {
      // Arrange letters diagonally
      const diagonalOffset = index * (15 + Math.random() * 8); // 15-23px spacing
      const verticalOffset = index * (12 + Math.random() * 6); // 12-18px vertical
      const jitter = (Math.random() - 0.5) * 8; // Random jitter

      letter.style.position = "relative";
      letter.style.display = "inline-block";
      letter.style.left = `${diagonalOffset + jitter}px`;
      letter.style.top = `${verticalOffset + jitter}px`;
    });
  }

  calculateRandomPosition(element) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // Calculate safe bounds (with padding)
    const padding = 20;
    const maxTop = viewportHeight - elementHeight - padding;
    const maxLeft = viewportWidth - elementWidth - padding;

    // Generate random position within safe bounds
    const top = Math.max(padding, Math.random() * maxTop);
    const left = Math.max(padding, Math.random() * maxLeft);

    return { top, left };
  }

  calculateRandomPositionNoOverlap(element) {
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const elementWidth = element.offsetWidth;
    const elementHeight = element.offsetHeight;

    // Calculate safe bounds (with padding)
    const padding = 20;
    const minSpacing = 15; // Minimum space between elements
    const maxTop = viewportHeight - elementHeight - padding;
    const maxLeft = viewportWidth - elementWidth - padding;

    let attempts = 0;
    const maxAttempts = 100; // Prevent infinite loop

    while (attempts < maxAttempts) {
      // Generate random position within safe bounds
      const top = Math.max(padding, Math.random() * maxTop);
      const left = Math.max(padding, Math.random() * maxLeft);

      // Check if this position overlaps with any existing elements
      const hasOverlap = this.positionedElements.some((positioned) => {
        // Calculate boundaries with spacing
        const newRight = left + elementWidth + minSpacing;
        const newBottom = top + elementHeight + minSpacing;
        const existingRight = positioned.left + positioned.width + minSpacing;
        const existingBottom = positioned.top + positioned.height + minSpacing;

        // Check for overlap (AABB collision detection)
        const overlaps = !(
          newRight < positioned.left ||
          left > existingRight ||
          newBottom < positioned.top ||
          top > existingBottom
        );

        return overlaps;
      });

      // If no overlap, use this position
      if (!hasOverlap) {
        return { top, left };
      }

      attempts++;
    }

    // If we couldn't find a non-overlapping position after max attempts,
    // just return a random position (better than crashing)
    console.warn(
      "Could not find non-overlapping position after",
      maxAttempts,
      "attempts"
    );
    const top = Math.max(padding, Math.random() * maxTop);
    const left = Math.max(padding, Math.random() * maxLeft);
    return { top, left };
  }

  getRandomColorPalette() {
    return this.colorPalettes[
      Math.floor(Math.random() * this.colorPalettes.length)
    ];
  }

  addFlickerEffect(letter, colorPalette) {
    // Create rapid color changes during reformation
    const flickerCount = 3 + Math.floor(Math.random() * 4); // 3-6 flickers
    const flickerInterval = 800 / flickerCount; // Spread over 800ms reformation time

    for (let i = 0; i < flickerCount; i++) {
      setTimeout(() => {
        const randomColor =
          colorPalette[Math.floor(Math.random() * colorPalette.length)];
        letter.style.color = randomColor;

        // Add brief intensity flash
        letter.style.textShadow = `0 0 8px ${randomColor}`;
        setTimeout(() => {
          letter.style.textShadow = "";
        }, flickerInterval / 3);
      }, i * flickerInterval);
    }
  }

  addEnhancedFlickerEffect(letter, colorPalette) {
    // Much more dramatic flickering with size and glow changes
    const flickerCount = 5 + Math.floor(Math.random() * 6); // 5-10 flickers
    const flickerInterval = 1000 / flickerCount; // Spread over 1000ms reformation time

    for (let i = 0; i < flickerCount; i++) {
      setTimeout(() => {
        const randomColor =
          colorPalette[Math.floor(Math.random() * colorPalette.length)];
        letter.style.color = randomColor;

        // Dramatic glow and size effects
        const glowIntensity = 15 + Math.random() * 20; // 15-35px glow
        const sizeMultiplier = 0.8 + Math.random() * 0.6; // 0.8x to 1.4x size variation
        const currentSize = parseFloat(letter.style.fontSize) || 16;

        letter.style.textShadow = `
          0 0 ${glowIntensity}px ${randomColor},
          0 0 ${glowIntensity * 1.5}px ${randomColor},
          0 0 ${glowIntensity * 2}px ${randomColor}
        `;
        letter.style.fontSize = `${currentSize * sizeMultiplier}px`;

        setTimeout(() => {
          letter.style.textShadow = "";
          letter.style.fontSize = `${currentSize}px`;
        }, flickerInterval / 2);
      }, i * flickerInterval);
    }
  }

  createEnhancedSparkles(element) {
    const rect = element.getBoundingClientRect();
    const sparkleCount = 30; // Doubled from 15 to 30

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "enhanced-sparkle";

      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;
      const size = 2 + Math.random() * 6; // Variable sizes 2-8px
      const duration = 0.8 + Math.random() * 0.8; // 0.8-1.6s duration

      sparkle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: radial-gradient(circle, #fff, transparent);
        border-radius: 50%;
        pointer-events: none;
        animation: enhancedSparkle ${duration}s ease-out forwards;
        animation-delay: ${Math.random() * 0.5}s;
        box-shadow: 0 0 ${size * 2}px rgba(255, 255, 255, 0.8);
      `;

      element.appendChild(sparkle);

      // Remove sparkle after animation
      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, (duration + 0.5) * 1000);
    }
  }

  createLingeringStardust(element) {
    // Get the current position of the element before it moves
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const stardustCount = 12 + Math.floor(Math.random() * 8); // 12-19 particles
    const colorPalette = this.getRandomColorPalette();

    for (let i = 0; i < stardustCount; i++) {
      const stardust = document.createElement("div");
      stardust.className = "lingering-stardust";

      // Random offset from explosion center
      const offsetX = (Math.random() - 0.5) * rect.width * 1.5;
      const offsetY = (Math.random() - 0.5) * rect.height * 1.5;

      const x = centerX + offsetX;
      const y = centerY + offsetY;
      const size = 2 + Math.random() * 5; // 2-7px
      const twinkleDuration = 1.5 + Math.random() * 2.5; // 1.5-4s twinkle
      const fadeDelay = 270 + Math.random() * 30; // Start fading after 4.5-5 minutes!
      const fadeDuration = 5 + Math.random() * 5; // Fade over 5-10s

      const starColor =
        colorPalette[Math.floor(Math.random() * colorPalette.length)];

      stardust.style.cssText = `
        position: fixed;
        left: ${x}px;
        top: ${y}px;
        width: ${size}px;
        height: ${size}px;
        background: ${starColor};
        border-radius: 50%;
        pointer-events: none;
        z-index: 1;
        box-shadow: 0 0 ${size * 3}px ${starColor}, 0 0 ${
        size * 5
      }px ${starColor};
        animation: twinkle ${twinkleDuration}s ease-in-out infinite;
        animation-delay: ${Math.random() * 2}s;
        opacity: 0.9;
      `;

      document.body.appendChild(stardust);

      // Fade out and remove after a while
      setTimeout(() => {
        stardust.style.transition = `opacity ${fadeDuration}s ease-out`;
        stardust.style.opacity = "0";

        setTimeout(() => {
          if (stardust.parentNode) {
            stardust.parentNode.removeChild(stardust);
          }
        }, fadeDuration * 1000);
      }, fadeDelay * 1000);
    }
  }

  addLetterScreenShake() {
    // Lighter screen shake for letter explosions
    document.body.style.animation = "letterShake 0.4s ease-out";

    setTimeout(() => {
      document.body.style.animation = "";
    }, 400);
  }

  addLetterShake(letter) {
    // Individual letter shake during explosion
    letter.style.animation = "individualLetterShake 0.3s ease-out";

    setTimeout(() => {
      letter.style.animation = "";
    }, 300);
  }

  startSubtleAnimations() {
    // Add subtle default flickering and micro-explosions
    setInterval(() => {
      const allLetters = document.querySelectorAll(".letter");
      if (allLetters.length === 0) return;

      // Random letter gets a subtle effect
      if (Math.random() < 0.05) {
        // 5% chance every interval
        const randomLetter =
          allLetters[Math.floor(Math.random() * allLetters.length)];
        this.addSubtleFlicker(randomLetter);
      }

      // Occasionally trigger a mini-sparkle burst
      if (Math.random() < 0.02) {
        // 2% chance
        const randomElement =
          document.querySelectorAll("h1, h2, h3, h4")[
            Math.floor(Math.random() * 5)
          ];
        if (randomElement) {
          this.addMiniSparkles(randomElement);
        }
      }
    }, 2000); // Check every 2 seconds
  }

  addSubtleFlicker(letter) {
    const originalColor = letter.style.color || getComputedStyle(letter).color;
    const brightColors = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#96ceb4",
      "#feca57",
    ];
    const flickerColor =
      brightColors[Math.floor(Math.random() * brightColors.length)];

    // Brief color flash
    letter.style.color = flickerColor;
    letter.style.textShadow = `0 0 6px ${flickerColor}`;

    setTimeout(() => {
      letter.style.color = originalColor;
      letter.style.textShadow = "";
    }, 150 + Math.random() * 200); // 150-350ms flicker
  }

  addMiniSparkles(element) {
    const rect = element.getBoundingClientRect();
    const sparkleCount = 3 + Math.floor(Math.random() * 4); // 3-6 mini sparkles

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "mini-sparkle";

      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;

      sparkle.style.cssText = `
        position: absolute;
        left: ${x}px;
        top: ${y}px;
        width: 2px;
        height: 2px;
        background: #fff;
        border-radius: 50%;
        pointer-events: none;
        animation: miniSparkle 1s ease-out forwards;
        animation-delay: ${Math.random() * 0.3}s;
      `;

      element.appendChild(sparkle);

      // Remove sparkle after animation
      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, 1300);
    }
  }

  createSparkles(element) {
    const rect = element.getBoundingClientRect();
    const sparkleCount = 15;

    for (let i = 0; i < sparkleCount; i++) {
      const sparkle = document.createElement("div");
      sparkle.className = "sparkle";

      const x = Math.random() * rect.width;
      const y = Math.random() * rect.height;

      sparkle.style.left = `${x}px`;
      sparkle.style.top = `${y}px`;
      sparkle.style.animationDelay = `${Math.random() * 0.5}s`;

      element.appendChild(sparkle);

      // Remove sparkle after animation
      setTimeout(() => {
        if (sparkle.parentNode) {
          sparkle.parentNode.removeChild(sparkle);
        }
      }, 1000);
    }
  }
}

// Background effects system
class BackgroundEffects {
  constructor() {
    this.isAnimating = false;
    // Share settings with LetterExplosion
    this.settings = letterExplosion.settings;
    this.init();
    // Set random background color on page load
    this.setRandomInitialBackground();
  }

  playSound(type) {
    if (!this.settings.soundEnabled) return;
    console.log(`🔊 Sound: ${type}`);
  }

  init() {
    console.log("BackgroundEffects initialized!");

    // Add double-click event listener to body with better detection
    document.body.addEventListener("dblclick", (e) => {
      console.log(
        "Double-click detected on:",
        e.target,
        "tagName:",
        e.target.tagName
      );

      // Check if we clicked directly on the body element (empty space)
      const isBody = e.target === document.body;
      const isHeading = e.target.matches("h1, h2, h3, h4, h5, h6");
      const isLetter = e.target.matches(".letter");
      const isButton = e.target.matches("button");

      if (isBody || (!isHeading && !isLetter && !isButton)) {
        console.log("Triggering background effects!");
        this.triggerWildColors(e);
      } else {
        console.log(
          "Skipping background effects - clicked on:",
          e.target.tagName,
          e.target.className
        );
      }
    });

    // Add single click for pulse effect with better detection
    document.body.addEventListener("click", (e) => {
      const isBody = e.target === document.body;
      const isHeading = e.target.matches("h1, h2, h3, h4, h5, h6");
      const isLetter = e.target.matches(".letter");
      const isButton = e.target.matches("button");

      if (isBody || (!isHeading && !isLetter && !isButton)) {
        console.log("Triggering pulse effect!");
        this.triggerPulse();
      }
    });

    // Keep right-click as backup trigger
    document.body.addEventListener("contextmenu", (e) => {
      e.preventDefault();
      console.log("Right-click detected - forcing background animation!");
      this.triggerWildColors(e);
    });
  }

  triggerWildColors(event) {
    if (this.isAnimating) return;

    this.isAnimating = true;

    this.playSound("background");

    // Debug log
    console.log("Triggering wild colors animation!");

    // Generate a random end color for this animation
    const randomEndColor = this.generateRandomEndColor();
    console.log("Animation will end with color:", randomEndColor);

    // Use smooth color transition instead of CSS animation for mobile compatibility
    this.animateBackgroundColorSmooth(randomEndColor);

    // Create floating particles from click point
    this.createBackgroundParticles(event.clientX, event.clientY);

    // Create screen flash effect
    this.createScreenFlash();

    // Complete animation
    setTimeout(() => {
      this.isAnimating = false;
      console.log(
        "Wild colors animation completed! New background:",
        randomEndColor
      );
    }, 3000);
  }

  animateBackgroundColorSmooth(finalColor) {
    // Detect iPad for optimized settings
    const isIPad =
      /iPad|Macintosh/.test(navigator.userAgent) && "ontouchend" in document;

    // Create color sequence for smooth transition
    const colorSequence = [
      "#ff6b6b",
      "#4ecdc4",
      "#45b7d1",
      "#ff9ff3",
      "#54a0ff",
      "#5f27cd",
      "#ff6348",
      "#2ed573",
      "#3742fa",
      "#f368e0",
      "#ffa502",
      "#ff4757",
      "#2ecc71",
      "#3498db",
      "#9b59b6",
      "#ff3838",
      "#f39c12",
      "#e74c3c",
      "#1abc9c",
      "#3498db",
      "#9b59b6",
      "#e67e22",
      "#e74c3c",
      "#8e44ad",
      finalColor,
    ];

    let currentStep = 0;
    const totalSteps = colorSequence.length;

    // iPad-specific optimizations
    const stepDuration = isIPad ? 3000 / (totalSteps * 0.8) : 3000 / totalSteps; // Slower on iPad
    const transitionType = isIPad ? "ease" : "ease-out"; // Simpler easing on iPad

    // Force repaint on iPad before starting
    if (isIPad) {
      document.body.style.transform = "translateZ(0)";
      document.body.offsetHeight; // Force reflow
    }

    const colorInterval = setInterval(() => {
      if (currentStep >= totalSteps) {
        clearInterval(colorInterval);
        // Ensure final color is set with iPad-specific handling
        if (isIPad) {
          requestAnimationFrame(() => {
            document.body.style.backgroundColor = finalColor;
          });
        } else {
          document.body.style.backgroundColor = finalColor;
        }
        return;
      }

      // iPad-optimized transition
      if (isIPad) {
        requestAnimationFrame(() => {
          document.body.style.transition = `background-color ${stepDuration}ms ${transitionType}`;
          document.body.style.backgroundColor = colorSequence[currentStep];
        });
      } else {
        document.body.style.transition = `background-color ${stepDuration}ms ${transitionType}`;
        document.body.style.backgroundColor = colorSequence[currentStep];
      }

      currentStep++;
    }, stepDuration);

    // Clean up transition after animation
    const cleanupDelay = isIPad ? 3500 : 3000; // Extra time for iPad
    setTimeout(() => {
      document.body.style.transition = "all 0.3s ease";
      if (isIPad) {
        // Reset transform on iPad
        document.body.style.transform = "";
      }
    }, cleanupDelay);
  }

  generateRandomEndColor() {
    // Choose random color generation method
    const methods = [
      () => this.generateRandomDarkColor(),
      () => this.generateRandomVibrantColor(),
      () => this.generateRandomPastelColor(),
      () => this.generateRandomNeonColor(),
      () => this.generateRandomEarthTone(),
      () => this.generateRandomJewelTone(),
    ];

    const randomMethod = methods[Math.floor(Math.random() * methods.length)];
    return randomMethod();
  }

  generateRandomDarkColor() {
    // Generate dark colors (RGB values 0-120)
    const r = Math.floor(Math.random() * 121);
    const g = Math.floor(Math.random() * 121);
    const b = Math.floor(Math.random() * 121);
    return `rgb(${r}, ${g}, ${b})`;
  }

  generateRandomVibrantColor() {
    // Generate vibrant colors with at least one high value
    const colors = [];
    for (let i = 0; i < 3; i++) {
      colors.push(Math.floor(Math.random() * 256));
    }
    // Ensure at least one color is vibrant (>150)
    const randomIndex = Math.floor(Math.random() * 3);
    colors[randomIndex] = Math.max(
      colors[randomIndex],
      150 + Math.floor(Math.random() * 106)
    );

    return `rgb(${colors[0]}, ${colors[1]}, ${colors[2]})`;
  }

  generateRandomPastelColor() {
    // Generate soft pastel colors (high values with some variation)
    const r = 150 + Math.floor(Math.random() * 106);
    const g = 150 + Math.floor(Math.random() * 106);
    const b = 150 + Math.floor(Math.random() * 106);
    return `rgb(${r}, ${g}, ${b})`;
  }

  generateRandomNeonColor() {
    // Generate bright neon-like colors
    const neonBase = [
      [255, 0, 255],
      [0, 255, 255],
      [255, 255, 0],
      [255, 0, 128],
      [128, 255, 0],
      [0, 128, 255],
    ];
    const base = neonBase[Math.floor(Math.random() * neonBase.length)];

    // Add some variation to the base neon color
    const r = Math.max(0, Math.min(255, base[0] + (Math.random() - 0.5) * 100));
    const g = Math.max(0, Math.min(255, base[1] + (Math.random() - 0.5) * 100));
    const b = Math.max(0, Math.min(255, base[2] + (Math.random() - 0.5) * 100));

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  generateRandomEarthTone() {
    // Generate earth tones (browns, greens, oranges)
    const earthPalettes = [
      { r: [101, 67, 33], g: [67, 33, 16], b: [33, 16, 8] }, // Browns
      { r: [34, 68, 102], g: [85, 119, 153], b: [34, 51, 68] }, // Forest greens
      { r: [153, 102, 51], g: [102, 68, 34], b: [51, 34, 17] }, // Oranges/rust
      { r: [68, 85, 102], g: [85, 102, 119], b: [102, 119, 136] }, // Blue-grays
    ];

    const palette =
      earthPalettes[Math.floor(Math.random() * earthPalettes.length)];
    const r =
      palette.r[Math.floor(Math.random() * palette.r.length)] +
      Math.floor(Math.random() * 50);
    const g =
      palette.g[Math.floor(Math.random() * palette.g.length)] +
      Math.floor(Math.random() * 50);
    const b =
      palette.b[Math.floor(Math.random() * palette.b.length)] +
      Math.floor(Math.random() * 50);

    return `rgb(${Math.min(255, r)}, ${Math.min(255, g)}, ${Math.min(255, b)})`;
  }

  generateRandomJewelTone() {
    // Generate rich jewel tones
    const jewelBases = [
      [128, 0, 128], // Purple (amethyst)
      [0, 100, 0], // Green (emerald)
      [220, 20, 60], // Red (ruby)
      [0, 0, 139], // Blue (sapphire)
      [255, 140, 0], // Orange (topaz)
      [75, 0, 130], // Indigo
    ];

    const base = jewelBases[Math.floor(Math.random() * jewelBases.length)];
    const r = Math.max(0, Math.min(255, base[0] + (Math.random() - 0.5) * 80));
    const g = Math.max(0, Math.min(255, base[1] + (Math.random() - 0.5) * 80));
    const b = Math.max(0, Math.min(255, base[2] + (Math.random() - 0.5) * 80));

    return `rgb(${Math.floor(r)}, ${Math.floor(g)}, ${Math.floor(b)})`;
  }

  setRandomInitialBackground() {
    const randomColor = this.generateRandomEndColor();
    document.body.style.backgroundColor = randomColor;
    console.log("Initial random background set to:", randomColor);
  }

  triggerPulse() {
    if (!this.isAnimating) {
      document.body.classList.add("pulsing");

      setTimeout(() => {
        document.body.classList.remove("pulsing");
      }, 500);
    }
  }

  createBackgroundParticles(centerX, centerY) {
    const particleCount = 60; // Doubled from 25 to 60!

    for (let i = 0; i < particleCount; i++) {
      const particle = document.createElement("div");
      particle.className = "bg-particle";

      // More dramatic direction and distance
      const angle = (Math.PI * 2 * i) / particleCount + Math.random() * 1.0;
      const distance = 150 + Math.random() * 400; // Increased from 100-300 to 150-550
      const x = Math.cos(angle) * distance;
      const y = Math.sin(angle) * distance;

      // Set initial position at click point
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;

      // Set animation properties
      particle.style.setProperty("--particle-x", `${x}px`);
      particle.style.setProperty("--particle-y", `${y}px`);

      // More vibrant colors with higher opacity
      const colors = [
        "rgba(255, 107, 107, 0.95)",
        "rgba(78, 205, 196, 0.95)",
        "rgba(69, 183, 209, 0.95)",
        "rgba(150, 206, 180, 0.95)",
        "rgba(254, 202, 87, 0.95)",
        "rgba(255, 0, 255, 0.9)", // Bright magenta
        "rgba(0, 255, 255, 0.9)", // Bright cyan
        "rgba(255, 255, 0, 0.9)", // Bright yellow
        "rgba(255, 0, 128, 0.9)", // Hot pink
        "rgba(128, 255, 0, 0.9)", // Lime green
      ];
      particle.style.background =
        colors[Math.floor(Math.random() * colors.length)];

      // Random particle sizes for more variety
      const size = 4 + Math.random() * 8; // 4-12px instead of fixed 6px
      particle.style.width = `${size}px`;
      particle.style.height = `${size}px`;

      // Add glow effect to particles
      particle.style.boxShadow = `0 0 ${size * 2}px ${
        particle.style.background
      }`;

      document.body.appendChild(particle);

      // Remove particle after animation
      setTimeout(() => {
        if (particle.parentNode) {
          particle.parentNode.removeChild(particle);
        }
      }, 5000); // Increased duration from 4s to 5s
    }

    // Add additional explosion rings for more drama
    this.createExplosionRings(centerX, centerY);

    // Add screen shake effect
    this.addScreenShake();
  }

  createExplosionRings(centerX, centerY) {
    // Create 5 expanding rings for more dramatic effect (was 3)
    for (let ring = 0; ring < 5; ring++) {
      const ringElement = document.createElement("div");
      ringElement.className = "explosion-ring";

      // Random colors for each ring
      const ringColors = [
        "rgba(255, 107, 107, 0.9)",
        "rgba(78, 205, 196, 0.9)",
        "rgba(69, 183, 209, 0.9)",
        "rgba(255, 159, 243, 0.9)",
        "rgba(254, 202, 87, 0.9)",
      ];
      const ringColor = ringColors[ring % ringColors.length];

      ringElement.style.cssText = `
        position: fixed;
        left: ${centerX}px;
        top: ${centerY}px;
        width: 0px;
        height: 0px;
        border: 4px solid ${ringColor};
        border-radius: 50%;
        pointer-events: none;
        z-index: 9998;
        animation: explosionRingPulse ${3 + ring * 0.5}s ease-out forwards;
        animation-delay: ${ring * 0.3}s;
      `;

      document.body.appendChild(ringElement);

      // Remove ring after much longer duration
      setTimeout(() => {
        if (ringElement.parentNode) {
          ringElement.parentNode.removeChild(ringElement);
        }
      }, 8000 + ring * 1000); // Much longer persistence (8-12 seconds)
    }
  }

  addScreenShake() {
    // Add dramatic screen shake effect
    document.body.style.animation = "screenShake 0.6s ease-out";

    setTimeout(() => {
      document.body.style.animation = "";
    }, 600);
  }

  createScreenFlash() {
    // Create many more flash layers for extended flickering (was 3, now 12!)
    for (let i = 0; i < 12; i++) {
      const flash = document.createElement("div");
      const intensity = 0.5 - (i % 4) * 0.1; // Varying intensity in cycles
      const delay = i * 400; // Much more staggered (was 100ms, now 400ms)

      // Cycle through different colors for more dramatic effect
      const flashColors = [
        `radial-gradient(circle, rgba(255,255,255,${intensity}) 0%, rgba(255,255,255,${
          intensity * 0.3
        }) 30%, transparent 70%)`,
        `radial-gradient(circle, rgba(255,200,200,${intensity}) 0%, rgba(255,200,200,${
          intensity * 0.3
        }) 30%, transparent 70%)`,
        `radial-gradient(circle, rgba(200,255,255,${intensity}) 0%, rgba(200,255,255,${
          intensity * 0.3
        }) 30%, transparent 70%)`,
        `radial-gradient(circle, rgba(255,255,200,${intensity}) 0%, rgba(255,255,200,${
          intensity * 0.3
        }) 30%, transparent 70%)`,
      ];

      flash.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100vw;
        height: 100vh;
        background: ${flashColors[i % 4]};
        pointer-events: none;
        z-index: 9999;
        animation: dramaticFlash ${1.2 + (i % 3) * 0.3}s ease-out forwards;
        animation-delay: ${delay}ms;
      `;

      document.body.appendChild(flash);

      // Much longer removal time
      setTimeout(() => {
        if (flash.parentNode) {
          flash.parentNode.removeChild(flash);
        }
      }, 2000 + delay);
    }

    // Add flash animation if not already added
    if (!document.getElementById("dramaticFlashStyle")) {
      const style = document.createElement("style");
      style.id = "dramaticFlashStyle";
      style.textContent = `
        @keyframes dramaticFlash {
          0% { opacity: 0; transform: scale(0.8); }
          15% { opacity: 1; transform: scale(1.1); }
          30% { opacity: 0.7; transform: scale(1.05); }
          45% { opacity: 0.95; transform: scale(1.02); }
          60% { opacity: 0.8; transform: scale(1.04); }
          75% { opacity: 0.9; transform: scale(1.01); }
          90% { opacity: 0.5; transform: scale(1.02); }
          100% { opacity: 0; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }
  }
}

// Initialize both systems
const letterExplosion = new LetterExplosion();
const backgroundEffects = new BackgroundEffects();

// All systems initialized and ready!

// Keep the original movie variables for reference
const movieOne = "The VVitch";
const movieTwo = "Hell Watcher";
const movieThree = "Dog Man";
const movieFour = "Dog Man II";
