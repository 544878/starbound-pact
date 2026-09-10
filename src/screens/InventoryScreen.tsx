import { EquipmentArt } from "../components/EquipmentArt";
import { MaterialArt } from "../components/MaterialArt";
import { companionCatalog } from "../data/catalog";
import { useRef, useState } from "react";
import { useGame } from "../state/GameContext";
import { inventoryMaterials } from "../systems/inventory";

export function InventoryScreen() {
  const { state, navigate } = useGame();
  const [tab, setTab] = useState<"weapons" | "materials">("materials");
  const [query, setQuery] = useState("");
  const [rarity, setRarity] = useState("all");
  const [selectedName, setSelectedName] = useState("造化之水");
  const [selectedWeaponId, setSelectedWeaponId] = useState("");
  const detailRef = useRef<HTMLElement>(null);
  const revealDetail = () => {
    if (window.matchMedia("(max-width: 700px)").matches)
      detailRef.current?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "auto"
          : "smooth",
        block: "start",
      });
  };
  const materialEntries = inventoryMaterials(state.materials);
  const matches = (name: string, rank: string) =>
    name.includes(query.trim()) && (rarity === "all" || rank === rarity);
  const materials = materialEntries.filter((m) => matches(m.name, m.rarity));
  const weapons = state.weapons.filter((w) => matches(w.name, w.rarity));
  const selected =
    materials.find((m) => m.name === selectedName) ?? materials[0];
  const weapon = weapons.find((w) => w.id === selectedWeaponId) ?? weapons[0];
  const totalItemCount =
    state.weapons.length + materialEntries.reduce((sum, m) => sum + m.count, 0);
  const changeTab = (next: "weapons" | "materials") => {
    setTab(next);
    setQuery("");
    setRarity("all");
  };
  const wishItem = selected && ["造化之水", "造化青莲"].includes(selected.name);
  return (
    <section className="collection-page">
      <header className="collection-heading">
        <div>
          <h1>行旅珍藏</h1>
          <p>每一份收获，都有它的来处。</p>
        </div>
        <span>
          {totalItemCount.toLocaleString()} <small>件物资</small>
        </span>
      </header>
      <div className="collection-toolbar">
        <nav aria-label="背包分类">
          <button
            aria-pressed={tab === "materials"}
            onClick={() => changeTab("materials")}
          >
            材料与道具 <small>{materialEntries.length}</small>
          </button>
          <button
            aria-pressed={tab === "weapons"}
            onClick={() => changeTab("weapons")}
          >
            武器库 <small>{state.weapons.length}</small>
          </button>
        </nav>
        <div className="collection-filters">
          <input
            aria-label="搜索背包名称"
            placeholder="搜索名称"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <select
            aria-label="筛选品质"
            value={rarity}
            onChange={(e) => setRarity(e.target.value)}
          >
            <option value="all">全部品质</option>
            <option value="5星">5星</option>
            <option value="4星">4星</option>
          </select>
        </div>
      </div>
      <div className="collection-layout">
        <div className="collection-grid">
          {tab === "materials"
            ? materials.map((m) => (
                <button
                  key={m.name}
                  className={`collection-item rarity-${m.rarity}`}
                  aria-pressed={selected?.name === m.name}
                  aria-label={`${m.name} 持有 ${m.count}`}
                  onClick={() => {
                    setSelectedName(m.name);
                    revealDetail();
                  }}
                >
                  <MaterialArt
                    name={m.name}
                    rarity={m.rarity}
                    fallbackIcon={m.icon}
                  />
                  <span className="collection-count">
                    ×{m.count.toLocaleString()}
                  </span>
                  <h2>{m.name}</h2>
                  <small className="collection-rarity">
                    {m.rarity === "5星" ? "✦ ✦ ✦ ✦ ✦" : "✦ ✦ ✦ ✦"}{" "}
                    <span>{m.rarity}</span>
                  </small>
                </button>
              ))
            : weapons.map((w) => (
                <button
                  key={w.id}
                  className={`collection-item rarity-${w.rarity}`}
                  aria-pressed={weapon?.id === w.id}
                  aria-label={`${w.name} 等级 ${w.level}`}
                  onClick={() => {
                    setSelectedWeaponId(w.id);
                    revealDetail();
                  }}
                >
                  <EquipmentArt
                    kind="weapon"
                    signatureFor={w.signatureFor}
                    name={w.name}
                    path={
                      companionCatalog.find((c) => c.id === w.signatureFor)
                        ?.path
                    }
                  />
                  <span className="collection-count">Lv.{w.level}</span>
                  <h2>{w.name}</h2>
                  <small className="collection-rarity">
                    {w.rarity} · 精炼 {w.refinement}
                  </small>
                </button>
              ))}
          {(tab === "materials" ? !materials.length : !weapons.length) && (
            <div className="collection-no-results">
              <h2>未找到物品</h2>
              <p>试试其他名称或品质。</p>
              <button
                className="store-button"
                onClick={() => {
                  setQuery("");
                  setRarity("all");
                }}
              >
                清除筛选
              </button>
            </div>
          )}
        </div>
        <aside
          ref={detailRef}
          className="collection-inspector"
          aria-label="物品详情"
          aria-live="polite"
        >
          {tab === "materials" && selected ? (
            <>
              <div className="collection-detail-art">
                <MaterialArt
                  name={selected.name}
                  rarity={selected.rarity}
                  fallbackIcon={selected.icon}
                />
              </div>
              <div className="collection-detail-copy">
                <span
                  className={`collection-detail-rarity rarity-${selected.rarity}`}
                >
                  {selected.rarity} · {wishItem ? "祈愿材料" : "养成素材"}
                </span>
                <h2>{selected.name}</h2>
                <div className="collection-owned">
                  <span>持有数量</span>
                  <strong>{selected.count.toLocaleString()}</strong>
                </div>
                <p>{selected.desc}</p>
                <button
                  className="store-button"
                  onClick={() => navigate(wishItem ? "summon" : "companions")}
                >
                  {wishItem ? "前往祈愿" : "前往角色养成"} →
                </button>
                <button className="store-link" onClick={() => navigate("shop")}>
                  前往商会补给
                </button>
              </div>
            </>
          ) : tab === "weapons" && weapon ? (
            <>
              <div className="collection-detail-art">
                <EquipmentArt
                  kind="weapon"
                  name={weapon.name}
                  signatureFor={weapon.signatureFor}
                  path={
                    companionCatalog.find((c) => c.id === weapon.signatureFor)
                      ?.path
                  }
                />
              </div>
              <div className="collection-detail-copy">
                <span
                  className={`collection-detail-rarity rarity-${weapon.rarity}`}
                >
                  {weapon.rarity} · 战术武器
                </span>
                <h2>{weapon.name}</h2>
                <div className="collection-owned">
                  <span>等级 / 精炼</span>
                  <strong>
                    {weapon.level} / {weapon.refinement}
                  </strong>
                </div>
                <p>{weapon.passive || "与同行的伙伴一起，见证新的征途。"}</p>
                <p>
                  {weapon.ownerId
                    ? `已装备 · ${state.companions.find((c) => c.id === weapon.ownerId)?.name ?? "同行伙伴"}`
                    : "未装备"}
                </p>
                <button
                  className="store-button"
                  onClick={() => navigate("companions")}
                >
                  前往角色装备 →
                </button>
              </div>
            </>
          ) : (
            <div className="collection-detail-copy">
              <h2>珍藏仍在继续</h2>
              <p>选择物品，查看详细信息。</p>
            </div>
          )}
        </aside>
      </div>
      <footer className="collection-footer">
        珍物有灵 · 道行天下 <span>旅途仍在继续，更多珍藏等待相遇。</span>
      </footer>
    </section>
  );
}
