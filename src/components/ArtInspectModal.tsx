import React, { useEffect } from 'react';

export interface ArtInspectData {
  title: string;
  subtitle?: string;
  imageUrl: string;
  quote?: string;
  tag?: string;
}

export function ArtInspectModal({
  data,
  onClose,
}: {
  data: ArtInspectData | null;
  onClose: () => void;
}) {
  useEffect(() => {
    if (!data) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [data, onClose]);

  if (!data) return null;

  return (
    <div
      className="art-inspect-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={data.title}
      onClick={onClose}
    >
      <div
        className="art-inspect-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          className="art-inspect-close"
          onClick={onClose}
          aria-label="关闭鉴赏"
        >
          ✕
        </button>

        <div className="art-inspect-header">
          {data.tag && <span className="art-inspect-tag">{data.tag}</span>}
          <h2 className="art-inspect-title">{data.title}</h2>
          {data.subtitle && <p className="art-inspect-subtitle">{data.subtitle}</p>}
        </div>

        <div className="art-inspect-viewport">
          <div className="art-inspect-pedestal-glow" />
          <img
            src={data.imageUrl}
            alt={data.title}
            className="art-inspect-image"
          />
        </div>

        {data.quote && (
          <blockquote className="art-inspect-quote">
            <span className="quote-mark">“</span>
            {data.quote}
            <span className="quote-mark">”</span>
          </blockquote>
        )}

        <div className="art-inspect-footer">
          <span>点击背景或右上角关闭</span>
        </div>
      </div>
    </div>
  );
}
