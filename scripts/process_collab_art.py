import os
from PIL import Image, ImageFilter
import numpy as np

# 1. Seamless scenic stitching
def process_scenic(in_path, out_path, cut1, cut2):
    im = Image.open(in_path).convert('RGB')
    w, h = im.size # 1536, 1024
    
    # cut1: (left_end, mid_start)
    # cut2: (mid_end, right_start)
    p1 = im.crop((0, 0, cut1[0], h)).resize((512, 1024), Image.Resampling.LANCZOS)
    p2 = im.crop((cut1[1], 0, cut2[0], h)).resize((512, 1024), Image.Resampling.LANCZOS)
    p3 = im.crop((cut2[1], 0, w, h)).resize((512, 1024), Image.Resampling.LANCZOS)
    
    out_im = Image.new('RGB', (1536, 1024))
    out_im.paste(p1, (0, 0))
    out_im.paste(p2, (512, 0))
    out_im.paste(p3, (1024, 0))
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    out_im.save(out_path, 'PNG')
    print(f'Processed scenic -> {out_path}')

# Aventurine scenic
process_scenic(
    'c4e2f78060c1c4ff6e53d05c2a70e1c5.jpg',
    'public/assets/characters/scenic/aventurine_waves.png',
    cut1=(503, 514),
    cut2=(1022, 1033)
)

# Robin scenic
process_scenic(
    'bc5601e0a8e5a33cdd742a749d86f866.png',
    'public/assets/characters/scenic/robin_lovesong.png',
    cut1=(508, 513),
    cut2=(1026, 1031)
)

# Save joint illustration
im_joint = Image.open('1b487ef2dde6b0bb32362609d1ef2045.jpg')
im_joint.save('public/assets/hsr-summer-resort.jpg', 'JPEG', quality=95)
print('Saved joint resort illustration -> public/assets/hsr-summer-resort.jpg')

# 2. Extract 4-item signature sets
def process_item(crop):
    w, h = crop.size
    arr = np.array(crop.convert('RGB'), dtype=np.float32)
    
    # Feathered ellipse alpha mask
    yy, xx = np.mgrid[0:h, 0:w]
    cx, cy = w * 0.50, h * 0.50
    rx, ry = w * 0.47, h * 0.47
    
    dist_norm = np.sqrt(((xx - cx) / rx)**2 + ((yy - cy) / ry)**2)
    alpha = np.clip(1.0 - (dist_norm - 0.80) / 0.18, 0.0, 1.0)
    alpha = alpha * alpha * (3.0 - 2.0 * alpha)
    
    edge_x = np.minimum(xx, w - 1 - xx)
    alpha = alpha * np.clip(edge_x / 8.0, 0.0, 1.0)
    edge_y = np.minimum(yy, h - 1 - yy)
    alpha = alpha * np.clip(edge_y / 8.0, 0.0, 1.0)
    
    res = np.dstack([arr, (alpha * 255.0).astype(np.uint8)])
    return Image.fromarray(res.astype(np.uint8))

def extract_signature_quad(sheet_path, char_id, col_bounds, y_bounds):
    im = Image.open(sheet_path).convert('RGB')
    sig_dir = f'public/assets/signature-v2/{char_id}'
    os.makedirs(sig_dir, exist_ok=True)
    os.makedirs('public/assets/weapons', exist_ok=True)
    
    kinds = ['weapon', 'vessel', 'origin', 'true-form']
    for kind, (x1, x2), (y1, y2) in zip(kinds, col_bounds, y_bounds):
        crop = im.crop((x1, y1, x2, y2))
        proc = process_item(crop)
        out_sig = os.path.join(sig_dir, f'{kind}.png')
        proc.save(out_sig, 'PNG')
        print(f'Saved {char_id} {kind} -> {out_sig} ({proc.size})')
        if kind == 'weapon':
            out_weapon = f'public/assets/weapons/{char_id}.png'
            proc.save(out_weapon, 'PNG')
            print(f'Saved weapon sprite -> {out_weapon}')

# Extract Robin quad
# Col 0: weapon, Col 1: vessel, Col 2: origin, Col 3: true-form
extract_signature_quad(
    'b53e6f8dd813ac81e60db2f4a7d4f150.jpg',
    'robin_lovesong',
    col_bounds=[(25, 435), (450, 825), (840, 1225), (1245, 1655)],
    y_bounds=[(60, 840), (80, 780), (70, 780), (80, 780)]
)

# Extract Aventurine quad
# Col 0: weapon, Col 1: vessel, Col 2: origin, Col 3: true-form
extract_signature_quad(
    '757e0a2dbc243a66ad9dbc7a17b63abf.jpg',
    'aventurine_waves',
    col_bounds=[(25, 425), (440, 825), (845, 1235), (1255, 1655)],
    y_bounds=[(60, 840), (70, 780), (70, 780), (80, 780)]
)

print('All assets extracted and organized successfully!')
