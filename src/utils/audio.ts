// Web Audio API Sound Synthesizer for Quizlet MCQ Master

class SoundEngine {
  private ctx: AudioContext | null = null;

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
    return this.ctx;
  }

  public isEnabled(): boolean {
    return localStorage.getItem('mcq_sound_enabled') !== 'false';
  }

  public setEnabled(enabled: boolean): void {
    localStorage.setItem('mcq_sound_enabled', enabled ? 'true' : 'false');
  }

  // Play a crisp, pleasant victory chime for correct answer
  public playCorrect(): void {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Note frequencies: C5 (523.25Hz), E5 (659.25Hz), G5 (783.99Hz), C6 (1046.50Hz)
      const notes = [523.25, 659.25, 783.99, 1046.50];

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, now + idx * 0.07);

        gain.gain.setValueAtTime(0, now + idx * 0.07);
        gain.gain.linearRampToValueAtTime(0.25, now + idx * 0.07 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.35);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.07);
        osc.stop(now + idx * 0.07 + 0.36);
      });
    } catch {
      // Ignore audio context errors
    }
  }

  // Play a gentle low buzz for wrong answer
  public playWrong(): void {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      // Two descending tones: Eb3 (155.56Hz) -> C3 (130.81Hz)
      const freqs = [185.00, 130.81];

      freqs.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now + idx * 0.12);

        gain.gain.setValueAtTime(0, now + idx * 0.12);
        gain.gain.linearRampToValueAtTime(0.18, now + idx * 0.12 + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.12);
        osc.stop(now + idx * 0.12 + 0.29);
      });
    } catch {
      // Ignore audio errors
    }
  }

  // Play a subtle card flip sound
  public playFlip(): void {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.08);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.09);
    } catch {
      // Ignore audio errors
    }
  }

  // Play a soft tap/click sound
  public playClick(): void {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.045);
    } catch {
      // Ignore audio errors
    }
  }

  // Play a celebratory finish fanfare
  public playFinish(): void {
    if (!this.isEnabled()) return;
    try {
      const ctx = this.getContext();
      if (!ctx) return;

      const now = ctx.currentTime;
      const notes = [523.25, 659.25, 783.99, 1046.50, 1318.51]; // C5, E5, G5, C6, E6

      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now + idx * 0.09);

        gain.gain.setValueAtTime(0, now + idx * 0.09);
        gain.gain.linearRampToValueAtTime(0.28, now + idx * 0.09 + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.09 + 0.5);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(now + idx * 0.09);
        osc.stop(now + idx * 0.09 + 0.51);
      });
    } catch {
      // Ignore audio errors
    }
  }
}

export const sound = new SoundEngine();
