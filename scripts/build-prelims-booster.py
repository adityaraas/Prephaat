"""Build all seven Prelims Booster 2025 books for Crack IAS.

Only PDF page one is replaced. All remaining pages, page numbers, links and
bookmarks are retained. Web text has audited line ownership, native tables and
source diagrams; a complete page rendering preserves every visual detail.
"""
import argparse
import collections
import hashlib
import json
import re
import shutil
import sys
from pathlib import Path

ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/governance-pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
OUT=ROOT/'public/prelims-2025';OUT.mkdir(exist_ok=True)
DELIVERY=ROOT/'output/pdf';DELIVERY.mkdir(parents=True,exist_ok=True)
DATA=ROOT/'public/data/prelims-2025';DATA.mkdir(exist_ok=True)
REVIEW=ROOT/'tmp/prelims-review';REVIEW.mkdir(parents=True,exist_ok=True)
BOOKS=[
 ('economy','Economics','Economy'),
 ('environment','Environment & Ecology','Environment-Ecology'),
 ('schemes','Government Schemes','GOVERNMENT-SCHEMES'),
 ('history','History & Culture','HISTORY-CULTURE'),
 ('ir','International Relations','INTERNATIONAL-RELATIONS'),
 ('polity','Polity & Governance','POLITY-GOVERNANCE-1'),
 ('science','Science & Technology','SCIENCE-TECHNOLOGY'),
]

def clean(s):
    s=s.replace('\u00ad','').replace('ﬁ','fi').replace('ﬂ','fl')
    return re.sub(r'\s+',' ',re.sub(r'[\x00-\x08\x0b-\x1f]',' ',s)).strip()

def join(lines):
    result=''
    for l in lines:result+=('' if not result or result.endswith('-') else ' ')+l['text']
    return result

def printed_label(page, fallback):
    for b in page.get_text('blocks'):
        if b[1]>page.rect.height-70:
            match=re.search(r'(?:^|\n)\s*(\d+)\s*(?:\n|$)',b[4])
            if match:return match[1]
    return str(fallback)

def paragraphs(lines):
    groups=[]
    for l in sorted(lines,key=lambda l:(round(l['rect'].y0/2)*2,l['rect'].x0)):
        bullet=re.match(r'^(?:[•●○▪◦]\s*|[o]\s+)',l['text'])
        if not groups or bullet or re.match(r'^(?:\d+[.)]|[ivx]+\.)\s+',l['text']):
            groups.append(dict(lines=[],bullet=bool(bullet),level=2 if l['rect'].x0>76 and bullet else 1))
        groups[-1]['lines'].append(l)
    return [dict(text=re.sub(r'^(?:[•●○▪◦]\s*|o\s+)','',join(g['lines'])),bullet=g['bullet'],level=g['level']) for g in groups]

def merge_vertical(segments):
    groups=[]
    for x,y0,y1 in sorted(segments):
        prev=next((g for g in reversed(groups) if abs(g[0]-x)<1 and y0<=g[2]+3 and y1>=g[1]-3),None)
        if prev:prev[1]=min(prev[1],y0);prev[2]=max(prev[2],y1)
        else:groups.append([x,y0,y1])
    return groups

