const SiteTheme = (() => {
  const themes = ['mango', 'forest', 'navy', 'plum'];
  try { const saved = localStorage.getItem('crack-ias-theme'); if (themes.includes(saved)) document.documentElement.dataset.theme = saved; } catch {}
  const paths = {
    preparation: '<rect x="3" y="4" width="18" height="17" rx="3"/><path d="M7 2v4m10-4v4M3 9h18m-13 6 3 3 5-6"/>',
    editorials: '<path d="M4 4h16v16H4zM8 8h8M8 12h8M8 16h5"/>',
    history: '<path d="M3 21h18M5 18h14M6 9v9m4-9v9m4-9v9m4-9v9M3 7l9-4 9 4H3Z"/>',
    current: '<path d="M5 4h14v16H5zM8 8h8M8 12h3m3 0h2M8 16h3m3 0h2"/>',
    quiz: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
    pyq: '<path d="M4 4h7l1 2 1-2h7v15h-7l-1 2-1-2H4zM12 6v15"/>',
    survey: '<path d="M4 3v18h17M8 16v-5m5 5V7m5 9V4"/>',
    geography: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c5 5 5 13 0 18-5-5-5-13 0-18Z"/>',
    polity: '<path d="M12 3v18M5 21h14M4 6h16M6 6l-4 8h8L6 6Zm12 0-4 8h8l-4-8Z"/>',
    economy: '<path d="m3 17 6-6 4 3 8-10M15 4h6v6M4 21h16"/>',
    science: '<path d="M9 3h6m-5 0v7l-6 9a1 1 0 0 0 1 2h14a1 1 0 0 0 1-2l-6-9V3M7 16h10"/>',
    environment: '<path d="M20 3C8 2 2 8 6 16c8 4 14-2 14-13ZM4 21 15 10"/>',
    ethics: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
    medieval: '<path d="M4 21V8h4V4h3v4h2V4h3v4h4v13M2 21h20M10 21v-7h4v7"/>',
    modern: '<path d="M5 22V3m0 1c5-4 9 4 15 0v10c-6 4-10-4-15 0"/>',
    palette: '<circle cx="12" cy="12" r="9"/><path d="M12 3v18M3 12h18"/>'
  };
  function icon(name) {return `<svg class="site-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name] || paths.pyq}</svg>`;}
  function init() {
    const host = document.querySelector('#profile-preferences') || document.querySelector('.mast-right') || document.querySelector('.topbar') || document.querySelector('.wrap > header') || document.querySelector('.mast');
    if (!host || document.getElementById('site-theme')) return;
    const label = document.createElement('label');
    label.className = 'theme-picker';
    label.innerHTML = `${icon('palette')}<span class="sr-only">Color theme</span><select id="site-theme" aria-label="Color theme"><option value="mango">Mango & Leaf</option><option value="forest">Forest & Ivory</option><option value="navy">Navy & Teal</option><option value="plum">Plum & Sand</option></select><span class="sr-only" id="theme-status" role="status"></span>`;
    host.append(label);
    const select = label.querySelector('select');
    select.value = document.documentElement.dataset.theme || 'mango';
    select.addEventListener('change', () => {
      document.documentElement.dataset.theme = select.value;
      try { localStorage.setItem('crack-ias-theme', select.value); label.querySelector('#theme-status').textContent = 'Theme saved.'; }
      catch { label.querySelector('#theme-status').textContent = 'Theme applied for this page. Browser storage is unavailable.'; }
    });
  }
  document.addEventListener('DOMContentLoaded', init);
  return { icon };
})();
