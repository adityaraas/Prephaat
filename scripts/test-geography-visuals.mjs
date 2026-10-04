import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const geography = JSON.parse(readFileSync('public/data/study-course-geography.json', 'utf8'));
const polity = JSON.parse(readFileSync('public/data/study-course-polity.json', 'utf8'));
const context = vm.createContext({ URL, location: { hash: '#geography-day-1' },
  history: { replaceState(_, __, hash) { context.location.hash = hash; } },
  localStorage: { getItem: () => null, setItem() {} },
  fetch: async url => ({ ok: true, json: async () => url.includes('polity') ? polity : geography }),
});
vm.runInContext(readFileSync('public/geography-visuals.js', 'utf8') + '\nglobalThis.visuals = GeographyVisuals;', context);
vm.runInContext(readFileSync('public/history-plan.js', 'utf8') + '\nglobalThis.plan = HistoryPlan;', context);
const elements = new Map();
const root = { innerHTML: '', querySelector(selector) { if (!elements.has(selector)) elements.set(selector, { innerHTML: '', focus() {} }); return elements.get(selector); } };
for (const lesson of geography.segments.flatMap(segment => segment.days)) {
  const html = context.visuals.render(lesson);
  assert.match(html, /role="img"/);
  assert.match(html, /Read the diagram/);
  assert.match(html, /Read the map/);
  assert.match(html, /Watch with a purpose/);
  assert(!html.includes('<iframe'), 'External media should load only after an explicit click');
  assert.equal((html.match(/<option /g) || []).length, 16);
  assert(!/undefined|NaN|\ufffd/.test(html));
}
await context.plan.mount(root, 'geography');
assert.match(root.innerHTML, /Your visual geography desk/);
for (const kind of ['diagram','map','video']) {
  const html = context.visuals.render({ topic: 'geography' });
  const choices = html.match(new RegExp(`<select id="geo-${kind}-choice"[^>]*>(.*?)</select>`))[1];
  for (const match of choices.matchAll(/value="([^"]+)"/g)) {
    root.onchange({ target: { dataset: { geoChoice: kind }, value: match[1] } });
    const body = root.querySelector(`#geo-${kind}-body`).innerHTML;
    assert(body.length > 250 && !/undefined|NaN|\ufffd/.test(body));
    if (kind === 'diagram') assert.match(body, /<svg/);
    else {
      const button = { dataset: { geoLoad: kind, geoId: match[1] } };
      root.onclick({ target: { closest: selector => selector === '[data-geo-load]' ? button : null } });
      const frame = root.querySelector(`#geo-${kind}-frame`).innerHTML;
      assert.match(frame, /<iframe title=/);
      const src = new URL(frame.match(/src="([^"]+)"/)[1].replaceAll('&amp;', '&'));
      assert.equal(src.protocol, 'https:');
      assert.equal(src.hostname, kind === 'map' ? 'www.openstreetmap.org' : 'www.youtube-nocookie.com');
      if (kind === 'map') assert.equal(src.searchParams.get('bbox').split(',').length, 4);
      else assert.match(src.pathname, /^\/embed\/[a-zA-Z0-9_-]{11}$/);
    }
  }
}
root.onclick({ target: { closest: selector => selector === 'button' ? { dataset: { day: '30' } } : null } });
assert.match(root.innerHTML, /DAY 30 \/ 60/);
assert.match(root.innerHTML, /Your visual geography desk/);
await context.plan.mount(root, 'polity');
assert(!root.innerHTML.includes('geo-visuals'), 'Visual geography resources must not change other subjects');
const home = readFileSync('public/home.html', 'utf8');
assert(home.indexOf('/geography-visuals.js') < home.indexOf('/history-plan.js'));
console.log('PASS: visual resources across 60 geography lessons, 6 diagrams, 6 map explainers, 4 videos, selectors, explicit media loading, day navigation and subject isolation.');
