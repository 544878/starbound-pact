import { describe, it, expect, beforeEach, vi } from 'vitest';
import { noteToFreq, TRACK_REGISTRY, HOME_TRACK, BATTLE_TRACK } from './musicTracks';
import { audioEngine } from './audioEngine';

describe('Music Tracks & Note Calculation', () => {
  it('converts standard pitch notation to correct frequencies', () => {
    // A4 is 440 Hz
    expect(Math.round(noteToFreq('A4'))).toBe(440);
    // A3 is 220 Hz
    expect(Math.round(noteToFreq('A3'))).toBe(220);
    // C4 (Middle C) is approx 261.63 Hz
    expect(Math.round(noteToFreq('C4'))).toBe(262);
    // F#4
    expect(Math.round(noteToFreq('F#4'))).toBe(370);
  });

  it('converts MIDI note numbers to frequencies', () => {
    expect(Math.round(noteToFreq(69))).toBe(440); // A4
    expect(Math.round(noteToFreq(60))).toBe(262); // C4
    expect(noteToFreq(0)).toBe(0);
    expect(noteToFreq(-1)).toBe(0);
  });

  it('handles invalid note strings gracefully', () => {
    expect(noteToFreq('invalid')).toBe(0);
    expect(noteToFreq('')).toBe(0);
  });

  it('verifies Home Screen track structure (星海静谧)', () => {
    expect(HOME_TRACK.id).toBe('home');
    expect(HOME_TRACK.title).toBe('星海静谧');
    expect(HOME_TRACK.bpm).toBe(72);
    expect(HOME_TRACK.pads.length).toBeGreaterThan(0);
    expect(HOME_TRACK.arpeggios.length).toBeGreaterThan(0);
    expect(HOME_TRACK.melody.length).toBeGreaterThan(0);
    expect(HOME_TRACK.bassline.length).toBeGreaterThan(0);
  });

  it('verifies Battle Screen track structure (星阵破晓 · 英雄交响)', () => {
    expect(BATTLE_TRACK.id).toBe('battle');
    expect(BATTLE_TRACK.title).toBe('星阵破晓 · 英雄交响');
    expect(BATTLE_TRACK.bpm).toBe(120);
    expect(BATTLE_TRACK.drums).toBeDefined();
    expect(BATTLE_TRACK.drums!.length).toBeGreaterThan(0);
    expect(BATTLE_TRACK.bassline.length).toBeGreaterThan(0);
    expect(BATTLE_TRACK.arpeggios.length).toBeGreaterThan(0);
    expect(BATTLE_TRACK.melody.length).toBeGreaterThan(0);
  });

  it('verifies track registry contains both tracks', () => {
    expect(TRACK_REGISTRY['home']).toBe(HOME_TRACK);
    expect(TRACK_REGISTRY['battle']).toBe(BATTLE_TRACK);
  });
});

describe('AudioEngine Settings & Controls', () => {
  beforeEach(() => {
    // Reset or ensure known baseline
    audioEngine.setMusicVolume(0.75);
    audioEngine.setSfxVolume(0.8);
  });

  it('toggles music enabled state', () => {
    const initial = audioEngine.getSettings().musicEnabled;
    const toggled = audioEngine.toggleMusic();
    expect(toggled).toBe(!initial);
    expect(audioEngine.getSettings().musicEnabled).toBe(!initial);
    // toggle back
    audioEngine.toggleMusic();
    expect(audioEngine.getSettings().musicEnabled).toBe(initial);
  });

  it('clamps volume levels between 0 and 1', () => {
    audioEngine.setMusicVolume(1.5);
    expect(audioEngine.getSettings().musicVolume).toBe(1);

    audioEngine.setMusicVolume(-0.2);
    expect(audioEngine.getSettings().musicVolume).toBe(0);

    audioEngine.setMusicVolume(0.65);
    expect(audioEngine.getSettings().musicVolume).toBe(0.65);
  });

  it('tracks current playing track id', () => {
    audioEngine.playTrack('home');
    expect(audioEngine.getCurrentTrackId()).toBe('home');

    audioEngine.playTrack('battle');
    expect(audioEngine.getCurrentTrackId()).toBe('battle');
    expect(audioEngine.getCurrentTrack()?.title).toBe('星阵破晓 · 英雄交响');
  });

  it('guarantees complete silence and respects disabled state', () => {
    audioEngine.setMusicEnabled(false);
    expect(audioEngine.getSettings().musicEnabled).toBe(false);

    audioEngine.playTrack('battle');
    expect(audioEngine.getCurrentTrackId()).toBe('battle');
    expect(audioEngine.getSettings().musicEnabled).toBe(false);

    audioEngine.setMusicEnabled(true);
    expect(audioEngine.getSettings().musicEnabled).toBe(true);
  });

  it('notifies subscribers on setting changes', () => {
    const listener = vi.fn();
    const unsubscribe = audioEngine.subscribe(listener);

    audioEngine.setMusicVolume(0.4);
    expect(listener).toHaveBeenCalled();

    unsubscribe();
    listener.mockReset();
    audioEngine.setMusicVolume(0.5);
    expect(listener).not.toHaveBeenCalled();
  });
});
