// Zero-dependency procedural sound engine — Web Audio API only.

export type SoundName =
  | 'keyClick'
  | 'lockInEngage'
  | 'palantirSpin'
  | 'teletypeTick'
  | 'sonarPing'
  | 'jevMatrixLock'
  | 'deficitAlert'
  | 'counterfactualBoost'
  | 'dossierStamp';

export const SOUND_LABELS: Record<SoundName, string> = {
  keyClick: 'KEY_CLICK',
  lockInEngage: 'LOCK_IN_ENGAGE',
  palantirSpin: 'PALANTIR_SPIN',
  teletypeTick: 'TELETYPE_TICK',
  sonarPing: 'SONAR_PING',
  jevMatrixLock: 'JEV_MATRIX_LOCK',
  deficitAlert: 'DEFICIT_ALERT',
  counterfactualBoost: 'COUNTERFACTUAL_BOOST',
  dossierStamp: 'DOSSIER_STAMP',
};

type Ctx = AudioContext;

export class TacticalSoundEngine {
  private ctx: Ctx | null = null;
  private master: GainNode | null = null;
  private muted = false;
  private listeners: ((muted: boolean) => void)[] = [];

  private ensure(): Ctx | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AC =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
    return this.ctx;
  }

  setMuted(muted: boolean) {
    this.muted = muted;
    this.listeners.forEach((l) => l(muted));
  }

  isMuted() {
    return this.muted;
  }

  onMuteChange(fn: (muted: boolean) => void) {
    this.listeners.push(fn);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== fn);
    };
  }

  private tone(
    freq: number,
    opts: {
      type?: OscillatorType;
      dur?: number;
      gain?: number;
      delay?: number;
      slideTo?: number;
      sweep?: 'up' | 'down';
    } = {}
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { type = 'sine', dur = 0.12, gain = 0.2, delay = 0, slideTo, sweep } = opts;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
    void sweep;
  }

  private noise(
    dur: number,
    opts: { gain?: number; delay?: number; filterFreq?: number; q?: number } = {}
  ) {
    const ctx = this.ensure();
    if (!ctx || !this.master) return;
    const { gain = 0.15, delay = 0, filterFreq = 1800, q = 1 } = opts;
    const t0 = ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(ctx.sampleRate * dur));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = filterFreq;
    bp.Q.value = q;
    const g = ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(bp);
    bp.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  // 1 — crisp mechanical switch transient
  playKeyClick() {
    if (this.muted) return;
    this.noise(0.035, { gain: 0.12, filterFreq: 800 + Math.random() * 1600, q: 6 });
    this.tone(800 + Math.random() * 1600, { type: 'square', dur: 0.03, gain: 0.05 });
  }

  // 2 — sub-bass biometric thud + rising turbine sweep
  playLockInEngage() {
    if (this.muted) return;
    this.tone(48, { type: 'sine', dur: 0.5, gain: 0.5, slideTo: 30 });
    this.noise(0.25, { gain: 0.1, filterFreq: 240, q: 1 });
    this.tone(110, { type: 'sawtooth', dur: 1.1, gain: 0.1, slideTo: 560, delay: 0.15 });
    this.tone(220, { type: 'triangle', dur: 0.9, gain: 0.06, slideTo: 880, delay: 0.3 });
  }

  // 3 — ethereal resonant harmonic shimmer
  playPalantirSpin() {
    if (this.muted) return;
    [523.25, 784, 1046.5, 1568].forEach((f, i) =>
      this.tone(f, { type: 'sine', dur: 0.9, gain: 0.06, delay: i * 0.09 })
    );
    this.tone(196, { type: 'sine', dur: 1.4, gain: 0.05, slideTo: 392 });
  }

  // 4 — high-speed encrypted briefing character tick
  playTeletypeTick() {
    if (this.muted) return;
    this.noise(0.02, { gain: 0.06, filterFreq: 3200, q: 9 });
  }

  // 5 — tactical submarine ping, 1850Hz exponential decay
  playSonarPing() {
    if (this.muted) return;
    this.tone(1850, { type: 'sine', dur: 0.7, gain: 0.22 });
    this.tone(1850, { type: 'sine', dur: 0.5, gain: 0.08, delay: 0.06 });
  }

  // 6 — crisp 3-note futuristic chord (Jev matrix completion)
  playJevMatrixLock() {
    if (this.muted) return;
    this.tone(392, { type: 'triangle', dur: 0.16, gain: 0.16 });
    this.tone(587.33, { type: 'triangle', dur: 0.16, gain: 0.16, delay: 0.07 });
    this.tone(880, { type: 'triangle', dur: 0.28, gain: 0.18, delay: 0.14 });
    this.noise(0.08, { gain: 0.05, filterFreq: 5200, q: 4, delay: 0.14 });
  }

  // 7 — subtle tactical double-beep (portfolio vulnerability flag)
  playDeficitAlert() {
    if (this.muted) return;
    this.tone(660, { type: 'square', dur: 0.09, gain: 0.09 });
    this.tone(520, { type: 'square', dur: 0.12, gain: 0.09, delay: 0.14 });
  }

  // 8 — ascending power-up arpeggio (counterfactual boost)
  playCounterfactualBoost() {
    if (this.muted) return;
    [392, 523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
      this.tone(f, { type: 'square', dur: 0.12, gain: 0.1, delay: i * 0.055 })
    );
  }

  // 9 — heavy metallic seal latch (dossier finished)
  playDossierStamp() {
    if (this.muted) return;
    this.tone(70, { type: 'sine', dur: 0.3, gain: 0.5 });
    this.noise(0.12, { gain: 0.22, filterFreq: 900, q: 2 });
    this.tone(148, { type: 'sawtooth', dur: 0.18, gain: 0.14, delay: 0.05 });
    this.tone(196, { type: 'sine', dur: 0.5, gain: 0.1, delay: 0.1 });
  }
}

export const soundEngine = new TacticalSoundEngine();
