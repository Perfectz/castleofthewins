export class SoundBoard {
  constructor(settings) {
    this.settings = settings;
    this.ctx = null;
    this.music = null;
    this.musicTrack = "";
  }

  updateSettings(settings) {
    this.settings = settings;
    if (!this.settings.musicEnabled) {
      this.stopMusic();
    }
  }

  ensureMusicElement() {
    if (typeof window === "undefined" || typeof window.Audio === "undefined") {
      return null;
    }
    if (!this.music) {
      this.music = new window.Audio();
      this.music.loop = true;
      this.music.preload = "metadata";
      this.music.volume = 0.55;
      this.music.setAttribute("playsinline", "");
    }
    return this.music;
  }

  isMusicPlaying() {
    return Boolean(this.music && !this.music.paused && !this.music.ended);
  }

  syncMusic(track = "") {
    const wasPlaying = this.isMusicPlaying();
    this.musicTrack = track || "";
    if (!this.musicTrack || !this.settings.musicEnabled) {
      this.stopMusic();
      return;
    }
    const music = this.ensureMusicElement();
    if (!music) {
      return;
    }
    if (music.dataset.track !== this.musicTrack) {
      music.dataset.track = this.musicTrack;
      music.src = this.musicTrack;
      music.currentTime = 0;
      if (wasPlaying) {
        this.resumeMusic();
      }
    }
  }

  resumeMusic() {
    if (!this.settings.musicEnabled || !this.musicTrack) {
      return;
    }
    const music = this.ensureMusicElement();
    if (!music) {
      return;
    }
    if (music.dataset.track !== this.musicTrack) {
      music.dataset.track = this.musicTrack;
      music.src = this.musicTrack;
      music.currentTime = 0;
    }
    const playPromise = music.play?.();
    if (playPromise && typeof playPromise.catch === "function") {
      playPromise.catch(() => {
        // Ignore autoplay rejections until the next user gesture.
      });
    }
  }

  stopMusic() {
    if (!this.music) {
      return;
    }
    this.music.pause();
    this.music.currentTime = 0;
  }

  play(type) {
    if (!this.settings.soundEnabled) {
      return;
    }
    const freqMap = { hit: 180, good: 520, bad: 150, cast: 420, move: 240, trap: 120, stairs: 310, ui: 360, search: 210, searchGood: 480 };
    const durationMap = { hit: 0.04, good: 0.08, bad: 0.09, cast: 0.11, move: 0.03, trap: 0.12, stairs: 0.08, ui: 0.05, search: 0.05, searchGood: 0.07 };
    const frequency = freqMap[type] || 300;
    const duration = durationMap[type] || 0.05;
    try {
      if (typeof window === "undefined" || (!window.AudioContext && !window.webkitAudioContext)) {
        return;
      }
      this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "square";
      osc.frequency.value = frequency;
      gain.gain.value = 0.015;
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Ignore audio init failures on unsupported browsers.
    }
  }
}
