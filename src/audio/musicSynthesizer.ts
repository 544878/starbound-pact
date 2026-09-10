/**
 * Starbound Pact - Real-time Web Audio Synthesizer
 * 
 * Features:
 * - High-precision Web Audio clock scheduling with lookahead
 * - Active voice tracking with instant, zero-latency cancellation on stop()
 * - Physical node cable disconnection on stop() ensuring absolute 0dB silence
 * - Noble Orchestral Heroic instruments (French Horn, Trumpet, Strings, Timpani, Field Snare)
 * - Ethereal ambient sanctuary instruments (Celesta bells, warm pad, lyrical piano)
 */

import { noteToFreq, type MusicTrackConfig, type NoteEvent } from './musicTracks';

interface ActiveVoice {
  stop: () => void;
  gainNode?: GainNode;
}

export class MusicSynthesizer {
  private ctx: AudioContext;
  private outputNode: GainNode;
  private destinationNode: AudioNode;
  private isConnected = true;
  private track: MusicTrackConfig | null = null;

  // Effects bus
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;
  private delayFilter: BiquadFilterNode | null = null;
  private noiseBuffer: AudioBuffer | null = null;

  // Scheduling state
  private isPlaying = false;
  private isPhase2 = false;
  private timerId: number | null = null;
  private nextStepTime = 0;
  private currentStep = 0;
  private lookaheadMs = 25;
  private scheduleAheadSec = 0.12;

  // Active voice tracking for instantaneous stop
  private activeVoices: ActiveVoice[] = [];

  // Track map for quick step lookup
  private bassStepMap = new Map<number, NoteEvent[]>();
  private arpStepMap = new Map<number, NoteEvent[]>();
  private melodyStepMap = new Map<number, NoteEvent[]>();

  constructor(ctx: AudioContext, destination: AudioNode) {
    this.ctx = ctx;
    this.destinationNode = destination;
    this.outputNode = ctx.createGain();
    this.outputNode.gain.value = 1.0;
    this.outputNode.connect(destination);
    this.isConnected = true;

    this.initEffects();
    this.initNoiseBuffer();
  }

  private initEffects() {
    try {
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayFeedback = this.ctx.createGain();
      this.delayFilter = this.ctx.createBiquadFilter();

      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback.gain.value = 0.25;
      this.delayFilter.type = 'lowpass';
      this.delayFilter.frequency.value = 2800;

      this.delayNode.connect(this.delayFilter);
      this.delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFilter.connect(this.outputNode);
    } catch {
      // Audio fallback
    }
  }

  private initNoiseBuffer() {
    try {
      const bufferSize = Math.floor(this.ctx.sampleRate * 1.5);
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      this.noiseBuffer = buffer;
    } catch {
      this.noiseBuffer = null;
    }
  }

  public disconnectFromDestination() {
    if (this.isConnected) {
      try {
        this.outputNode.disconnect();
      } catch {}
      this.isConnected = false;
    }
  }

  public connectToDestination() {
    if (!this.isConnected) {
      try {
        this.outputNode.connect(this.destinationNode);
      } catch {}
      this.isConnected = true;
    }
  }

  private registerVoice(voice: ActiveVoice) {
    this.activeVoices.push(voice);
  }

  private unregisterVoice(voice: ActiveVoice) {
    const idx = this.activeVoices.indexOf(voice);
    if (idx !== -1) {
      this.activeVoices.splice(idx, 1);
    }
  }

  public setPhase2(active: boolean) {
    this.isPhase2 = active;
  }

  public setTrack(track: MusicTrackConfig) {
    this.track = track;
    this.buildStepMaps();
    if (this.delayNode) {
      const sixteenth = 60 / track.bpm / 4;
      this.delayNode.delayTime.setValueAtTime(sixteenth * 3, this.ctx.currentTime);
    }
  }

  public getTrack(): MusicTrackConfig | null {
    return this.track;
  }

  private buildStepMaps() {
    this.bassStepMap.clear();
    this.arpStepMap.clear();
    this.melodyStepMap.clear();

    if (!this.track) return;

    for (const note of this.track.bassline) {
      const list = this.bassStepMap.get(note.time) ?? [];
      list.push(note);
      this.bassStepMap.set(note.time, list);
    }

    for (const note of this.track.arpeggios) {
      const list = this.arpStepMap.get(note.time) ?? [];
      list.push(note);
      this.arpStepMap.set(note.time, list);
    }

    for (const note of this.track.melody) {
      const list = this.melodyStepMap.get(note.time) ?? [];
      list.push(note);
      this.melodyStepMap.set(note.time, list);
    }
  }

