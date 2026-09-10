import { useEffect, useRef, useState } from "react";
import { EquippedSkinArt } from './SkinMedia';
import type { Companion } from "../domain/types";
import { CollabCharacterArt } from "./CollabCharacterArt";
import { fgoArtIndex } from "../data/collabArt";
import { FgoCharacterArt } from "./FgoCharacterArt";
import { hasScenicArt, ScenicArt, scenicSource } from "./ScenicArt";
const views = [
  { id: 0, label: "正面" },
  { id: 4, label: "头像" },
  { id: 3, label: "Q版" },
];
export function CharacterArt({
  companion,
  view = 0,
  className = "",
  defaultAppearance = false,
}: {
  companion: Companion;
  view?: number;
  className?: string;
  defaultAppearance?: boolean;
}) {
  const current = views.some((v) => v.id === view) ? view : 0;
  const original = hasScenicArt(companion.id) ? <ScenicArt id={companion.id} view={current} /> : fgoArtIndex(companion.id) >= 0 ? <FgoCharacterArt id={companion.id} view={current} /> : <CollabCharacterArt id={companion.id} view={current} />;
  return (
    <div
      className={`character-art view-${current} ${className}`}
      role="img"
      aria-label={`${companion.name}·${views.find((v) => v.id === current)?.label}`}
    >
      {defaultAppearance ? original : <EquippedSkinArt characterId={companion.id} view={current}>{original}</EquippedSkinArt>}
    </div>
  );
}
export function ArtGallery({ companion }: { companion: Companion }) {
  const [view, setView] = useState(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    setView(0);
    dialog.current?.close();
  }, [companion.id]);
  return (
    <>
      <div className="art-view-controls" role="group" aria-label="立绘视角">
        {views.map((v) => (
          <button
            key={v.id}
            aria-pressed={view === v.id}
            onClick={() => setView(v.id)}
          >
            {v.label}
          </button>
        ))}
      </div>
      <button
        className="art-stage-button"
        aria-label={`放大${companion.name}立绘`}
        onClick={() => dialog.current?.showModal()}
      >
        <CharacterArt companion={companion} view={view} />
      </button>
      <button
        className="art-expand"
        onClick={() => dialog.current?.showModal()}
      >
        查看立绘 ↗
      </button>
      <dialog
        className="scenic-gallery-modal"
        ref={dialog}
        onClick={(e) => {
          if (e.target === e.currentTarget) dialog.current?.close();
        }}
      >
        <header>
          <b>{companion.name} · 正面 / 头像 / Q版</b>
          <button
            autoFocus
            onClick={() => dialog.current?.close()}
            aria-label="关闭立绘"
          >
            关闭 ×
          </button>
        </header>
        <div className="scenic-gallery-views">
          {views.map((v) => (
            <figure key={v.id}>
              <CharacterArt companion={companion} view={v.id} />
              <figcaption>{v.label}</figcaption>
            </figure>
          ))}
        </div>
        {hasScenicArt(companion.id) && (
          <a
            href={scenicSource(companion.id)}
            download={`${companion.name}-正面头像Q版.png`}
          >
            下载原图
          </a>
        )}
      </dialog>
    </>
  );
}
