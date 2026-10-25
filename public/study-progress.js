const StudyProgress = (() => {
  const subjects = ['history','geography','polity','economy','science','environment','ethics','ir','governance','environment-book','economy-book'];
  const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dateKey = date => `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
  const shift = (date, days) => { const result = new Date(date); result.setDate(result.getDate()+days); return result; };
  let key, days = {}, storageOK = true;
  function setAccount(account) {
    const id = String(account?.id ?? 'guest').replace(/[^a-zA-Z0-9_-]/g,'');
    key = `bpsc-consistency-${id}-v1`; days = {}; storageOK = true;
    try {
      const saved = JSON.parse(localStorage.getItem(key) || '{}');
      for (const [date, items] of Object.entries(saved)) if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(items)) days[date] = [...new Set(items.filter(x => typeof x === 'string' && /^(lesson:(history|geography|polity|economy|science|environment|ethics):([1-9]|[1-5]\d|60)|lesson:ir:[1-7]|lesson:governance:[1-5]|chapter:economy:([1-9]|1[0-2])|chapter:environment:[1-9]|block:[0-4])$/.test(x)))];
      const prep = JSON.parse(localStorage.getItem(`prephaat-preparation-${id}-v1`) || '{}');
      for (const [date, checks] of Object.entries(prep.checks || {})) if (/^\d{4}-\d{2}-\d{2}$/.test(date) && Array.isArray(checks)) {
        days[date] = [...new Set([...(days[date] || []), ...checks.filter(n => Number.isInteger(n) && n >= 0 && n < 5).map(n => `block:${n}`)])];
      }
    } catch { storageOK = false; }
    render();
  }
  function record(item, checked = true) {
    if (!key) return;
    const today = dateKey(new Date());
    // A lesson is counted once; unchecking also removes its earlier completion.
    if (/^(lesson|chapter):/.test(item)) for (const date of Object.keys(days)) days[date] = days[date].filter(x => x !== item);
    days[today] = (days[today] || []).filter(x => x !== item);
    if (checked) days[today].push(item);
    try { localStorage.setItem(key, JSON.stringify(days)); storageOK = true; } catch { storageOK = false; }
    render();
  }
  function snapshot(now = new Date()) {
    const today = dateKey(now);
    const count = date => (days[date] || []).length;
    let streak = 0, cursor = count(today) ? now : shift(now,-1);
    while (count(dateKey(cursor))) { streak++; cursor = shift(cursor,-1); }
    const cells = Array.from({length:84}, (_, i) => {const date = dateKey(shift(now,i-83)); return {date,count:count(date)};});
    const lessons = new Set(Object.values(days).flat().filter(x => /^(lesson|chapter):/.test(x)));
    return {streak,cells,week:cells.slice(-7).filter(c => c.count).length,lessons:lessons.size,
      subjects:subjects.map(id=>({id,count:[...lessons].filter(x=>x.startsWith(id === 'environment-book' ? 'chapter:environment:' : id === 'economy-book' ? 'chapter:economy:' : `lesson:${id}:`)).length}))};
  }
  function render() {
    const host = document.getElementById('profile-consistency');
    if (!host) return;
    const data = snapshot();
    host.innerHTML = `<h3>My consistency <span>Last 12 weeks</span></h3><div class="consistency-stats"><div><strong>${data.streak}</strong><span>day streak</span></div><div><strong>${data.week}<small>/7</small></strong><span>active days in last 7 days</span></div><div><strong>${data.lessons}</strong><span>topics completed</span></div></div><div class="consistency-grid" role="group" aria-label="Daily study activity for the last 84 days">${data.cells.map(c=>`<button type="button" class="consistency-day level-${Math.min(c.count,4)}" aria-label="${c.date}: ${c.count} completed activities" title="${c.date}: ${c.count} completed activities" data-consistency-date="${c.date}"></button>`).join('')}</div><div class="consistency-legend"><span>Less</span>${[0,1,2,3,4].map(n=>`<i class="level-${n}"></i>`).join('')}<span>More</span></div><p id="consistency-detail" role="status">Tap a day to see completed activities.</p><details class="consistency-subjects"><summary>Progress by subject</summary>${data.subjects.map(s=>`<label>${esc(s.id === 'environment-book' ? 'Environment · Quick Book preview' : s.id === 'governance' ? 'Governance' : s.id === 'ir' ? 'International Relations' : s.id === 'economy-book' ? 'Economics · Rau’s IAS' : s.id)}<span>${s.count} / ${s.id === 'environment-book' ? 9 : s.id === 'governance' ? 5 : s.id === 'ir' ? 7 : s.id === 'economy-book' ? 12 : 60}</span><progress value="${s.count}" max="${s.id === 'environment-book' ? 9 : s.id === 'governance' ? 5 : s.id === 'ir' ? 7 : s.id === 'economy-book' ? 12 : 60}" aria-label="${esc(s.id === 'environment-book' ? 'Environment · Quick Book preview' : s.id === 'governance' ? 'Governance' : s.id === 'ir' ? 'International Relations' : s.id === 'economy-book' ? 'Economics · Rau’s IAS' : s.id)} lessons completed"></progress></label>`).join('')}</details><p class="consistency-note">Counts finished lessons, book chapters and checked daily-plan blocks. Lesson tracking starts with this update. Saved for your account in this browser.${storageOK?'':' Storage is unavailable; new progress lasts only for this visit.'}</p>`;
    host.onclick = event => {
      const date = event.target.closest('[data-consistency-date]')?.dataset.consistencyDate;
      if (!date) return;
      const labels = ['Foundation study','Recall & revision','News brief','Question practice','Breaks'];
      document.getElementById('consistency-detail').textContent = `${date}: ` + ((days[date] || []).map(item=>item.startsWith('block:')?labels[Number(item.split(':')[1])]:item.startsWith('chapter:environment:') ? item.replace('chapter:environment:', 'Environment preview · chapter ') : item.startsWith('chapter:economy:') ? item.replace('chapter:economy:', 'Economics · chapter ') :item.startsWith('lesson:governance:') ? item.replace('lesson:governance:', 'Governance · chapter ') : item.startsWith('lesson:ir:') ? item.replace('lesson:ir:', 'IR · chapter ') : item.replace('lesson:','').replace(':',' · day ')).join(', ') || 'No completed activities.');
    };
  }
  document.addEventListener('change', event => {
    if (event.target.matches('[data-prep-check]')) record(`block:${event.target.dataset.prepCheck}`, event.target.checked);
  });
  document.getElementById('profile-menu')?.addEventListener('toggle', render);
  return {setAccount,record,snapshot,isComplete:item=>Object.values(days).some(items=>items.includes(item))};
})();
