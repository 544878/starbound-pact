import { useState, useRef, useEffect } from 'react';
import { useAudio } from '../audio/useAudio';
import { audioEngine } from '../audio/audioEngine';

interface MusicPlayerPillProps {
  className?: string;
  compact?: boolean;
}

export function MusicPlayerPill({ className = '', compact = false }: MusicPlayerPillProps) {
  const { settings, currentTrack, toggleMusic, setMusicVolume, setSfxVolume } = useAudio();
  const [showSettings, setShowSettings] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    }
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const isPlaying = settings.musicEnabled && !!currentTrack;

  return (
    <div className={`music-player-pill-container ${className}`} ref={popoverRef}>
      <button
        className={`glass-pill-btn music-pill-btn ${isPlaying ? 'active' : 'muted'}`}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          toggleMusic();
        }}
        onContextMenu={(e) => {
          e.preventDefault();
          setShowSettings((v) => !v);
        }}
        title={isPlaying ? `点击关闭背景音乐 (${currentTrack?.title ?? '专属音乐'})，右键调节音量` : '点击开启背景音乐，右键调节音量'}
        aria-label={isPlaying ? `正在播放：${currentTrack?.title}，点击关闭音乐` : '背景音乐已关闭，点击开启'}
      >
        <div className={`music-eq-waves ${isPlaying ? 'playing' : 'paused'}`} aria-hidden="true">
          <span className="eq-bar bar-1" />
          <span className="eq-bar bar-2" />
          <span className="eq-bar bar-3" />
          <span className="eq-bar bar-4" />
        </div>

        <span className="music-pill-label">
          {isPlaying ? (
            <>
              <span className="music-note-icon">♪</span>
              <span className="music-track-name">{currentTrack?.title ?? '专属音乐'}</span>
            </>
          ) : (
            <>
              <span className="music-note-icon">🔇</span>
              <span>{compact ? '音乐关' : '音乐已关'}</span>
            </>
          )}
        </span>

        <span
          className="music-settings-trigger"
          onClick={(e) => {
            e.stopPropagation();
            setShowSettings((v) => !v);
          }}
          title="调整音量"
          role="button"
          tabIndex={0}
        >
          ⚙
        </span>
      </button>

      {/* Mini Volume Popover */}
      {showSettings && (
        <div className="music-volume-popover" onClick={(e) => e.stopPropagation()}>
          <div className="popover-header">
            <span className="popover-star">✦</span>
            <div className="popover-titles">
              <b>{currentTrack?.title ?? '星契原声'}</b>
              <small>{currentTrack?.subtitle ?? '专属音乐配置'}</small>
            </div>
          </div>

          <div className="volume-control-group">
            <div className="volume-label-row">
              <span>音乐音量</span>
              <small>{Math.round(settings.musicVolume * 100)}%</small>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.musicVolume}
              onChange={(e) => setMusicVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>

          <div className="volume-control-group">
            <div className="volume-label-row">
              <span>战斗音效</span>
              <small>{Math.round(settings.sfxVolume * 100)}%</small>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={settings.sfxVolume}
              onChange={(e) => setSfxVolume(parseFloat(e.target.value))}
              className="volume-slider"
            />
          </div>

          <div className="popover-hints">
            <span>✨ 采用 Web Audio 毫秒时钟无缝循环</span>
          </div>
        </div>
      )}
    </div>
  );
}
