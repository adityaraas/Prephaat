"""Reconstruct the IR book's topics, lists, comparisons and question sets.

IR uses coloured cells and separately positioned question numbers. It needs its
own geometry-aware parser rather than the history book's bold-text heuristic.
"""
import collections
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/polity-pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
DOC = fitz.open(ROOT / 'public/ir-source/book.pdf')
MANIFEST = json.loads((ROOT / 'public/data/ir-source.json').read_text(encoding='utf-8'))
SECTION = re.compile(r'^([1-7]\.\d+(?:\.\d+)?)[. ]*\s+(.+)')
BULLET = re.compile(r'^(?:y\s+|[•▪❖♦\x89\x8b\uf000-\uf8ff]\s*)')
CAPTIONS = json.loads((ROOT/'scripts/ir-figure-captions.json').read_text(encoding='utf-8'))

def clean(value):
    value = value.replace('\u00ad','').replace('\x08',' ')
    return re.sub(r'\s+', ' ', re.sub(r'[\x00-\x08\x0b-\x1f]', ' ', value)).strip()

def join(lines):
    result = ''
    for line in lines:
        text = clean(line['text'])
        result += ('' if not result or result.endswith('-') else ' ') + text
    return result

def ids(lines):
    return [line['id'] for line in lines]

def paragraphs(lines):
    """Join wraps inside a cell, while keeping every bullet and sub-bullet separate."""
    groups = []
    for line in sorted(lines, key=lambda l:(round(l['rect'].y0/2)*2, l['rect'].x0)):
        text = line['text']
        bullet = BULLET.match(text)
        numbered = re.match(r'^\d+[.)]\s+\S', text)
        label = bool(re.match(r'^[^:]{2,70}:\s*$', text))
        gap = line['rect'].y0 - groups[-1]['lastY'] if groups else 0
        follows_number = bool(groups and re.match(r'^\d+\.$',join(groups[-1]['lines'])))
        if not groups or bullet or numbered or (label and not follows_number) or gap > 19:
            groups.append(dict(lines=[], bullet=bool(bullet or numbered), level=2 if text.startswith(('♦','\x8b')) else 1,lastY=0))
        groups[-1]['lines'].append(line)
        groups[-1]['lastY'] = line['rect'].y0
    output = []
    for group in groups:
        text = join(group['lines'])
        if BULLET.match(text): text = BULLET.sub('', text, count=1)
        if not text: continue
        output.append(dict(text=text, bullet=group['bullet'], level=group['level'], lineIds=ids(group['lines'])))
    return output

def flow(events):
    """Read horizontal bands first, then independent columns inside each band."""
    if len(events)<2: return events
    ordered=sorted(events,key=lambda e:e['_rect'].y0)
    bottom=ordered[0]['_rect'].y1
    for i,event in enumerate(ordered[1:],1):
        if event['_rect'].y0 > bottom+2:
            return flow(ordered[:i])+flow(ordered[i:])
        bottom=max(bottom,event['_rect'].y1)
    ordered=sorted(events,key=lambda e:e['_rect'].x0)
    right=ordered[0]['_rect'].x1
    for i,event in enumerate(ordered[1:],1):
        if event['_rect'].x0 > right+3:
            return flow(ordered[:i])+flow(ordered[i:])
        right=max(right,event['_rect'].x1)
    return sorted(events,key=lambda e:(round(e['_rect'].y0/3)*3,e['_rect'].x0))

