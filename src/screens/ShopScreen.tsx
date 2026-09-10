import { useState } from "react";
import { RECHARGE_TIERS, SHOP_GOODS, type ShopGoodItem } from "../data/shop";
import { MONTHLY_CARD, SHOP_BUNDLES } from "../data/shopOffers";
import { SKIN_CATALOG } from "../data/skins";
import type { ProductRef, SkinDefinition } from "../domain/commerce";
import { useGame } from "../state/GameContext";
import { quoteProduct, rewardText, shopDay } from "../systems/commerce";
import { Checkout } from "../components/shop/Checkout";
import { ShopDialog } from "../components/shop/ShopDialog";
import { SkinMedia } from "../components/SkinMedia";
import { MaterialArt } from "../components/MaterialArt";
import { RewardItems } from "../components/shop/RewardItems";

const tabs = [
  ["featured", "精选"],
  ["offers", "月卡与礼包"],
  ["recharge", "星晶充值"],
  ["supplies", "金币与补给"],
  ["skins", "皮肤商城"],
] as const;
type ShopTab = (typeof tabs)[number][0];
export function ShopScreen() {
  const { state, dispatch, navigate } = useGame();
  const [tab, setTab] = useState<ShopTab>("featured");
  const [product, setProduct] = useState<ProductRef | null>(null);
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState(false);
  const [skin, setSkin] = useState<SkinDefinition | null>(null);
  const [goods, setGoods] = useState<ShopGoodItem | null>(null);
  const [supplyFilter, setSupplyFilter] = useState("all");
  const day = shopDay();
  const monthly = state.commerce?.monthly;
  const daysLeft = Math.max(0, (monthly?.endDay ?? 0) - day);
  const claimed = (monthly?.lastClaimDay ?? -1) >= day;
  const listed = SKIN_CATALOG.filter((s) => s.status === "listed");
  const buy = (ref: ProductRef) => setProduct(ref);
  const goodsBlocked = (item: ShopGoodItem) => {
    if (
      item.dailyLimit &&
      (state.materials[`shop_claimed_${item.id}_${state.taskPeriods?.day}`] ??
        0) >= item.dailyLimit
    )
      return "今日已领取";
    if (state[item.currency] < item.price)
      return `${item.currency === "gold" ? "金币" : "星晶"}不足`;
    if (item.stamina && state.stamina + item.stamina > 240)
      return "体力空间不足";
    return "";
  };
  const buyGoods = (item: ShopGoodItem) => {
    const error = goodsBlocked(item);
    if (error) {
      setMessage(error);
      setGoods(null);
      return;
    }
    dispatch({ type: "BUY_GOODS", id: item.id });
    setMessage(`${item.name}已入库。`);
    setGoods(null);
  };
  return (
    <section className="store-page">
      <header className="store-heading">
        <div>
          <span className="store-overline">EMPORIUM / 万界商会</span>
          <h1>
            万界商会<span>为下一程，备好行囊。</span>
          </h1>
        </div>
        <button className="store-link" onClick={() => setHistory(true)}>
          订单记录 ↗
        </button>
      </header>
      <nav className="store-tabs" aria-label="商场分类">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            aria-pressed={tab === id}
            onClick={() => {
              setTab(id);
              setMessage("");
            }}
          >
            {label}
          </button>
        ))}
      </nav>
      {message && (
        <div className="store-status" role="status">
          {message}
          <button aria-label="关闭提示" onClick={() => setMessage("")}>
            ×
          </button>
        </div>
      )}
      {(tab === "featured" || tab === "offers") && (
        <>
          <div className="store-features">
            <article className="monthly-feature">
              <div className="monthly-copy">
                <span className="feature-kicker">☾ LUNAR MEMBERSHIP</span>
                <h2>
                  小月卡<small>星月同行</small>
                </h2>
                <p>微小的相伴，也能照亮远方。</p>
                <div className="monthly-benefits">
                  <span>
                    立即领取
                    <strong>
                      180 <small>星晶</small>
                    </strong>
                  </span>
                  <span>
                    每日领取
                    <strong>
                      60 <small>星晶</small>
                    </strong>
                  </span>
                  <span>
                    持续相伴
                    <strong>
                      30 <small>天</small>
                    </strong>
                  </span>
                </div>
                <div className="feature-action">
                  {daysLeft ? (
                    <>
                      <strong>剩余 {daysLeft} 天</strong>
                      <button
                        className="store-button gold"
                        disabled={claimed}
                        onClick={() => {
                          dispatch({ type: "CLAIM_MONTHLY" });
                          setMessage("今日月卡奖励 60 星晶已到账。");
                        }}
                      >
                        {claimed ? "今日已领取" : "领取今日 60 星晶"}
                      </button>
                    </>
                  ) : (
                    <>
                      <strong>
                        <small>¥</small>18
                      </strong>
                      <button
                        className="store-button gold"
                        onClick={() =>
                          buy({ kind: "monthly", id: MONTHLY_CARD.id })
                        }
                      >
                        立即开启 →
                      </button>
                    </>
                  )}
                </div>
              </div>
            </article>
            <article className="gift-feature">
              <div>
                <span className="feature-kicker">JOURNEY GIFT</span>
                <h2>启程礼盒</h2>
                <p>为冒险的第一步，准备更多可能。</p>
                <p className="gift-rewards">
                  120 星晶 · 6,000 金币
                  <br />
                  战术经验书 ×10
                </p>
              </div>
              <div className="feature-action">
                <strong>
                  <small>¥</small>6
                </strong>
                <button
                  className="store-button"
                  disabled={
                    !quoteProduct(state, {
                      kind: "bundle",
                      id: SHOP_BUNDLES[0].id,
                    })
                  }
                  onClick={() =>
                    buy({ kind: "bundle", id: SHOP_BUNDLES[0].id })
                  }
                >
                  {quoteProduct(state, {
                    kind: "bundle",
                    id: SHOP_BUNDLES[0].id,
                  })
                    ? "查看礼包 →"
                    : "已购完"}
                </button>
              </div>
            </article>
          </div>
          {tab === "offers" && (
            <>
              <p className="store-rules">
                月卡含购买当日，共 30 个自然日（北京时间 00:00
                刷新）。每日主动领取，漏领不补发；有效期内不可重复购买，到期后可重新开通。全部领取共得
                1,980 星晶。
              </p>
              <div className="store-section-title">
                <h2>旅途赠礼</h2>
                <span>每份心意，都恰到好处。</span>
              </div>
              <div className="bundle-list">
                {SHOP_BUNDLES.map((b) => (
                  <article key={b.id}>
                    <MaterialArt name="商会礼盒" />
                    <div>
                      <h3>{b.name}</h3>
                      <p>{b.description}</p>
                      <RewardItems reward={b.reward} />
                      <small>
                        永久限购 {b.limit} 次 · 已购{" "}
                        {state.commerce?.purchases[b.id] ?? 0} 次
                      </small>
                    </div>
                    <button
                      className="store-button"
                      disabled={
                        !quoteProduct(state, { kind: "bundle", id: b.id })
                      }
                      onClick={() => buy({ kind: "bundle", id: b.id })}
                    >
                      {quoteProduct(state, { kind: "bundle", id: b.id })
                        ? `¥${b.price} · 查看礼包`
                        : "已购完"}
                    </button>
                  </article>
                ))}
              </div>
            </>
          )}
        </>
      )}
      {(tab === "featured" || tab === "recharge") && (
        <>
          <div className="store-section-title">
            <h2>
              星晶充值 <small>CRYSTAL TOP-UP</small>
            </h2>
            <button
              className="store-link"
              onClick={() => setTab(tab === "featured" ? "recharge" : "offers")}
            >
              {tab === "featured" ? "查看全部 8 档 →" : "查看月卡与礼包 →"}
            </button>
          </div>
          <div className="store-crystals">
            {RECHARGE_TIERS.slice(0, tab === "featured" ? 4 : 8).map((t) => {
              const first = !state.rechargedTiers?.[t.id];
              const bonus = first ? t.firstBonusCrystals : t.bonusCrystals;
              return (
                <article className="crystal-product" key={t.id}>
                  <span className="product-ribbon">
                    {first
                      ? "首充双倍"
                      : bonus
                        ? `额外赠送 ${bonus}`
                        : "常驻补给"}
                  </span>
                  <div className="crystal-art" aria-hidden="true" />
                  <h3>
                    {t.crystals.toLocaleString()} <small>星晶</small>
                  </h3>
                  <p>{t.name}</p>
                  <span className="crystal-bonus">
                    {first ? "首充赠送" : "常规赠送"} {bonus.toLocaleString()}{" "}
                    星晶
                  </span>
                  <button
                    className="store-price-button"
                    aria-label={`${t.name} ¥${t.price} 购买`}
                    onClick={() => buy({ kind: "recharge", id: t.id })}
                  >
                    ¥{t.price}
                    <span>购买 →</span>
                  </button>
                </article>
              );
            })}
          </div>
          <p className="store-rules">
            每档首充额外赠送等量星晶；首充赠送与常规赠送不叠加，以收银台实际到账数量为准。
          </p>
        </>
      )}
      {tab === "supplies" && (
        <>
          <div className="store-section-title">
            <h2>行囊整备</h2>
            <div className="store-filters">
              {[
                ["all", "全部"],
                ["gold", "金币"],
                ["supplies", "物资"],
              ].map(([id, label]) => (
                <button
                  key={id}
                  aria-pressed={supplyFilter === id}
                  onClick={() => setSupplyFilter(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="store-goods">
            {SHOP_GOODS.filter(
              (g) => supplyFilter === "all" || g.category === supplyFilter,
            ).map((g) => (
              <article key={g.id}>
                <MaterialArt
                  name={
                    g.material ??
                    (g.stamina
                      ? "灵泉甘露"
                      : g.id === "gold_free"
                        ? "商会礼盒"
                        : (g.gold ?? 0) >= 22000
                          ? "金币宝箱"
                          : "金币")
                  }
                />
                <h3>{g.name}</h3>
                <p>{g.desc}</p>
                <button
                  className="store-price-button"
                  disabled={!!goodsBlocked(g)}
                  onClick={() => (g.price === 0 ? buyGoods(g) : setGoods(g))}
                >
                  {goodsBlocked(g) ||
                    (g.price === 0
                      ? "免费领取"
                      : `${g.price.toLocaleString()} ${g.currency === "gold" ? "金币" : "星晶"} · 兑换`)}
                </button>
              </article>
            ))}
          </div>
        </>
      )}
      {tab === "skins" && (
        <>
          <div className="store-section-title">
            <h2>
              星裳衣橱 <small>CHARACTER COLLECTION</small>
            </h2>
            <button
              className="store-link"
              onClick={() => navigate("companions")}
            >
              我的角色衣橱 →
            </button>
          </div>
          {!listed.length ? (
            <div className="skin-empty">
              <div className="empty-orbit">✧</div>
              <span>新的风景，值得等待。</span>
              <h2>敬请期待</h2>
              <p>
                新的衣装正在准备中。
                <br />
                下一次相遇，让熟悉的伙伴焕然一新。
              </p>
              <button
                className="store-button"
                onClick={() => navigate("companions")}
              >
                前往角色衣橱
              </button>
              <small>当前暂无上架皮肤</small>
            </div>
          ) : (
            <div className="skin-store-grid">
              {listed.map((s) => (
                <article key={s.id}>
                  <button
                    className="skin-preview-button"
                    aria-label={`预览${s.name}`}
                    onClick={() => setSkin(s)}
                  >
                    <SkinMedia
                      skin={s}
                      motion={false}
                      fallback={<span>立绘暂不可用</span>}
                    />
                  </button>
                  <h3>{s.name}</h3>
                  <p>{s.description}</p>
                  <button className="store-button" onClick={() => setSkin(s)}>
                    {state.wardrobe?.owned.includes(s.id)
                      ? "已拥有 · 查看"
                      : `¥${s.price} · 预览`}
                  </button>
                </article>
              ))}
            </div>
          )}
        </>
      )}
      <footer className="store-footer">
        <span>✧ 万界好物，伴你前行</span>
        <small>
          所有支付均为模拟，不会真实扣款。商品与外观随本地存档保存。
        </small>
      </footer>
      {product && (
        <Checkout product={product} onClose={() => setProduct(null)} />
      )}
      {goods && (
        <ShopDialog title="确认兑换" onClose={() => setGoods(null)}>
          <MaterialArt
            name={goods.material ?? (goods.stamina ? "灵泉甘露" : "金币")}
            size={120}
          />
          <h3>{goods.name}</h3>
          <p>{goods.desc}</p>
          <p>
            消耗 {goods.price.toLocaleString()}{" "}
            {goods.currency === "gold" ? "金币" : "星晶"}
          </p>
          <button
            className="store-button"
            disabled={!!goodsBlocked(goods)}
            onClick={() => buyGoods(goods)}
          >
            确认兑换
          </button>
        </ShopDialog>
      )}
      {skin && (
        <ShopDialog title={skin.name} onClose={() => setSkin(null)}>
          <div className="wardrobe-preview">
            <SkinMedia
              key={skin.id}
              skin={skin}
              motion={state.wardrobe?.motion}
              fallback={<p>立绘暂不可用</p>}
            />
          </div>
          <p>{skin.description}</p>
          {state.wardrobe?.owned.includes(skin.id) ? (
            <button
              className="store-button"
              onClick={() => {
                dispatch({ type: "SELECT_COMPANION", id: skin.characterId });
                navigate("companions");
              }}
            >
              前往装备
            </button>
          ) : (
            <button
              className="store-button"
              disabled={!quoteProduct(state, { kind: "skin", id: skin.id })}
              onClick={() => {
                buy({ kind: "skin", id: skin.id });
                setSkin(null);
              }}
            >
              {state.companions.some((c) => c.id === skin.characterId)
                ? `¥${skin.price} · 购买皮肤`
                : "请先获得对应角色"}
            </button>
          )}
        </ShopDialog>
      )}
      {history && (
        <ShopDialog title="模拟订单记录" onClose={() => setHistory(false)}>
          {!state.commerce?.orders.length ? (
            <p className="store-rules">
              暂无订单。完成一笔模拟支付后，可在这里查看。
            </p>
          ) : (
            <div className="order-list">
              {state.commerce.orders.map((o) => (
                <article key={o.id}>
                  <div>
                    <b>{o.name}</b>
                    <strong>¥{o.price}</strong>
                  </div>
                  <p>
                    {o.method === "wechat" ? "微信支付" : "支付宝"} ·{" "}
                    {
                      {
                        pending: "待支付",
                        paid: "支付成功",
                        cancelled: "已取消",
                        failed: "支付失败",
                      }[o.status]
                    }
                  </p>
                  <small>{new Date(o.createdAt).toLocaleString("zh-CN")}</small>
                  <small className="order-id">{o.id}</small>
                  {o.status === "paid" && (
                    <p>{rewardText(o.reward) || "皮肤已解锁"}</p>
                  )}
                </article>
              ))}
            </div>
          )}
        </ShopDialog>
      )}
    </section>
  );
}
