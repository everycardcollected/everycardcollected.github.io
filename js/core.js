// Shared runtime: data loading, rarity helpers, tooltip, formatting, card art.
window.PPA = (() => {
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => [...el.querySelectorAll(s)];
  const cache = new Map();
  const json = (p) => {
    if (!cache.has(p)) cache.set(p, fetch(p).then(r => { if (!r.ok) throw new Error(p + ' ' + r.status); return r.json(); }));
    return cache.get(p);
  };
  const bin = (p) => {
    if (!cache.has(p)) cache.set(p, fetch(p).then(r => r.text()).then(t => { const b = atob(t.trim()); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; }));
    return cache.get(p);
  };

  // Rarity: code -> group (6 identity colors) + symbol + label
  const RARITY = {
    100: { code: 'C', sym: '◆', label: '1-diamond (Common)', g: 'dia' },
    200: { code: 'U', sym: '◆◆', label: '2-diamond (Uncommon)', g: 'dia' },
    300: { code: 'R', sym: '◆◆◆', label: '3-diamond (Rare)', g: 'dia' },
    400: { code: 'RR', sym: '◆◆◆◆', label: '4-diamond (ex)', g: 'rr' },
    500: { code: 'AR', sym: '☆', label: '1-star (Art Rare)', g: 'star' },
    600: { code: 'SR', sym: '☆☆', label: '2-star (Super Rare)', g: 'star2' },
    700: { code: 'SAR', sym: '☆☆', label: '2-star (Special Art)', g: 'star2' },
    800: { code: 'IM', sym: '☆☆☆', label: '3-star (Immersive)', g: 'star2' },
    830: { code: 'S', sym: '✦', label: '1-shiny', g: 'shiny' },
    860: { code: 'SSR', sym: '✦✦', label: '2-shiny', g: 'shiny' },
    900: { code: 'UR', sym: '♛', label: 'Crown', g: 'crown' },
  };
  const BY_CODE = Object.fromEntries(Object.entries(RARITY).map(([k, v]) => [v.code, { ...v, r: +k }]));
  const GROUPS = [
    { g: 'dia', label: '◆ – ◆◆◆', name: '1–3 diamond' },
    { g: 'rr', label: '◆◆◆◆', name: '4-diamond (ex)' },
    { g: 'star', label: '☆', name: '1-star' },
    { g: 'star2', label: '☆☆ / ☆☆☆', name: '2-star and 3-star' },
    { g: 'shiny', label: '✦ / ✦✦', name: 'Shiny' },
    { g: 'crown', label: '♛', name: 'Crown' },
  ];
  const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const gColor = (g) => css('--r-' + g);
  const rColor = (r) => gColor((RARITY[r] || RARITY[100]).g);
  const rarityOf = (codeOrInt) => typeof codeOrInt === 'number' ? RARITY[codeOrInt] : BY_CODE[codeOrInt];
  const badge = (r) => {
    const R = rarityOf(r) || RARITY[100];
    const s = document.createElement('span');
    s.className = 'rb'; s.style.setProperty('--rc', `var(--r-${R.g})`);
    s.textContent = R.sym; s.title = R.label;
    return s;
  };

  // numbers
  // Times are seconds since the first pack; we show day and hour of the run, never calendar dates.
  const dayOf = (s) => Math.floor(s / 86400) + 1;
  const when = (s) => `Day ${dayOf(s)}, hour ${Math.floor(s / 3600)}`;
  const fmt = (n, d = 0) => n == null || isNaN(n) ? '–' : Number(n).toLocaleString('en-US', { maximumFractionDigits: d, minimumFractionDigits: d });
  const pct = (x, d = 1) => x == null || isNaN(x) ? '–' : (x * 100).toFixed(d) + '%';
  const compact = (n) => Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(n);
  const oneIn = (p) => p > 0 ? '1 in ' + fmt(Math.round(1 / p)) : '–';

  // tooltip
  let tipEl;
  const tip = {
    show(e, build) {
      if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; tipEl.setAttribute('role', 'tooltip'); document.body.appendChild(tipEl); }
      tipEl.replaceChildren();
      build(tipEl);
      tipEl.classList.add('on');
      tip.move(e);
    },
    move(e) {
      if (!tipEl) return;
      const pt = e.touches ? e.touches[0] : e;
      let x = pt.clientX + 14, y = pt.clientY + 14;
      const w = tipEl.offsetWidth, h = tipEl.offsetHeight;
      if (x + w > innerWidth - 8) x = pt.clientX - w - 14;
      if (y + h > innerHeight - 8) y = pt.clientY - h - 14;
      tipEl.style.left = Math.max(8, x) + 'px'; tipEl.style.top = Math.max(8, y) + 'px';
    },
    hide() { tipEl && tipEl.classList.remove('on'); clearTimeout(tipTimer); },
  };
  // Touch screens have no real hover: a tap fires the hover handlers and the tooltip stays pinned. There, a tooltip
  // closes on scroll, on a tap elsewhere, or after a few seconds; desktop keeps normal hover behaviour.
  let tipTimer, tipShownAt = 0;
  const TOUCH = matchMedia('(hover: none), (pointer: coarse)').matches;
  if (TOUCH) {
    const show0 = tip.show;
    tip.show = (e, build) => { show0(e, build); tipShownAt = performance.now(); clearTimeout(tipTimer); tipTimer = setTimeout(tip.hide, 4500); };
    addEventListener('scroll', () => { if (performance.now() - tipShownAt > 250) tip.hide(); }, { passive: true, capture: true });
    addEventListener('touchstart', (e) => { if (tipEl && !tipEl.contains(e.target)) tip.hide(); }, { passive: true, capture: true });
    // hover-only styling (lifts, glows) sticks after a tap on phones, so drop :hover rules there
    const strip = (rules) => {
      for (let i = rules.length - 1; i >= 0; i--) {
        const r = rules[i];
        if (r.cssRules && !r.selectorText) { strip(r.cssRules); continue; }
        if (!r.selectorText || !r.selectorText.includes(':hover')) continue;
        const keep = r.selectorText.split(',').filter(x => !x.includes(':hover'));
        try { if (keep.length) r.selectorText = keep.join(','); else r.parentStyleSheet && (r.parentRule ? r.parentRule.deleteRule(i) : r.parentStyleSheet.deleteRule(i)); } catch {}
      }
    };
    const run = () => { for (const sh of document.styleSheets) { try { strip(sh.cssRules); } catch {} } };
    if (document.readyState === 'complete') run(); else addEventListener('load', run);
    document.documentElement.classList.add('touch');
  }
  const el = (tag, attrs = {}, ...kids) => {
    const n = document.createElement(tag);
    for (const [k, v] of Object.entries(attrs)) {
      if (v == null) continue;
      if (k === 'class') n.className = v; else if (k === 'text') n.textContent = v;
      else if (k === 'style') n.style.cssText = v;
      else if (k.startsWith('on')) n.addEventListener(k.slice(2), v);
      else n.setAttribute(k, v);
    }
    for (const k of kids.flat()) if (k != null) n.append(k.nodeType ? k : document.createTextNode(k));
    return n;
  };

  // catalog + art
  let catalog;
  const loadCatalog = async () => {
    if (catalog) return catalog;
    const c = await json('data/cards.json');
    catalog = c;
    c.cards.forEach(x => { if (x.name == null) x.name = x.n; });
    catalog.byId = Object.fromEntries(c.cards.map(x => [x.id, x]));
    catalog.packById = Object.fromEntries(c.packs.map(x => [x.id, x]));
    return catalog;
  };
  const card = (id) => catalog && catalog.byId[id];
  // Render card art into a .cardart box: one small webp per card, loaded only when it nears the screen.
  const cardArt = (id, { holo = false } = {}) => {
    const c = card(id);
    const box = el('span', { class: 'cardart' + (holo ? ' holo' : ''), role: 'img', 'aria-label': c ? `${c.n}, ${(RARITY[c.r] || RARITY[100]).label} card` : 'Card' });
    if (c) box.append(el('img', { src: `art/c/${id}.webp`, alt: '', loading: 'lazy', decoding: 'async' }));
    else {
      const d = el('span'); d.style.background = 'linear-gradient(160deg, color-mix(in oklab, #888 55%, var(--surface)), var(--surface-2))';
      box.append(d);
    }
    return box;
  };
  const cardTip = (t, id, extra) => {
    const c = card(id);
    t.append(el('b', { text: c ? c.n : 'Card' }));
    if (c) t.append(badge(c.r), ' ', el('span', { class: 'k', text: (catalog.packById[c.p?.[0]]?.name || '') }));
    if (extra) t.append(el('div', { class: 'k', text: extra }));
  };

  // view switching
  const views = () => $$('[data-view]');
  const setView = (v) => {
    views().forEach(n => n.hidden = n.dataset.view !== v);
    $$('.tab').forEach(t => t.setAttribute('aria-selected', String(t.dataset.go === v)));
    document.dispatchEvent(new CustomEvent('ppa:view', { detail: v }));
  };

  // lazy render when near viewport
  const lazy = (node, fn) => {
    let done = false;
    const run = () => { if (done) return; done = true; try { fn(node); } catch (e) { console.error(e); node.append(el('p', { class: 'small', text: 'This figure could not load: ' + e.message })); } };
    if (!('IntersectionObserver' in window)) return run();
    const io = new IntersectionObserver((es) => { if (es.some(e => e.isIntersecting)) { io.disconnect(); run(); } }, { rootMargin: '600px 0px' });
    io.observe(node);
  };

  return { $, $$, json, bin, dayOf, when, RARITY, BY_CODE, GROUPS, gColor, rColor, rarityOf, badge, fmt, pct, compact, oneIn, tip, el, loadCatalog, card, cardArt, cardTip, setView, lazy, css, get catalog() { return catalog; } };
})();
