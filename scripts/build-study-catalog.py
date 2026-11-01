"""Build the Planner/Analytics reading index from the site's actual data files."""
import json
from pathlib import Path
from urllib.parse import quote

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'public' / 'data'
items = []

def read(name):
    return json.loads((DATA / (name + '.json')).read_text(encoding='utf-8'))

def add(id, subject, title, url, source, kind, progress=None):
    if title and url:
        items.append(dict(id=id, subject=subject, title=title, url=url,
                          source=source, kind=kind, progress=progress))

for subject in ['history', 'geography', 'polity', 'economy', 'science', 'environment', 'ethics']:
    course = read('history-plan' if subject == 'history' else 'study-course-' + subject)
    for segment in course['segments']:
        for day in segment['days']:
            n = day['day']
            route = f'day-{n}' if subject == 'history' else f'{subject}-day-{n}'
            add(f'lesson:{subject}:{n}', subject, day['topic'], '/home#' + route,
                day.get('reading', course.get('title', 'Foundation course')), 'Lesson', f'lesson:{subject}:{n}')

for subject in ['history', 'polity', 'ir', 'governance', 'economy', 'environment']:
    book = read(subject + '-reading')
    for chapter in book['chapters']:
        cid = chapter['id']
        route = subject if subject not in ['history', 'polity'] else ('day-1' if subject == 'history' else 'polity-day-1')
        chapter_url = f'/home?chapter={cid}#{route}'
        progress = f'lesson:{subject}:{cid}' if subject in ['ir','governance'] else f'chapter:{subject}:{cid}' if subject in ['economy','environment'] else None
        add(f'book:{subject}:{cid}', subject, chapter['title'], chapter_url, book['title'], 'Chapter', progress)
        for topic in chapter.get('topics', []):
            add(f'book-topic:{subject}:{topic["id"]}', subject, topic['title'],
                f'/home?chapter={cid}&topic={quote(str(topic["id"]))}#{route}', book['title'], 'Source topic', progress)

library = read('resource-library')
for resource in library['resources']:
    subject = resource['subjects'][0] if resource['subjects'] else 'general'
    add('resource:' + resource['id'], subject, resource['title'],
        '/library?resource=' + quote(resource['id']), resource['provider'], 'Book')
    for i, chapter in enumerate(resource.get('chapters', [])):
        add(f'resource-chapter:{resource["id"]}:{i}', subject, chapter['title'], chapter['url'], resource['title'], 'Publisher chapter')

for subject in ['history','geography','polity','economy','science','environment']:
    pack = read('ncert-' + subject)
    for i, book in enumerate(pack['books']):
        for j, chapter in enumerate(book.get('chapters', [])):
            add(f'ncert-note:{subject}:{i}:{j}', subject, chapter['title'], f'/study-material.html?id=ncert-note:{subject}:{i}:{j}',
                book.get('book', 'NCERT revision notes'), 'NCERT notes')

for subject in ['history','polity','ir','economy','science','environment','schemes']:
    book = read('prelims-2025/' + subject)
    for i, chapter in enumerate(book['chapters']):
        add(f'booster:{subject}:{i}', 'governance' if subject == 'schemes' else subject,
            chapter['title'], f'/home#prelims-2025-{subject}-p{chapter["page"]}', book['title'], 'Prelims Booster 2025')

news_archive = read('current-affairs-latest') if (DATA / 'current-affairs-latest.json').exists() else read('monthly-current-affairs')
for month in news_archive['months']:
    for item in month['items']:
        add('news:' + item['id'], 'current', item['title'], f'/home#current/{month["id"]}/{item["id"]}', item['source'], 'Current affairs')

for item in read('editorials')['items']:
    add('editorial:' + item['id'], 'editorials', item['title'], '/home#editorials/' + item['id'], item['source'], 'Editorial')

survey = read('economic-survey')
for chapter in survey['chapters']:
    add('survey:' + chapter['id'], 'survey', chapter['title'], '/study-material.html?id=survey:' + chapter['id'], survey['title'], 'Economic Survey')

output = {'version': 1, 'items': items, 'sources': 'Generated from site course, source-book, publisher, NCERT, current-affairs, editorial and survey catalogs.'}
(DATA / 'study-catalog.json').write_text(json.dumps(output, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')
print(f'Indexed {len(items)} real study entries.')
