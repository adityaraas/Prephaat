(() => {
  const links = [
    ['today', 'Today', '/home#today'],
    ['current', 'Current affairs', '/home#current'],
    ['practice', 'Practice', '/home#quiz'],
    ['syllabus', 'Syllabus', '/syllabus'],
    ['planner', 'Planner', '/planner.html'],
    ['library', 'Library', '/library'],
    ['performance', 'Performance', '/performance.html'],
  ];

  function currentSection() {
    const path = location.pathname.replace(/\/$/, '') || '/';
    if (['/performance', '/performance.html', '/analytics'].includes(path)) return 'performance';
    if (['/planner', '/planner.html'].includes(path)) return 'planner';
    if (['/library', '/library.html', '/study-material.html'].includes(path)) return 'library';
    if (['/syllabus','/syllabus.html'].includes(path)) return 'syllabus';
    if (path === '/daily-digest.html') return 'current';
    if (['/test', '/prelims-practice.html', '/answer-writing', '/answer-writing.html'].includes(path)) return 'practice';
    if (path === '/crack-ias-today.html') return 'today';
    if (!['/home', '/home.html', '/study'].includes(path)) return '';
    const params = new URLSearchParams(location.search);
    if (params.get('syllabus') === '1') return 'syllabus';
    if (params.has('testId') || params.has('practice')) return 'practice';
    const section = location.hash.slice(1).split('/')[0];
    return section === 'quiz' ? 'practice' : ['today', 'current', 'planner', 'performance', 'syllabus'].includes(section) ? section : section === 'analytics' ? 'performance' : !section ? 'today' : '';
  }

  class SiteNavigation extends HTMLElement {
    connectedCallback() {
      if (this.shadowRoot) return;
      const root = this.attachShadow({ mode: 'open' });
      root.innerHTML = `<style>
        :host{display:block;width:100%;position:relative;z-index:20;font:500 14px/1.5 Inter,system-ui,sans-serif;color:#fff;background:#112b4e;border-bottom:1px solid #ffffff26}
        *{box-sizing:border-box}.bar{max-width:1280px;margin:auto;padding:6px 24px}
        nav{display:flex;align-items:center;gap:6px;flex-wrap:wrap}
        a{display:flex;align-items:center;justify-content:center;min-height:44px;padding:10px 16px;color:#eef4ff;text-decoration:none;border-radius:6px;border-bottom:3px solid transparent;white-space:nowrap}
        a:hover{background:#ffffff16}a[aria-current=page]{color:#ffdb83;background:#ffffff12;border-bottom-color:#ffdb83;font-weight:750}
        button{display:none;align-items:center;gap:10px;min-height:44px;padding:8px 12px;color:#fff;background:transparent;border:1px solid #ffffff65;border-radius:6px;font:inherit;cursor:pointer}
        svg{width:20px;height:20px}a:focus-visible,button:focus-visible{outline:3px solid #ffdb83;outline-offset:2px}
        @media(max-width:760px){.bar{padding:8px 16px}button{display:flex}nav{display:none;flex-direction:column;align-items:stretch;gap:3px;margin-top:8px}nav[data-open=true]{display:flex}a{justify-content:flex-start;padding:10px 14px}}
      </style><div class="bar"><button type="button" aria-label="Open navigation menu" aria-expanded="false" aria-controls="primary-links"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M3 6h18M3 12h18M3 18h18"/></svg>Menu</button><nav id="primary-links" aria-label="Main navigation" data-open="false">${links.map(([id, label, href]) => `<a href="${href}" data-section="${id}">${label}</a>`).join('')}</nav></div>`;
      const button = root.querySelector('button'), nav = root.querySelector('nav');
      const setOpen = open => {
        nav.dataset.open = String(open);
        button.setAttribute('aria-expanded', String(open));
        button.setAttribute('aria-label', `${open ? 'Close' : 'Open'} navigation menu`);
      };
      const update = section => {
        for (const link of nav.querySelectorAll('a')) {
          if (link.dataset.section === section) link.setAttribute('aria-current', 'page');
          else link.removeAttribute('aria-current');
        }
      };
      button.onclick = () => setOpen(nav.dataset.open !== 'true');
      nav.addEventListener('click', event => { if (event.target.closest('a')) setOpen(false); });
      this.onkeydown = event => { if (event.key === 'Escape' && nav.dataset.open === 'true') { setOpen(false); button.focus(); } };
      this.onLocation = () => { update(currentSection()); setOpen(false); };
      this.onSection = event => {
        const section = event.detail === 'quiz' ? 'practice' : event.detail === 'analytics' ? 'performance' : event.detail;
        update(new URLSearchParams(location.search).get('syllabus') === '1' ? 'syllabus' : section);
      };
      this.onOutside = event => { if (!event.composedPath().includes(this)) setOpen(false); };
      window.addEventListener('hashchange', this.onLocation);
      window.addEventListener('popstate', this.onLocation);
      window.addEventListener('site-section-change', this.onSection);
      document.addEventListener('click', this.onOutside);
      update(currentSection());
    }
    disconnectedCallback() {
      window.removeEventListener('hashchange', this.onLocation);
      window.removeEventListener('popstate', this.onLocation);
      window.removeEventListener('site-section-change', this.onSection);
      document.removeEventListener('click', this.onOutside);
    }
  }

  class AccountNavigation extends HTMLElement {
    connectedCallback() {
      const render = account => {
        const staff = account?.role === 'faculty' || account?.role === 'admin';
        this.innerHTML = `<nav class="profile-links" aria-label="Profile navigation">${staff ? '<a id="faculty-link" href="/faculty">Faculty Desk <span aria-hidden="true">↗</span></a><a href="/records">Records <span aria-hidden="true">↗</span></a>' : ''}<a href="/library">Study Library <span aria-hidden="true">↗</span></a><a href="/performance.html">Performance <span aria-hidden="true">↗</span></a><a href="/break">Break <span aria-hidden="true">↗</span></a><a href="/home">Study Desk <span aria-hidden="true">↗</span></a></nav>`;
      };
      // No privileged links are rendered until the server confirms the role.
      render(null);
      this.onAccount = event => render(event.detail);
      window.addEventListener('site-account-change', this.onAccount);
      this.request = new AbortController();
      fetch('/api/me', { signal: this.request.signal })
        .then(response => response.ok ? response.json() : null)
        .then(session => { if (this.isConnected) render(session?.account); })
        .catch(() => {});
    }
    disconnectedCallback() {
      window.removeEventListener('site-account-change', this.onAccount);
      this.request?.abort();
    }
  }
  customElements.define('crack-ias-nav', SiteNavigation);
  customElements.define('crack-ias-account-nav', AccountNavigation);
})();
