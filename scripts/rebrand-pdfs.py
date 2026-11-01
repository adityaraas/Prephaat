"""Apply Crack IAS branding to published PDFs and regenerate their web images.

Publisher words are removed from native text without touching page graphics or
images. Image-based Economics cover/back-page logos have reviewed replacement
regions. Changes outside those regions are checked pixel by pixel.
"""
import collections
import json
import re
import shutil
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/governance-pdf-tools'))
import pymupdf as fitz
import numpy as np
sys.stdout.reconfigure(encoding='utf-8')
BRAND=re.compile(r"\brau[’']s\b",re.I)
CACHE=ROOT/'.cache/branding-originals'
REVIEW=ROOT/'tmp/prelims-review'
REVIEW.mkdir(parents=True,exist_ok=True)

def replace_text(value):
    return BRAND.sub(lambda m:'CRACK' if m[0].isupper() else 'Crack',value)

def check_pixels(before,after,regions,label):
    a=before.get_pixmap();b=after.get_pixmap()
    assert a.width==b.width and a.height==b.height
    av=np.frombuffer(a.samples,dtype=np.uint8).reshape(a.height,a.width,a.n)
    bv=np.frombuffer(b.samples,dtype=np.uint8).reshape(b.height,b.width,b.n)
    changed=np.any(av!=bv,axis=2);allowed=np.zeros(changed.shape,dtype=bool)
    for rect in regions:
        r=fitz.Rect(rect)+(-3,-3,3,3)
        allowed[max(0,int(r.y0)):min(a.height,int(r.y1)+2),max(0,int(r.x0)):min(a.width,int(r.x1)+2)]=True
    outside=changed & ~allowed
    if np.any(outside):
        yy,xx=np.where(outside)
        raise AssertionError((label,'Changed pixels outside branding regions',(int(xx.min()),int(yy.min()),int(xx.max()),int(yy.max())),regions))

def rewrite(path):
    backup=CACHE/path.relative_to(ROOT)
    backup.parent.mkdir(parents=True,exist_ok=True)
    if not backup.exists():shutil.copyfile(path,backup)
    before=fitz.open(path);doc=fitz.open(path);changed={}
    is_mains=path==ROOT/'public/economy-source/book.pdf'
    for index,page in enumerate(doc):
        spans=[s for b in page.get_text('dict')['blocks'] for l in b.get('lines',[]) for s in l['spans']]
        edits=[];seen=set()
        for span in spans:
            for match in BRAND.finditer(span['text']):
                for found in page.search_for(match[0]):
                    key=tuple(round(x,2) for x in found)
                    if key in seen:continue
                    # search_for is case-insensitive; find the span at this box.
                    owner=next((s for s in spans if fitz.Rect(s['bbox']).intersects(found) and BRAND.search(s['text'])),span)
                    seen.add(key)
                    word=next(BRAND.finditer(owner['text']))[0]
                    text='CRACK' if word.isupper() else 'Crack'
                    font='hebo' if owner['flags']&16 or 'Bold' in owner['font'] else 'helv'
                    size=min(owner['size'],max(1,found.width-.3)/fitz.get_text_length(text,fontname=font,fontsize=1))
                    color=owner['color'];rgb=((color>>16&255)/255,(color>>8&255)/255,(color&255)/255)
                    edits.append((found,text,font,size,rgb,owner['origin'][1],owner['bbox']))
        if edits:
            for rect,*_ in edits:page.add_redact_annot(rect,fill=False)
            page.apply_redactions(images=0,graphics=0)
            for rect,text,font,size,color,baseline,_ in edits:
                page.insert_text(fitz.Point(rect.x0,baseline),text,fontname=font,fontsize=size,color=color)
            changed[index]=[list(e[6]) for e in edits]
        if is_mains and index==0 and 'CRACK IAS' not in page.get_text():
            w,h=page.rect.width,page.rect.height;r=fitz.Rect(0,h*.90,w,h*.985)
            page.draw_rect(r,color=None,fill=(.07,.23,.39))
            page.insert_textbox(r+(15,4,-15,-2),'CRACK IAS',fontname='hebo',fontsize=29,color=(1,1,1),align=1)
            changed.setdefault(index,[]).append(list(r))
        if is_mains and index==len(doc)-1 and 'CRACK IAS' not in page.get_text():
            r=fitz.Rect(195,13,410,107)
            page.draw_rect(r,color=None,fill=(.07,.23,.39))
            page.insert_textbox(r+(10,10,-10,-3),'CRACK IAS\nSTUDY CIRCLE',fontname='hebo',fontsize=23,color=(1,1,1),align=1)
            small=fitz.Rect(495.5,303,526,315)
            page.draw_rect(small,color=None,fill=(1,1,1))
            page.insert_text(fitz.Point(496,312),'Crack',fontname='hebo',fontsize=8,color=(.12,.12,.12))
            changed.setdefault(index,[]).extend([list(r),list(small)])
        assert not BRAND.search(page.get_text()),(path,index+1,'Brand remains')
    if not changed:return {}
    meta=doc.metadata
    for k,v in meta.items():
        if isinstance(v,str):meta[k]=replace_text(v)
    doc.set_metadata(meta)
    toc=doc.get_toc()
    for item in toc:item[1]=replace_text(item[1])
    doc.set_toc(toc)
    temporary=ROOT/'.cache'/('branded-'+path.parent.name+'-'+path.name)
    doc.save(temporary,garbage=3,deflate=True);doc.close()
    after=fitz.open(temporary)
    assert len(after)==len(before)
    for index,regions in changed.items():
        check_pixels(before[index],after[index],regions,(str(path),index+1))
        if not (is_mains and index in (0,len(after)-1)):
            def words(text):
                text=BRAND.sub('',text)
                text=re.sub(r'\bcrack\b','',text,flags=re.I)
                return collections.Counter(re.findall(r'\w+',text))
            assert words(before[index].get_text())==words(after[index].get_text()),(path,index+1,'Study words changed')
    assert before.get_toc()==after.get_toc() or [x[2] for x in before.get_toc()]==[x[2] for x in after.get_toc()]
    for index in range(len(after)):
        assert not BRAND.search(after[index].get_text())
        # Every original internal navigation destination is retained.
        links=lambda p:[{k:v for k,v in x.items() if k not in ('xref','id')} for x in p.get_links()]
        assert links(before[index])==links(after[index]),(path,index+1,'Links changed')
    before.close();after.close();shutil.copyfile(temporary,path)
    print(f'Branded {path.relative_to(ROOT)}: {len(changed)} pages; pixels outside brand regions unchanged.',flush=True)
    return changed

