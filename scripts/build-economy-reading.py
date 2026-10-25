"""Build a complete topic reader for Rau's IAS Mains Compass of Economy.

Native text, ruled comparisons, embedded diagrams, and reviewed OCR pages are
assigned to exactly one semantic owner. Chapter contents become navigation.
"""
import collections,json,re,shutil,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/economy-ocr'))
sys.path.insert(0,str(ROOT/'tmp/polity-pdf-tools'))
import pymupdf as fitz
import cv2
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
OUT=ROOT/'public/economy-source';OUT.mkdir(exist_ok=True)
shutil.copyfile(next((ROOT/'study material').glob('Raus*Economy*.pdf')),OUT/'book.pdf')
DOC=fitz.open(OUT/'book.pdf')
CHAPTERS=[
 (8,'Agriculture and Allied Sector',50),(62,'Public Distribution System',3),
 (66,'Land Reforms',7),(72,'Inclusive Growth and Development',17),
 (94,'Banking and Finance',8),(108,'Budget and Taxation',16),
 (127,'Industrial Policy and LPG',5),(139,'Employment, Skills and Labour Reforms',7),
 (153,'External Sector',14),(175,'Infrastructure and Investment',24),
 (210,'Food Processing Industries',1),(212,'Planning in India',3)]
BULLET=re.compile(r'^(?:[•▪◦●○o]\s+|[\uf000-\uf8ff]\s*)')
FIXES=json.loads((ROOT/'scripts/economy-ocr-corrections.json').read_text(encoding='utf-8')) if (ROOT/'scripts/economy-ocr-corrections.json').exists() else {}
ACRONYMS=['MSP','PM','AASHA','KISAN','KUSUM','PMFBY','FPOs','NABFID','CBDC','GDP','TFP','FRBM','OECD','GST','PLI','SEZs','MSME','MSMEs','LPG','PPP','HAM','FTAs','IBC','PFMS','PDS','LFPR','NMP','NIP','PMUY','PMKVY','e-NAM','SC','LPS','DISCOMs']

def clean(text):
    text=text.replace('\u00ad','').replace('ﬁ','fi').replace('ﬂ','fl').replace('\x08',' ')
    return re.sub(r'\s+',' ',re.sub(r'[\x00-\x08\x0b-\x1f]',' ',text)).strip()

def title(text):
    text=clean(text).title()
    text=re.sub(r"(?<=[a-z])([’'])S\b",r'\1s',text)
    text=re.sub(r'(\d+)(St|Nd|Rd|Th)\b',lambda m:m[1]+m[2].lower(),text)
    for word in ACRONYMS:text=re.sub(r'\b'+re.escape(word)+r'\b',word,text,flags=re.I)
    return text

def line_ids(lines):return [l['id'] for l in lines]

def join(lines):
    result=''
    for line in lines:result+=('' if not result or result.endswith('-') else ' ')+line['text']
    return clean(result)

def row_order(lines):
    groups=[]
    for line in sorted(lines,key=lambda l:(l['rect'].y0,l['rect'].x0)):
        same=next((g for g in reversed(groups[-3:]) if abs(g[0]['rect'].y0-line['rect'].y0)<2),None)
        if same is not None:same.append(line)
        else:groups.append([line])
    return [sorted(g,key=lambda l:l['rect'].x0) for g in groups]

def paragraphs(lines):
    groups=[]
    for physical in row_order(lines):
        text=join(physical);rect=fitz.Rect(physical[0]['rect'])
        for l in physical:rect|=l['rect']
        bullet=BULLET.match(text)
        first=physical[0]
        starts_label=bool(re.match(r'^[^:]{2,75}:',text) and first['leadBold'])
        gap=rect.y0-groups[-1]['last'] if groups else 0
        numbered=bool(re.match(r'^\d+[.)]\s+\S',text))
        if not groups or bullet or numbered or starts_label or gap>17:
            groups.append(dict(lines=[],bullet=bool(bullet or numbered),level=2 if rect.x0>78 and bullet else 1,last=0,startsLabel=starts_label))
        groups[-1]['lines'].extend(physical);groups[-1]['last']=rect.y0
    output=[]
    for g in groups:
        text=join(g['lines']);text=BULLET.sub('',text,count=1)
        if text:output.append(dict(text=text,bullet=g['bullet'],level=g['level'],startsLabel=g['startsLabel'],lineIds=line_ids(g['lines'])))
    return output

