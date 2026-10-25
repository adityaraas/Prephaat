"""Extract heading-based visual panels, preserving vector art, tables and labels."""
import sys,json,re
from pathlib import Path
root=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(root/'tmp/pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
manifest=root/'public/data/history-source.json'
data=json.loads(manifest.read_text(encoding='utf-8'))
doc=fitz.open(root/'study material/V&R_Mains_Smasher_Ancient_and_Medieval_History,_Art_and_Culture.pdf')
out=root/'public/history-source'
count=0
for record in data['pages']:
    page=doc[record['number']-1]
    record['panels']=[]
    if record['number']<3: continue
    top=18; bottom=page.rect.height-38
    text_lines=[line['bbox'] for block in page.get_text('dict')['blocks'] for line in block.get('lines',[])]
    headings=[]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            spans=line.get('spans',[])
            text=' '.join(s['text'].strip() for s in spans).strip()
            y=line['bbox'][1]
            if top<=y<bottom and len(text)>5 and any(s['size']>=12 and s['flags']&16 for s in spans) and 'http' not in text:
                headings.append((max(top,y-4),text.replace('\x08',' ')))
    headings.sort()
    groups=[]
    for y,title in headings:
        if groups and (y-groups[-1][0]<65 or any(box[1]+1 < y < box[3]-1 for box in text_lines)):
            groups[-1]=(groups[-1][0],groups[-1][1]+' · '+title)
        else: groups.append((y,title))
    if not groups or groups[0][0]>top+65: groups.insert(0,(top,record['chapter']+' (continued)' if record['printedPage'] else record['chapter']))
    else: groups[0]=(top,groups[0][1])
    for i,(y,title) in enumerate(groups):
        end=groups[i+1][0]-3 if i+1<len(groups) else bottom
        if end-y<55: continue
        rect=fitz.Rect(30,y,page.rect.width-30,end)
        name=f"page-{record['number']:03d}-panel-{i+1}.jpg"
        pix=page.get_pixmap(matrix=fitz.Matrix(2,2),clip=rect)
        pix.save(str(out/name),jpg_quality=88)
        record['panels'].append(dict(image='/history-source/'+name,label=title,chapter=record['chapter'],page=record['number'],width=pix.width,height=pix.height,kind='source-panel'))
        count+=1
    for item in record.get('illustrations',[]):
        image_doc=fitz.Pixmap(str(root/'public'/item['image'].lstrip('/')))
        item['width']=image_doc.width; item['height']=image_doc.height
        item['page']=record['number']
        item['decorative']=image_doc.width/image_doc.height>5
    if record['number']%30==0: print('Visual panels through page',record['number'],flush=True)
manifest.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print('Extracted visual panels:',count)
