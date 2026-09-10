/**
 * Starbound Pact - Audio Engine & Sound Manager
 * 
 * Manages Web Audio Context lifecycle, autoplay unlocking, master/music/sfx buses,
 * instantaneous zero-leak muting with physical cable disconnection, Vite HMR cleanup,
 * track transitions (cross-fade), SFX synthesis, and local storage persistence.
 */

import { MusicSynthesizer } from './musicSynthesizer';
import { TRACK_REGISTRY, type TrackId, type MusicTrackConfig } from './musicTracks';

export interface AudioSettings {
  musicEnabled: boolean;
  sfxEnabled: boolean;
  musicVolume: number; // 0.0 to 1.0
  sfxVolume: number;   // 0.0 to 1.0
}

export type SfxType = 'hit' | 'heavyHit' | 'heal' | 'skill' | 'ultimate' | 'click' | 'victory';

const STORAGE_KEY = 'starbound_audio_settings_v1';

class AudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;

  private synthesizer: MusicSynthesizer | null = null;
  private currentTrackId: TrackId | null = null;
  private isUnlocked = false;
  private crossfadeTimer: ReturnType<typeof setTimeout> | null = null;

  private settings: AudioSettings = {
    musicEnabled: true,
    sfxEnabled: true,
    musicVolume: 0.75,
    sfxVolume: 0.8,
  };

  private listeners = new Set<() => void>();

  constructor() {
    this.loadSettings();
    this.setupUnlockListeners();
  }

  // ---------------------------------------------------------------------------------------
  // Context & Bus Initialization
  // ---------------------------------------------------------------------------------------

  public getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (!AudioCtx) return null;

        this.ctx = new AudioCtx();

        // Master Gain
        this.masterGain = this.ctx.createGain();
        this.masterGain.gain.value = 1.0;

        // Analyser for real-time visualizer animations
        this.analyser = this.ctx.createAnalyser();
        this.analyser.fftSize = 64;
        this.analyser.smoothingTimeConstant = 0.8;

        this.masterGain.connect(this.analyser);
        this.analyser.connect(this.ctx.destination);

        // Music Gain
        this.musicGain = this.ctx.createGain();
        if (this.settings.musicEnabled) {
          this.musicGain.gain.value = this.settings.musicVolume;
          this.musicGain.connect(this.masterGain);
        } else {
          this.musicGain.gain.value = 0;
        }

        // SFX Gain
        this.sfxGain = this.ctx.createGain();
        this.sfxGain.gain.value = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
        this.sfxGain.connect(this.masterGain);

        // Synthesizer
        this.synthesizer = new MusicSynthesizer(this.ctx, this.musicGain);
        if (!this.settings.musicEnabled) {
          this.synthesizer.disconnectFromDestination();
        }
      } catch {
        return null;
      }
    }
    return this.ctx;
  }

  private setupUnlockListeners() {
    if (typeof window === 'undefined') return;

    const unlock = () => {
      void this.unlockAudio();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('click', unlock);
    };

    window.addEventListener('pointerdown', unlock, { passive: true, once: true });
    window.addEventListener('keydown', unlock, { passive: true, once: true });
    window.addEventListener('click', unlock, { passive: true, once: true });
  }

  public async unlockAudio(): Promise<boolean> {
    const ctx = this.getAudioContext();
    if (!ctx) return false;

    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch {
        return false;
      }
    }
    this.isUnlocked = true;

    // Resume playing current track ONLY if music is explicitly enabled
    if (this.settings.musicEnabled && this.currentTrackId && this.synthesizer) {
      const track = TRACK_REGISTRY[this.currentTrackId];
      if (track) {
        this.synthesizer.setTrack(track);
        this.synthesizer.start();
      }
    }
    this.notify();
    return true;
  }

  // ---------------------------------------------------------------------------------------
  // Music Playback & Track Management
  // ---------------------------------------------------------------------------------------

  public playTrack(trackId: TrackId, crossfadeSec = 0.5) {
    this.currentTrackId = trackId;
    const trackConfig = TRACK_REGISTRY[trackId];
    if (!trackConfig) return;

    if (this.crossfadeTimer !== null) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    const ctx = this.getAudioContext();
    if (!ctx || !this.synthesizer || !this.musicGain) {
      this.notify();
      return;
    }

    // If music is turned off by user, configure track but do NOT play sound or connect
    if (!this.settings.musicEnabled) {
      this.synthesizer.stop();
      this.synthesizer.setTrack(trackConfig);
      try {
        this.musicGain.disconnect();
        this.musicGain.gain.cancelScheduledValues(0);
        this.musicGain.gain.setValueAtTime(0, ctx.currentTime);
        this.musicGain.gain.value = 0;
      } catch {}
      this.notify();
      return;
    }

    // Ensure musicGain is connected
    if (this.masterGain) {
      try {
        this.musicGain.connect(this.masterGain);
      } catch {}
    }

    // If changing track while running, do smooth cross-fade
    const now = ctx.currentTime;
    try {
      this.musicGain.gain.cancelScheduledValues(now);
      this.musicGain.gain.setValueAtTime(this.musicGain.gain.value, now);
      this.musicGain.gain.linearRampToValueAtTime(0.0001, now + crossfadeSec * 0.4);
    } catch {}

    this.crossfadeTimer = setTimeout(() => {
      this.crossfadeTimer = null;
      if (!this.synthesizer || !this.ctx || !this.musicGain) return;

      this.synthesizer.stop();
      this.synthesizer.setTrack(trackConfig);
      this.synthesizer.setPhase2(false);

      if (this.settings.musicEnabled) {
        this.synthesizer.start();
        const resumeTime = this.ctx.currentTime;
        try {
          this.musicGain.gain.cancelScheduledValues(resumeTime);
          this.musicGain.gain.setValueAtTime(0.0001, resumeTime);
          this.musicGain.gain.linearRampToValueAtTime(this.settings.musicVolume, resumeTime + crossfadeSec * 0.6);
        } catch {}
      } else {
        try {
          this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
          this.musicGain.gain.value = 0;
          this.musicGain.disconnect();
        } catch {}
      }

      this.notify();
    }, crossfadeSec * 400);

    this.notify();
  }

  public getCurrentTrack(): MusicTrackConfig | null {
    if (!this.currentTrackId) return null;
    return TRACK_REGISTRY[this.currentTrackId] ?? null;
  }

  public getCurrentTrackId(): TrackId | null {
    return this.currentTrackId;
  }

  public setBattlePhase2(active: boolean) {
    if (this.synthesizer) {
      this.synthesizer.setPhase2(active);
    }
  }

  // ---------------------------------------------------------------------------------------
  // Settings & Volumes
  // ---------------------------------------------------------------------------------------

  public toggleMusic(): boolean {
    return this.setMusicEnabled(!this.settings.musicEnabled);
  }

  public setMusicEnabled(enabled: boolean): boolean {
    this.settings.musicEnabled = enabled;
    this.saveSettings();

    // Clear any pending cross-fade timers immediately
    if (this.crossfadeTimer !== null) {
      clearTimeout(this.crossfadeTimer);
      this.crossfadeTimer = null;
    }

    if (!enabled) {
      // 1. Physically disconnect musicGain and set volume to 0
      if (this.musicGain && this.ctx) {
        const now = this.ctx.currentTime;
        try {
          this.musicGain.gain.cancelScheduledValues(0);
          this.musicGain.gain.setValueAtTime(0, now);
          this.musicGain.gain.value = 0;
          this.musicGain.disconnect();
        } catch {}
      }
      // 2. Immediately stop synthesizer and silence all active oscillators
      this.synthesizer?.stop();
    } else {
      // 1. Reconnect musicGain cable and restore volume
      if (this.musicGain && this.masterGain && this.ctx) {
        try {
          this.musicGain.connect(this.masterGain);
          const now = this.ctx.currentTime;
          this.musicGain.gain.cancelScheduledValues(0);
          this.musicGain.gain.setValueAtTime(this.settings.musicVolume, now);
          this.musicGain.gain.value = this.settings.musicVolume;
        } catch {}
      }
      // 2. Start playback
      void this.unlockAudio().then(() => {
        if (this.settings.musicEnabled && this.currentTrackId && this.synthesizer) {
          const track = TRACK_REGISTRY[this.currentTrackId];
          if (track) {
            this.synthesizer.setTrack(track);
            this.synthesizer.start();
          }
        }
      });
    }

    this.notify();
    return this.settings.musicEnabled;
  }

  public toggleSfx(): boolean {
    this.settings.sfxEnabled = !this.settings.sfxEnabled;
    this.saveSettings();
    this.updateSfxGain();
    this.notify();
    return this.settings.sfxEnabled;
  }

  public setMusicVolume(volume: number) {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.updateMusicGain();
    this.notify();
  }

  public setSfxVolume(volume: number) {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume));
    this.saveSettings();
    this.updateSfxGain();
    this.notify();
  }

  public getSettings(): Readonly<AudioSettings> {
    return { ...this.settings };
  }

  private updateMusicGain() {
    if (!this.musicGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    try {
      this.musicGain.gain.cancelScheduledValues(now);
      if (!this.settings.musicEnabled) {
        this.musicGain.gain.setValueAtTime(0, now);
        this.musicGain.gain.value = 0;
        this.musicGain.disconnect();
      } else {
        if (this.masterGain) this.musicGain.connect(this.masterGain);
        this.musicGain.gain.setValueAtTime(this.settings.musicVolume, now);
        this.musicGain.gain.value = this.settings.musicVolume;
      }
    } catch {}
  }

  private updateSfxGain() {
    if (!this.sfxGain || !this.ctx) return;
    const val = this.settings.sfxEnabled ? this.settings.sfxVolume : 0;
    this.sfxGain.gain.value = val;
  }

  // ---------------------------------------------------------------------------------------
  // SFX Synthesis
  // ---------------------------------------------------------------------------------------

  public playSfx(type: SfxType) {
    if (!this.settings.sfxEnabled) return;
    const ctx = this.getAudioContext();
    if (!ctx || !this.sfxGain) return;

    if (ctx.state === 'suspended') {
      void ctx.resume();
    }

    const now = ctx.currentTime;

    try {
      switch (type) {
        case 'click': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(880, now);
          osc.frequency.exponentialRampToValueAtTime(440, now + 0.04);
          gain.gain.setValueAtTime(0.08, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.06);
          break;
        }

        case 'hit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'triangle';
          osc.frequency.setValueAtTime(320, now);
          osc.frequency.exponentialRampToValueAtTime(90, now + 0.15);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.2);
          break;
        }

        case 'heavyHit': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(160, now);
          osc.frequency.exponentialRampToValueAtTime(42, now + 0.28);
          gain.gain.setValueAtTime(0.24, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'heal': {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(440, now);
          osc.frequency.exponentialRampToValueAtTime(880, now + 0.25);
          gain.gain.setValueAtTime(0.001, now);
          gain.gain.linearRampToValueAtTime(0.15, now + 0.08);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
          osc.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.35);
          break;
        }

        case 'skill': {
          const osc = ctx.createOscillator();
          const filter = ctx.createBiquadFilter();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(523.25, now);
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.frequency.linearRampToValueAtTime(3200, now + 0.1);
          gain.gain.setValueAtTime(0.18, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
          osc.connect(filter);
          filter.connect(gain);
          gain.connect(this.sfxGain);
          osc.start(now);
          osc.stop(now + 0.32);
          break;
        }

        case 'ultimate': {
          [261.63, 329.63, 392.0, 523.25].forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(f, now + idx * 0.03);
            gain.gain.setValueAtTime(0.001, now + idx * 0.03);
            gain.gain.linearRampToValueAtTime(0.16, now + idx * 0.03 + 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(now + idx * 0.03);
            osc.stop(now + 0.65);
          });
          break;
        }

        case 'victory': {
          [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = 'triangle';
            const noteStart = now + idx * 0.12;
            osc.frequency.setValueAtTime(f, noteStart);
            gain.gain.setValueAtTime(0.001, noteStart);
            gain.gain.linearRampToValueAtTime(0.18, noteStart + 0.03);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.45);
            osc.connect(gain);
            gain.connect(this.sfxGain!);
            osc.start(noteStart);
            osc.stop(noteStart + 0.5);
          });
          break;
        }
      }
    } catch {
      // Audio fallback
    }
  }

  // ---------------------------------------------------------------------------------------
  // Equalizer / Visualizer
  // ---------------------------------------------------------------------------------------

  public getVisualizerData(buffer: Uint8Array): void {
    if (this.analyser && this.settings.musicEnabled) {
      this.analyser.getByteFrequencyData(buffer as unknown as Uint8Array<ArrayBuffer>);
    } else {
      buffer.fill(0);
    }
  }

  // ---------------------------------------------------------------------------------------
  // Lifecycle & Destroy (Clean shutdown on HMR)
  // ---------------------------------------------------------------------------------------

  public destroy() {
    this.setMusicEnabled(false);
    this.synthesizer?.stop();
    if (this.ctx) {
      try {
        void this.ctx.close();
      } catch {}
      this.ctx = null;
    }
    this.listeners.clear();
  }

  // ---------------------------------------------------------------------------------------
  // Storage & Subscriptions
  // ---------------------------------------------------------------------------------------

  private loadSettings() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<AudioSettings>;
        if (typeof parsed.musicEnabled === 'boolean') this.settings.musicEnabled = parsed.musicEnabled;
        if (typeof parsed.sfxEnabled === 'boolean') this.settings.sfxEnabled = parsed.sfxEnabled;
        if (typeof parsed.musicVolume === 'number') this.settings.musicVolume = parsed.musicVolume;
        if (typeof parsed.sfxVolume === 'number') this.settings.sfxVolume = parsed.sfxVolume;
      }
    } catch {
      // Ignore storage errors
    }
  }

  private saveSettings() {
    if (typeof window === 'undefined' || typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
    } catch {
      // Ignore storage errors
    }
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notify() {
    this.listeners.forEach((l) => l());
  }
}

// Persist singleton on window across Vite HMR and destroy old audio engines
declare global {
  interface Window {
    __STARBOUND_AUDIO_ENGINE__?: AudioEngine;
  }
}

if (typeof window !== 'undefined' && window.__STARBOUND_AUDIO_ENGINE__) {
  try {
    window.__STARBOUND_AUDIO_ENGINE__.destroy();
  } catch {}
}

export const audioEngine = new AudioEngine();

if (typeof window !== 'undefined') {
  window.__STARBOUND_AUDIO_ENGINE__ = audioEngine;
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    audioEngine.destroy();
  });
}