def merge_vertical(segments):
    groups=[]
    for x,y0,y1 in sorted(segments):
        previous=next((g for g in reversed(groups) if abs(g[0]-x)<1 and y0<=g[2]+3 and y1>=g[1]-3),None)
        if previous:previous[1]=min(previous[1],y0);previous[2]=max(previous[2],y1)
        else:groups.append([x,y0,y1])
    return groups

def table_regions(vertical,horizontal):
    vertical=merge_vertical(vertical)
    merged_h=[]
    for x0,x1,y in sorted(horizontal,key=lambda l:(round(l[2]),l[0])):
        previous=next((h for h in reversed(merged_h) if abs(h[2]-y)<1 and x0<=h[1]+3 and x1>=h[0]-3),None)
        if previous:previous[0]=min(previous[0],x0);previous[1]=max(previous[1],x1)
        else:merged_h.append([x0,x1,y])
    horizontal=merged_h
    edges=sorted(set(round(y,1) for _,a,b in vertical for y in (a,b)))
    bands=[]
    for y0,y1 in zip(edges,edges[1:]):
        if y1-y0<1:continue
        raw_xs=sorted(set(round(x,1) for x,a,b in vertical if a-1<=(y0+y1)/2<=b+1))
        clusters=[]
        for x in raw_xs:
            if clusters and x-clusters[-1][-1]<2:clusters[-1].append(x)
            else:clusters.append([x])
        xs=[round(sum(c)/len(c),1) for c in clusters]
        # A frame alone is not a table. Comparisons require an internal column.
        if len(xs)<3:continue
        if xs[-1]-xs[0]<140:continue
        if bands and len(bands[-1]['xs'])==len(xs) and max(abs(a-b) for a,b in zip(bands[-1]['xs'],xs))<1.5 and y0-bands[-1]['bottom']<3:bands[-1]['bottom']=y1
        else:bands.append(dict(top=y0,bottom=y1,xs=xs))
    for band in bands:
        xs=band['xs'];top=band['top'];bottom=band['bottom']
        ys=[top,bottom]+[y for x0,x1,y in horizontal if top+1<y<bottom-1 and x0<xs[0]+3 and x1>xs[-1]-3]
        merged=[]
        for y in sorted(ys):
            if not merged or y-merged[-1]>2:merged.append(y)
        band['ys']=merged
    return [b for b in bands if b['bottom']-b['top']>18]

