// Hero: card fan + "the whole week" pack wall.
// Wall = one square per pack, one band per day of the run, coloured by the best card inside.
// A lens (mouse) shows real card art for the packs under the cursor; click/tap opens the hour as rows of real cards.
// A player replays the week with play/pause, speed and a scrubber.
(() => {
  const { $, el, fmt, tip, RARITY } = PPA;

  // ---------- rarity vocabulary (what players say) ----------
  const RI = { 100: ['diamond', 1], 200: ['diamond', 2], 300: ['diamond', 3], 400: ['diamond', 4], 500: ['star', 1], 600: ['star', 2], 700: ['star', 2], 800: ['star', 3], 830: ['shiny', 1], 860: ['shiny', 2], 900: ['crown', 1] };
  const RNAME = { 100: '1-diamond', 200: '2-diamond', 300: '3-diamond', 400: '4-diamond (ex)', 500: '1-star', 600: '2-star', 700: '2-star', 800: '3-star (immersive)', 830: 'Shiny', 860: '2-shiny', 900: 'Crown' };
  const icons = (name, n, cls = 'h4-ri') => { const s = el('span', { class: cls, 'aria-hidden': 'true' }); for (let k = 0; k < n; k++) s.append(el('img', { src: `art/icons/rarity/rarity-${name}.webp`, alt: '' })); return s; };
  const rIcons = (r, cls) => icons(...(RI[r] || RI[100]), cls);
  const LEG = [
    { g: 'dia', ic: ['diamond', 1], label: '1 to 3-diamond', test: (r) => r <= 300 },
    { g: 'rr', ic: ['diamond', 4], label: '4-diamond ex', test: (r) => r === 400 },
    { g: 'star', ic: ['star', 1], label: '1-star', test: (r) => r === 500 },
    { g: 'star2', ic: ['star', 2], label: '2 & 3-star', test: (r) => r >= 600 && r <= 800 },
    { g: 'shiny', ic: ['shiny', 1], label: 'Shiny', test: (r) => r === 830 || r === 860 },
    { g: 'crown', ic: ['crown', 1], label: 'Crown', test: (r) => r === 900 },
  ];

  // run-relative clock: seconds since the first pack -> "Day 3", "62h 14m"
  const dayName = (s) => `Day ${PPA.dayOf(s)}`;
  const hm = (s) => `${Math.floor(s / 3600)}h ${String(Math.floor(s % 3600 / 60)).padStart(2, '0')}m`;
  const hms = hm;
  const KIND = { 2: 'God pack', 3: 'Deluxe bonus table', 4: 'Themed rare pack (1 in 20,000)', 5: 'Pity guarantee', 6: '6-card bonus pack' };

  // ---------- card fan ----------
  const fan = $('#h4-fan');
  if (fan) PPA.loadCatalog().then(() => {
    const ids = ['PK_20_002140_00', 'PK_20_001290_02', 'PK_20_000960_02', 'PK_20_000360_02', 'PK_20_010050_02'];
    ids.forEach((id, i) => {
      const k = i - 2;
      const a = PPA.cardArt(id, { holo: true });
      a.classList.add('h4-fc');
      a.style.setProperty('--k', k); a.style.setProperty('--ak', Math.abs(k));
      a.style.zIndex = 10 - Math.abs(k);
      a.style.animationDelay = (i * 90) + 'ms';
      fan.append(a);
    });
    fan.addEventListener('pointermove', (e) => {
      const r = fan.getBoundingClientRect();
      fan.style.setProperty('--mx', ((e.clientX - r.left) / r.width - .5).toFixed(3));
      fan.style.setProperty('--my', ((e.clientY - r.top) / r.height - .5).toFixed(3));
    });
    fan.addEventListener('pointerleave', () => { fan.style.setProperty('--mx', 0); fan.style.setProperty('--my', 0); });
  });

  // ---------- wall ----------
  const mountWall = (host) => {

  const base = el('canvas', { class: 'h4-base', role: 'img', 'aria-label': 'All 60,689 packs as coloured squares, one band per day' });
  const glow = el('canvas', { class: 'h4-glow', 'aria-hidden': 'true' });
  const fx = el('canvas', { class: 'h4-fx', 'aria-hidden': 'true' });
  const labels = el('div', { class: 'h4-days', 'aria-hidden': 'true' });
  const board = el('div', { class: 'h4-board' }, base, glow, fx);
  const stage = el('div', { class: 'h4-stage' }, labels, board);

  const legend = el('div', { class: 'h4-legend', role: 'group', 'aria-label': 'Highlight packs by their best card' });
  const hint = el('div', { class: 'h4-hint' });

  const playBtn = el('button', { class: 'h4-play', type: 'button', 'aria-label': 'Replay the week' });
  const clock = el('div', { class: 'h4-clock' });
  const cPacks = el('b', { class: 'num' }), cCards = el('b', { class: 'num' });
  const counts = el('div', { class: 'h4-counts' }, el('span', {}, cPacks, ' packs'), el('span', {}, cCards, ' distinct cards'));
  const speed = el('select', { class: 'h4-speed', 'aria-label': 'Replay speed' });
  [[3600, '1 hour / sec'], [3 * 3600, '3 hours / sec'], [6 * 3600, '6 hours / sec'], [12 * 3600, '12 hours / sec'], [86400, '1 day / sec']]
    .forEach(([v, l]) => speed.append(el('option', { value: v, text: l })));
  speed.value = 3 * 3600;
  const recent = el('div', { class: 'h4-recent', 'aria-label': 'Latest big pulls' });
  const spark = el('canvas', { class: 'h4-spark', 'aria-hidden': 'true' });
  const scrub = el('input', { class: 'h4-scrub', type: 'range', min: 0, step: 60, 'aria-label': 'Time in the week' });
  const ticks = el('div', { class: 'h4-ticks', 'aria-hidden': 'true' });
  const player = el('div', { class: 'h4-player' },
    el('div', { class: 'h4-prow' }, playBtn, el('div', { class: 'h4-read' }, clock, counts), recent, el('label', { class: 'h4-speedwrap' }, el('span', { text: 'Speed' }), speed)),
    el('div', { class: 'h4-timeline' }, spark, scrub, ticks));

  const zoom = el('div', { class: 'h4-zoom', 'aria-live': 'polite' });
  const lens = el('div', { class: 'h4-lens', 'aria-hidden': 'true' });
  document.body.append(lens);
  host.append(legend, stage, hint, player, zoom);

  let P, n, T, best, uniq, hl, dayStart = [], dayN = [], dayY = [], dayRows = [], day0;
  let cols, cell, H, px, py, img, dpr = 1;
  let only = null, upto = 0, cur = 0, playing = false, last = 0, raf = 0;
  const FIRST = () => (innerWidth < 700 ? 6 : 12);
  let hover = -1, selHour = null, featured = -1, filter = 'rare', shown = FIRST();
  let accounts = null;
  PPA.json('data/accounts.json').then(a => { accounts = a; }).catch(() => {});
  const alias = (i) => accounts ? accounts.alias[P.acct[i]] : '';
  const packOf = (i) => PPA.catalog.packById[P.packId(P.pack[i])];
  const abs = (i) => P.t0 + P.t[i];
  const bisect = (s) => { let lo = 0, hi = n; while (lo < hi) { const m = (lo + hi) >> 1; if (P.t[m] <= s) lo = m + 1; else hi = m; } return lo; };

  // colours: resolve any CSS colour via a 1px canvas
  const probe = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  const rgb = (c) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = c; probe.fillRect(0, 0, 1, 1); const d = probe.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
  const mix = (a, b, k) => a.map((v, i) => Math.round(v + (b[i] - v) * k));
  let C = {};
  const palette = () => {
    const css = PPA.css, surf = rgb(css('--surface')), line = rgb(css('--line-2'));
    const light = (surf[0] + surf[1] + surf[2]) / 3 > 128;
    C = { surf, ghost: mix(surf, line, .55), light, accent: css('--accent'), ink: css('--ink'), muted: css('--muted'), line: css('--line-2') };
    for (const r of Object.keys(RARITY)) {
      const c = rgb(PPA.rColor(+r));
      const k = r == 100 ? (light ? .3 : .2) : r == 200 ? (light ? .46 : .34) : r == 300 ? (light ? .66 : .55) : 1;
      C[r] = mix(surf, c, k);
    }
  };
  const grpOf = (r) => LEG.findIndex(L => L.test(r));

  // ---------- layout ----------
  const layout = () => {
    dpr = Math.min(2, devicePixelRatio || 1);
    const W = board.clientWidth || 1000;
    cell = W < 520 ? 2 : 3;
    cols = Math.floor(W / cell);
    const gap = Math.ceil(10 / cell), minRows = Math.ceil((W < 520 ? 14 : 26) / cell);
    let y = 0;
    labels.replaceChildren();
    for (let d = 0; d < dayN.length; d++) {
      dayY[d] = y; dayRows[d] = Math.ceil(dayN[d] / cols);
      const L = el('div', { class: 'h4-day', style: `top:${y * cell}px` }, el('b', { text: `Day ${d + 1}` }), el('span', { text: fmt(dayN[d]) }));
      labels.append(L);
      y += Math.max(dayRows[d], minRows) + gap;
    }
    H = y - gap;
    base.width = cols; base.height = H;
    base.style.width = cols * cell + 'px'; base.style.height = H * cell + 'px';
    for (const c of [glow, fx]) { c.width = Math.round(cols * cell * dpr); c.height = Math.round(H * cell * dpr); c.style.width = cols * cell + 'px'; c.style.height = H * cell + 'px'; }
    board.style.height = H * cell + 'px';
    px = new Uint16Array(n); py = new Uint16Array(n);
    for (let d = 0; d < dayN.length; d++) for (let j = 0; j < dayN[d]; j++) { const i = dayStart[d] + j; px[i] = j % cols; py[i] = dayY[d] + Math.floor(j / cols); }
    img = base.getContext('2d').createImageData(cols, H);
    glowUpto = -1;
    drawSpark();
    ticks.replaceChildren(...dayN.map((_, d) => { const s = day0 + d * 86400 - P.t0; const f = Math.max(0, s / T); return el('span', { style: `left:${(f * 100).toFixed(2)}%`, text: d === 0 ? '' : `Day ${d + 1}` }); }));
  };

  // ---------- drawing ----------
  let glowUpto = -1, glowOnly;
  const draw = () => {
    const d = img.data; d.fill(0);
    const g0 = C.ghost;
    for (let i = 0; i < n; i++) {
      const p = (py[i] * cols + px[i]) * 4;
      let c;
      if (i >= upto) c = g0;
      else if (only != null && grpOf(best[i]) !== only) c = mix(C.surf, C[best[i] <= 300 ? best[i] : 100], .55);
      else c = C[best[i]];
      d[p] = c[0]; d[p + 1] = c[1]; d[p + 2] = c[2]; d[p + 3] = i >= upto ? 140 : 255;
    }
    base.getContext('2d').putImageData(img, 0, 0);
    // glow for 2-star and better
    const g = glow.getContext('2d'), s = cell * dpr;
    if (glowUpto < 0 || upto < glowUpto || glowOnly !== only) { g.clearRect(0, 0, glow.width, glow.height); glowUpto = 0; }
    glowOnly = only;
    for (let i = Math.max(0, glowUpto); i < upto; i++) {
      const r = best[i]; if (r < 800 || r === 830) continue;
      if (only != null && grpOf(r) !== only) continue;
      g.globalAlpha = r === 900 ? .95 : r === 860 ? .7 : .45;
      g.fillStyle = `rgb(${C[r].join(',')})`;
      g.beginPath(); g.arc((px[i] + .5) * s, (py[i] + .5) * s, s * (r === 900 ? 2.4 : r === 860 ? 1.7 : 1.3), 0, 7); g.fill();
    }
    glowUpto = upto;
    drawFx();
  };
  const drawFx = () => {
    const g = fx.getContext('2d'), s = cell * dpr;
    g.clearRect(0, 0, fx.width, fx.height);
    if (selHour != null) {
      const [a, b] = hourRange(selHour);
      g.fillStyle = C.accent; g.globalAlpha = .38;
      for (let i = a; i < b; i++) g.fillRect(px[i] * s, py[i] * s, s, s);
      g.globalAlpha = 1;
    }
    const ring = (i, col, w) => { if (i < 0) return; g.strokeStyle = col; g.lineWidth = w * dpr; const cx = (px[i] + .5) * s, cy = (py[i] + .5) * s; g.beginPath(); g.arc(cx, cy, s * 2.6 + 2 * dpr, 0, 7); g.stroke(); };
    ring(featured, C.accent, 2);
    if (hover >= 0 && hover !== featured) ring(hover, C.ink, 1.5);
  };
  const drawSpark = () => {
    const w = spark.clientWidth || 600, h = spark.clientHeight || 34;
    spark.width = Math.round(w * dpr); spark.height = Math.round(h * dpr);
    const g = spark.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    const max = Math.max(...perHour), bw = w / perHour.length;
    const nowH = cur / 3600;
    perHour.forEach((v, k) => {
      const bh = Math.max(v ? 1 : 0, (v / max) * (h - 4));
      g.fillStyle = k + 1 <= nowH ? C.accent : C.line;
      g.globalAlpha = k + 1 <= nowH ? .9 : .9;
      g.fillRect(k * bw, h - bh, Math.max(1, bw - .6), bh);
    });
    g.globalAlpha = 1;
  };
  let perHour = [];

  // ---------- player ----------
  const fmtClock = (s) => `${dayName(s)} · ${hm(s)}`;
  const setCur = (s, fromScrub) => {
    cur = Math.max(0, Math.min(T, s));
    const u = cur >= T ? n : bisect(cur);
    if (!fromScrub) scrub.value = Math.round(cur);
    scrub.style.setProperty('--f', (cur / T * 100).toFixed(2) + '%');
    const at = u ? abs(u - 1) : P.t0;
    clock.textContent = fmtClock(cur >= T ? abs(n - 1) : P.t0 + cur);
    cPacks.textContent = fmt(u); cCards.textContent = fmt(u ? uniq[u - 1] : 0);
    if (u !== upto) { upto = u; draw(); updateRecent(); }
    drawSpark();
    playBtn.classList.toggle('on', playing);
    playBtn.setAttribute('aria-label', playing ? 'Pause' : 'Replay the week');
    playBtn.replaceChildren(el('span', { class: 'h4-pi', 'aria-hidden': 'true' }), el('span', { class: 'h4-pl', text: playing ? 'Pause' : cur >= T ? 'Replay' : 'Play' }));
    void at;
  };
  const loop = (now) => {
    const dt = Math.min(.1, (now - last) / 1000); last = now;
    let s = cur + dt * +speed.value;
    if (s >= T) { s = T; playing = false; }
    setCur(s);
    if (playing) raf = requestAnimationFrame(loop);
  };
  playBtn.onclick = () => {
    if (playing) { playing = false; cancelAnimationFrame(raf); setCur(cur); return; }
    if (cur >= T) setCur(0);
    playing = true; last = performance.now(); raf = requestAnimationFrame(loop);
  };
  scrub.addEventListener('input', () => setCur(+scrub.value, true));

  let recentKey = '';
  // last three 3-star-or-better pulls before a bound: the playhead, or the pack the reader clicked
  const updateRecent = (bound = upto, label = 'Latest big pulls') => {
    let lo = 0, hi = hl.length; while (lo < hi) { const m = (lo + hi) >> 1; if (hl[m].i < bound) lo = m + 1; else hi = m; }
    const L = hl.slice(Math.max(0, lo - 3), lo).reverse();
    const key = label + L.map(x => x.id + x.i).join();
    if (key === recentKey) return; recentKey = key;
    recent.replaceChildren(el('span', { class: 'h4-rl', text: label }), ...L.map(x => { const c = PPA.card(x.id); const a = PPA.cardArt(x.id); a.dataset.id = x.id; a.dataset.extra = `${RNAME[c.r] || ''} · ${fmtClock(abs(x.i))}`; return a; }));
  };

  // ---------- picking, lens ----------
  const pick = (e) => {
    const r = base.getBoundingClientRect();
    const cx = Math.floor((e.clientX - r.left) / cell), cy = Math.floor((e.clientY - r.top) / cell);
    if (cx < 0 || cx >= cols) return -1;
    for (let d = 0; d < dayN.length; d++) if (cy >= dayY[d] && cy < dayY[d] + dayRows[d]) { const j = (cy - dayY[d]) * cols + cx; return j < dayN[d] ? dayStart[d] + j : -1; }
    return -1;
  };
  const strip = (i, size = 's') => {
    const cs = el('div', { class: 'h4-cards' });
    P.cardsOf(i).forEach(id => { const a = PPA.cardArt(id, { size, holo: (PPA.card(id)?.r || 0) >= 800 }); a.dataset.id = id; cs.append(a); });
    cs.style.setProperty('--nc', P.cnt[i]);
    return cs;
  };
  let lensI = -1;
  const showLens = (e, i) => {
    if (i !== lensI) {
      lensI = i;
      const rows = [];
      for (let k = i - 2; k <= i + 2; k++) {
        if (k < 0 || k >= n) continue;
        rows.push(el('div', { class: 'h4-lrow' + (k === i ? ' on' : '') + (k >= upto ? ' future' : '') }, el('span', { class: 'h4-lt num', text: hms(abs(k)) }), strip(k)));
      }
      const pk = packOf(i);
      lens.replaceChildren(
        el('div', { class: 'h4-lh' }, el('b', { text: pk ? pk.name : 'Pack' }), el('span', { class: 'num', text: `#${fmt(i + 1)}` })),
        el('div', { class: 'h4-lsub', text: `${alias(i)} · ${dayName(abs(i))}, ${hms(abs(i))}` + (KIND[P.kind[i]] ? ` · ${KIND[P.kind[i]]}` : '') }),
        ...rows,
        el('div', { class: 'h4-lfoot', text: 'Click to open this hour' }));
    }
    const w = lens.offsetWidth, h = lens.offsetHeight;
    let x = e.clientX + 22, y = e.clientY - h / 2;
    if (x + w > innerWidth - 10) x = e.clientX - w - 22;
    y = Math.max(10, Math.min(innerHeight - h - 10, y));
    lens.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
    lens.classList.add('on');
  };
  const hideLens = () => { lens.classList.remove('on'); hover = -1; drawFx(); };
  let pend = null;
  board.addEventListener('pointermove', (e) => {
    if (!P || e.pointerType !== 'mouse') return;
    pend = e;
    if (raf2) return;
    raf2 = requestAnimationFrame(() => {
      raf2 = 0; const ev = pend; const i = pick(ev);
      if (i < 0) return hideLens();
      if (i !== hover) { hover = i; drawFx(); }
      showLens(ev, i);
    });
  });
  let raf2 = 0;
  board.addEventListener('pointerleave', hideLens);
  board.addEventListener('click', (e) => {
    if (!P) return; const i = pick(e); if (i < 0) return;
    openHour(hourOf(i), i);
    if (!playing) updateRecent(i + 1, `Big pulls up to ${dayName(abs(i))}, ${hm(abs(i))}`);
    if (e.pointerType !== 'mouse' || matchMedia('(hover: none)').matches) zoom.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // ---------- hour zoom ----------
  const hourOf = (i) => Math.floor(abs(i) / 3600);
  const hourRange = (h) => [bisect(h * 3600 - P.t0 - 1e-6), bisect((h + 1) * 3600 - P.t0 - 1e-6)];
  const rarest = (a, b) => { let k = a; for (let i = a; i < b; i++) if (best[i] > best[k]) k = i; return k; };
  const openHour = (h, focus) => {
    const [a, b] = hourRange(h);
    if (b <= a) return;
    selHour = h; featured = focus != null && focus >= a && focus < b ? focus : rarest(a, b); shown = FIRST();
    renderZoom(); drawFx();
  };
  const step = (dir) => {
    if (selHour == null) return;
    const [a, b] = hourRange(selHour);
    const i = dir < 0 ? a - 1 : b;
    if (i < 0 || i >= n) return;
    openHour(hourOf(i));
  };
  const packRow = (i, big) => {
    const pk = packOf(i), r = best[i];
    const meta = el('div', { class: 'h4-pm' },
      el('span', { class: 'h4-dot', style: pk ? `background:linear-gradient(135deg, ${pk.c1}, ${pk.c2})` : '' }),
      el('b', { text: pk ? pk.name : 'Pack' }),
      el('span', { class: 'num h4-pt', text: hms(abs(i)) }),
      el('span', { class: 'h4-pa', text: alias(i) }),
      KIND[P.kind[i]] ? el('span', { class: 'h4-kind', text: KIND[P.kind[i]] }) : null,
      el('span', { class: 'h4-best', title: 'Best card: ' + RNAME[r] }, rIcons(r)));
    const row = el(big ? 'div' : 'button', { class: 'h4-pack' + (big ? ' big' : '') + (i === featured && !big ? ' cur' : ''), type: big ? null : 'button', 'data-i': i }, meta, strip(i, big ? 'm' : 's'));
    return row;
  };
  const renderZoom = () => {
    const [a, b] = hourRange(selHour);
    const all = []; for (let i = a; i < b; i++) all.push(i);
    const rare = all.filter(i => best[i] >= 500);
    const list = filter === 'rare' ? rare : all;
    const s0 = selHour * 3600;
    const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Which packs to show' },
      ...[['rare', `1-star or better (${fmt(rare.length)})`], ['all', `All packs (${fmt(all.length)})`]].map(([k, l]) =>
        el('button', { type: 'button', 'aria-pressed': String(filter === k), text: l, onclick: () => { filter = k; shown = FIRST(); renderZoom(); } })));
    const grid = el('div', { class: 'h4-grid2' }, ...list.slice(0, shown).map(i => packRow(i)));
    const more = list.length > shown ? el('button', { class: 'btn ghost h4-more', type: 'button', text: `Show ${fmt(Math.min(48, list.length - shown))} more of ${fmt(list.length - shown)}`, onclick: () => { shown += 48; renderZoom(); } }) : null;
    zoom.replaceChildren(
      el('div', { class: 'h4-zh' },
        el('button', { class: 'h4-nav', type: 'button', 'aria-label': 'Previous hour', text: '‹', onclick: () => step(-1) }),
        el('div', { class: 'h4-zt' }, el('div', { class: 'h4-zk', text: 'Inside one hour' }), el('h3', { text: `${dayName(s0)} · hour ${Math.floor(s0 / 3600)}` }),
          el('div', { class: 'h4-zs', text: `${fmt(all.length)} packs opened · ${fmt(rare.length)} held a 1-star or better` })),
        el('button', { class: 'h4-nav', type: 'button', 'aria-label': 'Next hour', text: '›', onclick: () => step(1) })),
      el('div', { class: 'h4-feat' }, el('div', { class: 'h4-fl', text: featured >= 0 && best[featured] >= 600 ? 'Pack of the hour' : 'Selected pack' }), packRow(featured, true)),
      el('div', { class: 'h4-zbar' }, seg),
      list.length ? grid : el('p', { class: 'small', text: 'No pack this hour held a 1-star or better card. Switch to all packs to see them.' }),
      more);
  };
  zoom.addEventListener('click', (e) => {
    const b = e.target.closest('button.h4-pack'); if (!b) return;
    featured = +b.dataset.i; renderZoom(); drawFx();
    zoom.querySelector('.h4-feat').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  });

  // card tooltips anywhere in the hero
  const tipOn = (e) => { const a = e.target.closest('[data-id]'); if (!a || !host.contains(a)) return; tip.show(e, t => PPA.cardTip(t, a.dataset.id, a.dataset.extra)); };
  host.addEventListener('pointerover', (e) => { if (e.target.closest('.h4-zoom [data-id], .h4-recent [data-id]')) tipOn(e); });
  host.addEventListener('pointermove', (e) => { if (e.target.closest('.h4-zoom [data-id], .h4-recent [data-id]')) tip.move(e); });
  host.addEventListener('pointerout', (e) => { if (e.target.closest('[data-id]')) tip.hide(); });

  // legend = filter
  const renderLegend = () => {
    legend.replaceChildren(...LEG.map((L, k) => {
      const b = el('button', { type: 'button', class: 'h4-chip', 'aria-pressed': String(only === k), style: `--rc:var(--r-${L.g})` }, el('i'), icons(...L.ic), el('span', { text: L.label }));
      b.onclick = () => { only = only === k ? null : k; renderLegend(); glowUpto = -1; draw(); };
      return b;
    }));
  };
  renderLegend();
  hint.textContent = matchMedia('(hover: none)').matches ? 'Tap any square to see the real cards from that hour.' : 'Hover to look inside. Click any square to see its hour as real cards. Click a colour above to highlight it.';

  // Shared pack tooltip used elsewhere on the site (Explore)
  window.PackTip = (t, i) => {
    const pk = packOf(i);
    t.append(el('b', { text: pk ? pk.name : 'Pack' }));
    t.append(el('div', { class: 'k', text: `${alias(i)} · ${PPA.when(abs(i))}` }));
    if (KIND[P.kind[i]]) t.append(el('div', { class: 'k', style: 'color:var(--accent-ink);font-weight:700', text: '★ ' + KIND[P.kind[i]] }));
    const ul = el('div', { style: 'display:grid;gap:3px;margin-top:6px' });
    P.cardsOf(i).forEach(id => { const c = PPA.card(id); ul.append(el('div', {}, PPA.badge(c ? c.r : 100), ' ', c ? c.n : id)); });
    t.append(ul);
  };

  // ---------- load ----------
  Openings.load().then(p => {
    P = p; n = P.n; T = P.t[n - 1];
    best = new Uint16Array(n); uniq = new Uint16Array(n); hl = [];
    const seen = new Uint8Array(P.idx.cards.length); let u = 0;
    for (let i = 0; i < n; i++) {
      let b = 0;
      for (let k = P.start[i]; k < P.start[i] + P.cnt[i]; k++) {
        const j = P.cards[k], r = P.rarityByIdx[j];
        if (r > b) b = r;
        if (!seen[j]) { seen[j] = 1; u++; }
        if (r >= 800) hl.push({ i, id: P.idx.cards[j] });
      }
      best[i] = b; uniq[i] = u;
    }
    day0 = Math.floor(P.t0 / 86400) * 86400;
    for (let i = 0; i < n; i++) { const d = Math.floor((abs(i) - day0) / 86400); if (dayN[d] == null) { for (let q = dayN.length; q <= d; q++) { dayN[q] = 0; dayStart[q] = i; } } dayN[d]++; }
    perHour = new Array(Math.ceil(T / 3600) + 1).fill(0);
    for (let i = 0; i < n; i++) perHour[Math.floor(P.t[i] / 3600)]++;
    scrub.max = Math.ceil(T);
    palette(); layout(); upto = -1; setCur(T);
    // start on the first god pack, else the first crown
    let start = -1; for (let i = 0; i < n; i++) if (P.kind[i] === 2) { start = i; break; }
    if (start < 0) for (let i = 0; i < n; i++) if (best[i] === 900) { start = i; break; }
    if (start >= 0) openHour(hourOf(start), start);
    let rw, lastW = board.clientWidth;
    new ResizeObserver(() => { clearTimeout(rw); rw = setTimeout(() => { if (board.clientWidth === lastW) return drawSpark(); lastW = board.clientWidth; layout(); draw(); }, 120); }).observe(board);
    const retheme = () => { palette(); glowUpto = -1; draw(); drawSpark(); };
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', retheme);
    new MutationObserver(retheme).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  }).catch(e => { console.error(e); host.append(el('p', { class: 'small', text: 'The pack wall could not load: ' + e.message })); });
  };
  window.PackWall = { mount: (h) => { if (!h.dataset.mounted) { h.dataset.mounted = 1; mountWall(h); } } };
  const h0 = $('#mosaic'); if (h0) window.PackWall.mount(h0);
})();
