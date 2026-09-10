const originals = new Set([
  "lumi",
  "alden",
  "selene",
  "mira",
  "noctis",
  "kael",
  "astra",
  "xuanzhao",
  "canglan",
  "yanhuang",
  "jingxuan",
  "siming",
  "yueheng",
  "saber",
  "sakura",
  "rin",
  "archer",
  "gilgamesh",
  "yuno",
  "shorekeeper",
  "phrolova",
  "cantarella",
  "xinyuehu",
]);
export const hasScenicArt = (id: string) =>
  originals.has(id) || /^R[45]-/.test(id);
export const scenicSource = (id: string) =>
  `/assets/characters/scenic/${id}.png`;

export function ScenicArt({ id, view = 0 }: { id: string; view?: number }) {
  const box =
    view === 4
      ? "512 90 512 512"
      : view === 3
        ? "1024 160 512 850"
        : "0 0 512 1024";
  return (
    <svg
      className="scenic-art"
      viewBox={box}
      preserveAspectRatio={view === 3 ? "xMidYMax slice" : "xMidYMin slice"}
      aria-hidden="true"
    >
      <image
        href={scenicSource(id)}
        width="1536"
        height="1024"
        preserveAspectRatio="none"
      />
    </svg>
  );
}
