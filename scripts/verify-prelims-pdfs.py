"""Verify that the seven delivered editions change only their cover pages."""
import hashlib
import sys
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'tmp/governance-pdf-tools'))
import pymupdf as fitz
BOOKS={'economy':'Economy','environment':'Environment-Ecology','schemes':'GOVERNMENT-SCHEMES','history':'HISTORY-CULTURE','ir':'INTERNATIONAL-RELATIONS','polity':'POLITY-GOVERNANCE-1','science':'SCIENCE-TECHNOLOGY'}
def links(page):
    return [{k:v for k,v in l.items() if k not in ('xref','id')} for l in page.get_links()]
total=0
sheet=fitz.open();contact=sheet.new_page(width=630,height=840)
for index,(slug,suffix) in enumerate(BOOKS.items()):
    source=fitz.open(ROOT/f'study material/Raus-PRE-COMPASS-2025-{suffix}.pdf')
    result=fitz.open(ROOT/f'output/pdf/Crack-IAS-Prelims-Booster-2025-{slug}.pdf')
    assert len(source)==len(result)
    cover=result[0].get_text()
    for required in ['CRACK IAS','PRELIMS BOOSTER','2025',"Rau's PRE Compass"]:assert required in cover,(slug,required)
    assert result.get_toc()==source.get_toc(),(slug,'Bookmarks changed')
    col,row=index%3,index//3
    contact.show_pdf_page(fitz.Rect(col*210,row*280,(col+1)*210,(row+1)*280),result,0)
    for i in range(1,len(source)):
        assert source[i].get_text()==result[i].get_text(),(slug,i+1,'Text changed')
        assert links(source[i])==links(result[i]),(slug,i+1,'Page links changed',links(source[i]),links(result[i]))
        a=b''.join(source.xref_stream(x) for x in source[i].get_contents())
        b=b''.join(result.xref_stream(x) for x in result[i].get_contents())
        assert hashlib.sha256(a).digest()==hashlib.sha256(b).digest(),(slug,i+1,'Content changed')
        total+=1
    print(f'PASS {slug}: cover text, {len(source)-1} unchanged pages, all page links and bookmarks.',flush=True)
print(f'PASS: all {total} non-cover pages preserved.',flush=True)
review=ROOT/'tmp/prelims-review';review.mkdir(parents=True,exist_ok=True)
contact.get_pixmap(matrix=fitz.Matrix(2,2)).save(review/'covers-final.png')
