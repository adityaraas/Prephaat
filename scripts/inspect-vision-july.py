"""Render reference pages for read-only layout review of the supplied magazine."""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'tmp/vision-render-tools'))
import pymupdf

source = ROOT / 'study material/vision ias _current_affairs_july_2026.pdf'
output = ROOT / 'tmp/vision-july-2026'
output.mkdir(parents=True, exist_ok=True)
document = pymupdf.open(source)
for number in [1, 6, 8, 20, 31, 58, 75]:
    path = output / f'page-{number:02}.png'
    document[number - 1].get_pixmap(matrix=pymupdf.Matrix(1.15, 1.15)).save(path)
    print(path)