chapters=[]
all_lines={}
audits=[]
practice=None
topic=None
section_count=0
for ci,chapter in enumerate(MANIFEST['chapters']):
    ch=dict(id=ci+1,title=chapter['title'],topics=[],practice=[])
    chapters.append(ch)
    topic=None
    practice=None
    end=MANIFEST['chapters'][ci+1]['pdfPage'] if ci+1<len(MANIFEST['chapters']) else len(DOC)+1
    for number in range(chapter['pdfPage'],end):
        page=DOC[number-1]
        lines=[]
        for bi,block in enumerate(page.get_text('dict')['blocks']):
            for line in block.get('lines',[]):
                spans=line['spans']; text=clean(''.join(s['text'] for s in spans));rect=fitz.Rect(line['bbox'])
                if not text or rect.y1<58 or rect.y0>page.rect.height-39: continue
                if any(x in text.lower() for x in ['upscpdf.com','delhiupscmaterial.in','only for premium members']):continue
                if text.isdigit() and (rect.y0>790 or max(s['size'] for s in spans)>23):continue
                item=dict(id=f'p{number}-l{len(lines)+1}',text=text,rect=rect,block=bi,
                          white=all(s['color']>0xeeeeee for s in spans if s['text'].strip()),
                          bold=all(s['flags']&16 for s in spans if s['text'].strip()),size=max(s['size'] for s in spans))
                lines.append(item)
                all_lines[item['id']]=item
        claimed=set();events=[]

        def take(selected):
            chosen=[l for l in selected if l['id'] not in claimed]
            claimed.update(ids(chosen))
            return chosen

        def inside(rect):
            return [l for l in lines if l['id'] not in claimed and rect.contains((l['rect'].x0+1,(l['rect'].y0+l['rect'].y1)/2))]

        def add(kind,rect,selected=None,**values):
            event=dict(type=kind,_rect=rect,page=number,**values)
            if selected is not None:event['lineIds']=ids(take(selected))
            events.append(event)
            return event

        # True topic headings are numbered, teal and larger than body text.
        for line in lines:
            match=SECTION.match(line['text'])
            if match and line['size']>=12:
                add('topic',line['rect'],[line],title=clean(match[2]),number=match[1])
            elif line['size']>=20 and clean(chapter['title']).lower() in line['text'].lower():
                add('chapter-title',line['rect'],[line],text=line['text'])

        # Extract question batches before study-cell reconstruction. Batches may
        # continue on the next page; their source answer key closes the batch.
        for line in sorted(lines,key=lambda l:(round(l['rect'].y0/2)*2,l['rect'].x0)):
            if line['id'] in claimed:continue
            if 'UPSC Prelims PYQs' in line['text']:
                add('practice-start',line['rect'],[line])
            elif re.match(r'^Answers?\s*:',line['text'],re.I):
                add('practice-answer',line['rect'],[line],text=line['text'])
        boundaries=sorted([e for e in events if e['type'] in ('topic','practice-start','practice-answer')],key=lambda e:e['_rect'].y0)
        reading=practice is not None
        cut=58
        for boundary in boundaries+[dict(type='end',_rect=fitz.Rect(0,page.rect.height-39,600,page.rect.height-39))]:
            y=boundary['_rect'].y0
            if reading:
                chosen=take([l for l in lines if cut<=l['rect'].y0<y])
                if chosen:add('practice-lines',fitz.Rect(38,cut,558,y),textLines=[dict(id=l['id'],text=l['text'],x=round(l['rect'].x0,1),y=round(l['rect'].y0,1)) for l in sorted(chosen,key=lambda l:(round(l['rect'].y0/2)*2,l['rect'].x0))])
            if boundary['type']=='practice-start':reading=True
            elif boundary['type'] in ('practice-answer','topic'):reading=False
            cut=boundary['_rect'].y1 if boundary['type']=='practice-start' else y

        # Coloured fill strips are merged into the original cells, not confused
        # with bold text. This recovers the tables that line-based detection missed.
        green=[];dark=[]
        for draw in page.get_drawings():
            color=draw.get('fill');rect=draw['rect']
            if not color or len(color)<3 or rect.x0<30 or rect.y0<58 or rect.y1>page.rect.height-38 or rect.width<30 or rect.height<8:continue
            r,g,b=color[:3]
            if r<.9 and g>.85 and b>.75:green.append(dict(rect=fitz.Rect(rect),color=tuple(round(c,2) for c in color)))
            elif r<.12 and .25<g<.6 and .25<b<.65:dark.append(fitz.Rect(rect))
        merged=[]
        for cell in sorted(green,key=lambda c:(round(c['rect'].x0),c['rect'].y0)):
            rect=cell['rect']
            previous=next((m for m in reversed(merged) if abs(m['rect'].x0-rect.x0)<1 and abs(m['rect'].x1-rect.x1)<1 and m['color']==cell['color'] and -4<rect.y0-m['rect'].y1<.8),None)
            if previous:previous['rect']|=rect
            else:merged.append(cell)
        header_groups=[]
        for rect in sorted(dark,key=lambda r:r.y0):
            if header_groups and abs(header_groups[-1][0].y0-rect.y0)<2:header_groups[-1].append(rect)
            else:header_groups.append([rect])
        for group in header_groups:
            group=sorted(group,key=lambda r:r.x0)
            if len(group)<2 or any(a.x1>b.x0+2 for a,b in zip(group,group[1:])):continue
            # A comparison header defines its actual column boundaries.
            top=min(r.y0 for r in group);stop=page.rect.height-39
            stops=[e['_rect'].y0 for e in events if e['_rect'].y0>top+5 and e['type'] in ('topic','practice-start')]
            stops += [r.y0 for r in dark if r.y0>max(r.y1 for r in group)+2 and r.width>480]
            stops += [g[0].y0 for g in header_groups if g[0].y0>top+5 and len(g)>1]
            if stops:stop=min(stops)
            first=group[0]
            rowcells=sorted([c['rect'] for c in merged if abs(c['rect'].x0-first.x0)<2 and abs(c['rect'].x1-first.x1)<3 and c['rect'].y0>=first.y1-2 and c['rect'].y0<stop],key=lambda r:r.y0)
            if not rowcells:continue
            headers=[]
            for rect in group:
                selected=take(inside(rect+(-2,-3,2,3)));headers.append(dict(text=join(selected),lineIds=ids(selected)))
            rows=[]
            for ri,rect in enumerate(rowcells):
                bottom=min(stop,rowcells[ri+1].y0 if ri+1<len(rowcells) else rect.y1+2)
                row=[]
                for col in group:
                    cellrect=fitz.Rect(col.x0-1,rect.y0-2,col.x1+1,bottom-1)
                    chosen=take(inside(cellrect));row.append(dict(parts=paragraphs(chosen),lineIds=ids(chosen)))
                if any(c['parts'] for c in row):rows.append(row)
            if rows:
                add('comparison',fitz.Rect(first.x0,top,group[-1].x1,max(r.y1 for r in rowcells)),headers=headers,rows=rows)

        # Real heading bars are short white titles. Long white annotations remain
        # callouts; body sentences and highlighted words never become headings.
        # Two-column tables frequently continue without a repeated header. Keep
        # each institution/region paired with its own facts instead of reading
        # every label down the left column before the right-column descriptions.
        for cell in sorted(merged,key=lambda c:c['rect'].y0):
            rect=cell['rect']
            if rect.x0>50 or rect.width>190:continue
            label=inside(rect+(-1,-2,1,1))
            if not label:continue
            partners=[c['rect'] for c in merged if c['color']==cell['color'] and c['rect'].x0>rect.x1 and c['rect'].y0<rect.y1 and c['rect'].y1>rect.y0]
            if not partners:continue
            details=[]
            for partner in partners:
                region=partner & fitz.Rect(partner.x0-1,rect.y0-2,partner.x1+1,rect.y1+1)
                details.extend(inside(region))
            details=list({l['id']:l for l in details}.values())
            if not details:continue
            label=take(label);details=take(details)
            extent=fitz.Rect(rect)
            for partner in partners:extent|=partner
            add('entry',extent,labelParts=paragraphs(label),parts=paragraphs(details),lineIds=ids(label)+ids(details))
        for rect in dark:
            selected=inside(rect+(-1,-2,1,3))
            if not selected:continue
            selected=take(selected);text=join(selected)
            kind='heading' if len(text)<140 and all(l['bold'] for l in selected) else 'callout'
            add(kind,rect,text=text,lineIds=ids(selected))
        for cell in merged:
            rect=cell['rect'];selected=take(inside(rect+(-1,-2,1,1)))
            if selected:add('body',rect,parts=paragraphs(selected),lineIds=ids(selected))
        # Plain text, detached labels and table continuations retain their block
        # boundaries. No source content is silently discarded.
        for bi in sorted(set(l['block'] for l in lines)):
            remaining=take([l for l in lines if l['block']==bi])
            if not remaining:continue
            rect=fitz.Rect(remaining[0]['rect'])
            for line in remaining:rect|=line['rect']
            add('body',rect,parts=paragraphs(remaining),lineIds=ids(remaining))

        # Keep actual maps and comparison graphics at a comfortable reading size.
        infos=[]
        for info in page.get_image_info(xrefs=True):
            rect=fitz.Rect(info['bbox'])&page.rect
            if not info.get('xref') or rect.width<45 or rect.height<45 or rect.get_area()>page.rect.get_area()*.7 or tuple(rect) in [tuple(r) for r in infos]:continue
            infos.append(rect)
        for image,rect in zip(MANIFEST['pages'][number-1]['illustrations'],infos):
            if rect.y0<125 and rect.x0>430:continue
            if len(page.get_textbox(rect).strip())>65 and rect.width>200:continue
            add('figure',rect,image=image['image'],width=image['width'],height=image['height'])
        assert claimed==set(ids(lines)),(number,'Unrepresented source lines')

        for event in flow(events):
            kind=event['type']
            if kind=='chapter-title':
                ch.setdefault('navigationLineIds',[]).extend(event['lineIds']);continue
            if kind=='topic':
                topic=dict(id='ir-'+event['number'].replace('.','-'),number=event['number'],title=event['title'],lineIds=event['lineIds'],elements=[],pages=[])
                ch['topics'].append(topic);section_count+=1;continue
            if topic is None:
                topic=dict(id=f'ir-{ci+1}-intro',number=str(ci+1),title='Overview',lineIds=[],elements=[],pages=[])
                ch['topics'].append(topic)
            if number not in topic['pages']:topic['pages'].append(number)
            if kind=='practice-start':
                practice=dict(topic=topic['id'],title=topic['title'],pages=[number],lineIds=event['lineIds'],lines=[],answerKey='')
                ch['practice'].append(practice);continue
            if kind=='practice-lines':
                if practice is None:
                    practice=dict(topic=topic['id'],title=topic['title'],pages=[number],lineIds=[],lines=[],answerKey='');ch['practice'].append(practice)
                practice['lines'].extend(event['textLines'])
                if number not in practice['pages']:practice['pages'].append(number)
                continue
            if kind=='practice-answer':
                if practice is not None:
                    practice['answerKey']=event['text'];practice['lineIds'].extend(event['lineIds']);practice=None
                else:topic['elements'].append(dict(type='callout',text=event['text'],lineIds=event['lineIds'],page=number))
                continue
            event.pop('_rect');event['id']=f'ir-{ci+1}-{number}-{len(topic["elements"])}'
            if kind=='figure':
                context=next((e['text'] for e in reversed(topic['elements']) if e['type']=='heading'),topic['title'])
                event['caption']=CAPTIONS.get(event['image'].split('/')[-1],context+' — map or reference graphic')
            topic['elements'].append(event)
        audits.append(dict(page=number,sourceLines=len(lines)))
    print('Structured chapter',ci+1,flush=True)

