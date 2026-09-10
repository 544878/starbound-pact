import { useRef, useState } from "react";
import type { PaymentMethod, ProductRef } from "../../domain/commerce";
import { useGame } from "../../state/GameContext";
import { quoteProduct } from "../../systems/commerce";
import { ShopDialog } from "./ShopDialog";
import { RewardItems } from "./RewardItems";
import { MaterialArt } from "../MaterialArt";

export function Checkout({
  product,
  onClose,
}: {
  product: ProductRef;
  onClose: () => void;
}) {
  const { state, dispatch } = useGame();
  const [method, setMethod] = useState<PaymentMethod>("wechat");
  const [orderId, setOrderId] = useState<string>();
  const guard = useRef(false);
  const order = state.commerce?.orders.find((o) => o.id === orderId);
  const quote = order ?? quoteProduct(state, product);
  const close = () => {
    if (order?.status === "pending")
      dispatch({
        type: "SETTLE_SHOP_ORDER",
        id: order.id,
        result: "cancelled",
      });
    onClose();
  };
  const create = () => {
    if (guard.current) return;
    guard.current = true;
    const id = `SIM-${crypto.randomUUID()}`;
    dispatch({ type: "CREATE_SHOP_ORDER", id, product, method });
    setOrderId(id);
  };
  const settle = (result: "paid" | "failed" | "cancelled") => {
    if (order) dispatch({ type: "SETTLE_SHOP_ORDER", id: order.id, result });
  };
  const complete = order && order.status !== "pending";
  return (
    <ShopDialog
      title={
        complete
          ? order.status === "paid"
            ? "心意已抵达"
            : "支付未完成"
          : "模拟收银台"
      }
      onClose={close}
    >
      {quote ? (
        <>
          <div className="checkout-product">
            <MaterialArt
              name={product.kind === "bundle" ? "商会礼盒" : "星晶"}
              inline
              size={65}
            />
            <div>
              <h3>{quote.name}</h3>
              <small>
                {product.kind === "monthly"
                  ? "30 天权益 · 每日奖励需主动领取"
                  : "万界商会"}
              </small>
            </div>
          </div>
          <div className="checkout-price">
            <small>模拟支付金额</small>
            <strong>
              <i>¥</i>
              {quote.price.toFixed(2)}
            </strong>
          </div>
          <RewardItems reward={quote.reward} />
          {product.kind === "skin" && (
            <p className="checkout-rewards">解锁角色外观，可在角色衣橱中装备</p>
          )}
          {product.kind === "monthly" && (
            <p className="checkout-notice">
              立即获得 180 星晶，每日主动领取 60 星晶。含购买当日共 30
              天，北京时间 00:00 刷新；漏领不补发，有效期内不可重复购买。
            </p>
          )}
          {!order && (
            <>
              <p>选择支付方式</p>
              <div className="payment-methods">
                {(["wechat", "alipay"] as const).map((m) => (
                  <button
                    key={m}
                    aria-pressed={method === m}
                    onClick={() => setMethod(m)}
                  >
                    <span className={`provider-icon ${m}`}>
                      {m === "wechat" ? "聊" : "支"}
                    </span>
                    {m === "wechat" ? "微信支付" : "支付宝"}
                    <b>{method === m ? "✓" : "○"}</b>
                  </button>
                ))}
              </div>
              <button className="store-button" onClick={create}>
                前往{method === "wechat" ? "微信" : "支付宝"}模拟支付
              </button>
            </>
          )}
          {order?.status === "pending" && (
            <div className="payment-pending">
              <span className={`provider-icon ${order.method}`}>
                {order.method === "wechat" ? "聊" : "支"}
              </span>
              <h3>
                {order.method === "wechat" ? "微信支付" : "支付宝"} · 等待确认
              </h3>
              <p>演示支付窗口已就绪，请选择支付结果。</p>
              <button className="store-button" onClick={() => settle("paid")}>
                确认模拟支付
              </button>
              <div className="payment-secondary">
                <button onClick={() => settle("failed")}>模拟支付失败</button>
                <button onClick={() => settle("cancelled")}>取消订单</button>
              </div>
            </div>
          )}
          {complete && (
            <div className="payment-result" role="status">
              <strong>
                {order.status === "paid"
                  ? "✓ 支付成功，商品已到账"
                  : order.status === "cancelled"
                    ? "订单已取消，未发放商品"
                    : order.error}
              </strong>
              {order.status !== "paid" && (
                <button
                  className="store-button"
                  onClick={() => {
                    guard.current = false;
                    setOrderId(undefined);
                  }}
                >
                  重新选择支付
                </button>
              )}
              <button className="store-link" onClick={close}>
                返回商城
              </button>
            </div>
          )}
          {order && <small className="order-id">订单号 {order.id}</small>}
        </>
      ) : (
        <p>商品暂不可购买，可能已达到限购次数或月卡仍在生效。</p>
      )}
      <p className="checkout-notice">
        仅模拟支付，不连接微信或支付宝，不会真实扣款。
      </p>
    </ShopDialog>
  );
}
