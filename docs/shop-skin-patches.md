# 商城与皮肤补丁接入

当前为本地存档中的模拟商店，不连接微信、支付宝或真实扣款服务。所有人民币商品通过同一订单入口处理；游戏币兑换沿用原有经济规则。

## 商品配置

- `src/data/shop.ts`：八档星晶充值、金币和素材兑换。
- `src/data/shopOffers.ts`：小月卡价格、时长、立即奖励、每日奖励，以及礼包内容和永久限购次数。
- `src/systems/commerce.ts`：报价、创建订单、成功/取消/失败结算、重复结算防护、15 分钟过期、限购与月卡领取。
- `src/domain/commerce.ts`：商品、订单、奖励与外观的类型接口。
- `src/state/gameState.ts`：存档版本 10。旧存档自动补全新字段；恢复时待支付的模拟订单转为取消，绝不自动发奖。

月卡从购买当日计 30 个自然日，北京时间 00:00 刷新。立即获得 180 星晶，每日手动领取 60 星晶；漏领不补发，有效期内不续购，到期可以重新购买。按默认配置完整领取共 1,980 星晶。礼包限购永久记录在 `commerce.purchases`；变更为一轮新礼包时使用新的稳定商品 ID。

## 增加一套皮肤

1. 在 `public/assets/skins/<角色>/<皮肤>/` 放入资源。推荐静态图 PNG/WebP，动态视频 WebM/MP4；动画图片可使用 Animated WebP/APNG。
2. 在 `src/data/skinPacks/` 新建该补丁的 TypeScript 配置，导出 `SkinDefinition[]`。
3. 将补丁数组导入并展开到 `src/data/skins.ts` 的 `SKIN_CATALOG`。目前该列表为空，页面显示“敬请期待”。
4. 预备资源用 `draft`；确定上架改为 `listed`。停售改为 `retired` 并保留配置与资源，已购买的玩家仍可装备。
5. 每个皮肤的 ID 永久固定且不可复用；资源修改时增加 `version`。建议给变动资源换文件名避免旧缓存。

```ts
import type { SkinDefinition } from '../../domain/commerce';

export const moonPack: SkinDefinition[] = [{
  id: 'selene-moon-v1',
  characterId: 'selene',
  name: '月影来信',
  description: '示例配置，请在补齐真实资源后再上架。',
  version: 1,
  status: 'draft',
  price: 68,
  assets: {
    illustration: { src: '/assets/skins/selene/moon/illustration.webp' },
    portrait: { src: '/assets/skins/selene/moon/portrait.webp', objectPosition: '50% 25%' },
    chibi: { src: '/assets/skins/selene/moon/chibi.webp' },
    dynamic: {
      type: 'video',
      src: '/assets/skins/selene/moon/idle.webm',
      poster: '/assets/skins/selene/moon/illustration.webp',
    },
  },
}];
```

`illustration` 必须提供。未提供头像/Q版时自动使用静态立绘。动态资源错误时回退静态图，静态图失败时回退角色原有外观。皮肤只更改展示，不改变角色战斗属性。

`SkinMedia` 是共享媒体渲染入口；`EquippedSkinArt` 根据存档读取已装备外观。已接入角色详情及放大画廊、通用头像和主页动态看板。衣橱支持默认外观预览、未拥有外观预览、装备、恢复默认、动态开关，并尊重系统减少动态效果偏好。

支持动态视频和动画图片。Live2D/Spine 模型需要在 `SkinMedia` 添加对应的运行时适配器；不应把模型文件直接当视频资源填写。后续游戏中新添角色展示场景也应复用 `EquippedSkinArt`。

皮肤只能购买一次，必须先获得对应角色。未拥有、错角色或草稿皮肤均不能装备。未知皮肤 ID 会保留在存档中，以便临时移除的补丁重新加入后恢复权益；缺失配置时显示默认外观。

## 素材立绘

`src/data/materialArt.ts` 将素材名映射到 `public/assets/materials/material-collection-v2.png` 的 4×4 图集。`MaterialArt` 统一供商城、礼包奖励、支付明细、背包及原有行内素材展示使用。图集加载失败会回退旧素材图，再回退图标。新图集是精细建模风格的二维展示资源，并非交互式三维模型。

背包默认展示材料，支持名称搜索、品质筛选、数量与用途详情，保留武器库。商店每日领取标记与角色进阶内部记录不会作为物品显示或计入数量。

## 校验

```sh
npm run build
node node_modules/vitest/vitest.mjs run src/systems/commerce.test.ts src/systems/shop.test.ts src/systems/inventory.test.ts src/state/gameState.test.ts
```

补丁上架前检查：资源路径可加载；透明图完整显示；视频静音循环；动态开关与系统减少动态效果生效；模拟购买后进入衣橱装备；角色立绘、头像和主页同步；刷新后仍保留；停售后已拥有皮肤仍可使用。测试中的皮肤配置仅为内存夹具，不会发布到商城。
