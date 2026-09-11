import os, sys
from PIL import Image, ImageFilter
import numpy as np

zip_dir = r"C:\Users\cyt15\Documents\New project 2\tmp\zip_extracted_dotnet"
out_base = r"C:\Users\cyt15\Documents\New project 2\public\assets\signature-v2"
weapons_base = r"C:\Users\cyt15\Documents\New project 2\public\assets\weapons"

# Complete definition of all sheets and characters
# sheet_file, format_type, top_char_id, bottom_char_id
SHEET_MAPPINGS = [
    # 1. image-gen-1: 焰笙, 镜弦
    ("image-gen-1(4).png", "1672x941", "R4-020", "R4-021"),
    # 2. image-gen-2: 忆澜, 磐舟
    ("image-gen-2(4).png", "1672x941", "R4-022", "R4-025"),
    # 3. image-gen-3: 赤垒, 梦珀
    ("image-gen-3(2).png", "1672x941", "R4-026", "R4-027"),
    # 4. image-gen-4: 春蘅, 雨织
    ("image-gen-4(2).png", "1672x941", "R4-028", "R4-029"),
    # 5. image-gen-5: 岁安, 朔衡
    ("image-gen-5(2).png", "1672x941", "R4-030", "R5-001"),
    # 6. image-gen-6: 尘歌, 绯月
    ("image-gen-6(2).png", "1672x941", "R5-002", "R5-003"),
    # 7. image-gen-7: 曜烬, 梦璃
    ("image-gen-7(2).png", "1672x941", "R5-004", "R5-005"),
    # 8. image-gen-8: 溯白, 终祈
    ("image-gen-8(1).png", "1672x941", "R5-006", "R5-007"),
    # 9. image-gen-9: 时珩, 阿尔托莉雅
    ("image-gen-9(1).png", "1672x941", "R5-008", "saber"),
    # 10. image-gen-10: 间桐樱, 远坂凛
    ("image-gen-10(1).png", "1672x941", "sakura", "rin"),
    # 11. 卫宫与吉尔伽美什
    ("卫宫与吉尔伽美什的王者武装图鉴.png", "1672x941", "archer", "gilgamesh"),
    # 12. 心月狐 (single)
    ("心月狐_月影九尾灵契展卷.png", "xinyuehu_single", "xinyuehu", None),
    # 13. 暗花与深潮: 弗洛洛, 坎特雷拉
    ("暗花与深潮_星魂双生图鉴.png", "1672x941", "phrolova", "cantarella"),
    # 14. 风与潮汐: 优诺, 守岸人
    ("风与潮汐的星契图鉴.png", "1672x941", "yuno", "shorekeeper"),
    # 15. 沧澜, 炎煌
    ("wide_cinematic_concept_art_presentation_split_into.png", "1672x941", "canglan", "yanhuang"),
    # 16. 烬羽, 眠鸢
    ("wide_clean_concept_art_layout_on_a_dark_studio_ba.png", "1536x1024", "R4-012", "R4-013"),
    # 17. 灯禾, 绛音
    ("wide_cinematic_fantasy_concept_art_infographic.png", "1536x1024", "R4-018", "R4-019"),
    # 18. 汐辞, 暮刃
    ("a_wide_cinematic_concept_art_style_ui_board_on_a.png", "1536x1024", "R4-014", "R4-015"),
    # 19. 晷宁, 砺川
    ("a_clean_concept_art_portfolio_style_graphic_on_dar.png", "1536x1024", "R4-016", "R4-017"),
    # 20. 镜玄, 司命
    ("a_clean_concept_art_style_infographic_asset_sheet.png", "1536x1024", "jingxuan", "siming"),
    # 21. 南絮, 绯棠
    ("a_wide_clean_high_resolution_fantasy_concept_art.png", "1536x1024", "R4-010", "R4-011"),
    # 22. 岳衡, 霜砚
    ("a_wide_clean_poster_like_concept_art_layout_with.png", "1774x887", "yueheng", "R4-009"),
    # 23. 星璃, 玄照 (RGBA)
    ("wide_clean_concept_asset_layout_poster_game_art.png", "1536x1024_rgba", "astra", "xuanzhao"),
    # 24. 诺克缇娅, 凯尔 (RGBA)
    ("wide_fantasy_concept_art_style_layout_on_a_transpa.png", "1536x1024_rgba", "noctis", "kael"),
]

KINDS = ["weapon", "true-form", "vessel", "origin"]

def inpaint_text(crop_arr):
    # Inpaint bright text glyphs near margins
    h, w = crop_arr.shape[:2]
    # Check right side text strip (x > 0.78 * w, y > 0.35 * h)
    for (x1, y1, x2, y2) in [
        (int(w * 0.76), int(h * 0.35), int(w * 0.96), int(h * 0.90)),
        (int(w * 0.04), int(h * 0.40), int(w * 0.22), int(h * 0.90)),
    ]:
        roi = crop_arr[y1:y2, x1:x2]
        if roi.size == 0:
            continue
        lum = 0.299 * roi[:, :, 0] + 0.587 * roi[:, :, 1] + 0.114 * roi[:, :, 2]
        bg_lum = np.median(lum)
        text_pixels = lum > max(140, bg_lum + 45)
        if np.any(text_pixels):
            blurred = np.array(Image.fromarray(roi.astype(np.uint8)).filter(ImageFilter.MedianFilter(size=11)), dtype=np.float32)
            roi[text_pixels] = blurred[text_pixels]
            crop_arr[y1:y2, x1:x2] = roi

