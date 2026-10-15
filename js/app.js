// Boot: views, theme toggle, chapter nav, lazy chart rendering.
(async () => {
  const { $, $$, el, setView, lazy } = PPA;
  // theme
  const root = document.documentElement;
  try { const t = localStorage.getItem('ppa-theme'); if (t) root.dataset.theme = t; } catch {}
  $('#theme-btn').onclick = () => {
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : !matchMedia('(prefers-color-scheme: light)').matches;
    root.dataset.theme = dark ? 'light' : 'dark';
    try { localStorage.setItem('ppa-theme', root.dataset.theme); } catch {}
  };
  // views
  $$('.tab').forEach(t => t.onclick = () => PPA.go(t.dataset.go));
  await PPA.loadCatalog();
  // chapter nav built from sections
  const nav = $('#chapters');
  const secs = $$('#story section.chapter[id]');
  secs.forEach(s => nav.append(el('a', { href: '#' + s.id, text: s.dataset.short || s.querySelector('h2')?.textContent || s.id })));
  // highlight the chapter whose top most recently passed a line just under the header; computed from layout on every
  // scroll/resize so it stays right when lazy charts change section heights
  let curNav = '', navQ = 0;
  const markNav = () => {
    navQ = 0; if ($('#story').hidden) return;
    const line = (($('.topbar')?.getBoundingClientRect().height) || 56) + innerHeight * .25;
    let id = '';
    for (const s of secs) { if (s.getBoundingClientRect().top <= line) id = s.id; else break; }
    if (innerHeight + scrollY >= document.documentElement.scrollHeight - 4) id = secs[secs.length - 1].id;
    if (id === curNav) return; curNav = id;
    $$('a', nav).forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + id));
    const on = $('a.on', nav); if (on) nav.scrollTo({ left: on.offsetLeft - nav.clientWidth / 2 + on.offsetWidth / 2, behavior: 'smooth' });
  };
  const queueNav = () => { if (!navQ) navQ = requestAnimationFrame(markNav); };
  addEventListener('scroll', queueNav, { passive: true }); addEventListener('resize', queueNav);
  new ResizeObserver(queueNav).observe($('#story'));
  // charts
  $$('[data-chart]').forEach(n => lazy(n, () => {
    const fn = window.Story && window.Story[n.dataset.chart];
    if (fn) return fn(n);
    n.append(el('p', { class: 'small', text: 'Missing chart: ' + n.dataset.chart }));
  }));
  // explore lazily on first view
  let explored = false;
  document.addEventListener('ppa:view', e => { if (e.detail === 'explore' && !explored) { explored = true; window.Explore && Explore.init(); } });
  // routing: every in-page link goes through here so the Back button restores it
  const topH = () => ($('.topbar')?.getBoundingClientRect().height || 56) + 8;
  let settle = 0;
  const scrollToEl = (t) => {
    const go = () => scrollTo({ top: Math.max(0, t.getBoundingClientRect().top + scrollY - topH()), behavior: 'instant' });
    go();
    // lazy charts above the target change height as they render; keep the target pinned until the page settles
    const id = ++settle, until = performance.now() + 2500;
    const stop = () => { settle++; removeEventListener('wheel', stop); removeEventListener('touchstart', stop); removeEventListener('keydown', stop); };
    addEventListener('wheel', stop, { once: true, passive: true }); addEventListener('touchstart', stop, { once: true, passive: true }); addEventListener('keydown', stop, { once: true });
    const tick = () => { if (id !== settle || performance.now() > until) return; go(); markNav && markNav(); setTimeout(tick, 60); };
    setTimeout(tick, 60);
  };
  const route = (h) => {
    if (h === 'explore' || h === 'method') { setView(h); scrollTo({ top: 0 }); return; }
    if (h.startsWith('x-') || h.startsWith('card=') || h.startsWith('trainer=') || h.startsWith('pack=')) { setView('explore'); window.Explore && Explore.route && Explore.route(h); return; }
    setView('story');
    const t = h && h !== 'story' && h !== 'top' && document.getElementById(h);
    if (t) scrollToEl(t); else scrollTo({ top: 0, behavior: 'instant' });
  };
  PPA.go = (h, replace) => { h = String(h).replace(/^#/, ''); if (location.hash.slice(1) !== h) history[replace ? 'replaceState' : 'pushState'](null, '', '#' + h); route(h); };
  document.addEventListener('click', (e) => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || a.target) return;
    const h = a.getAttribute('href').slice(1);
    if (h && !document.getElementById(h) && !/^(explore|method|story|top|x-|card=|trainer=|pack=)/.test(h)) return;
    e.preventDefault(); PPA.go(h || 'top');
  });
  addEventListener('popstate', () => { if (PPA.skipRoute) { PPA.skipRoute = false; return; } route(location.hash.slice(1)); });
  route(location.hash.slice(1));
  document.addEventListener('ppa:pack', e => { window.Explore && Explore.openPack(e.detail); });
})();
