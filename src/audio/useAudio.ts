import { useState, useEffect, useCallback } from 'react';
import { audioEngine, type AudioSettings, type SfxType } from './audioEngine';
import { type TrackId } from './musicTracks';

export function useAudio() {
  const [settings, setSettings] = useState<AudioSettings>(() => audioEngine.getSettings());
  const [currentTrackId, setCurrentTrackId] = useState<TrackId | null>(() => audioEngine.getCurrentTrackId());

  useEffect(() => {
    const unsubscribe = audioEngine.subscribe(() => {
      setSettings(audioEngine.getSettings());
      setCurrentTrackId(audioEngine.getCurrentTrackId());
    });
    return unsubscribe;
  }, []);

  const toggleMusic = useCallback(() => {
    audioEngine.toggleMusic();
  }, []);

  const toggleSfx = useCallback(() => {
    audioEngine.toggleSfx();
  }, []);

  const setMusicVolume = useCallback((val: number) => {
    audioEngine.setMusicVolume(val);
  }, []);

  const setSfxVolume = useCallback((val: number) => {
    audioEngine.setSfxVolume(val);
  }, []);

  const playTrack = useCallback((trackId: TrackId) => {
    audioEngine.playTrack(trackId);
  }, []);

  const playSfx = useCallback((type: SfxType) => {
    audioEngine.playSfx(type);
  }, []);

  const currentTrack = audioEngine.getCurrentTrack();

  return {
    settings,
    currentTrackId,
    currentTrack,
    toggleMusic,
    toggleSfx,
    setMusicVolume,
    setSfxVolume,
    playTrack,
    playSfx,
  };
}
