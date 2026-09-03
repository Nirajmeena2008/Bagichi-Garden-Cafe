// Kitchen and Reservation Sound Notification Engine
// Generates clear, high-contrast, attention-grabbing restaurant chimes via the Web Audio API
// and supports custom audio overrides.

class SoundAlertManager {
  private audioCtx: AudioContext | null = null;
  private isMuted: boolean = false;
  private volume: number = 0.9;
  private customSoundUrl: string | null = null;

  constructor() {
    // Check localStorage for saved settings
    if (typeof window !== 'undefined') {
      const savedMute = localStorage.getItem('bagichi_sound_muted');
      const savedVol = localStorage.getItem('bagichi_sound_volume');
      const savedUrl = localStorage.getItem('bagichi_custom_sound_url');
      if (savedMute) this.isMuted = savedMute === 'true';
      if (savedVol) this.volume = parseFloat(savedVol);
      if (savedUrl) this.customSoundUrl = savedUrl;

      // Unlock AudioContext on first user interaction
      const unlockAudio = () => {
        this.initAudioContext();
        window.removeEventListener('click', unlockAudio);
        window.removeEventListener('keydown', unlockAudio);
        window.removeEventListener('touchstart', unlockAudio);
      };
      window.addEventListener('click', unlockAudio, { once: true });
      window.addEventListener('keydown', unlockAudio, { once: true });
      window.addEventListener('touchstart', unlockAudio, { once: true });
    }
  }

  private initAudioContext(): AudioContext | null {
    if (!this.audioCtx && typeof window !== 'undefined') {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    localStorage.setItem('bagichi_sound_muted', String(muted));
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    localStorage.setItem('bagichi_sound_volume', String(this.volume));
  }

  public getVolume(): number {
    return this.volume;
  }

  public setCustomSoundUrl(url: string | null) {
    this.customSoundUrl = url;
    if (url) {
      localStorage.setItem('bagichi_custom_sound_url', url);
    } else {
      localStorage.removeItem('bagichi_custom_sound_url');
    }
  }

  public getCustomSoundUrl(): string | null {
    return this.customSoundUrl;
  }

  /**
   * Play the high-priority Incoming Order Bell (Loud Dual-Tone Kitchen Bell / Zomato POS Chime)
   * Plays a distinct 3-burst repeating chime designed to cut through noisy kitchen background noise.
   */
  public playOrderAlert() {
    if (this.isMuted) return;

    // If a custom sound URL has been provided and is valid, play that audio
    if (this.customSoundUrl) {
      try {
        const customAudio = new Audio(this.customSoundUrl);
        customAudio.volume = this.volume;
        customAudio.play().catch(err => {
          console.warn('Custom audio playback failed, falling back to synthesized chime:', err);
          this.synthesizeOrderBell();
        });
        return;
      } catch (err) {
        console.warn('Custom audio load error, fallback:', err);
      }
    }

    this.synthesizeOrderBell();
  }

  /**
   * Play the Table Reservation Notification Chime (Harmonic Welcome Ding)
   */
  public playReservationAlert() {
    if (this.isMuted) return;

    const ctx = this.initAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(this.volume * 0.7, now);
    gainNode.connect(ctx.destination);

    // Warm ascending arpeggio (C5 -> E5 -> G5 -> C6)
    const notes = [523.25, 659.25, 783.99, 1046.50];
    notes.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const noteGain = ctx.createGain();
      const startTime = now + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      noteGain.gain.setValueAtTime(0, startTime);
      noteGain.gain.linearRampToValueAtTime(0.5, startTime + 0.02);
      noteGain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

      osc.connect(noteGain);
      noteGain.connect(gainNode);

      osc.start(startTime);
      osc.stop(startTime + 0.6);
    });
  }

  /**
   * Authentic Kitchen Order Bell Sound
   * Dual striking chime: High resonant chime with acoustic harmonic overtones.
   */
  private synthesizeOrderBell() {
    const ctx = this.initAudioContext();
    if (!ctx) return;

    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(this.volume, ctx.currentTime);
    masterGain.connect(ctx.destination);

    const playStrike = (delay: number, baseFreq: number) => {
      const strikeTime = ctx.currentTime + delay;

      // Fundamental tone
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(baseFreq, strikeTime);
      gain1.gain.setValueAtTime(0, strikeTime);
      gain1.gain.linearRampToValueAtTime(0.6, strikeTime + 0.01);
      gain1.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.7);
      osc1.connect(gain1);
      gain1.connect(masterGain);
      osc1.start(strikeTime);
      osc1.stop(strikeTime + 0.75);

      // Upper harmonic for metallic bell strike
      const osc2 = ctx.createOscillator();
      const gain2 = ctx.createGain();
      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(baseFreq * 2.76, strikeTime);
      gain2.gain.setValueAtTime(0, strikeTime);
      gain2.gain.linearRampToValueAtTime(0.3, strikeTime + 0.008);
      gain2.gain.exponentialRampToValueAtTime(0.001, strikeTime + 0.35);
      osc2.connect(gain2);
      gain2.connect(masterGain);
      osc2.start(strikeTime);
      osc2.stop(strikeTime + 0.4);
    };

    // 3 distinct alerting rings: Ding-Dong-Ding
    playStrike(0.0, 987.77);  // B5
    playStrike(0.2, 1318.51); // E6
    playStrike(0.45, 1567.98); // G6
    playStrike(0.75, 1318.51); // E6
  }
}

export const soundManager = new SoundAlertManager();
