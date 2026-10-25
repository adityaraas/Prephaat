"""Extract the supplied IR book's contents and real illustrations for the shared reader."""
import json
import re
import shutil
import sys
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'tmp/polity-pdf-tools'))
import pymupdf as fitz
folder = root / 'public/ir-source'
folder.mkdir(exist_ok=True)
shutil.copyfile(next((root / 'study material').glob('*International*Relations*.pdf')), folder / 'book.pdf')
doc = fitz.open(folder / 'book.pdf')
chapters = []
for match in re.finditer(r'(?:^|\n)(\d+)\.\s*(.+?)\.{3,}\s*\x08?(\d+)', doc[1].get_text(), re.S):
    chapters.append(dict(id=int(match[1]), title=' '.join(match[2].split()), pdfPage=int(match[3])+2))
assert len(chapters) == 7, chapters
pages = []
for number, page in enumerate(doc, 1):
    illustrations, seen = [], set()
    for info in page.get_image_info(xrefs=True):
        rect = fitz.Rect(info['bbox']) & page.rect
        if not info.get('xref') or rect.width < 45 or rect.height < 45 or rect.get_area() > page.rect.get_area() * .7 or tuple(rect) in seen:
            continue
        seen.add(tuple(rect))
        path = folder / f'page-{number:03}-figure-{len(illustrations)+1}.jpg'
        pix = page.get_pixmap(matrix=fitz.Matrix(2,2), clip=rect)
        pix.save(path)
        illustrations.append(dict(image='/ir-source/'+path.name, width=pix.width, height=pix.height))
    pages.append(dict(sections=['ir'], illustrations=illustrations))
manifest = dict(title='International Relations — Prelims Smasher 2026', printedPageOffset=2, chapters=chapters, pages=pages)
(root / 'public/data/ir-source.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2),encoding='utf-8')
print(f'Prepared {len(chapters)} chapters and {len(pages)} pages.',flush=True)
