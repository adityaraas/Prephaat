"""Extract all source pages, text, tables and embedded illustrations for the history reader.
Run: python scripts/extract-history-source.py (requires PyMuPDF).
"""
import sys, json, re, shutil
from pathlib import Path
root = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(root / 'tmp/pdf-tools'))
import pymupdf as fitz
sys.stdout.reconfigure(encoding='utf-8')
source = root / 'study material/V&R_Mains_Smasher_Ancient_and_Medieval_History,_Art_and_Culture.pdf'
out = root / 'public/history-source'
out.mkdir(parents=True, exist_ok=True)
doc = fitz.open(source)
chapters = [(1,'Overview of Ancient Indian History'),(3,'Prehistoric Period in India'),(8,'Indus Valley Civilisation'),(13,'Megalithic Culture and Iron Age'),(15,'Vedic Period'),(19,'Mahajanapadas and Rise of Magadha'),(23,'Maurya Dynasty'),(33,'Post-Mauryan India'),(38,'Satavahana Dynasty'),(43,'Sangam Age'),(47,'Gupta Period'),(55,'Harsha and Pushyabhuti Dynasty'),(60,'Pallavas of Kanchi'),(64,'Western Chalukyas'),(66,'Chola Dynasty'),(72,'The Tripartite Struggle'),(78,'Rajput States'),(83,'Kakatiya Dynasty'),(84,'Foreign Invasions'),(86,'Delhi Sultanate'),(92,'Hoysala Dynasty'),(94,'Vijayanagara Empire'),(101,'Bahmani Kingdom'),(102,'Mughal Empire'),(114,'Bhakti and Sufi Movements'),(121,'Buddhism'),(126,'Jainism'),(128,'Foreign Travellers'),(132,'Indian Philosophy')]
pages=[]
for index, page in enumerate(doc):
    number=index+1
    printed=number-2
    chapter=next((title for start,title in reversed(chapters) if printed>=start),'Cover' if number==1 else 'Contents')
    section='ancient' if printed<60 else 'medieval'
    if printed>=114: section='culture'
    raw=page.get_text('blocks',sort=True)
    blocks=[b[4].strip() for b in raw if b[6]==0 and b[4].strip() and 'https://upscpdf.com/' not in b[4] and not b[4].strip().isdigit()]
    blocks=[b.replace('\x08',' ') for b in blocks]
    text='\n\n'.join(blocks)
    headings=[]
    for block in page.get_text('dict')['blocks']:
        for line in block.get('lines',[]):
            spans=line.get('spans',[])
            line_text=' '.join(s['text'].strip() for s in spans).strip()
            if line_text and len(line_text)>6 and any(s['size']>=12 and s['flags'] & 16 for s in spans) and 'http' not in line_text:
                headings.append(line_text)
    cultural = bool(re.search(r'art|architect|cultur|sculpt|paint|temple|literature|religio|philosoph|buddhi|jain|bhakti|sufi', ' '.join(headings), re.I))
    cultural = number > 2 and (cultural or bool(re.search(r'Art and Culture|Art and Architecture|Sculptur|Iconograph|Temple Architecture|Pottery and Decorative|Cave Paintings|Religious Practices|Literary', text, re.I)))
    headings=[h.replace('\x08',' ') for h in headings]
    sections=[section]
    if cultural and 'culture' not in sections: sections.append('culture')
    image=f'/history-source/page-{number:03d}.jpg'
    pix=page.get_pixmap(matrix=fitz.Matrix(1.8,1.8))
    pix.save(str(out/f'page-{number:03d}.jpg'),jpg_quality=86)
    illustrations=[]
    seen=set()
    for info in page.get_image_info(xrefs=True):
        rect=fitz.Rect(info['bbox']) & page.rect
        xref=info.get('xref',0)
        if not xref or rect.width<45 or rect.height<45 or rect.get_area()>page.rect.get_area()*.7 or tuple(rect) in seen: continue
        seen.add(tuple(rect))
        # Render the visible placement, preserving masks, overlaid labels and callouts.
        name=f'page-{number:03d}-figure-{len(illustrations)+1}.jpg'
        crop=page.get_pixmap(matrix=fitz.Matrix(2.5,2.5),clip=rect)
        crop.save(str(out/name),jpg_quality=90)
        illustrations.append({'image':'/history-source/'+name,'label':f'{chapter} — source illustration {len(illustrations)+1}, PDF page {number}'})
    tables=[]
    try:
        for table in page.find_tables().tables:
            rows=table.extract()
            if len(rows)>1: tables.append([[str(cell or '').strip() for cell in row] for row in rows])
    except Exception as error:
        print('Table extraction fallback',number,str(error))
    pages.append(dict(number=number,printedPage=printed if printed>0 else None,section=section,sections=sections,chapter=chapter,topic=chapter,headings=headings,text=text,blocks=blocks,tables=tables,illustrations=illustrations,image=image,width=pix.width,height=pix.height))
    if number%20==0: print('Extracted',number,flush=True)
shutil.copyfile(source,out/'book.pdf')
data=dict(title='Ancient and Medieval History, Art and Culture',pageCount=len(doc),sections=[dict(id='ancient',title='Ancient History'),dict(id='medieval',title='Medieval History'),dict(id='culture',title='Art and Culture')],chapters=[dict(printedPage=start,title=title,pdfPage=start+2) for start,title in chapters],pages=pages)
(root/'public/data/history-source.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'pages':len(pages),'chapters':len(chapters),'illustrations':sum(len(p['illustrations']) for p in pages),'tables':sum(len(p['tables']) for p in pages),'sections':{s['id']:sum(s['id'] in p['sections'] for p in pages) for s in data['sections']}}))
