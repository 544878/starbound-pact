"""Read-only PNG coverage/alpha audit for independently generated signature art."""
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
roster = json.loads((root / 'src/data/signatureArtDescriptions.json').read_text(encoding='utf-8'))
kinds = ['weapon', 'true-form', 'vessel', 'origin']
rows = []
for hero in roster:
    for kind in kinds:
        path = root / 'public/assets/signature-v2' / hero['id'] / f'{kind}.png'
        if kind == 'weapon' and not path.exists():
            path = root / 'public/assets/weapons' / f"{hero['id']}.png"
        row = {'id': hero['id'], 'name': hero['name'], 'kind': kind, 'exists': path.exists()}
        if path.exists():
            with Image.open(path) as im:
                alpha = im.convert('RGBA').getchannel('A')
                bbox = alpha.point(lambda v: 255 if v > 128 else 0).getbbox()
                row.update(size=list(im.size), transparent=alpha.getextrema()[0] == 0,
                           subjectBounds=bbox, bytes=path.stat().st_size,
                           subjectTouchesEdge=bool(bbox and (bbox[0] == 0 or bbox[1] == 0 or bbox[2] == im.width or bbox[3] == im.height)))
        rows.append(row)
report = {'expected': len(rows), 'present': sum(r['exists'] for r in rows), 'assets': rows,
          'note': 'Pixel checks do not replace visual review of model accuracy and clean edges.'}
(root / 'docs/signature-art/coverage.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({'expected': report['expected'], 'present': report['present'], 'edgeFlags': [r for r in rows if r.get('subjectTouchesEdge')]}, ensure_ascii=False))
