// MIDNIGHT VAULT — synthesized sound: every effect is drawn from the Web Audio
// API, so the game ships no audio files and makes no network request.

export class SoundBank {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this.ambientStarted = false;
    this.lastStep = 0;
  }

  // Call from a user gesture (click / keypress) so the browser allows audio.
  // Never throws: in headless or restricted browsers the game plays silent.
  ensure() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
      return;
    }
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.startAmbient();
    } catch (err) {
      this.ctx = null;
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : 0.5;
    return this.muted;
  }

  tone(freq, dur, type = 'sine', gain = 0.2, delay = 0, slideTo = 0) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise(dur, gain = 0.15, delay = 0, lowpass = 1200) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowpass;
    const g = this.ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
  }

  startAmbient() {
    if (this.ambientStarted || !this.ctx) return;
    this.ambientStarted = true;
    const mk = (freq, gain) => {
      const osc = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      g.gain.value = gain;
      osc.connect(g);
      g.connect(this.master);
      osc.start();
    };
    mk(55, 0.05);
    mk(82.4, 0.03);
    mk(110, 0.02);
  }

  footstep() {
    if (!this.ctx || this.muted) return;
    const now = performance.now();
    if (now - this.lastStep < 240) return;
    this.lastStep = now;
    this.noise(0.05, 0.05, 0, 500);
  }

  pickup() {
    this.tone(659, 0.12, 'sine', 0.22);
    this.tone(880, 0.18, 'sine', 0.22, 0.09);
  }

  keycard() {
    this.tone(523, 0.1, 'triangle', 0.2);
    this.tone(784, 0.1, 'triangle', 0.2, 0.08);
    this.tone(1046, 0.16, 'triangle', 0.2, 0.16);
  }

  coin() {
    this.tone(1567, 0.07, 'triangle', 0.18);
    this.tone(2093, 0.1, 'triangle', 0.14, 0.05);
    this.noise(0.04, 0.06, 0, 4000);
  }

  emp() {
    this.tone(1200, 0.35, 'sawtooth', 0.16, 0, 90);
    this.noise(0.25, 0.14, 0, 3000);
  }

  alarmTick() {
    this.tone(980, 0.09, 'square', 0.08);
  }

  caught() {
    this.tone(220, 0.5, 'sawtooth', 0.22, 0, 110);
    this.tone(233, 0.5, 'sawtooth', 0.18, 0, 116);
    this.noise(0.4, 0.12, 0, 800);
  }

  win() {
    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.22, 'triangle', 0.2, i * 0.11));
  }

  click() {
    this.tone(740, 0.06, 'sine', 0.14);
  }
}
