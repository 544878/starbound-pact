import { useEffect, useState, type ReactNode } from "react";
import { useGame } from "../state/GameContext";
import { equippedSkin } from "../systems/commerce";
import type { SkinDefinition } from "../domain/commerce";

export function SkinMedia({
  skin,
  view = 0,
  motion = true,
  fallback,
}: {
  skin: SkinDefinition;
  view?: number;
  motion?: boolean;
  fallback: ReactNode;
}) {
  const [failed, setFailed] = useState<string[]>([]);
  const [reduced, setReduced] = useState(
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
  );
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const change = () => setReduced(query.matches);
    query.addEventListener("change", change);
    return () => query.removeEventListener("change", change);
  }, []);
  const fail = (src: string) => setFailed((previous) => [...previous, src]);
  const art =
    view === 4
      ? (skin.assets.portrait ?? skin.assets.illustration)
      : view === 3
        ? (skin.assets.chibi ?? skin.assets.illustration)
        : skin.assets.illustration;
  const dynamic =
    view === 0 && motion && !reduced ? skin.assets.dynamic : undefined;
  if (dynamic && !failed.includes(dynamic.src)) {
    return dynamic.type === "video" ? (
      <video
        className="skin-media"
        key={dynamic.src}
        src={dynamic.src}
        poster={dynamic.poster}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        aria-label={`${skin.name}动态立绘`}
        onError={() => fail(dynamic.src)}
      />
    ) : (
      <img
        className="skin-media"
        src={dynamic.src}
        alt={`${skin.name}动态立绘`}
        onError={() => fail(dynamic.src)}
      />
    );
  }
  if (failed.includes(art.src)) return <>{fallback}</>;
  return (
    <img
      className="skin-media"
      src={art.src}
      alt={skin.name}
      style={{ objectPosition: art.objectPosition }}
      onError={() => fail(art.src)}
    />
  );
}
export function EquippedSkinArt({
  characterId,
  view = 0,
  children,
}: {
  characterId: string;
  view?: number;
  children: ReactNode;
}) {
  const { state } = useGame();
  const skin = equippedSkin(state, characterId);
  return skin ? (
    <SkinMedia
      key={`${skin.id}:${skin.version}`}
      skin={skin}
      view={view}
      motion={state.wardrobe?.motion}
      fallback={children}
    />
  ) : (
    <>{children}</>
  );
}