chapters=[];audit=[];all_lines={};represented=collections.Counter();scanned=[]
for ci,(start,ch_title,expected) in enumerate(CHAPTERS):
    end=CHAPTERS[ci+1][0] if ci+1<len(CHAPTERS) else 216
    chapter=dict(id=ci+1,title=ch_title,topics=[],practice=[],navigationLineIds=[],guide='Read the core idea, identify the issues and trade-offs, then organise the book’s recommendations into a balanced Mains answer.')
    chapters.append(chapter);topic=None;next_topic=1
    for number in range(start,end):
        page=DOC[number-1];ocr_path=ROOT/f'scripts/economy-ocr/page-{number:03}.json'
        is_ocr=ocr_path.exists();lines=[]
        if is_ocr:
            scanned.append(number)
            raw=json.loads(ocr_path.read_text(encoding='utf-8'))['lines']
            for i,l in enumerate(raw):
                text=FIXES.get(str(number),{}).get(str(i),l['text'])
                if not text:continue
                rect=fitz.Rect(l['bbox'])
                size=rect.height
                lines.append(dict(text=clean(text),rect=rect,size=size,bold=text.upper()==text,leadBold=bool(re.match(r'^[^:]{2,65}:',text)),block=i,ocr=True,confidence=l['confidence']))
        else:
            for bi,block in enumerate(page.get_text('dict')['blocks']):
                for l in block.get('lines',[]):
                    s=l['spans'];text=clean(''.join(x['text'] for x in s));rect=fitz.Rect(l['bbox'])
                    if not text or rect.y0<58 or rect.y0>777 or 'upscpdf.com' in text.lower():continue
                    nonempty=[x for x in s if x['text'].strip()]
                    if not nonempty:continue
                    bold=lambda x:bool(x['flags']&16 or 'Black' in x['font'])
                    lines.append(dict(text=text,rect=rect,size=max(x['size'] for x in nonempty),bold=all(bold(x) for x in nonempty),leadBold=bold(nonempty[0]),block=bi,ocr=False))
        for i,l in enumerate(lines):
            l['id']=f'p{number}-l{i+1}';all_lines[l['id']]=l
        claimed=set();events=[];vertical=[];horizontal=[]
        for draw in page.get_drawings():
            r=draw['rect']
            if r.y0<58 or r.y1>778 or r.x0<50 or r.x1>438:continue
            if r.width<1.5 and r.height>12 and r.x0<430:vertical.append((r.x0+r.width/2,r.y0,r.y1))
            elif r.height<1.5 and r.width>20:horizontal.append((r.x0,r.x1,r.y0+r.height/2))
        if is_ocr:
            pix=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5))
            img=cv2.imdecode(np.frombuffer(pix.tobytes('png'),np.uint8),cv2.IMREAD_GRAYSCALE)
            mask=cv2.threshold(img,140,255,cv2.THRESH_BINARY_INV)[1]
            for orient,kernel in [('v',cv2.getStructuringElement(cv2.MORPH_RECT,(1,50))),('h',cv2.getStructuringElement(cv2.MORPH_RECT,(70,1)))]:
                ruled=cv2.morphologyEx(mask,cv2.MORPH_OPEN,kernel)
                for contour in cv2.findContours(ruled,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)[0]:
                    x,y,w,h=cv2.boundingRect(contour);x/=2.5;y/=2.5;w/=2.5;h/=2.5
                    if y<58 or y+h>778 or x<50 or x+w>438:continue
                    if orient=='v' and w<3 and h>15:vertical.append((x+w/2,y,y+h))
                    if orient=='h' and h<3 and w>30:horizontal.append((x,x+w,y+h/2))

        def take(selected):
            result=[l for l in selected if l['id'] not in claimed];claimed.update(line_ids(result));return result
        def inside(rect):
            return [l for l in lines if l['id'] not in claimed and rect.contains((l['rect'].x0+1,(l['rect'].y0+l['rect'].y1)/2))]
        def event(kind,rect,selected=None,**values):
            e=dict(type=kind,_rect=rect,page=number,**values)
            if selected is not None:e['lineIds']=line_ids(take(selected))
            events.append(e);return e

        # The printed chapter outlines become navigation instead of duplicated notes.
        if number==start:
            marker=next((l for l in lines if 'TOPICS TO BE COVERED' in l['text']),None)
            if marker:
                bottoms=[y1 for x,y0,y1 in vertical if x<60 and marker['rect'].y0-10<=y0<=marker['rect'].y0+30 and y1>marker['rect'].y0+25]
                if bottoms:
                    bound=max(bottoms)
                    chosen=take([l for l in lines if l['rect'].y0<bound+2]);chapter['navigationLineIds'].extend(line_ids(chosen))
        if number==9:
            chosen=take([l for l in lines if l['rect'].y0<330]);chapter['navigationLineIds'].extend(line_ids(chosen))

        # Merge wrapped 14-point topic titles. On scanned pages the same numbered
        # titles are recognised by their larger uppercase OCR text.
        ordered=sorted(lines,key=lambda l:(l['rect'].y0,l['rect'].x0))
        for index,l in enumerate(ordered):
            if l['id'] in claimed:continue
            match=re.match(r'^(\d{1,2})\.\s*(\S.*)',l['text']) if not is_ocr else re.match(r'^(\d{1,2})\.?\s*([A-Z].*)',l['text'])
            native_heading=not is_ocr and abs(l['size']-14)<.6
            scan_heading=is_ocr and l['size']>=10 and l['text'].upper()==l['text'] and l['rect'].x0<85
            if match and int(match[1])==next_topic and (native_heading or scan_heading):
                group=[l];rect=fitz.Rect(l['rect'])
                for other in ordered[index+1:index+4]:
                    if other['id'] in claimed:continue
                    if other['rect'].y0-rect.y1>12 or other['rect'].x0>110:break
                    if re.match(r'^\d+\.',other['text']):break
                    if (not is_ocr and abs(other['size']-14)<.6) or (is_ocr and other['text'].upper()==other['text'] and other['size']>=10):group.append(other);rect|=other['rect']
                    else:break
                text=join(group);event('topic',rect,group,number=f'{ci+1}.{int(match[1])}',title=title(re.sub(r'^\d+\.?\s*','',text)));next_topic+=1

        for region in table_regions(vertical,horizontal):
            xs=region['xs'];ys=region['ys'];rows=[]
            for y0,y1 in zip(ys,ys[1:]):
                row=[]
                for x0,x1 in zip(xs,xs[1:]):
                    chosen=take(inside(fitz.Rect(x0-1,y0-1,x1-1,y1+1)))
                    row.append(dict(parts=paragraphs(chosen),lineIds=line_ids(chosen),bold=bool(chosen) and all(l['bold'] for l in chosen)))
                if any(c['parts'] for c in row):rows.append(row)
            if not rows:continue
            filled=[c for c in rows[0] if c['parts']]
            if len(filled)>=2 and all(c['bold'] for c in filled) and len(rows)>1:
                first=rows.pop(0);headers=[dict(text=' '.join(p['text'] for p in c['parts']) or 'Aspect',lineIds=c['lineIds']) for c in first]
            else:headers=[dict(text='Aspect' if i==0 else 'Details' if len(xs)==3 else f'Comparison {i+1}',lineIds=[]) for i in range(len(xs)-1)]
            for row in rows:
                for c in row:c.pop('bold')
            if rows:event('comparison',fitz.Rect(xs[0],ys[0],xs[-1],ys[-1]),headers=headers,rows=rows)

        for l in ordered:
            if l['id'] in claimed:continue
            heading=l['bold'] and l['size']>=9.8 and len(l['text'])<170
            if heading:
                group=[l];rect=fitz.Rect(l['rect'])
                for other in ordered[ordered.index(l)+1:ordered.index(l)+3]:
                    if other['id'] in claimed or not other['bold'] or abs(other['size']-l['size'])>1 or other['rect'].y0-rect.y1>6:break
                    group.append(other);rect|=other['rect']
                event('heading',rect,group,text=title(join(group)))

        # Plain-text blocks keep original paragraph boundaries; fragments sharing
        # a physical line are joined, while bullets and bold lead-ins stay separate.
        if is_ocr:
            cuts=sorted(e['_rect'].y0 for e in events if e['type'] in ('topic','heading','comparison'))
            for l in lines:l['block']=sum(y<=l['rect'].y0 for y in cuts)
        for bi in sorted(set(l['block'] for l in lines)):
            chosen=take([l for l in lines if l['block']==bi])
            if not chosen:continue
            rect=fitz.Rect(chosen[0]['rect'])
            for l in chosen:rect|=l['rect']
            event('body',rect,parts=paragraphs(chosen),lineIds=line_ids(chosen))

        images=[]
        for info in page.get_image_info(xrefs=True):
            rect=fitz.Rect(info['bbox'])&page.rect
            if not info.get('xref') or rect.width<65 or rect.height<35 or rect.get_area()>page.rect.get_area()*.65 or rect.y0<58 or rect.y1>778:continue
            if any(tuple(rect)==tuple(r) for r in images):continue
            near=next((r for r in images if abs(r.x0-rect.x0)<2 and abs(r.x1-rect.x1)<2 and -2<rect.y0-r.y1<2),None)
            if near:images[images.index(near)]=near|rect
            else:images.append(rect)
        for ii,rect in enumerate(images):
            path=OUT/f'page-{number:03}-figure-{ii+1}.jpg'
            page.get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=rect).save(path)
            pix=fitz.Pixmap(path)
            event('figure',rect,image='/economy-source/'+path.name,width=pix.width,height=pix.height,sourceBBox=list(rect))
        assert claimed==set(line_ids(lines)),(number,'unassigned source text')
        for e in sorted(events,key=lambda e:(e['_rect'].y0,e['_rect'].x0)):
            if e['type']=='topic':
                topic=dict(id='economy-'+e['number'].replace('.','-'),number=e['number'],title=e['title'],lineIds=e['lineIds'],elements=[],pages=[],ocrPages=[]);chapter['topics'].append(topic);continue
            if topic is None:
                topic=dict(id=f'economy-{ci+1}-overview',number=f'{ci+1}.0',title='Chapter Overview',lineIds=[],elements=[],pages=[],ocrPages=[]);chapter['topics'].append(topic)
            if number not in topic['pages']:topic['pages'].append(number)
            if is_ocr and number not in topic['ocrPages']:topic['ocrPages'].append(number)
            bounds=e.pop('_rect');e['id']=f'economy-{ci+1}-p{number}-{len(topic["elements"])}'
            if e['type']=='body':
                e['sourceBBox']=list(bounds)
                previous=topic['elements'][-1] if topic['elements'] else None
                if previous and previous['type']=='body' and previous['page']==number and bounds.y0-previous['sourceBBox'][3]<16:
                    if previous['parts'] and e['parts'] and not e['parts'][0]['bullet'] and not e['parts'][0]['startsLabel'] and not re.search(r'[.?!:;]$',previous['parts'][-1]['text']):
                        a=previous['parts'][-1];b=e['parts'].pop(0);a['text']+=('' if a['text'].endswith('-') else ' ')+b['text'];a['lineIds'].extend(b['lineIds'])
                    previous['parts'].extend(e['parts']);previous['lineIds'].extend(e['lineIds']);previous['sourceBBox'][3]=max(previous['sourceBBox'][3],bounds.y1)
                    continue
            if e['type']=='figure':
                context=next((item['text'] for item in reversed(topic['elements']) if item['type']=='heading'),topic['title'])
                e['caption']=context+' — source diagram or chart'
            topic['elements'].append(e)
        audit.append(dict(page=number,printedPage=number-7,method='ocr' if is_ocr else 'native',sourceLines=len(lines),navigationLines=sum(id in chapter['navigationLineIds'] for id in line_ids(lines))))
    actual=[int(t['number'].split('.')[-1]) for t in chapter['topics'] if not t['id'].endswith('overview')]
    assert actual==list(range(1,expected+1)),(ch_title,actual,expected)
    print(f'Built chapter {ci+1}: {len(actual)} numbered topics',flush=True)

