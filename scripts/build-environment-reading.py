"""Extract every included content page of Drishti's 25-page web preview.

The PDF samples non-consecutive printed pages. Never infer missing chapters from
its full-book contents. Text geometry uses baselines because this PDF's Cambria
font reports excessively tall glyph boxes. Tables use their actual ruled cells.
"""
import collections
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT/'tmp/governance-pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
OUT = ROOT/'public/environment-source'
OUT.mkdir(exist_ok=True)
shutil.copyfile(ROOT/'study material/Environment & Ecology (Quick Book) -For web.pdf', OUT/'book.pdf')
DOC = fitz.open(OUT/'book.pdf')
PRINTED = dict(zip(range(9,24), [11,18,32,49,50,60,87,96,97,102,104,110,141,151,234]))
CHAPTERS = [
 ('Biogeochemical Cycles', [9], 'Biogeochemical cycles'),
 ('Terrestrial Ecosystems', [10], 'Temperate forests — continued source extract'),
 ('Desertification', [11], 'Desertification in India (2003–05 to 2011–13)'),
 ('Aquatic Ecosystems', [12,13], 'Ramsar Convention — continued source extract'),
 ('Biodiversity', [14], 'Biodiversity'),
 ('International Union for Conservation of Nature', [15], 'IUCN'),
 ('Biodiversity in India', [16,17,18,19,20], 'Animal kingdom'),
 ('Pollution', [21,22], 'Smog'),
 ('Environmental Movements and Conventions', [23], 'Major environmental movements in India'),
]
CAPTIONS = {
 9:['Carbon cycle: exchange between the atmosphere, organisms, soil, water and fossil fuels'],
 10:['Temperate and boreal forest environments — source illustration'],
 12:['Ramsar Convention and international wetland conservation — source infographic'],
 13:['Wetland conservation organisations — source infographic'],
 14:['Biological diversity — source illustration', 'Centres of crop diversity — source illustration'],
 15:['IUCN conservation framework — source infographic'],
 16:['Animal kingdom: vertebrates and invertebrates, classification, characteristics and examples'],
 18:['Species diversity — source chart', 'Species diversity in different zones — source chart', 'Endemism — source reference graphic'],
 19:['Plant kingdom: cryptogams, phanerogams, characteristics, habitats and examples'],
 20:['Invasive alien species — source illustration'],
 21:['Smog and photochemical air pollution — source infographic'],
 22:['Marine pollution: sources and effects — source infographic'],
}

def clean(s):
    return re.sub(r'\s+', ' ', re.sub(r'[\x00-\x1f\x7f-\x9f]', ' ', s.replace('\u00ad',''))).strip()

def join(lines):
    result=''
    for line in lines: result+=('' if not result or result.endswith('-') else ' ')+line['text']
    return result.strip()

def paragraphs(lines):
    groups=[]
    for line in lines:
        if not groups or line['bullet'] or re.match(r'^\([ivx]+\)',line['text']):
            groups.append(dict(lines=[],bullet=line['bullet'],level=line['level']))
        groups[-1]['lines'].append(line)
    return [dict(text=join(g['lines']),bullet=g['bullet'],level=g['level']) for g in groups]

def flow(events):
    if len(events)<2:return events
    ordered=sorted(events,key=lambda e:e['_rect'].y0)
    bottom=ordered[0]['_rect'].y1
    for i,e in enumerate(ordered[1:],1):
        if e['_rect'].y0>bottom+2:return flow(ordered[:i])+flow(ordered[i:])
        bottom=max(bottom,e['_rect'].y1)
    ordered=sorted(events,key=lambda e:e['_rect'].x0)
    right=ordered[0]['_rect'].x1
    for i,e in enumerate(ordered[1:],1):
        if e['_rect'].x0>right+3:return flow(ordered[:i])+flow(ordered[i:])
        right=max(right,e['_rect'].x1)
    return sorted(events,key=lambda e:(round(e['_rect'].y0/3)*3,e['_rect'].x0))

