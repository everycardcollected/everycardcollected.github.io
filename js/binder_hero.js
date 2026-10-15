// Hero: the binder filling up. Every pullable card is a slot; it flips to its art the moment the fleet first found it.
(() => {
  const { $, el, fmt, tip, json, css } = PPA;
  const host = $('#bh'); if (!host) return;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const TIERS = [
    { key: 'diamond', name: 'Diamond cards', sub: '1 to 4-diamond', icon: 'diamond', g: 'dia' },
    { key: 'star', name: 'Star cards', sub: '1, 2 and 3-star', icon: 'star', g: 'star' },
    { key: 'shiny', name: 'Shiny cards', sub: '1 and 2-shiny', icon: 'shiny', g: 'shiny' },
    { key: 'crown', name: 'Crowns', sub: 'the gold cards', icon: 'crown', g: 'crown' },
  ];
  const EXP = 1.6, DUR = 30; // playback: p in [0,1] maps to hour T * p^EXP, so the long tail gets real screen time
  const ROUTE = { P: 'from a pack', W: 'from a Wonder Pick', F: 'from a free reward', B: 'from a battle reward', U: 'from an untracked source' };

  // ---------- DOM ----------
  const count = el('b', { class: 'bh-count num', text: '0' });
  const clock = el('div', { class: 'bh-clock num' });
  const toast = el('div', { class: 'bh-toast', 'aria-live': 'polite' });
  const head = el('div', { class: 'bh-head' },
    el('div', { class: 'bh-big' }, count, el('span', { class: 'bh-of', text: ' / 3,480' }), el('div', { class: 'bh-cap', text: 'cards found' })),
    el('div', { class: 'bh-side' }, clock, toast));
  const canvas = el('canvas', { class: 'bh-canvas', role: 'img', 'aria-label': 'Every pullable card as a slot in a binder, lighting up when first found' });
  const fx = el('canvas', { class: 'bh-fx', 'aria-hidden': 'true' });
  const labels = el('div', { class: 'bh-labels', 'aria-hidden': 'true' });
  const board = el('div', { class: 'bh-board' }, canvas, fx, labels);
  const play = el('button', { class: 'bh-play', type: 'button' });
  const scrub = el('input', { class: 'bh-scrub', type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': 'Time in the week' });
  const marks = el('div', { class: 'bh-marks' });
  const ctrl = el('div', { class: 'bh-ctrl' }, play, el('div', { class: 'bh-track' }, scrub, marks));
  host.append(head, board, ctrl, el('p', { class: 'bh-hint', text: 'Hover any card to see when it was found and by whom. Click to open it.' }));

  // ---------- data ----------
  let D, PM, alias, finderAcct = {}, T = 170.6, N = 0, tierOf, hourOf, idOf, routeOf, byHour, finder = {}, sheet, ready = false;
  let p = 0, lit = 0, playing = false, last = 0, raf = 0, startedOnce = false;
  let L = { slots: [] }, dpr = 1;
  const flashes = [];

  Promise.all([json('data/binder_hero.json'), json('data/accounts.json'), PPA.loadCatalog()]).then(([d, acc]) => {
    D = d; alias = acc.alias; N = d.cards.length;
    let run = 0; PM = d.pmd.map(x => (run += x));
    tierOf = new Uint8Array(N); hourOf = new Float32Array(N); idOf = []; routeOf = [];
    d.cards.forEach((c, k) => { idOf[k] = c[0]; tierOf[k] = c[1]; hourOf[k] = c[2]; routeOf[k] = c[3]; if (c[4] >= 0) { finder[k] = c[4]; finderAcct[k] = c[5]; } });
    T = Math.max(...hourOf);
    byHour = Array.from({ length: N }, (_, k) => k).sort((a, b) => hourOf[a] - hourOf[b]);
    sheet = new Image(); sheet.onload = () => { ready = true; redraw(); }; sheet.src = d.url;
    buildMarks(); layout(); setP(RM ? 1 : 0);
    new ResizeObserver(() => { layout(); redraw(); }).observe(board);
    const retheme = () => redraw();
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
    if (!RM) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting) && !startedOnce) { startedOnce = true; io.disconnect(); start(); } }, { threshold: .3 }).observe(board);
  }).catch(e => { console.error(e); host.append(el('p', { class: 'small', text: 'The binder could not load: ' + e.message })); });

  // ---------- time ----------
  const hourAt = (pp) => T * Math.pow(pp, EXP);
  const pAt = (h) => Math.pow(Math.min(1, h / T), 1 / EXP);
  const packsAt = (h) => PM[Math.max(0, Math.min(PM.length - 1, Math.floor(h * 60)))];

  let MS = [];
  const buildMarks = () => {
    const sorted = byHour.map(k => hourOf[k]);
    const at = (frac) => sorted[Math.ceil(frac * N) - 1];
    const lastDia = Math.max(...byHour.filter(k => tierOf[k] === 0).map(k => hourOf[k]));
    const firstCrown = Math.min(...byHour.filter(k => tierOf[k] === 3).map(k => hourOf[k]));
    const lastK = byHour[N - 1];
    MS = [
      { h: firstCrown, short: 'First crown', long: `First crown: ${PPA.card(idOf[byHour.find(k => tierOf[k] === 3)])?.n}` },
      { h: at(.5), short: 'Half', long: 'Half the game found' },
      { h: lastDia, short: 'All diamonds', long: 'Every diamond card found' },
      { h: at(.9), short: '90%', long: '90% of the game found' },
      { h: at(.99), short: '99%', long: `99% found: only ${N - Math.ceil(.99 * N)} cards left` },
      { h: hourOf[lastK], short: 'Last card', long: `The last card: ${PPA.card(idOf[lastK])?.n}` },
    ].sort((a, b) => a.h - b.h);
    let lastX = -1, row = 0;
    marks.replaceChildren(...MS.map(m => { const x = pAt(m.h) * 100; row = x - lastX < 11 ? 1 - row : 0; lastX = x; const b = el('button', { type: 'button', class: 'bh-mark' + (row ? ' low' : ''), style: `left:${x.toFixed(2)}%`, title: `${m.long} · hour ${m.h.toFixed(1)}` }, el('i'), el('span', { text: m.short })); b.onclick = () => { pause(); setP(pAt(m.h) + 1e-4); }; return b; }));
  };

  // ---------- layout ----------
  const layout = () => {
    const W = board.clientWidth; if (!W) return;
    dpr = Math.min(2, devicePixelRatio || 1);
    const gap = W > 700 ? 2 : 1, lab = 26, bandGap = 14;
    const sw = W > 1000 ? 9 : W > 700 ? 8 : 5;
    const slots = new Array(N); let y = 0; const bands = [];
    TIERS.forEach((t, ti) => {
      const ks = []; for (let k = 0; k < N; k++) if (tierOf[k] === ti) ks.push(k);
      const crown = ti === 3;
      let w = sw;
      if (crown) w = Math.max(W > 700 ? 20 : 14, Math.min(40, Math.floor((W - (ks.length - 1) * gap) / ks.length)));
      const h = Math.round(w * 1.4), cols = Math.max(1, Math.floor((W + gap) / (w + gap)));
      const used = cols * (w + gap) - gap, x0 = crown ? Math.max(0, (W - Math.min(used, ks.length * (w + gap) - gap)) / 2) : (W - used) / 2;
      bands.push({ t, y, n: ks.length, k0: ks });
      y += lab;
      ks.forEach((k, j) => { slots[k] = { x: x0 + (j % cols) * (w + gap), y: y + Math.floor(j / cols) * (h + gap), w, h }; });
      y += Math.ceil(ks.length / cols) * (h + gap) - gap + bandGap;
    });
    const H = y - bandGap + 4;
    [canvas, fx].forEach(c => { c.width = W * dpr; c.height = H * dpr; c.style.height = H + 'px'; });
    L = { slots, bands, W, H };
    labels.replaceChildren(...bands.map(b => el('div', { class: 'bh-lab', style: `top:${b.y}px;--c:var(--r-${b.t.g})` }, el('img', { src: `art/icons/rarity/rarity-${b.t.icon}.webp`, alt: '' }), el('b', { text: b.t.name }), el('span', { class: 'bh-labn num', 'data-tier': b.t.key }))));
  };

  // ---------- drawing ----------
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.roundRect ? g.roundRect(x, y, w, h, r) : g.rect(x, y, w, h); };
  const drawSlot = (g, k, on) => {
    const s = L.slots[k]; if (!s) return;
    const r = Math.max(1, s.w * .12);
    if (on && ready) {
      g.save(); rr(g, s.x, s.y, s.w, s.h, r); g.clip();
      const c = D.cols; g.drawImage(sheet, (k % c) * D.w, Math.floor(k / c) * D.h, D.w, D.h, s.x, s.y, s.w, s.h); g.restore();
    } else {
      g.fillStyle = on ? css('--r-' + TIERS[tierOf[k]].g) : css('--surface-2');
      rr(g, s.x, s.y, s.w, s.h, r); g.fill();
      if (!on) { g.strokeStyle = css('--line'); g.lineWidth = 1; g.stroke(); }
    }
  };
  const redraw = () => {
    if (!L.slots.length) return;
    const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, L.W, L.H);
    const h = hourAt(p);
    for (let k = 0; k < N; k++) drawSlot(g, k, hourOf[k] <= h);
    counts();
  };
  const counts = () => {
    const h = hourAt(p); const per = [0, 0, 0, 0], tot = [0, 0, 0, 0];
    for (let k = 0; k < N; k++) { tot[tierOf[k]]++; if (hourOf[k] <= h) per[tierOf[k]]++; }
    labels.querySelectorAll('.bh-labn').forEach((s, i) => { s.textContent = `${fmt(per[i])} / ${fmt(tot[i])}`; s.classList.toggle('done', per[i] === tot[i]); });
  };
  const fxLoop = () => {
    const g = fx.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, L.W, L.H);
    const now = performance.now();
    for (let i = flashes.length - 1; i >= 0; i--) {
      const f = flashes[i], a = 1 - (now - f.t) / f.d; if (a <= 0) { flashes.splice(i, 1); continue; }
      const s = L.slots[f.k]; if (!s) continue;
      const grow = (1 - a) * (f.big ? 14 : 5);
      g.strokeStyle = css('--r-' + TIERS[tierOf[f.k]].g); g.globalAlpha = a; g.lineWidth = f.big ? 2.5 : 1.5;
      rr(g, s.x - grow, s.y - grow, s.w + grow * 2, s.h + grow * 2, 4); g.stroke();
    }
    g.globalAlpha = 1;
    if (flashes.length || playing) requestAnimationFrame(fxLoop);
  };

  // ---------- state ----------
  let msShown = -2;
  const setP = (np, fromScrub) => {
    np = Math.max(0, Math.min(1, np));
    const h0 = hourAt(p), h = hourAt(np), forward = np >= p;
    p = np;
    if (!fromScrub) scrub.value = Math.round(p * 1000);
    scrub.style.setProperty('--f', (p * 100).toFixed(2) + '%');
    // incremental lighting when moving forward, full redraw otherwise
    if (forward && L.slots.length) {
      const g = canvas.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0);
      while (lit < N && hourOf[byHour[lit]] <= h) {
        const k = byHour[lit++]; drawSlot(g, k, true);
        if (playing && hourOf[k] > h0) flashes.push({ k, t: performance.now(), d: tierOf[k] >= 1 ? 1200 : 500, big: tierOf[k] >= 1 });
      }
      counts();
    } else { lit = 0; while (lit < N && hourOf[byHour[lit]] <= h) lit++; redraw(); }
    count.textContent = fmt(lit);
    const lastFi = finder[byHour[N - 1]];
    const packs = !PM ? 0 : lit === N && lastFi != null ? lastFi + 1 : packsAt(h);
    clock.replaceChildren(el('span', { text: `Hour ${h.toFixed(1)}` }), el('span', { text: `Day ${Math.floor(h / 24) + 1}` }), el('span', { text: fmt(packs) + (packs === 1 ? ' pack opened' : ' packs opened') }));
    // milestone toast
    let mi = -1; MS.forEach((m, i) => { if (h >= m.h) mi = i; });
    marks.querySelectorAll('.bh-mark').forEach((b, i) => b.classList.toggle('on', i <= mi));
    if (mi !== msShown) { msShown = mi; toast.replaceChildren(...(mi >= 0 ? [el('span', { class: 'bh-tk', text: `Hour ${MS[mi].h.toFixed(0)}` }), el('b', { text: MS[mi].long })] : [el('span', { class: 'bh-tk', text: 'Hour 0' }), el('b', { text: 'Empty binders, 1,500 brand-new accounts' })])); toast.classList.remove('pop'); void toast.offsetWidth; toast.classList.add('pop'); }
    play.replaceChildren(el('span', { class: 'bh-pi ' + (playing ? 'pause' : 'play'), 'aria-hidden': 'true' }), el('span', { text: playing ? 'Pause' : p >= 1 ? 'Replay' : 'Play' }));
    play.setAttribute('aria-label', playing ? 'Pause' : 'Play the week');
  };
  const loop = (now) => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    // ease out near the end so the final cards land one by one
    const slow = p > .9 ? .55 : 1;
    let np = p + dt / DUR * slow;
    if (np >= 1) { np = 1; playing = false; }
    setP(np);
    if (playing) raf = requestAnimationFrame(loop);
  };
  const start = () => { if (p >= 1) setP(0); playing = true; last = performance.now(); raf = requestAnimationFrame(loop); requestAnimationFrame(fxLoop); setP(p); };
  const pause = () => { playing = false; cancelAnimationFrame(raf); setP(p); };
  play.onclick = () => (playing ? pause() : start());
  scrub.addEventListener('input', () => { const v = +scrub.value / 1000; if (playing) { playing = false; cancelAnimationFrame(raf); } setP(v, true); });

  // ---------- hover / click ----------
  const pick = (e) => {
    const r = canvas.getBoundingClientRect(), x = e.clientX - r.left, y = e.clientY - r.top;
    for (let k = 0; k < N; k++) { const s = L.slots[k]; if (s && x >= s.x - 1 && x <= s.x + s.w + 1 && y >= s.y - 1 && y <= s.y + s.h + 1) return k; }
    return -1;
  };
  let hov = -1;
  board.addEventListener('pointermove', (e) => {
    const k = pick(e); if (k !== hov) { hov = k; if (k < 0) return tip.hide(); }
    if (k < 0) return;
    const found = hourOf[k] <= hourAt(p), fi = finder[k];
    const who = routeOf[k] === 'P' && fi != null ? `by ${alias[finderAcct[k]]} from a pack` : ROUTE[routeOf[k]] || '';
    tip.show(e, t => {
      t.append(el('div', { class: 'bh-tipart' }, PPA.cardArt(idOf[k], { holo: tierOf[k] >= 1 })));
      PPA.cardTip(t, idOf[k], found ? `Found at hour ${hourOf[k].toFixed(1)}, ${who}` : `Not found yet. It turns up at hour ${hourOf[k].toFixed(1)}.`);
    });
    board.style.cursor = 'pointer';
  });
  board.addEventListener('pointerleave', () => { hov = -1; tip.hide(); });
  board.addEventListener('click', (e) => { const k = pick(e); if (k >= 0 && window.Explore && Explore.openCard) Explore.openCard(idOf[k]); });
})();