def process_item(im, box, is_rgba=False):
    x1, y1, x2, y2 = box
    crop = im.crop((x1, y1, x2, y2))
    w, h = crop.size
    
    if is_rgba:
        # RGBA source: preserve transparency and apply smooth border feather
        arr = np.array(crop.convert("RGBA"), dtype=np.float32)
        alpha = arr[:, :, 3]
        yy, xx = np.mgrid[0:h, 0:w]
        edge_dist = np.minimum(np.minimum(xx, w - 1 - xx), np.minimum(yy, h - 1 - yy))
        edge_feather = np.clip(edge_dist / 8.0, 0.0, 1.0)
        arr[:, :, 3] = alpha * edge_feather
        return Image.fromarray(arr.astype(np.uint8))
    
    # RGB source on dark / themed background
    arr = np.array(crop.convert("RGB"), dtype=np.float32)
    inpaint_text(arr)
    
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w * 0.50, h * 0.50
    rx, ry = w * 0.47, h * 0.47
    
    dist_norm = np.sqrt(((xx - cx) / rx)**2 + ((yy - cy) / ry)**2)
    # Smoothstep falloff in the outer 18% margin
    alpha = np.clip(1.0 - (dist_norm - 0.80) / 0.18, 0.0, 1.0)
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)
    
    # Text masks on very edge (first 4% and last 4% x)
    edge_x = np.minimum(xx, w - 1 - xx)
    alpha = alpha * np.clip(edge_x / 8.0, 0.0, 1.0)
    edge_y = np.minimum(yy, h - 1 - yy)
    alpha = alpha * np.clip(edge_y / 8.0, 0.0, 1.0)
    
    res_arr = np.dstack([arr, (alpha * 255.0).astype(np.uint8)])
    return Image.fromarray(res_arr.astype(np.uint8))

def get_boxes_for_row(fmt, is_top=True):
    # Returns 4 boxes [weapon, true-form, vessel, origin]
    if fmt == "1672x941":
        y1 = 65 if is_top else 525
        y2 = 445 if is_top else 910
        # 4 columns: [200, 568], [568, 936], [936, 1304], [1304, 1672]
        cols = [
            (205, 560),
            (575, 930),
            (945, 1295),
            (1310, 1665)
        ]
        return [(c[0], y1, c[1], y2) for c in cols]
    
    elif fmt == "xinyuehu_single":
        # Full height 4 columns
        y1, y2 = 80, 780
        cols = [
            (195, 560),
            (570, 935),
            (945, 1300),
            (1310, 1665)
        ]
        return [(c[0], y1, c[1], y2) for c in cols]
        
    elif fmt in ("1536x1024", "1536x1024_rgba"):
        y1 = 65 if is_top else 555
        y2 = 475 if is_top else 970
        cols = [
            (185, 515),
            (525, 855),
            (865, 1190),
            (1200, 1525)
        ]
        return [(c[0], y1, c[1], y2) for c in cols]
        
    elif fmt == "1774x887":
        y1 = 60 if is_top else 490
        y2 = 425 if is_top else 855
        cols = [
            (225, 595),
            (605, 985),
            (995, 1375),
            (1385, 1765)
        ]
        return [(c[0], y1, c[1], y2) for c in cols]

total_exported = 0
for sheet_name, fmt, top_id, bottom_id in SHEET_MAPPINGS:
    sheet_path = os.path.join(zip_dir, sheet_name)
    if not os.path.exists(sheet_path):
        print(f"WARNING: Missing sheet {sheet_name}")
        continue
    
    im = Image.open(sheet_path)
    is_rgba = "_rgba" in fmt
    
    # Process Top character
    if top_id:
        h_dir = os.path.join(out_base, top_id)
        os.makedirs(h_dir, exist_ok=True)
        boxes = get_boxes_for_row(fmt, is_top=True)
        for kind, box in zip(KINDS, boxes):
            out_img = process_item(im, box, is_rgba=is_rgba)
            target_file = os.path.join(h_dir, f"{kind}.png")
            out_img.save(target_file)
            if kind == "weapon":
                out_img.save(os.path.join(weapons_base, f"{top_id}.png"))
            total_exported += 1
            
    # Process Bottom character
    if bottom_id:
        h_dir = os.path.join(out_base, bottom_id)
        os.makedirs(h_dir, exist_ok=True)
        boxes = get_boxes_for_row(fmt, is_top=False)
        for kind, box in zip(KINDS, boxes):
            out_img = process_item(im, box, is_rgba=is_rgba)
            target_file = os.path.join(h_dir, f"{kind}.png")
            out_img.save(target_file)
            if kind == "weapon":
                out_img.save(os.path.join(weapons_base, f"{bottom_id}.png"))
            total_exported += 1
            
    print(f"Extracted sheet: {sheet_name} -> {top_id} / {bottom_id}")

print(f"\nFINISHED! Total assets processed and saved: {total_exported}")