chapters=[];audits=[];all_ids=set()
for ci,(title,pages,initial) in enumerate(CHAPTERS,1):
    chapter=dict(id=ci,title=title,topics=[],practice=[],guide='Read the definitions, compare the examples, and trace the processes in the source diagrams. These are selected pages from the supplied preview.')
    chapters.append(chapter);topic=None
    def new_topic(title):
        n=len(chapter['topics'])+1
        t=dict(id=f'environment-{ci}-{n}',number=f'{ci}.{n}',title=title,elements=[],pages=[],lineIds=[])
        chapter['topics'].append(t)
        return t
    for number in pages:
        page=DOC[number-1];lines=[];claimed=set();events=[]
        for bi,block in enumerate(page.get_text('dict')['blocks']):
            for li,line in enumerate(block.get('lines',[])):
                spans=[s for s in line['spans'] if s['text'].strip() and 'Wingdings' not in s['font']]
                if not spans:continue
                text=clean(''.join(s['text'] for s in line['spans'] if 'Wingdings' not in s['font']))
                if not text:continue
                baseline=spans[0]['origin'][1];size=max(s['size'] for s in spans)
                if baseline<62 or baseline>678:continue
                if number in (9,14,15) and (size>20 or (baseline<155 and 'Cambria-Bold' in spans[0]['font'])):continue
                x=min(s['origin'][0] for s in spans)
                rect=fitz.Rect(x,baseline-size*.85,max(s['bbox'][2] for s in spans),baseline+size*.2)
                bullet=any('Wingdings' in s['font'] for s in line['spans'])
                marker=next((s['text'] for s in line['spans'] if 'Wingdings' in s['font']),'')
                l=dict(id=f'p{number}-b{bi}-l{li}',text=text,rect=rect,block=bi,size=size,font=spans[0]['font'],bullet=bullet,level=2 if marker in ('z','\x99') else 1,x=x,y=baseline)
                lines.append(l);all_ids.add(l['id'])
        def take(selected):
            result=[l for l in selected if l['id'] not in claimed]
            claimed.update(l['id'] for l in result)
            return result
        def inside(rect):
            return [l for l in lines if l['id'] not in claimed and rect.x0-.5<=l['x']<rect.x1-.5 and rect.y0<l['y']<=rect.y1+1]
        def add(kind,rect,selected=None,**values):
            e=dict(type=kind,_rect=rect,page=number,**values)
            if selected is not None:e['lineIds']=[l['id'] for l in take(selected)]
            events.append(e);return e
        # Actual ruled comparisons, including headerless right-column continuations.
        regions=[]
        if number==11:
            regions=[([35.2,92.95,150.32,199.69,264.7],79.5,673.8,True),([282.7,340.45,397.82,447.19,512.2],62.6,618.5,False)]
        if number==17:
            regions=[([35.2,167.65,234.2,264.7],83.1,672,True),([282.7,415.15,481.7,512.2],62.6,673.8,False)]
        if number==18:
            regions=[([35.2,167.65,234.2,264.7],62.6,192.7,False),([35.2,125.89,302.3,512.2],611.7,673.8,True)]
        if number==23:
            regions=[([35.2,123.01,512.1],78.1,502.2,False),([35.2,189.97,512.1],522.5,673.8,True)]
        images=[]
        for info in page.get_image_info(xrefs=True):
            rect=fitz.Rect(info['bbox'])&page.rect
            if not info.get('xref') or rect.y0<60 or rect.y1>678 or rect.width<35 or rect.height<30:continue
            if any(tuple(rect)==tuple(r) for r in images):continue
            images.append(rect)
        captured=set()
        def figure(rect,caption,index):
            path=OUT/f'page-{number:03}-figure-{index+1}.png'
            matrix=fitz.Matrix(2.2,2.2)
            if number in (16,19):matrix.prerotate(90)
            pix=page.get_pixmap(matrix=matrix,clip=rect);pix.save(path)
            return dict(type='figure',image='/environment-source/'+path.name,width=pix.width,height=pix.height,caption=caption,page=number,lineIds=[])
        for xs,top,bottom,header in regions:
            cuts=[top,bottom]
            for draw in page.get_drawings():
                r=draw['rect']
                if abs(r.x0-xs[1])<1.5 and r.width<1.5 and r.height>4 and r.y0>=top-1 and r.y1<=bottom+1:cuts.extend([r.y0,r.y1])
                if r.height<1.5 and r.width>20 and abs(r.x0-xs[0])<1.5 and top+1<r.y0<bottom-1:cuts.append(r.y0)
            ys=[]
            for y in sorted(cuts):
                if not ys or y-ys[-1]>1.8:ys.append(y)
            if len(ys)>1 and bottom-ys[-1]<2:ys[-1]=bottom
            rows=[]
            for ri,(y0,y1) in enumerate(zip(ys,ys[1:])):
                row=[]
                for x0,x1 in zip(xs,xs[1:]):
                    rect=fitz.Rect(x0,y0,x1,y1);chosen=take(inside(rect))
                    cell=dict(parts=paragraphs(chosen),lineIds=[l['id'] for l in chosen])
                    for ii,img in enumerate(images):
                        if ii not in captured and rect.contains(img.tl) and img.x1<rect.x1+1 and img.y1<rect.y1+1:
                            captured.add(ii)
                            cell.setdefault('figures',[]).append(figure(img,join(chosen)+' — source species photograph',ii))
                    row.append(cell)
                if any(c['parts'] or c.get('figures') for c in row):rows.append(row)
            if header and rows:
                first=rows.pop(0);headers=[dict(text=' '.join(p['text'] for p in c['parts']),lineIds=c['lineIds']) for c in first]
            else:
                names=['State','Area under desertification','Percentage change','Cause'] if number==11 else ['Species','Habitat and distribution','IUCN status in source'] if number in (17,18) else ['Movement','Details']
                headers=[dict(text=n,lineIds=[]) for n in names]
            if rows:add('comparison',fitz.Rect(xs[0],top,xs[-1],bottom),headers=headers,rows=rows)
        # Practice occupies both columns below the shared heading on printed p110.
        if number==20:
            selected=take([l for l in lines if l['y']>=375])
            heading=[l for l in selected if 'PRACTICE QUESTIONS' in l['text']]
            answers=[l for l in selected if l['y']>635 and l['x']>275]
            rest=[l for l in selected if l not in heading and l not in answers]
            ordered=sorted(rest,key=lambda l:(l['x']>275,round(l['y']/2)*2,l['x']))
            questions=[];q=None
            for l in ordered:
                m=re.match(r'^(\d+)\.\s+(.+)',l['text'])
                if m and (l['x']<50 or 290<l['x']<300):
                    q=dict(number=int(m[1]),_lines=[],lineIds=[]);questions.append(q)
                assert q is not None,l
                q['_lines'].append(re.sub(r'^\d+\.\s+','',l['text'],count=1) if m and (l['x']<50 or 290<l['x']<300) else l['text']);q['lineIds'].append(l['id'])
            key=join(answers);answer_map={int(n):a for n,a in re.findall(r'(\d+)\.\s*\(([a-d])\)',key)}
            for q in questions:
                pieces=re.split(r'\(([a-d])\)\s*',' '.join(q.pop('_lines')))
                q['prompt']=pieces[0];q['options']=[dict(label=pieces[i],text=pieces[i+1].strip()) for i in range(1,len(pieces)-1,2)];q['answer']=answer_map[q['number']]
                assert [o['label'] for o in q['options']]==list('abcd'),q
            add('practice',fitz.Rect(35,370,512,674),questions=questions,lineIds=[l['id'] for l in heading+answers],answerKey=key)
        # The blue Lato labels are real topic headings. Bold body lead-ins remain
        # inside their bullets. Merge wrapped Lato headings before body grouping.
        for block in sorted(set(l['block'] for l in lines)):
            group=[l for l in lines if l['block']==block and l['id'] not in claimed]
            headings=[l for l in group if l['font'].startswith('Lato-Bold') and l['size']>=10.5]
            if headings:
                chosen=take(headings);rect=fitz.Rect(chosen[0]['rect'])
                for l in chosen:rect|=l['rect']
                add('topic',rect,title=join(chosen),lineIds=[l['id'] for l in chosen])
        for block in sorted(set(l['block'] for l in lines)):
            chosen=take([l for l in lines if l['block']==block]);
            if not chosen:continue
            rect=fitz.Rect(chosen[0]['rect'])
            for l in chosen:rect|=l['rect']
            add('body',rect,parts=paragraphs(chosen),lineIds=[l['id'] for l in chosen])
        for ii,rect in enumerate(images):
            if ii in captured:continue
            caption=CAPTIONS.get(number,[initial])
            value=figure(rect,caption[min(ii,len(caption)-1)],ii)
            value['_rect']=rect;events.append(value)
        assert claimed=={l['id'] for l in lines},number
        # Non-consecutive extracts never silently append to an unrelated topic.
        if number in (16,17,19,20,21,22,23):
            label={16:'Animal kingdom',17:'Indian species: distribution and IUCN status',19:'Plant kingdom',20:'Insectivorous plants — continued source extract',21:'Smog',22:'Nitrates',23:'Major environmental movements in India'}[number]
            topic=new_topic(label)
        if topic is None:topic=new_topic(initial)
        # PDF block order already traverses each column before the next. Geometry
        # alone can interleave short lines from opposing columns in this source.
        order={l['id']:i for i,l in enumerate(lines)}
        for event in events:
            ids=list(event.get('lineIds',[]))
            if event['type']=='comparison':
                ids=[i for h in event['headers'] for i in h['lineIds']]+[i for row in event['rows'] for cell in row for i in cell['lineIds']]
            if event['type']=='practice':ids+= [i for q in event['questions'] for i in q['lineIds']]
            if ids:event['_order']=min(order[i] for i in ids)
            else:
                rect=event['_rect']
                same_column=[l for l in lines if (rect.width>350 or (l['x']<275)==(rect.x0<275)) and l['y']<=rect.y0+3]
                event['_order']=max((order[l['id']] for l in same_column),default=-1)+.5
        for event in sorted(events,key=lambda e:e['_order']):
            event.pop('_order')
            kind=event['type']
            if kind=='topic':
                if event['title'].lower()==topic['title'].lower():pass
                else:topic=new_topic(event['title'])
                topic['lineIds'].extend(event['lineIds'])
            elif kind=='practice':
                event.pop('_rect');event['topic']=topic['id'];event['pages']=[number];event['title']='Source practice questions';chapter['practice'].append(event)
            else:
                event.pop('_rect');event['id']=f'{topic["id"]}-p{number}-{len(topic["elements"])}'
                previous=topic['elements'][-1] if topic['elements'] else None
                if kind=='body' and previous and previous['type']=='body' and previous['page']==number:
                    if event['parts'] and previous['parts'] and not event['parts'][0]['bullet'] and not re.search(r'[.?!:;]$',previous['parts'][-1]['text']):
                        first=event['parts'].pop(0)
                        previous['parts'][-1]['text']+=('' if previous['parts'][-1]['text'].endswith('-') else ' ')+first['text']
                    previous['parts'].extend(event['parts']);previous['lineIds'].extend(event['lineIds'])
                else:topic['elements'].append(event)
            if number not in topic['pages']:topic['pages'].append(number)
        audits.append(dict(page=number,printedPage=PRINTED[number],sourceLines=len(lines)))

