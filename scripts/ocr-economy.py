"""Cache OCR for the ten image-only pages in the supplied Rau's economy book."""
import json,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/economy-ocr'))
sys.path.insert(0,str(ROOT/'tmp/polity-pdf-tools'))
import pymupdf as fitz
import cv2
import numpy as np
from rapidocr_onnxruntime import RapidOCR
sys.stdout.reconfigure(encoding='utf-8')
doc=fitz.open(next((ROOT/'study material').glob('Raus*Economy*.pdf')))
folder=ROOT/'scripts/economy-ocr';folder.mkdir(exist_ok=True)
engine=None
for number in range(31,41):
    path=folder/f'page-{number:03}.json'
    if path.exists():continue
    if engine is None:engine=RapidOCR(det_model_path=str(ROOT/'tmp/economy-ocr/rapidocr_onnxruntime/models/ch_PP-OCRv3_det_infer.onnx'),det_limit_side_len=2200,det_limit_type='max',use_angle_cls=False)
    pix=doc[number-1].get_pixmap(matrix=fitz.Matrix(2.5,2.5))
    img=cv2.imdecode(np.frombuffer(pix.tobytes('png'),dtype=np.uint8),cv2.IMREAD_COLOR)
    result,_=engine(img)
    lines=[]
    for box,text,confidence in result or []:
        # Diagonal watermark lettering is decoration, never study content.
        if abs(box[1][1]-box[0][1])>abs(box[1][0]-box[0][0])*.15:continue
        xs=[p[0]/2.5 for p in box];ys=[p[1]/2.5 for p in box]
        bbox=[min(xs),min(ys),max(xs),max(ys)]
        if bbox[1]<58 or bbox[3]>777 or 'upscpdf' in text.lower() or 'material' in text.lower() and '.com' in text.lower():continue
        lines.append(dict(text=text,bbox=bbox,confidence=round(float(confidence),4)))
    path.write_text(json.dumps(dict(page=number,lines=lines),ensure_ascii=False,indent=2),encoding='utf-8')
    print(f'OCR page {number}: {len(lines)} text regions; {sum(l["confidence"]<.85 for l in lines)} to review',flush=True)