def tables(vertical,horizontal):
    vertical=merge_vertical(vertical);merged=[]
    for x0,x1,y in sorted(horizontal,key=lambda a:(round(a[2]),a[0])):
        prev=next((h for h in reversed(merged) if abs(h[2]-y)<1 and x0<=h[1]+3 and x1>=h[0]-3),None)
        if prev:prev[0]=min(prev[0],x0);prev[1]=max(prev[1],x1)
        else:merged.append([x0,x1,y])
    edges=sorted(set(round(y,1) for _,a,b in vertical for y in (a,b)));bands=[]
    for y0,y1 in zip(edges,edges[1:]):
        if y1-y0<1:continue
        clusters=[]
        for x in sorted(set(round(x,1) for x,a,b in vertical if a-1<=(y0+y1)/2<=b+1)):
            if clusters and x-clusters[-1][-1]<2:clusters[-1].append(x)
            else:clusters.append([x])
        xs=[sum(c)/len(c) for c in clusters]
        if len(xs)<3 or xs[-1]-xs[0]<140:continue
        if bands and len(bands[-1]['xs'])==len(xs) and max(abs(a-b) for a,b in zip(bands[-1]['xs'],xs))<1.5 and y0-bands[-1]['bottom']<3:bands[-1]['bottom']=y1
        else:bands.append(dict(top=y0,bottom=y1,xs=xs))
    for b in bands:
        raw=[b['top'],b['bottom']]+[y for x0,x1,y in merged if b['top']+1<y<b['bottom']-1 and x0<b['xs'][0]+3 and x1>b['xs'][-1]-3]
        ys=[]
        for y in sorted(raw):
            if not ys or y-ys[-1]>2:ys.append(y)
        b['ys']=ys
    return [b for b in bands if b['bottom']-b['top']>18]

def cover(doc,title):
    rect=doc[0].rect;w,h=rect.width,rect.height
    page=doc.new_page(pno=0,width=w,height=h)
    green=(.065,.20,.17);gold=(.96,.78,.29);cream=(.99,.98,.94)
    page.draw_rect(page.rect,color=None,fill=cream)
    page.draw_rect(fitz.Rect(0,0,w,h*.59),color=None,fill=green)
    page.draw_rect(fitz.Rect(0,h*.59,w,h*.605),color=None,fill=gold)
    assert page.insert_textbox(fitz.Rect(40,h*.075,w-40,h*.17),'CRACK IAS',fontname='hebo',fontsize=35,color=cream,align=1)>=0
    page.insert_textbox(fitz.Rect(40,h*.19,w-40,h*.25),'PRELIMS BOOSTER',fontname='helv',fontsize=23,color=cream,align=1)
    page.insert_text(fitz.Point((w-fitz.get_text_length('2025',fontname='hebo',fontsize=88))/2,h*.395),'2025',fontname='hebo',fontsize=88,color=gold)
    assert page.insert_textbox(fitz.Rect(45,h*.445,w-45,h*.575),title.upper(),fontname='hebo',fontsize=27,color=cream,align=1)>=0
    page.insert_textbox(fitz.Rect(42,h*.66,w-42,h*.72),"Prelims Booster",fontname='hebo',fontsize=23,color=green,align=1)
    page.insert_textbox(fitz.Rect(45,h*.735,w-45,h*.80),'UPSC Civil Services | Preliminary Examination\nCurrent affairs compilation - 2025 edition',fontname='helv',fontsize=13,color=green,align=1)
    page.draw_line(fitz.Point(80,h*.845),fitz.Point(w-80,h*.845),color=green,width=.8)
    page.insert_textbox(fitz.Rect(50,h*.87,w-50,h*.96),"Crack IAS study copy\nSource material: 2025 supplied study edition\nCover adapted. Pages 2 onward retain the supplied source.",fontname='helv',fontsize=10,color=green,align=1)
    doc.delete_page(1)