# Turn question numbers, stems, statements and choices into distinct question cards.
for ch in chapters:
    for batch in ch['practice']:
        questions=[];q=None
        for line in batch.pop('lines'):
            if re.match(r'^\d+\.$',line['text']) and line['x']<86:
                q=dict(number=int(line['text'][:-1]),lines=[],lineIds=[line['id']]);questions.append(q)
            else:
                if q is None:q=dict(number=1,lines=[],lineIds=[]);questions.append(q)
                q['lines'].append(line['text']);q['lineIds'].append(line['id'])
        answers={int(n):letter.lower() for n,letter in re.findall(r'(\d+)\s*\.?\s*\(([a-d])\)',batch['answerKey'],re.I)}
        for q in questions:
            text=' '.join(q.pop('lines'));pieces=re.split(r'\(([a-d])\)\s*',text)
            q['prompt']=pieces[0].strip();q['options']=[]
            for i in range(1,len(pieces)-1,2):q['options'].append(dict(label=pieces[i],text=pieces[i+1].strip()))
            q['answer']=answers.get(q['number'])
        batch['questions']=questions

# Account for source lines through their final semantic owner, exactly once.
represented=collections.Counter()
for ch in chapters:
    represented.update(ch.get('navigationLineIds',[]))
    for t in ch['topics']:
        represented.update(t['lineIds'])
        for e in t['elements']:
            if e['type']=='comparison':
                for h in e['headers']:represented.update(h['lineIds'])
                for row in e['rows']:
                    for cell in row:represented.update(cell['lineIds'])
            else:represented.update(e.get('lineIds',[]))
    for batch in ch['practice']:
        represented.update(batch['lineIds'])
        for q in batch['questions']:represented.update(q['lineIds'])
assert set(represented)==set(all_lines),(set(all_lines)-set(represented),'missing source text')
assert all(n==1 for n in represented.values()),'Duplicate source text'
for audit in audits:audit['representedLines']=sum(1 for id in represented if id.startswith(f'p{audit["page"]}-'))
output=dict(version=2,title=MANIFEST['title'],sourcePageCount=len(DOC),chapters=chapters,audit=audits)
(ROOT/'public/data/ir-reading.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(chapters=len(chapters),topics=section_count,sourceLines=len(all_lines),questions=sum(len(b['questions']) for c in chapters for b in c['practice']),figures=sum(e['type']=='figure' for c in chapters for t in c['topics'] for e in t['elements']),comparisons=sum(e['type']=='comparison' for c in chapters for t in c['topics'] for e in t['elements']))))
