import { useState } from "react";
import type { Companion } from "../domain/types";
import { SKIN_CATALOG } from "../data/skins";
import { useGame } from "../state/GameContext";
import { equippedSkin } from "../systems/commerce";
import { SkinMedia } from "./SkinMedia";
import { ShopDialog } from "./shop/ShopDialog";
import { CharacterArt } from "./CharacterArt";

export function Wardrobe({ companion }: { companion: Companion }) {
  const { state, dispatch, navigate } = useGame();
  const [open, setOpen] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);
  const skins = SKIN_CATALOG.filter(
    (s) =>
      s.characterId === companion.id &&
      (s.status === "listed" ||
        (s.status === "retired" && state.wardrobe?.owned.includes(s.id))),
  );
  const current = equippedSkin(state, companion.id);
  const preview = skins.find((s) => s.id === previewId);
  const ownedCharacter = state.companions.some((c) => c.id === companion.id);
  return (
    <>
      <button
        className="wardrobe-trigger"
        onClick={() => {
          setPreviewId(current?.id ?? null);
          setOpen(true);
        }}
      >
        角色衣橱 · {current?.name ?? "默认外观"}
      </button>
      {open && (
        <ShopDialog
          title={`${companion.name} · 角色衣橱`}
          onClose={() => setOpen(false)}
        >
          <p className="store-muted">
            已装备：{current?.name ?? "默认外观"} · 外观不改变角色属性
          </p>
          <div className="wardrobe-options">
            <button
              aria-pressed={!previewId}
              onClick={() => setPreviewId(null)}
            >
              默认外观
            </button>
            {skins.map((s) => (
              <button
                key={s.id}
                aria-pressed={s.id === previewId}
                onClick={() => setPreviewId(s.id)}
              >
                {s.name} ·{" "}
                {state.wardrobe?.owned.includes(s.id) ? "已拥有" : "未拥有"}
              </button>
            ))}
          </div>
          {preview ? (
            <>
              <div className="wardrobe-preview">
                <SkinMedia
                  key={preview.id}
                  skin={preview}
                  motion={state.wardrobe?.motion}
                  fallback={<p>立绘暂不可用</p>}
                />
              </div>
              <p>{preview.description}</p>
            </>
          ) : (
            <div className="wardrobe-default">
              <div className="wardrobe-preview">
                <CharacterArt companion={companion} defaultAppearance />
              </div>
              <h3>最初的相遇</h3>
              <p>保留角色原有立绘、头像与看板外观。</p>
              {!skins.length && <p>新装尚未上架，敬请期待。</p>}
            </div>
          )}
          <label className="wardrobe-motion">
            <input
              type="checkbox"
              checked={state.wardrobe?.motion !== false}
              onChange={(e) =>
                dispatch({ type: "SET_SKIN_MOTION", enabled: e.target.checked })
              }
            />{" "}
            播放动态皮肤立绘
          </label>
          <button
            className="store-button"
            disabled={
              !ownedCharacter ||
              (!!preview && !state.wardrobe?.owned.includes(preview.id))
            }
            onClick={() =>
              dispatch({
                type: "EQUIP_SKIN",
                characterId: companion.id,
                skinId: preview?.id ?? null,
              })
            }
          >
            {!ownedCharacter
              ? "获得角色后可装备"
              : preview && !state.wardrobe?.owned.includes(preview.id)
                ? "尚未拥有"
                : current?.id === preview?.id
                  ? "当前已装备"
                  : preview
                    ? "装备此外观"
                    : "恢复默认外观"}
          </button>
          <button
            className="store-link"
            onClick={() => {
              setOpen(false);
              navigate("shop");
            }}
          >
            前往商城
          </button>
        </ShopDialog>
      )}
    </>
  );
}
