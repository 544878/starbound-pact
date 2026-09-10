import type { Reward } from "../../domain/commerce";
import { MaterialArt } from "../MaterialArt";
export function RewardItems({ reward }: { reward: Reward }) {
  const items = [
    ...(reward.crystals ? [{ name: "星晶", count: reward.crystals }] : []),
    ...(reward.gold ? [{ name: "金币", count: reward.gold }] : []),
    ...Object.entries(reward.materials ?? {}).map(([name, count]) => ({
      name,
      count,
    })),
  ];
  return (
    <div className="reward-items">
      {items.map((item) => (
        <div
          className="reward-item"
          key={item.name}
          title={`${item.name} ×${item.count}`}
        >
          <MaterialArt name={item.name} inline size={52} />
          <span>
            {item.name}
            <b>×{item.count.toLocaleString()}</b>
          </span>
        </div>
      ))}
    </div>
  );
}