for c in chapters:c['topics']=[t for t in c['topics'] if t['elements'] or t['lineIds'] or t['pages']]
owners=collections.Counter()
for c in chapters:
    for t in c['topics']:
        owners.update(t['lineIds'])
        for e in t['elements']:
            if e['type']=='comparison':
                for h in e['headers']:owners.update(h['lineIds'])
                for row in e['rows']:
                    for cell in row:owners.update(cell['lineIds'])
            else:owners.update(e.get('lineIds',[]))
    for b in c['practice']:
        owners.update(b['lineIds'])
        for q in b['questions']:owners.update(q['lineIds'])
assert set(owners)==all_ids, ('Missing',sorted(all_ids-set(owners)), 'Extra',sorted(set(owners)-all_ids))
assert all(n==1 for n in owners.values()),'Duplicate source line'
for p in audits:p['representedLines']=sum(i.startswith(f'p{p["page"]}-') for i in owners)
data=dict(version=1,title='Drishti Quick Book — Environment & Ecology (web preview)',sourcePageCount=len(DOC),printedPages=PRINTED,notice='This supplied web preview contains selected pages from the larger book. The reader includes all 15 sample content pages; the full-book contents also list chapters absent from this file. Figures, statistics and species status retain the source edition.',chapters=chapters,audit=audits)
(ROOT/'public/data/environment-reading.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(chapters=len(chapters),topics=sum(len(c['topics']) for c in chapters),sourceLines=len(owners),pages=len(audits),questions=sum(len(b['questions']) for c in chapters for b in c['practice']))))
