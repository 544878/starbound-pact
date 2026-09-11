import type { SkinDefinition } from "../domain/commerce";

// Patch entry point: add an imported skin pack here. Stable IDs must never be reused.
export const SKIN_CATALOG: readonly SkinDefinition[] = [
  {
    id: "skin-lumi-athletic",
    characterId: "lumi",
    name: "晨曦逐风",
    description:
      "换上轻便利落的墨绿运动装，在晨曦飞瀑前的露台扎起马尾。去更远的地方，和更喜欢的自己相遇。",
    version: 1,
    status: "listed",
    price: 0,
    assets: {
      illustration: {
        src: "/assets/characters/lumi-athletic.png",
      },
      portrait: {
        src: "/assets/characters/lumi-portrait.png",
      },
      chibi: {
        src: "/assets/characters/lumi-chibi.png",
      },
      dynamic: {
        src: "/assets/characters/lumi-athletic.png",
        type: "image",
        poster: "/assets/characters/lumi-athletic.png",
      },
    },
  },
  {
    id: "skin-lumi-summer",
    characterId: "lumi",
    name: "溯夏之约",
    description:
      "蔚蓝海风轻拂白金薄纱，露弥在碧波与繁花盛开的宫殿露台，向你发出深情邀约：「和我一起，去看更远的海吧？」",
    version: 1,
    status: "listed",
    price: 0,
    assets: {
      illustration: {
        src: "/assets/characters/lumi-summer.jpg",
      },
      portrait: {
        src: "/assets/characters/lumi-portrait.png",
      },
      chibi: {
        src: "/assets/characters/lumi-chibi.png",
      },
      dynamic: {
        src: "/assets/characters/lumi-summer.jpg",
        type: "image",
        poster: "/assets/characters/lumi-summer.jpg",
      },
    },
  },
];

export function validateSkinCatalog(catalog: readonly SkinDefinition[]) {
  const ids = new Set<string>();
  for (const skin of catalog) {
    if (
      !skin.id ||
      ids.has(skin.id) ||
      !skin.characterId ||
      !skin.name ||
      !Number.isSafeInteger(skin.price) ||
      skin.price < 0 ||
      !Number.isSafeInteger(skin.version) ||
      skin.version < 1 ||
      !["draft", "listed", "retired"].includes(skin.status) ||
      !skin.assets?.illustration?.src ||
      (skin.assets.dynamic &&
        (!skin.assets.dynamic.poster ||
          !skin.assets.dynamic.src ||
          !["video", "image"].includes(skin.assets.dynamic.type)))
    ) {
      throw new Error(`Invalid skin definition: ${skin.id}`);
    }
    ids.add(skin.id);
  }
  return catalog;
}
validateSkinCatalog(SKIN_CATALOG);