for ch in chapters:
    represented.update(ch['navigationLineIds'])
    for topic in ch['topics']:
        represented.update(topic['lineIds'])
        for e in topic['elements']:
            if e['type']=='comparison':
                for h in e['headers']:represented.update(h['lineIds'])
                for row in e['rows']:
                    for c in row:represented.update(c['lineIds'])
            else:represented.update(e.get('lineIds',[]))
assert set(represented)==set(all_lines),('Missing',set(all_lines)-set(represented))
assert all(n==1 for n in represented.values()),'Duplicated source text'
for p in audit:p['representedLines']=sum(1 for id in represented if id.startswith(f'p{p["page"]}-'))
preface=[clean(b[4]) for b in DOC[1].get_text('blocks') if len(b)>4 and clean(b[4]) and 'upscpdf.com' not in b[4].lower()]
output=dict(version=2,title='Rau’s IAS Mains Compass of Economy',sourcePageCount=len(DOC),printedPageOffset=7,chapters=chapters,audit=audit,ocrPages=scanned,numberedTopicCount=155,preface=preface)
(ROOT/'public/data/economy-reading.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(chapters=len(chapters),topics=sum(len(c['topics']) for c in chapters),sourceLines=len(all_lines),ocrPages=scanned,comparisons=sum(e['type']=='comparison' for c in chapters for t in c['topics'] for e in t['elements']),figures=sum(e['type']=='figure' for c in chapters for t in c['topics'] for e in t['elements']))))