  public start(offsetStep = 0) {
    if (this.isPlaying || !this.track) return;

    this.isPlaying = true;
    this.currentStep = offsetStep;
    this.nextStepTime = this.ctx.currentTime + 0.05;

    // Physically reconnect cable to destination
    this.connectToDestination();

    // Ensure output gain is at full
    const now = this.ctx.currentTime;
    try {
      this.outputNode.gain.cancelScheduledValues(0);
      this.outputNode.gain.setValueAtTime(1.0, now);
      this.outputNode.gain.value = 1.0;
    } catch {}

    this.scheduler = this.scheduler.bind(this);
    this.timerId = window.setInterval(this.scheduler, this.lookaheadMs);
  }

  /**
   * Immediately silences, disconnects, and terminates all playing oscillators and timers.
   */
  public stop() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }

    // Physically unplug the audio cable from the destination!
    this.disconnectFromDestination();

    const now = this.ctx.currentTime;

    // Immediately cut output gain to absolute zero
    try {
      this.outputNode.gain.cancelScheduledValues(0);
      this.outputNode.gain.setValueAtTime(0, now);
      this.outputNode.gain.value = 0;
    } catch {}

    // Stop and disconnect every active oscillator/voice immediately
    for (const voice of this.activeVoices) {
      try {
        if (voice.gainNode) {
          voice.gainNode.gain.cancelScheduledValues(0);
          voice.gainNode.gain.setValueAtTime(0, now);
          voice.gainNode.gain.value = 0;
          voice.gainNode.disconnect();
        }
        voice.stop();
      } catch {
        // Voice might already be stopped
      }
    }
    this.activeVoices = [];
  }

  private scheduler() {
    if (!this.isPlaying || !this.track) return;

    const stepDuration = 60 / this.track.bpm / 4;
    const totalSteps = this.track.totalBars * this.track.stepsPerBar;

    while (this.nextStepTime < this.ctx.currentTime + this.scheduleAheadSec) {
      this.scheduleStep(this.currentStep, this.nextStepTime, stepDuration);
      this.nextStepTime += stepDuration;
      this.currentStep = (this.currentStep + 1) % totalSteps;
    }
  }

  private scheduleStep(step: number, time: number, stepDuration: number) {
    if (!this.track || !this.isPlaying) return;

    const bar = Math.floor(step / this.track.stepsPerBar);
    const stepInBar = step % this.track.stepsPerBar;

    // 1. Strings / Orchestral Pad at start of bar
    if (stepInBar === 0) {
      const padConfig = this.track.pads.find((p) => p.bar === bar);
      if (padConfig) {
        const chordDuration = padConfig.durationBars * this.track.stepsPerBar * stepDuration;
        this.playPadChord(padConfig.notes, time, chordDuration);
      }
    }

    // 2. Bassline / Contrabass
    const bassNotes = this.bassStepMap.get(step);
    if (bassNotes) {
      for (const note of bassNotes) {
        const freq = typeof note.pitch === 'number' ? note.pitch : noteToFreq(note.pitch);
        const durationSec = note.duration * stepDuration;
        this.playBass(freq, time, durationSec, note.velocity ?? 0.7);
      }
    }

    // 3. Starlight Chimes / Bell Arpeggios
    const arpNotes = this.arpStepMap.get(step);
    if (arpNotes) {
      for (const note of arpNotes) {
        const freq = typeof note.pitch === 'number' ? note.pitch : noteToFreq(note.pitch);
        const durationSec = note.duration * stepDuration;
        this.playBell(freq, time, durationSec, note.velocity ?? 0.4);
      }
    }

    // 4. Melody (Heroic French Horn/Trumpet for battle, Piano for home)
    const melNotes = this.melodyStepMap.get(step);
    if (melNotes) {
      for (const note of melNotes) {
        const freq = typeof note.pitch === 'number' ? note.pitch : noteToFreq(note.pitch);
        const durationSec = note.duration * stepDuration;
        if (this.track.id === 'battle') {
          this.playHeroicLead(freq, time, durationSec, note.velocity ?? 0.85);
        } else {
          this.playHomePianoLead(freq, time, durationSec, note.velocity ?? 0.6);
        }
      }
    }

    // 5. Orchestral Percussion (Timpani & Field Snare for battle)
    if (this.track.drums) {
      const barDrums = this.track.drums.find((d) => d.bar === bar);
      if (barDrums && barDrums.pattern[stepInBar]) {
        const drumStep = barDrums.pattern[stepInBar];
        if (drumStep.kick) this.playTimpani(time);
        if (drumStep.snare) this.playFieldSnare(time);
        if (drumStep.hihat) this.playHiHat(time, false);
        if (drumStep.openHat) this.playHiHat(time, true);
        if (drumStep.crash) this.playCrash(time);
      }
    }
  }

  // ---------------------------------------------------------------------------------------
  // NOBLE ORCHESTRAL & AMBIENT INSTRUMENTS
  // ---------------------------------------------------------------------------------------

  /**
   * Heroic Brass / French Horn & Trumpet Lead
   */
  private playHeroicLead(freq: number, time: number, duration: number, velocity = 0.85) {
    if (freq <= 0 || time < this.ctx.currentTime || !this.isPlaying) return;

    const osc1 = this.ctx.createOscillator();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    const osc2 = this.ctx.createOscillator();
    osc2.type = 'sawtooth';
    osc2.frequency.setValueAtTime(freq, time);
    osc2.detune.setValueAtTime(4, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    const cutoff = this.isPhase2 ? 2400 : 1800;
    filter.frequency.setValueAtTime(800, time);
    filter.frequency.linearRampToValueAtTime(cutoff, time + 0.08);
    filter.frequency.exponentialRampToValueAtTime(cutoff * 0.75, time + duration);
    filter.Q.value = 1.6;

    let vibrato: OscillatorNode | null = null;
    if (duration > 0.35) {
      vibrato = this.ctx.createOscillator();
      const vibGain = this.ctx.createGain();
      vibrato.frequency.value = 5.2;
      vibGain.gain.setValueAtTime(0, time);
      vibGain.gain.setValueAtTime(0, time + 0.15);
      vibGain.gain.linearRampToValueAtTime(8, time + 0.45);

      vibrato.connect(vibGain);
      vibGain.connect(osc1.frequency);
      vibGain.connect(osc2.frequency);

      vibrato.start(time);
      vibrato.stop(time + duration);
    }

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.26, time + 0.04);
    gain.gain.setValueAtTime(velocity * 0.22, time + duration - 0.05);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc1.connect(filter);
    osc2.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    if (this.delayNode) {
      const send = this.ctx.createGain();
      send.gain.value = 0.2;
      gain.connect(send);
      send.connect(this.delayNode);
    }

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try {
          osc1.stop();
          osc2.stop();
          vibrato?.stop();
        } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    osc1.onended = () => this.unregisterVoice(voiceEntry);

    osc1.start(time);
    osc2.start(time);
    osc1.stop(time + duration);
    osc2.stop(time + duration);
  }

  /**
   * Warm String Section & French Horn Pad
   */
  private playPadChord(notes: string[], time: number, duration: number) {
    if (time < this.ctx.currentTime || !this.isPlaying) return;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(this.isPhase2 ? 1000 : 720, time);
    filter.Q.value = 1.0;

    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.0001, time);
    const attack = Math.min(0.6, duration * 0.2);
    masterGain.gain.linearRampToValueAtTime(0.14, time + attack);
    masterGain.gain.setValueAtTime(0.14, time + duration - 0.4);
    masterGain.gain.linearRampToValueAtTime(0.0001, time + duration);

    filter.connect(masterGain);
    masterGain.connect(this.outputNode);

    if (this.delayNode) {
      const delaySend = this.ctx.createGain();
      delaySend.gain.value = 0.2;
      masterGain.connect(delaySend);
      delaySend.connect(this.delayNode);
    }

    const oscillators: OscillatorNode[] = [];

    for (const noteName of notes) {
      const freq = noteToFreq(noteName);
      if (freq <= 0) continue;

      const osc1 = this.ctx.createOscillator();
      osc1.type = 'triangle';
      osc1.frequency.value = freq;
      osc1.detune.value = -4;

      const osc2 = this.ctx.createOscillator();
      osc2.type = 'sawtooth';
      osc2.frequency.value = freq;
      osc2.detune.value = 5;

      osc1.connect(filter);
      osc2.connect(filter);

      oscillators.push(osc1, osc2);

      osc1.start(time);
      osc2.start(time);
      osc1.stop(time + duration);
      osc2.stop(time + duration);
    }

    const voiceEntry: ActiveVoice = {
      stop: () => {
        for (const osc of oscillators) {
          try { osc.stop(); } catch {}
        }
      },
      gainNode: masterGain,
    };
    this.registerVoice(voiceEntry);

    if (oscillators[0]) {
      oscillators[0].onended = () => this.unregisterVoice(voiceEntry);
    }
  }

  /**
   * Starlight Celesta / Orchestral Chimes
   */
  private playBell(freq: number, time: number, _duration: number, velocity = 0.4) {
    if (freq <= 0 || time < this.ctx.currentTime || !this.isPlaying) return;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.15, time + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.1);

    const osc = this.ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, time);

    osc.connect(gain);
    gain.connect(this.outputNode);

    if (this.delayNode) {
      const send = this.ctx.createGain();
      send.gain.value = 0.3;
      gain.connect(send);
      send.connect(this.delayNode);
    }

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { osc.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    osc.onended = () => this.unregisterVoice(voiceEntry);

    osc.start(time);
    osc.stop(time + 1.15);
  }

  /**
   * Home Screen Lyrical Piano Lead
   */
  private playHomePianoLead(freq: number, time: number, duration: number, velocity = 0.6) {
    if (freq <= 0 || time < this.ctx.currentTime || !this.isPlaying) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(2000, time);
    filter.frequency.exponentialRampToValueAtTime(750, time + duration);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.2, time + 0.02);
    gain.gain.setValueAtTime(velocity * 0.16, time + duration * 0.7);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration + 0.2);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    if (this.delayNode) {
      const send = this.ctx.createGain();
      send.gain.value = 0.25;
      gain.connect(send);
      send.connect(this.delayNode);
    }

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { osc.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    osc.onended = () => this.unregisterVoice(voiceEntry);

    osc.start(time);
    osc.stop(time + duration + 0.25);
  }

  /**
   * Noble Orchestral Contrabass / Cello Pizzicato & March
   */
  private playBass(freq: number, time: number, duration: number, velocity = 0.7) {
    if (freq <= 0 || time < this.ctx.currentTime || !this.isPlaying) return;

    const osc = this.ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, time);

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(450, time);
    filter.frequency.exponentialRampToValueAtTime(120, time + Math.min(0.25, duration));
    filter.Q.value = 1.2;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, time);
    gain.gain.linearRampToValueAtTime(velocity * 0.32, time + 0.02);
    gain.gain.setValueAtTime(velocity * 0.24, time + duration * 0.6);
    gain.gain.linearRampToValueAtTime(0.0001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { osc.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    osc.onended = () => this.unregisterVoice(voiceEntry);

    osc.start(time);
    osc.stop(time + duration);
  }

  /**
   * Orchestral Timpani (Pitched resonant deep boom)
   */
  private playTimpani(time: number) {
    if (time < this.ctx.currentTime || !this.isPlaying) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(120, time);
    osc.frequency.exponentialRampToValueAtTime(58, time + 0.12);

    gain.gain.setValueAtTime(0.38, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

    osc.connect(gain);
    gain.connect(this.outputNode);

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { osc.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    osc.onended = () => this.unregisterVoice(voiceEntry);

    osc.start(time);
    osc.stop(time + 0.38);
  }

  /**
   * Noble Field Snare
   */
  private playFieldSnare(time: number) {
    if (time < this.ctx.currentTime || !this.isPlaying) return;

    let noise: AudioBufferSourceNode | null = null;
    if (this.noiseBuffer) {
      noise = this.ctx.createBufferSource();
      noise.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1400, time);
      filter.Q.value = 1.6;

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.24, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.outputNode);

      noise.start(time);
      noise.stop(time + 0.16);
    }

    const osc = this.ctx.createOscillator();
    const toneGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(210, time);
    osc.frequency.exponentialRampToValueAtTime(95, time + 0.06);

    toneGain.gain.setValueAtTime(0.18, time);
    toneGain.gain.exponentialRampToValueAtTime(0.001, time + 0.08);

    osc.connect(toneGain);
    toneGain.connect(this.outputNode);

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try {
          osc.stop();
          noise?.stop();
        } catch {}
      },
      gainNode: toneGain,
    };
    this.registerVoice(voiceEntry);

    osc.onended = () => this.unregisterVoice(voiceEntry);

    osc.start(time);
    osc.stop(time + 0.1);
  }

  /**
   * Crisp Orchestral Hi-Hat
   */
  private playHiHat(time: number, open: boolean) {
    if (time < this.ctx.currentTime || !this.noiseBuffer || !this.isPlaying) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    const duration = open ? 0.2 : 0.04;
    const vol = open ? 0.14 : 0.08;

    gain.gain.setValueAtTime(vol, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { noise.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    noise.onended = () => this.unregisterVoice(voiceEntry);

    noise.start(time);
    noise.stop(time + duration + 0.02);
  }

  /**
   * Triumphant Crash Cymbal
   */
  private playCrash(time: number) {
    if (time < this.ctx.currentTime || !this.noiseBuffer || !this.isPlaying) return;

    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.setValueAtTime(4000, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.2, time);
    gain.gain.exponentialRampToValueAtTime(0.0001, time + 1.4);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.outputNode);

    const voiceEntry: ActiveVoice = {
      stop: () => {
        try { noise.stop(); } catch {}
      },
      gainNode: gain,
    };
    this.registerVoice(voiceEntry);

    noise.onended = () => this.unregisterVoice(voiceEntry);

    noise.start(time);
    noise.stop(time + 1.5);
  }
}
