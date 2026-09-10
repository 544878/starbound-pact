import type { GameState } from "../domain/types";
export type WishPool = "standard" | "limited" | "collab" | "weapon";
export function wishPayment(
  state: Pick<GameState, "materials" | "crystals">,
  pool: WishPool,
  count: number,
) {
  const resource =
    pool === "limited" || pool === "collab" ? "造化青莲" : "造化之水";
  const tickets = Math.min(count, Math.max(0, state.materials[resource] ?? 0));
  const crystals = (count - tickets) * 160;
  return {
    resource,
    tickets,
    crystals,
    affordable: state.crystals >= crystals,
  };
}