audit={}
paths=list((ROOT/'public/prelims-2025').glob('*.pdf'))+[ROOT/'public/economy-source/book.pdf']
for path in paths:
    changes=rewrite(path)
    audit[str(path.relative_to(ROOT))]={str(i+1):regions for i,regions in changes.items()}
    slug=path.stem
    if path.parent.name=='prelims-2025':
        delivery=ROOT/f'output/pdf/Crack-IAS-Prelims-Booster-2025-{slug}.pdf'
        shutil.copyfile(path,delivery)
        bookpath=ROOT/f'public/data/prelims-2025/{slug}.json'
        book=json.loads(bookpath.read_text(encoding='utf-8'))
        book['preservation']['brandingReplaced']=True
        book['preservation']['unchangedPages']=book['pageCount']-1-sum(i!=0 for i in changes)
        book['preservation']['brandingUpdatedPages']=len(changes)
        bookpath.write_text(json.dumps(book,ensure_ascii=False,separators=(',',':')),encoding='utf-8')
        doc=fitz.open(path);assets=path.parent/slug
        doc[0].get_pixmap(matrix=fitz.Matrix(.7,.7)).save(assets/'cover.png')
        doc[0].get_pixmap().save(REVIEW/f'{slug}-branded-cover.png')
        for p in book['pages']:
            page=doc[p['number']-1]
            page.get_pixmap(matrix=fitz.Matrix(1.65,1.65)).save(ROOT/('public'+p['image']),jpg_quality=82)
            images=[]
            for info in page.get_image_info(xrefs=True):
                r=fitz.Rect(info['bbox'])&page.rect
                if not info.get('xref') or r.width<55 or r.height<35 or r.y0<58 or r.y1>page.rect.height-50:continue
                if not any(tuple(r)==tuple(x) for x in images):images.append(r)
            for e in p['elements']:
                if e['type']=='figure':
                    ii=int(Path(e['image']).stem.split('-')[-1])-1
                    if ii<len(images):page.get_pixmap(matrix=fitz.Matrix(1.8,1.8),clip=images[ii]).save(ROOT/('public'+e['image']),jpg_quality=85)
    else:
        shutil.copyfile(path,ROOT/'output/pdf/Crack-IAS-Mains-Compass-Economy.pdf')
        doc=fitz.open(path)
        for i in [0,1,7,len(doc)-1]:doc[i].get_pixmap().save(REVIEW/f'mains-branded-{i+1}.png')

# Replace only complete publisher words, never unrelated names such as Strauss.
for path in (ROOT/'public').rglob('*'):
    if path.suffix not in ('.html','.js','.json','.css'):continue
    text=path.read_text(encoding='utf-8');new=replace_text(text)
    if new!=text:path.write_text(new,encoding='utf-8')
(ROOT/'public/data/pdf-branding-audit.json').write_text(json.dumps(audit,indent=2),encoding='utf-8')
print('All published branding and web reader images updated.',flush=True)
