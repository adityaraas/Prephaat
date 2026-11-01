/* Active question dwell time. Hidden tabs and locked/review screens do not count. */
const QuestionTiming = (() => {
  let totals = {}, active = null, started = null;
  const flush = () => {
    if (active && started !== null) totals[active] = (totals[active] || 0) + Math.max(0, performance.now() - started);
    started = null;
  };
  function select(id) {
    if (id === active && started !== null) return;
    flush(); active = id || null;
    if (active && !document.hidden) started = performance.now();
  }
  function stop() { flush(); active = null; }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) flush(); else if (active) started = performance.now();
  });
  return { select, stop, reset() { stop(); totals = {}; }, snapshot() { flush(); if (active && !document.hidden) started = performance.now(); return Object.fromEntries(Object.entries(totals).map(([key,value])=>[key,Math.round(value)])); }, current: () => active };
})();
