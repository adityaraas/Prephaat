"""Build the supplied Vision IAS Governance book for the shared IR reader.

Requires PyMuPDF. Embedded diagrams retain their original content; PDF line IDs
provide an audit of every included body line. Re-run after replacing the source.
"""
import collections
import json
import re
import shutil
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tmp/governance-pdf-tools'))
import pymupdf as fitz

sys.stdout.reconfigure(encoding='utf-8')
OUT = ROOT / 'public/governance-source'
OUT.mkdir(exist_ok=True)
shutil.copyfile(ROOT / 'study material/dec31-governance.pdf', OUT / 'book.pdf')
doc = fitz.open(OUT / 'book.pdf')
specs = [
    ('Important Aspects of Governance', 10, 38),
    ('Role of Civil Services in a Democracy', 38, 50),
    ('Development Processes and the Development Industry', 50, 74),
    ('Government Policies and Interventions for Development in Various Sectors', 74, 83),
    ('Pressure Groups', 83, 93),
]
def clean(s):
    return re.sub(r'\s+', ' ', s.replace('\u00ad', '').replace('\ufffd', '’')).strip()

def join(lines):
    result = ''
    for line in lines:
        result += ('' if not result or result.endswith('-') else ' ') + line['text']
    return result

def parts(lines):
    groups = []
    for line in lines:
        bullet = re.match(r'^[•○▪●]\s*', line['text'])
        if not groups or bullet:
            groups.append(dict(lines=[], bullet=bool(bullet), level=2 if line['text'].startswith('○') else 1))
        groups[-1]['lines'].append(line)
    return [dict(text=re.sub(r'^[•○▪●]\s*', '', join(g['lines'])), bullet=g['bullet'], level=g['level']) for g in groups if join(g['lines']).strip('•○▪● ')]

