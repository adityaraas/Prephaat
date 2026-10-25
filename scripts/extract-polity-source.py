"""Prepare the polity book and chapter/illustration manifest for the semantic reader.

Run this script, then python scripts/build-readable-history.py --polity.
"""
import json
import re
import shutil
import sys
from pathlib import Path

root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'tmp/polity-pdf-tools'))
import pymupdf as fitz

folder = root / 'public/polity-source'
folder.mkdir(exist_ok=True)
shutil.copyfile(root / 'study material/V&R Mains Smasher Polity 2026 (2).pdf', folder / 'book.pdf')
doc = fitz.open(folder / 'book.pdf')
toc = '\n'.join(doc[i].get_text() for i in (1, 2))
chapters = []
for match in re.finditer(r'(?:^|\n)(\d+)\.\s+(.+?)\.{3,}\s*\x08?(\d+)', toc, re.S):
    chapters.append(dict(id=int(match[1]), title=' '.join(match[2].split()), pdfPage=int(match[3]) + 3))
assert len(chapters) == 37, len(chapters)
pages = []
for number, page in enumerate(doc, 1):
    illustrations = []
    seen = set()
    for info in page.get_image_info(xrefs=True):
        rect = fitz.Rect(info['bbox']) & page.rect
        if not info.get('xref') or rect.width < 45 or rect.height < 45 or rect.get_area() > page.rect.get_area() * .7 or tuple(rect) in seen:
            continue
        seen.add(tuple(rect))
        path = folder / f'page-{number:03}-figure-{len(illustrations)+1}.jpg'
        pix = page.get_pixmap(matrix=fitz.Matrix(2, 2), clip=rect)
        pix.save(path)
        illustrations.append(dict(image='/polity-source/' + path.name, width=pix.width, height=pix.height))
    pages.append(dict(sections=['polity'], illustrations=illustrations))
(root / 'public/data/polity-source.json').write_text(json.dumps(dict(title='Polity — Mains Smasher 2026', chapters=chapters, pages=pages), ensure_ascii=False, indent=2), encoding='utf-8')
print(f'Prepared {len(chapters)} polity chapters and {len(pages)} source pages.')
