(function (root) {
  'use strict';
  const labels = { history: 'History & culture', geography: 'Geography', polity: 'Polity & governance', economy: 'Economy', science: 'Science & technology', environment: 'Environment', ethics: 'Ethics', society: 'Society', ir: 'International relations', csat: 'CSAT', essay: 'Essay & English', security: 'Security & disasters', bihar: 'Bihar special', current: 'Current affairs' };
  const escape = value => String(value ?? '').replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
  const safeUrl = value => { try { const url = new URL(value); return url.protocol === 'https:' ? url.href : ''; } catch { return ''; } };
  const link = (url, title, cls = '') => safeUrl(url) ? `<a class="${escape(cls)}" href="${escape(safeUrl(url))}" target="_blank" rel="noopener noreferrer">${escape(title)}<span class="sr-only"> (opens in a new tab)</span></a>` : '';
  let pending;
  async function load() {
    if (!pending) pending = fetch('/data/resource-library.json').then(res => {
      if (!res.ok) throw new Error('Resource library could not be loaded.');
      return res.json();
    }).catch(error => { pending = null; throw error; });
    return pending;
  }
  function filter(resources, state) {
    const terms = (state.query || '').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return resources.filter(r => {
      if (state.subject && state.subject !== 'all' && !r.subjects.includes(state.subject)) return false;
      if (state.provider && state.provider !== 'all' && r.provider !== state.provider) return false;
      if (state.class && state.class !== 'all' && String(r.class) !== String(state.class)) return false;
      if (state.language && state.language !== 'all' && !r.language.includes(state.language)) return false;
      const text = [r.title, r.provider, r.description, ...r.topics, ...r.papers, ...r.subjects.map(s => labels[s]), r.class ? `Class ${r.class}` : ''].join(' ').toLocaleLowerCase();
      return terms.every(term => text.includes(term));
    });
  }
  function card(r) {
    return `<article class="resource-card" id="${escape(r.id)}" data-hit="resource:${escape(r.id)}">
      <p class="resource-meta">${escape(r.provider)} · ${escape(r.type)}${r.class ? ` · Class ${r.class}` : ''} · ${escape(r.language)}</p>
      <h3>${escape(r.title)}</h3>
      <p>${escape(r.description)}</p>
      <p class="resource-papers">${escape(r.papers.join(' · '))}</p>
      <p class="resource-topics">${escape(r.subjects.map(s => labels[s]).join(' · '))}</p>
      <div class="resource-actions">${link(r.pdfUrl, 'Open PDF', 'resource-primary')}${link(r.sourceUrl, r.type === 'Textbook' ? 'Official book page' : 'Publisher page')}${link(r.archiveUrl, 'Full book (ZIP)')}${link(r.contentsUrl, 'Contents PDF')}</div>
      <details><summary>Reading plan${r.chapters?.length ? ` & ${r.chapters.length} chapter PDFs` : ''}</summary>
        <p>${escape(r.readingTask)}</p>
        ${r.editionNote ? `<p class="meta">${escape(r.editionNote)}</p>` : ''}
        ${r.chapters?.length ? `<nav class="resource-chapters" aria-label="${escape(r.title)} chapters">${r.chapters.map(ch => link(ch.url, ch.title)).join('')}</nav>` : ''}
      </details>
    </article>`;
  }
  function options(values, selected) {
    return values.map(([value, title]) => `<option value="${escape(value)}"${String(value) === String(selected) ? ' selected' : ''}>${escape(title)}</option>`).join('');
  }
  async function mount(container, config = {}) {
    if (!container) return;
    container.innerHTML = '<p role="status">Loading study resources…</p>';
    let data;
    try { data = await load(); } catch {
      container.innerHTML = '<p role="alert">The resource library is unavailable. Please try again.</p><button type="button" data-retry>Retry</button>';
      container.querySelector('[data-retry]').addEventListener('click', () => mount(container, config));
      return;
    }
    if (!container.isConnected) return;
    const state = { subject: labels[config.subject] ? config.subject : 'all', class: 'all', provider: 'all', language: 'all', query: '', page: 1 };
    const size = 12;
    const target = config.resource && data.resources.find(r => r.id === config.resource);
    if (target) { state.subject = 'all'; state.page = Math.floor(data.resources.indexOf(target) / size) + 1; }
    container.innerHTML = `<section class="resource-library" aria-label="Study resource library">
      <div class="resource-heading"><div><p class="resource-kicker">CRACK IAS READING ROOM</p><h2>${config.subject ? `${escape(labels[config.subject])} resources` : 'Study materials & PDFs'}</h2></div><span class="resource-total">${data.resources.length} resources</span></div>
      <p>Build your foundation with NCERT Classes 6–12, then connect it to current affairs and official reports.</p>
      <p class="meta">${escape(data.accessNote)}</p>
      <details class="resource-editions"><summary>Coverage & textbook editions · checked ${escape(data.checkedAt)}</summary><p>${escape(data.scope)}</p><p>${escape(data.editionNote)}</p></details>
      <div class="resource-controls">
        <label class="resource-query">Search materials<input type="search" data-filter="query" placeholder="Book, topic, source or exam paper" autocomplete="off" /></label>
        <label>Subject<select data-filter="subject">${options([['all','All subjects'], ...Object.entries(labels)], state.subject)}</select></label>
        <label>Class<select data-filter="class">${options([['all','All levels'], ...[6,7,8,9,10,11,12].map(n => [n, `Class ${n}`])], 'all')}</select></label>
        <label>Source<select data-filter="provider">${options([['all','All sources'], ...[...new Set(data.resources.map(r => r.provider))].map(p => [p,p])], 'all')}</select></label>
        <label>Language<select data-filter="language">${options([['all','All languages'], ['English','English'], ['Hindi','Hindi']], 'all')}</select></label>
      </div>
      <div class="resource-guide"></div>
      <div class="resource-result-bar"><p role="status" aria-live="polite" class="resource-count"></p><button type="button" data-reset>Reset filters</button></div>
      <div class="resource-grid"></div>
      <nav class="resource-pagination" aria-label="Resource pages"><button type="button" data-prev>Previous</button><span data-page></span><button type="button" data-next>Next</button></nav>
    </section>`;
    const render = () => {
      const matches = filter(data.resources, state);
      const pages = Math.max(1, Math.ceil(matches.length / size));
      state.page = Math.min(state.page, pages);
      const start = (state.page - 1) * size;
      container.querySelector('.resource-count').textContent = matches.length ? `${matches.length} resources · showing ${start + 1}–${Math.min(start + size, matches.length)}` : 'No matching resources';
      container.querySelector('.resource-grid').innerHTML = matches.length ? matches.slice(start, start + size).map(card).join('') : '<p class="empty">Try a broader search or reset the filters. School class filters apply to NCERT books; magazines and reports have no school class.</p>';
      const guide = data.guides[state.subject];
      container.querySelector('.resource-guide').innerHTML = guide ? `<p><strong>Study focus:</strong> ${escape(guide.topics.join(' · '))}</p><p>${escape(guide.task)}</p>` : '';
      container.querySelector('[data-page]').textContent = `Page ${state.page} of ${pages}`;
      container.querySelector('[data-prev]').disabled = state.page === 1;
      container.querySelector('[data-next]').disabled = state.page >= pages;
      container.querySelector('.resource-pagination').hidden = matches.length <= size;
    };
    container.querySelectorAll('[data-filter]').forEach(input => input.addEventListener(input.tagName === 'INPUT' ? 'input' : 'change', () => {
      state[input.dataset.filter] = input.value; state.page = 1; render();
    }));
    container.querySelector('[data-reset]').addEventListener('click', () => {
      Object.assign(state, { subject: labels[config.subject] ? config.subject : 'all', class: 'all', provider: 'all', language: 'all', query: '', page: 1 });
      container.querySelectorAll('[data-filter]').forEach(input => { input.value = state[input.dataset.filter]; });
      render();
    });
    for (const [selector, delta] of [['[data-prev]', -1], ['[data-next]', 1]]) {
      container.querySelector(selector).addEventListener('click', () => { state.page += delta; render(); container.querySelector('.resource-result-bar').scrollIntoView({block:'start'}); });
    }
    render();
    if (target) container.querySelector(`#${CSS.escape(target.id)}`)?.scrollIntoView({ block: 'center' });
  }
  root.ResourceLibrary = { load, mount, filter, card, labels };
  const standalone = document.getElementById('standalone-library');
  if (standalone) { const params = new URLSearchParams(location.search); mount(standalone, { subject: params.get('subject') || undefined, resource: params.get('resource') || undefined }); }
})(globalThis);