chapters, audits = [], []
for ci, (title, start, stop) in enumerate(specs, 1):
    chapter = dict(id=ci, title=title, guide='Connect the concept, implementation challenges, examples and recommendations when building a Mains answer.', topics=[], practice=[])
    chapters.append(chapter)
    topic = None
    practice = False
    batch = None
    def new_topic(number, title):
        t = dict(id=f'governance-{ci}-{len(chapter["topics"])+1}', number=number, title=title, lineIds=[], elements=[], pages=[])
        chapter['topics'].append(t)
        return t
    for number in range(start+1, stop):
        page = doc[number-1]
        events, source_ids = [], []
        for bi, block in enumerate(page.get_text('dict')['blocks']):
            lines = []
            for li, line in enumerate(block.get('lines', [])):
                rect = fitz.Rect(line['bbox'])
                text = clean(''.join(s['text'] for s in line['spans']))
                if not text or rect.y0 < 40 or rect.y1 > 770 or rect.x0 > 473:
                    continue
                if text == 'Student Notes:' or re.fullmatch(r'[-_–]{10,}', text):
                    continue
                ident = f'p{number}-b{bi}-l{li}'
                source_ids.append(ident)
                lines.append(dict(text=text, id=ident, y=rect.y0, size=max(s['size'] for s in line['spans']), font=line['spans'][0]['font']))
            # Split heading lines from body paragraphs even inside a PDF block.
            group = []
            for line in lines:
                heading = line['size'] >= 12 and 'Bold' in line['font'] and ('Cambria' in line['font'] or bool(re.match(r'^\d+(?:\.\d+)+\.?\s', line['text'])))
                if not heading and not group and events and events[-1]['kind'] == 'heading':
                    previous = events[-1]['lines'][-1]
                    heading = line['font'] == previous['font'] and line['size'] == previous['size'] and line['y'] - previous['y'] < 20 and 'Bold' in line['font']
                if heading:
                    if group: events.append(dict(kind='body', lines=group, y=group[0]['y'])); group=[]
                    events.append(dict(kind='heading', lines=[line], y=line['y']))
                else: group.append(line)
            if group: events.append(dict(kind='body', lines=group, y=group[0]['y']))
        merged = []
        for event in events:
            if event['kind'] == 'heading' and merged and merged[-1]['kind'] == 'heading' and not re.match(r'^\d', join(event['lines'])) and event['y'] - merged[-1]['lines'][-1]['y'] < 25:
                merged[-1]['lines'].extend(event['lines'])
            else:
                merged.append(event)
        events = merged
        seen = set()
        for info in page.get_image_info(xrefs=True):
            rect = fitz.Rect(info['bbox']) & page.rect
            if not info.get('xref') or rect.width < 35 or rect.height < 30 or rect.y0 > 765 or tuple(rect) in seen:
                continue
            seen.add(tuple(rect))
            path = OUT / f'page-{number:03}-figure-{len(seen)}.png'
            pix = page.get_pixmap(matrix=fitz.Matrix(2,2), clip=rect)
            pix.save(path)
            events.append(dict(kind='figure', y=rect.y0, image='/governance-source/'+path.name, width=pix.width, height=pix.height))
        for event in sorted(events, key=lambda e:e['y']):
            kind = event['kind']
            text = join(event.get('lines', []))
            line_ids = [l['id'] for l in event.get('lines', [])]
            if kind == 'heading' and text.startswith('Previous Years Questions ('):
                topic = new_topic('PYQ', 'Previous years questions and analysis')
                practice = True
                batch = dict(topic=topic['id'], title=topic['title'], pages=[number], lineIds=line_ids, questions=[], answerKey='')
                chapter['practice'].append(batch)
                topic['pages'].append(number)
                continue
            if kind == 'heading' and text.startswith('Previous Years Questions Analysis'):
                practice = False
            if practice and kind == 'body':
                # Each source bullet is a Mains question; wrapped blocks continue it.
                for line in event['lines']:
                    if line['text'].startswith('•') or not batch['questions']:
                        batch['questions'].append(dict(number=len(batch['questions'])+1, prompt='', options=[], answer=None, mains=True, lineIds=[]))
                    q = batch['questions'][-1]
                    q['prompt'] = clean(q['prompt']+' '+line['text'].lstrip('• '))
                    q['lineIds'].append(line['id'])
                if number not in batch['pages']: batch['pages'].append(number)
                continue
            match = re.match(r'^(\d+(?:\.\d+)*\.?)\s+(.+)', text) if kind == 'heading' else None
            if match:
                practice = False
                topic = new_topic(match[1].rstrip('.'), match[2])
                topic['lineIds'] = line_ids
            else:
                if topic is None: topic = new_topic('Overview', 'Chapter overview')
                element = dict(page=number, id=f'gov-{ci}-{number}-{len(topic["elements"])}', lineIds=line_ids)
                if kind == 'figure':
                    element.update(type='figure', image=event['image'], width=event['width'], height=event['height'], caption=topic['title']+' — source diagram')
                elif kind == 'heading': element.update(type='heading', text=text)
                else: element.update(type='body', parts=parts(event['lines']))
                topic['elements'].append(element)
            if number not in topic['pages']: topic['pages'].append(number)
        audits.append(dict(page=number, sourceLines=len(source_ids), lineIds=source_ids))

owners = collections.Counter()
for chapter in chapters:
    for topic in chapter['topics']:
        owners.update(topic['lineIds'])
        for e in topic['elements']: owners.update(e['lineIds'])
    for batch in chapter['practice']:
        owners.update(batch['lineIds'])
        for q in batch['questions']:
            owners.update(q['lineIds'])
        batch['questions'] = [q for q in batch['questions'] if q['prompt']]
for audit in audits:
    assert all(owners[i] == 1 for i in audit['lineIds']), audit['page']
    audit['representedLines'] = len(audit.pop('lineIds'))
assert all(v == 1 for v in owners.values())
# Preserve the complete publisher preface and macro analysis in an optional source
# companion, including the original wide marks table which is image-based.
intro = fitz.open()
intro.insert_pdf(doc, from_page=1, to_page=8)
intro.save(OUT / 'preparation-guide.pdf')
output = dict(version=1, title='Vision IAS Governance — Mains 2025', sourcePageCount=len(doc), chapters=chapters, audit=audits)
(ROOT / 'public/data/governance-reading.json').write_text(json.dumps(output, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps(dict(chapters=len(chapters), topics=sum(len(c['topics']) for c in chapters), questions=sum(len(b['questions']) for c in chapters for b in c['practice']), figures=sum(e['type']=='figure' for c in chapters for t in c['topics'] for e in t['elements']), lines=len(owners))))
