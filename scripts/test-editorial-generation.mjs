import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import { existsSync, readFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import { getEditorialAnalysis, getEditorialCatalog } from '../editorials.ts';

const pack = JSON.parse(readFileSync('public/data/editorial-analysis.json', 'utf8'));
const candidates = (await getEditorialCatalog()).items.filter(item => !pack[item.id] && !existsSync(`.cache/editorial-analysis/${item.id}.json`)).slice(0, 6);
assert.equal(candidates.length, 6);
const originalFetch = globalThis.fetch;
const originalMkdir = fs.mkdir;
const envNames = ['EDITORIAL_MODEL', 'GEMINI_API_KEY', 'GOOGLE_GEMINI_API_KEY', 'GOOGLE_GENERATIVE_AI_API_KEY', 'GOOGLE_AI_API_KEY'];
const originalEnv = new Map(envNames.map(name => [name, process.env[name]]));
let modelCalls = [], mode = 'quota';
try {
  for (const name of envNames) delete process.env[name];
  assert.equal((await getEditorialAnalysis(Object.keys(pack)[0])).sourceUrl, Object.values(pack)[0].sourceUrl, 'Prepared notes work without a production API key');
  await assert.rejects(getEditorialAnalysis(candidates[5].id), /temporarily unavailable/);
  process.env.GEMINI_API_KEY = 'test-only-not-a-real-key';
  process.env.EDITORIAL_MODEL = 'unavailable-configured-model';
  fs.mkdir = async () => { throw Object.assign(new Error('Read-only deployment'), { code: 'EROFS' }); };
  syncBuiltinESMExports();
  globalThis.fetch = async (url, options) => {
    if (!url.startsWith('https://generativelanguage.googleapis.com/')) {
      const item = candidates.find(item => item.url === url);
      assert(item, 'Only catalog publisher URLs are requested');
      const html = `<meta itemprop="datePublished" content="${item.published}"><script type="application/ld+json">${JSON.stringify({ articleBody: 'Publicly accessible article context. '.repeat(50), isAccessibleForFree: mode !== 'restricted' })}</script>`;
      return new Response(html);
    }
    modelCalls.push(url);
    assert.equal(options.headers['x-goog-api-key'], 'test-only-not-a-real-key');
    if (mode === 'forbidden') return new Response('{}', { status: 403 });
    if (url.includes('unavailable-configured-model')) {
      if (mode === 'malformed') return Response.json({ candidates: [{ content: { parts: [{ text: '{incomplete' }] } }] });
      return new Response('{}', { status: mode === 'quota' ? 429 : 404 });
    }
    return Response.json({ candidates: [{ content: { parts: [{ text: JSON.stringify(Object.values(pack)[0]) }] } }] });
  };
  for (const [index, scenario] of ['quota', 'not-found', 'malformed'].entries()) {
    mode = scenario; modelCalls = [];
    const item = candidates[index];
    const results = await Promise.all([getEditorialAnalysis(item.id), getEditorialAnalysis(item.id)]);
    assert.equal(results[0], results[1], 'Concurrent opens share one generation');
    assert.equal(results[0].sourceUrl, item.url);
    assert.equal(modelCalls.length, 2, 'A failed configured model falls back once');
    assert(modelCalls[1].includes('gemini-3.1-flash-lite-preview'));
    const cached = await getEditorialAnalysis(item.id);
    assert.equal(cached, results[0]);
    assert.equal(modelCalls.length, 2, 'Read-only disk must not discard a generated note');
  }
  mode = 'forbidden'; modelCalls = [];
  await assert.rejects(getEditorialAnalysis(candidates[3].id), /temporarily unavailable/);
  assert.equal(modelCalls.length, 1, 'Invalid credentials are not retried against every model');
  mode = 'restricted'; modelCalls = [];
  await assert.rejects(getEditorialAnalysis(candidates[4].id), /not publicly available/);
  assert.equal(modelCalls.length, 0, 'Restricted publisher content is never sent for analysis');
  console.log('PASS: model quota/404/incomplete-output fallback, concurrent opens, read-only cache, offline prepared notes, missing-key and restricted-source handling.');
} finally {
  globalThis.fetch = originalFetch;
  fs.mkdir = originalMkdir;
  syncBuiltinESMExports();
  for (const [name, value] of originalEnv) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
}
