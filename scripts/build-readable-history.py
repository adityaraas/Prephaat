"""Build semantic website chapters from PDF text geometry and real illustrations."""
import sys,json,re,collections
from pathlib import Path
root=Path(__file__).resolve().parent.parent
if '--ir' in sys.argv:
 import runpy
 runpy.run_path(str(root/'scripts/build-ir-reading.py'),run_name='__main__')
 sys.exit()
sys.path.insert(0,str(root/'tmp/pdf-tools'))
subject = 'ir' if '--ir' in sys.argv else 'polity' if '--polity' in sys.argv else 'history'
if subject != 'history': sys.path.insert(0,str(root/'tmp/polity-pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
source=json.loads((root/f'public/data/{subject}-source.json').read_text(encoding='utf-8'))
doc=fitz.open(root/f'public/{subject}-source/book.pdf')
def clean(text):
 text=text.replace('\x08',' ').replace('\x89','•').replace('\u00ad','')
 text=re.sub(r'[\x00-\x08\x0b-\x1f]',' ',text)
 text=re.sub(r'^\s*y\s+','• ',text)
 return re.sub(r'[ \t]+',' ',text).strip()
def join(lines):
 result=''
 for line in lines:
  text=clean(line['text'])
  if not text: continue
  bullet=bool(re.match(r'^(?:•|▪|➢|❖|[0-9]+[.)])\s*',text))
  result+=('\n' if bullet and result else '' if result.endswith('-') else ' ' if result else '')+text
 return result.strip()
captions={"page-008-figure-1.jpg":"Map: regional Chalcolithic cultures and their distribution","page-010-figure-2.jpg":"Map: major Harappan sites and river systems","page-010-figure-3.jpg":"Map: Harappan civilisation and West Asian exchange","page-021-figure-1.jpg":"Mahajanapadas and Magadha: geographical context","page-025-figure-1.jpg":"Mauryan Empire: geographical context","page-040-figure-1.jpg":"Satavahana kingdom: geographical context","page-045-figure-2.jpg":"Sangam-age kingdoms: geographical context","page-049-figure-2.jpg":"Map: Gupta territories and neighbouring kingdoms, 375 CE","page-049-figure-3.jpg":"Timeline: Gupta rulers and their major contributions","page-057-figure-1.jpg":"Harsha and regional kingdoms: geographical context","page-066-figure-1.jpg":"Western Chalukyas: geographical context","page-068-figure-4.jpg":"Chola kingdom: geographical context","page-088-figure-1.jpg":"Delhi Sultanate: geographical context","page-104-figure-1.jpg":"Mughal Empire: geographical context","page-123-figure-2.jpg":"Timeline: phases in the development of Buddhism","page-124-figure-1.jpg":"The Eightfold Path: wisdom, ethical conduct and mental discipline","page-125-figure-1.jpg":"Diagram: parts of a Buddhist stupa"}
chapters=[]
audit=[]
for ci,ch in enumerate(source['chapters']):
 chapter=dict(id=ci+1,title=ch['title'],sections=[],pages=[])
 page_end=source['chapters'][ci+1]['pdfPage'] if ci+1<len(source['chapters']) else len(doc)+1
 for number in range(ch['pdfPage'],page_end):
  page=doc[number-1]; record=source['pages'][number-1]
  lines=[]
  for bi,block in enumerate(page.get_text('dict')['blocks']):
   for li,line in enumerate(block.get('lines',[])):
    spans=line.get('spans',[]); text=clean(''.join(s['text'] for s in spans))
    rect=fitz.Rect(line['bbox'])
    if not text or 'upscpdf.com' in text or rect.y0>page.rect.height-39 or rect.y1<58 or (text.isdigit() and (rect.x0<38 or rect.y0>760 or max([s['size'] for s in spans] or [0])>23)): continue
    if subject=='ir' and any(site in text.lower() for site in ['delhiupscmaterial.in','only for premium members']): continue
    heading=any(s['size']>=12 and s['flags']&16 for s in spans)
    if subject=='ir' and len(text)<120 and all(s['flags']&16 for s in spans) and any(s['size']>=10 for s in spans): heading=True
    lines.append(dict(id=len(lines),block=bi,text=text,rect=rect,heading=heading))
  assigned=set(); elements=[]
  if subject in ('polity','ir'):
   for table in page.find_tables().tables:
    if table.col_count<2 or table.row_count<2: continue
    rows=[]
    for row in table.rows:
     values=[]
     for box in row.cells:
      if box is None:
       values.append(None); continue
      rect=fitz.Rect(box)
      selected=[line for line in lines if line['id'] not in assigned and rect.contains((line['rect'].x0+1,(line['rect'].y0+line['rect'].y1)/2))]
      assigned.update(line['id'] for line in selected)
      values.append(dict(text=join(selected),rowspan=1))
     rows.append(values)
    if any(c and c['text'] for row in rows for c in row): elements.append(dict(type='table',y=table.bbox[1],headers=[],rows=rows))
  cells=[]; dark=[]
  for drawing in page.get_drawings():
   color=drawing.get('fill'); rect=drawing['rect']
   if not color or len(color)<3 or rect.x0<30 or rect.y0<58 or rect.y1>page.rect.height-38 or rect.width<40 or rect.height<9 or rect.width>480: continue
   r,g,b=color[:3]
   if r>.94 and .6<g<.95 and .3<b<.85: cells.append(dict(rect=fitz.Rect(rect),color=tuple(round(c,2) for c in color)))
   elif .25<r<.65 and .1<g<.45 and b<.12: dark.append(fitz.Rect(rect))
  # Merge consecutive drawing strips used to paint a single cell.
  merged=[]
  for cell in sorted(cells,key=lambda c:(round(c['rect'].x0),c['rect'].y0)):
   rect=cell['rect']
   previous=next((m for m in reversed(merged) if abs(m['rect'].x0-rect.x0)<1 and abs(m['rect'].x1-rect.x1)<1 and m['color']==cell['color'] and -10<rect.y0-m['rect'].y1<1.5),None)
   if previous: previous['rect'] |= rect
   else: merged.append(cell)
  groups=[]
  for cell in sorted(merged,key=lambda c:c['rect'].y0):
   if groups and cell['rect'].y0<=max(c['rect'].y1 for c in groups[-1])+5: groups[-1].append(cell)
   else: groups.append([cell])
  for group in groups:
   starts=sorted(set(round(c['rect'].x0,0) for c in group))
   if len(starts)<2: continue
   # Real table columns recur across rows; incidental callout boxes do not.
   counts=collections.Counter(round(c['rect'].x0,0) for c in group)
   if len(starts)>6: continue
   left=min(starts)
   row_cells=sorted([c for c in group if abs(c['rect'].x0-left)<1.5],key=lambda c:c['rect'].y0)
   if not row_cells: continue
   y0=min(c['rect'].y0 for c in group); y1=max(c['rect'].y1 for c in group)
   headers=[]
   for x in starts:
    candidate=[r for r in dark if abs(r.x0-x)<2 and 0<=y0-r.y1<45]
    h=max(candidate,key=lambda r:r.y1) if candidate else None
    if h:
     selected=[line for line in lines if h.contains((line['rect'].x0+1,(line['rect'].y0+line['rect'].y1)/2))]
     headers.append(join(selected)); assigned.update(line['id'] for line in selected)
    else: headers.append('')
   rows=[]
   for rc in row_cells:
    row=[]
    for x in starts:
     matching=[c for c in group if abs(c['rect'].x0-x)<1.5 and abs(c['rect'].y0-rc['rect'].y0)<4]
     if not matching:
      # A vertically merged cell is rendered once with its original row span.
      covering=any(abs(c['rect'].x0-x)<1.5 and c['rect'].y0<rc['rect'].y0-3 and c['rect'].y1>rc['rect'].y0+3 for c in group)
      row.append(None if covering else dict(text='',rowspan=1)); continue
     cell=matching[0]['rect']
     selected=[line for line in lines if cell.contains((line['rect'].x0+1,(line['rect'].y0+line['rect'].y1)/2)) and line['id'] not in assigned]
     selected.sort(key=lambda l:(round(l['rect'].y0,1),l['rect'].x0))
     span=sum(cell.y0-3<=r['rect'].y0<cell.y1-3 for r in row_cells)
     row.append(dict(text=join(selected),rowspan=max(1,span)))
     assigned.update(line['id'] for line in selected)
    rows.append(row)
   if any(cell and cell['text'] for row in rows for cell in row):
    elements.append(dict(type='table',y=y0,headers=headers,rows=rows))
  # Remaining content becomes normal website headings, paragraphs and lists.
  for bi in sorted(set(line['block'] for line in lines)):
   remaining=[line for line in lines if line['block']==bi and line['id'] not in assigned]
   runs=[]
   for line in remaining:
    if runs and runs[-1][0]['heading']==line['heading']: runs[-1].append(line)
    else: runs.append([line])
   for run in runs:
    text=join(run)
    if not text: continue
    kind='heading' if run[0]['heading'] else 'text'
    elements.append(dict(type=kind,y=min(l['rect'].y0 for l in run),text=text))
    assigned.update(line['id'] for line in run)
  # Include actual illustrations, excluding decorative backgrounds behind questions.
  infos=[]
  for info in page.get_image_info(xrefs=True):
   rect=fitz.Rect(info['bbox']) & page.rect
   if not info.get('xref') or rect.width<45 or rect.height<45 or rect.get_area()>page.rect.get_area()*.7 or tuple(rect) in [tuple(r) for r in infos]: continue
   infos.append(rect)
  for image,rect in zip(record['illustrations'],infos):
   overlay=page.get_textbox(rect)
   if len(overlay.strip())>65 and rect.width>200: continue
   caption=ch['title']+' — map or illustration'
   if number==8: caption='Map: regional Chalcolithic cultures and their distribution'
   if number==10: caption='Map: major Harappan sites and river systems' if image['image'].endswith('figure-2.jpg') else 'Map: Harappan civilisation and West Asian exchange'
   caption=captions.get(image['image'].split('/')[-1],caption) if subject=='history' else ch['title']+' — illustration'
   elements.append(dict(type='figure',y=rect.y0,image=image['image'],caption=caption,width=image.get('width'),height=image.get('height')))
  elements.sort(key=lambda e:e['y'])
  for ei,element in enumerate(elements): element['id']=f'ch-{ci+1}-p-{number}-{ei}'
  assert len(assigned)==len(lines),(number,'missing lines')
  audit.append(dict(page=number,sourceLines=len(lines),representedLines=len(assigned)))
  chapter['pages'].append(dict(number=number,printedPage=number-source.get('printedPageOffset',3 if subject=='polity' else 2),sections=record['sections'],elements=elements))
  chapter['sections']=list(dict.fromkeys(chapter['sections']+record['sections']))
 chapters.append(chapter)
 if (ci+1)%5==0: print('Converted chapters',ci+1,flush=True)
output=dict(title=source['title'],chapters=chapters,sourcePageCount=len(doc),audit=audit)
(root/f'public/data/{subject}-reading.json').write_text(json.dumps(output,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps(dict(chapters=len(chapters),pages=len(audit),tables=sum(e['type']=='table' for c in chapters for p in c['pages'] for e in p['elements']),figures=sum(e['type']=='figure' for c in chapters for p in c['pages'] for e in p['elements']),lines=sum(a['sourceLines'] for a in audit))))