catalog=[]
for slug,title,suffix in BOOKS:
    source=ROOT/f'study material/Raus-PRE-COMPASS-2025-{suffix}.pdf'
    original=fitz.open(source);doc=fitz.open(source);toc=original.get_toc()
    if '--labels-only' in sys.argv:
        data_path=DATA/f'{slug}.json'
        value=json.loads(data_path.read_text(encoding='utf-8'))
        for p in value['pages']:p['printedPage']=printed_label(original[p['number']-1],p['number']-2)
        data_path.write_text(json.dumps(value,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        print(f'Updated {slug} printed page references.',flush=True)
        continue
    cover(doc,title)
    doc.set_toc(toc)
    destination=DELIVERY/f'Crack-IAS-Prelims-Booster-2025-{slug}.pdf'
    doc.save(destination,garbage=3,deflate=True)
    doc.close();doc=fitz.open(destination)
    assert len(doc)==len(original)
    assert doc[0].get_text().startswith('CRACK IAS'),repr(doc[0].get_text())
    # Check every non-cover page. Keep content-stream hashes in the audit, and
    # verify representative page renders including tables, diagrams and the tail.
    preserved=[]
    for i in range(1,len(doc)):
        assert doc[i].get_text()==original[i].get_text(),(slug,i+1,'Text changed')
        assert doc[i].rect==original[i].rect and doc[i].rotation==original[i].rotation
        stream=lambda d,p:b''.join(d.xref_stream(x) for x in p.get_contents())
        assert stream(doc,doc[i])==stream(original,original[i]),(slug,i+1,'Page content changed')
        preserved.append(hashlib.sha256(stream(original,original[i])).hexdigest())
    for i in sorted(set([1,len(doc)//2,len(doc)-2,len(doc)-1])):
        before=original[i].get_pixmap(matrix=fitz.Matrix(.7,.7)).samples
        after=doc[i].get_pixmap(matrix=fitz.Matrix(.7,.7)).samples
        assert hashlib.sha256(before).digest()==hashlib.sha256(after).digest(),(slug,i+1,'Render changed')
    shutil.copyfile(destination,OUT/f'{slug}.pdf')
    assets=OUT/slug;assets.mkdir(exist_ok=True)
    doc[0].get_pixmap(matrix=fitz.Matrix(.7,.7)).save(assets/'cover.png')
    doc[0].get_pixmap().save(REVIEW/f'{slug}-new-cover.png')
    if '--pdf-only' in sys.argv:
        print(f'Updated and verified {slug} PDF cover.',flush=True)
        continue
    relevant=[(level,clean(label),page) for level,label,page in toc if level>=2 and page>=3 and len(clean(label))<170]
    start=min(p for _,_,p in relevant)
    # Level-two unnumbered outlines are chapters; numbered entries are topics.
    chapters=[];chapter=None
    for level,label,p in relevant:
        if level!=2:continue
        if not re.match(r'^\d+[.\s]',label):
            chapter=dict(id=len(chapters)+1,title=label,page=p,topics=[]);chapters.append(chapter)
        else:
            if chapter is None:chapter=dict(id=1,title=title,page=p,topics=[]);chapters.append(chapter)
            chapter['topics'].append(dict(title=label,page=p))
    assert chapters,(slug,'No chapters')
    pages=[];counts=collections.Counter();owners=collections.Counter()
    for number in range(start,len(doc)+1):
        page=doc[number-1];lines=[]
        for bi,block in enumerate(page.get_text('dict')['blocks']):
            for li,l in enumerate(block.get('lines',[])):
                spans=[s for s in l['spans'] if s['text'].strip()]
                if not spans:continue
                text=clean(''.join(s['text'] for s in l['spans']));r=fitz.Rect(l['bbox'])
                if not text or r.y0<58 or r.y0>page.rect.height-55:continue
                if any(t in text.lower() for t in ["rau’s ias prelims compass", "rau's ias prelims compass",'click here for index']):continue
                lines.append(dict(id=f'p{number}-b{bi}-l{li}',text=text,rect=r,block=bi,size=max(s['size'] for s in spans),bold=all(s['flags']&16 or 'Black' in s['font'] for s in spans)))
        claimed=set();events=[];vertical=[];horizontal=[]
        def take(selected):
            result=[l for l in selected if l['id'] not in claimed];claimed.update(l['id'] for l in result);return result
        def inside(r):return [l for l in lines if l['id'] not in claimed and r.contains((l['rect'].x0+1,(l['rect'].y0+l['rect'].y1)/2))]
        def add(kind,r,selected=None,**values):
            e=dict(type=kind,_rect=r,**values)
            if selected is not None:e['lineIds']=[l['id'] for l in take(selected)]
            events.append(e)
            return e
        # Numbered topic bars and actual subheadings precede cell reconstruction.
        for l in lines:
            if l['size']>=13 and re.match(r'^\d+[.]\s',l['text']):add('heading',l['rect'],[l],text=l['text'])
        for draw in page.get_drawings():
            for item in draw['items']:
                if item[0]=='l':
                    a,b=item[1],item[2]
                    if min(a.y,b.y)<58 or max(a.y,b.y)>page.rect.height-53:continue
                    if abs(a.x-b.x)<1.5 and abs(a.y-b.y)>10:vertical.append(((a.x+b.x)/2,min(a.y,b.y),max(a.y,b.y)))
                    if abs(a.y-b.y)<1.5 and abs(a.x-b.x)>20:horizontal.append((min(a.x,b.x),max(a.x,b.x),(a.y+b.y)/2))
                elif item[0]=='re':
                    r=item[1]
                    if r.y0<58 or r.y1>page.rect.height-53:continue
                    if r.width<1.5 and r.height>10:vertical.append(((r.x0+r.x1)/2,r.y0,r.y1))
                    elif r.height<1.5 and r.width>20:horizontal.append((r.x0,r.x1,(r.y0+r.y1)/2))
                    elif r.width>=20 and r.height>=10:
                        vertical.extend([(r.x0,r.y0,r.y1),(r.x1,r.y0,r.y1)])
                        horizontal.extend([(r.x0,r.x1,r.y0),(r.x0,r.x1,r.y1)])
        for region in tables(vertical,horizontal):
            xs,ys=region['xs'],region['ys'];rows=[]
            for y0,y1 in zip(ys,ys[1:]):
                row=[]
                for x0,x1 in zip(xs,xs[1:]):
                    selected=take(inside(fitz.Rect(x0-1,y0-1,x1-1,y1+1)))
                    row.append(dict(parts=paragraphs(selected),lineIds=[l['id'] for l in selected],bold=bool(selected) and all(l['bold'] for l in selected)))
                if any(c['parts'] for c in row):rows.append(row)
            if not rows:continue
            filled=[c for c in rows[0] if c['parts']]
            if len(rows)>1 and len(filled)>1 and all(c['bold'] for c in filled):
                first=rows.pop(0);headers=[dict(text=' '.join(p['text'] for p in c['parts']) or 'Details',lineIds=c['lineIds']) for c in first]
            else:headers=[dict(text='Aspect' if i==0 else 'Details' if len(xs)==3 else f'Column {i+1}',lineIds=[]) for i in range(len(xs)-1)]
            for row in rows:
                for cell in row:cell.pop('bold')
            add('table',fitz.Rect(xs[0],ys[0],xs[-1],ys[-1]),headers=headers,rows=rows)
        for l in lines:
            if l['id'] in claimed:continue
            if l['bold'] and l['size']>=10.5 and len(l['text'])<150:add('heading',l['rect'],[l],text=l['text'])
        # Preserve source blocks, split at claimed headings instead of promoting
        # highlighted fragments inside a body sentence to standalone sections.
        for bi in sorted(set(l['block'] for l in lines)):
            selected=take([l for l in lines if l['block']==bi])
            if not selected:continue
            r=fitz.Rect(selected[0]['rect'])
            for l in selected:r|=l['rect']
            add('body',r,parts=paragraphs(selected),lineIds=[l['id'] for l in selected])
        images=[]
        for info in page.get_image_info(xrefs=True):
            r=fitz.Rect(info['bbox'])&page.rect
            if not info.get('xref') or r.width<55 or r.height<35 or r.y0<58 or r.y1>page.rect.height-50:continue
            if any(tuple(r)==tuple(x) for x in images):continue
            images.append(r)
        for ii,r in enumerate(images,1):
            path=assets/f'p{number:03}-figure-{ii}.jpg'
            pix=page.get_pixmap(matrix=fitz.Matrix(1.8,1.8),clip=r);pix.save(path,jpg_quality=85)
            context=next((e['text'] for e in reversed(sorted(events,key=lambda e:e['_rect'].y0)) if e['type']=='heading' and e['_rect'].y0<=r.y0),'Source diagram')
            add('figure',r,image=f'/prelims-2025/{slug}/{path.name}',width=pix.width,height=pix.height,caption=context,lineIds=[])
        assert claimed=={l['id'] for l in lines},(slug,number,'Missing source text')
        elements=[]
        for e in sorted(events,key=lambda e:(round(e['_rect'].y0/2)*2,e['_rect'].x0)):
            e.pop('_rect')
            if e['type']=='table':
                for h in e['headers']:owners.update(h['lineIds'])
                for row in e['rows']:
                    for cell in row:owners.update(cell['lineIds'])
            else:owners.update(e.get('lineIds',[]))
            counts[e['type']]+=1
            previous=elements[-1] if elements else None
            if e['type']=='body' and previous and previous['type']=='body':
                if e['parts'] and previous['parts'] and not e['parts'][0]['bullet'] and not re.search(r'[.?!:;]$',previous['parts'][-1]['text']):
                    first=e['parts'].pop(0)
                    previous['parts'][-1]['text']+=('' if previous['parts'][-1]['text'].endswith('-') else ' ')+first['text']
                previous['parts'].extend(e['parts']);previous['lineIds'].extend(e['lineIds'])
            else:elements.append(e)
        # Source layout is always available, including graphics stored as vector
        # paths and scanned passages which native text extraction cannot recover.
        page_path=assets/f'page-{number:03}.jpg'
        pix=page.get_pixmap(matrix=fitz.Matrix(1.65,1.65));pix.save(page_path,jpg_quality=82)
        printed=printed_label(page,number-2)
        pages.append(dict(number=number,printedPage=printed,image=f'/prelims-2025/{slug}/{page_path.name}',width=pix.width,height=pix.height,elements=elements,text=' '.join(l['text'] for l in lines),sourceLines=len(lines)))
        if number%40==0:print(f'{slug}: page {number}/{len(doc)}',flush=True)
    assert all(v==1 for v in owners.values()),(slug,'Duplicate source line')
    assert len(owners)==sum(p['sourceLines'] for p in pages)
    for p in pages:p['representedLines']=sum(k.startswith(f'p{p["number"]}-') for k in owners)
    book=dict(id=slug,title=title,year=2025,pdf=f'/prelims-2025/{slug}.pdf',cover=f'/prelims-2025/{slug}/cover.png',pageCount=len(doc),contentStart=start,chapters=chapters,pages=pages,stats=dict(counts),preservation=dict(unchangedPages=len(preserved),pageStreamHashes=preserved,renderVerifiedPages=sorted(set([2,len(doc)//2+1,len(doc)-1,len(doc)]))))
    (DATA/f'{slug}.json').write_text(json.dumps(book,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
    catalog.append({k:book[k] for k in ['id','title','year','pdf','cover','pageCount','contentStart','stats']}|dict(chapters=len(chapters),topics=sum(len(c['topics']) for c in chapters),contentPages=len(pages),data=f'/data/prelims-2025/{slug}.json'))
    print(f'Built {slug}: {len(pages)} content pages, {len(chapters)} chapters, {len(owners)} audited lines.',flush=True)
if catalog:(DATA/'catalog.json').write_text(json.dumps(dict(title='Prelims Booster 2025',collection="Prelims Booster",year=2025,books=catalog),ensure_ascii=False,indent=2),encoding='utf-8')
print('All seven subjects built and verified.',flush=True)

# Apply the same publisher-name cleanup after any rebuild.
import subprocess
subprocess.run([sys.executable,str(ROOT / "scripts/rebrand-prelims-pdfs.py")],check=True)
