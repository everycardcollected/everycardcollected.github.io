// Chapter 9 · The last 1%: the final 34 cards, the packs each percentage point cost, and the very last pack.
(() => {
  const S = window.Story;
  const { el, json, fmt, tip, card, cardArt, cardTip, css, loadCatalog } = PPA;
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DUR = 26; // seconds of playback for the 41 hours
  const ROUTE = { pack: 'from a pack', wonder: 'from a Wonder Pick', reward: 'from a free reward pack' };
  const ICON = { 100: 'diamond', 200: 'diamond', 300: 'diamond', 400: 'diamond', 500: 'star', 600: 'star', 700: 'star', 800: 'star', 830: 'shiny', 860: 'shiny', 900: 'crown' };
  const nameOf = (id) => card(id)?.n || id;
  const openCard = (id) => window.Explore && Explore.openCard && Explore.openCard(id);

  // hover on mouse, tap-to-peek then tap-to-open on touch
  const touchable = (node, id, extra) => {
    let armed = false;
    node.addEventListener('pointerenter', e => { if (e.pointerType === 'mouse') tip.show(e, t => cardTip(t, id, extra())); });
    node.addEventListener('pointermove', e => { if (e.pointerType === 'mouse') tip.move(e); });
    node.addEventListener('pointerleave', e => { if (e.pointerType === 'mouse') tip.hide(); armed = false; });
    node.addEventListener('click', e => {
      if (e.pointerType === 'touch' || (e.pointerType === '' && matchMedia('(hover: none)').matches)) {
        if (!armed) { armed = true; tip.show(e, t => { cardTip(t, id, extra()); t.append(el('div', { class: 'k eg-tap', text: 'Tap again to open' })); }); setTimeout(() => { armed = false; }, 4000); return; }
      }
      tip.hide(); openCard(id);
    });
  };
  const glyph = (r) => el('img', { class: 'eg-glyph', src: `art/icons/rarity/rarity-${ICON[r] || 'diamond'}.webp`, alt: '' });

  S.endgame = async (node) => {
    const [D] = await Promise.all([json('data/endgame.json'), loadCatalog()]);
    const H0 = D.h99, H1 = D.hEnd, span = H1 - H0, tail = D.tail, N = tail.length;
    const tailPacks = D.packsEnd - D.packs99, share = tailPacks / D.packsEnd;
    const lede = document.getElementById('eg-lede');
    if (lede) lede.textContent = `By hour ${Math.round(H0)}, our accounts had found 99% of the cards. The last ${N} took another ${Math.round(span)} hours and ${fmt(tailPacks)} packs, ${Math.round(share * 100)}% of the whole week's packs for 1% of the binder. By the end almost every pack held nothing new. Two cards never appeared in our logged pack pulls at all; Wonder Pick and a reward pack filled those slots.`;

    // ---------- 1 · the endgame binder ----------
    const left = el('b', { class: 'num eg-n', text: String(N) });
    const packsN = el('b', { class: 'num eg-n', text: '0' });
    const hoursN = el('b', { class: 'num eg-n', text: '0' });
    const stats = el('div', { class: 'eg-stats' },
      el('div', { class: 'eg-stat' }, left, el('span', { text: 'cards still missing' })),
      el('div', { class: 'eg-stat' }, packsN, el('span', { text: 'packs opened since 99%' })),
      el('div', { class: 'eg-stat' }, hoursN, el('span', { text: 'hours since 99%' })));
    const latest = el('div', { class: 'eg-latest', 'aria-live': 'polite' });
    const slots = tail.map((t, i) => {
      const c = card(t.id) || {};
      const art = cardArt(t.id, { holo: c.r >= 500 });
      const cap = el('span', { class: 'eg-cap num', text: `h${Math.floor(t.h)}` });
      const s = el('button', { type: 'button', class: 'eg-slot', 'aria-label': `${nameOf(t.id)}, found at hour ${t.h.toFixed(1)}` },
        el('span', { class: 'eg-sleeve' }, glyph(c.r)), art, cap);
      touchable(s, t.id, () => s.classList.contains('on') ? `Found at hour ${t.h.toFixed(1)} by ${t.who} ${ROUTE[t.route]}${t.pack ? `, pack ${fmt(t.pack)} of the week` : ''}` : `Still missing. It turns up at hour ${t.h.toFixed(1)}.`);
      return s;
    });
    const grid = el('div', { class: 'eg-grid' }, slots);
    const play = el('button', { class: 'bh-play eg-play', type: 'button' });
    const next = el('button', { class: 'btn ghost eg-next', type: 'button', text: 'Next card ›' });
    const all = el('button', { class: 'btn ghost eg-next eg-all', type: 'button', text: `Show all ${N}` });
    const scrub = el('input', { class: 'bh-scrub eg-scrub', type: 'range', min: 0, max: 1000, step: 1, value: 0, 'aria-label': `Hours ${Math.round(H0)} to ${Math.round(H1)}` });
    const ends = el('div', { class: 'eg-ends num' }, el('span', { text: `Hour ${Math.round(H0)} · 99%` }), el('span', { text: `Hour ${H1.toFixed(1)} · 100%` }));
    const ctrl = el('div', { class: 'eg-ctrl' }, play, next, all, el('div', { class: 'eg-track' }, scrub, ends));
    const binder = el('div', { class: 'plate eg-plate' },
      el('div', { class: 'plate-head' }, el('div', {}, el('div', { class: 'plate-title', text: `The last ${N} cards, in the order they turned up` }), el('div', { class: 'plate-sub', text: 'Press play to watch the final 41 hours. The pack counter keeps climbing through long stretches where nothing new turns up.' }))),
      el('div', { class: 'eg-top' }, stats, latest), grid, ctrl);

    let h = H0, playing = false, raf = 0, last = 0, lit = -2, started = false;
    const packsAt = (hh) => D.curve[Math.max(0, Math.min(D.curve.length - 1, Math.floor((hh - H0) * 10 + 1e-6)))] ;
    const showLatest = (i) => {
      if (i < 0) { latest.replaceChildren(el('div', { class: 'eg-lt-empty' }, el('b', { text: `Hour ${Math.round(H0)}` }), el('span', { text: `3,446 of 3,480 cards found. ${N} to go.` }))); return; }
      const t = tail[i], c = card(t.id) || {};
      const a = cardArt(t.id, { holo: c.r >= 500 }); touchable(a, t.id, () => `Found at hour ${t.h.toFixed(1)} by ${t.who}`);
      latest.replaceChildren(el('div', { class: 'eg-lt-art' }, a),
        el('div', { class: 'eg-lt-txt' }, el('span', { class: 'eg-lt-k num', text: `Card ${3446 + i + 1} of 3,480 · hour ${t.h.toFixed(1)}` }), el('b', { text: nameOf(t.id) }),
          el('span', { text: `${t.who} pulled it from pack ${fmt(t.pack)} of the week.` })));
    };
    const set = (nh, fromScrub) => {
      h = Math.max(H0, Math.min(H1, nh));
      const f = (h - H0) / span;
      if (!fromScrub) scrub.value = Math.round(f * 1000);
      scrub.style.setProperty('--f', (f * 100).toFixed(2) + '%');
      let n = -1; tail.forEach((t, i) => { if (t.h <= h + 1e-6) n = i; });
      slots.forEach((s, i) => { const on = i <= n; if (on !== s.classList.contains('on')) { s.classList.toggle('on', on); if (on && playing && !RM) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } } });
      if (n !== lit) { lit = n; showLatest(n); }
      left.textContent = String(N - 1 - n);
      packsN.textContent = fmt(n === N - 1 ? tailPacks : packsAt(h) - D.packs99);
      hoursN.textContent = (h - H0).toFixed(1);
      play.replaceChildren(el('span', { class: 'bh-pi ' + (playing ? 'pause' : 'play'), 'aria-hidden': 'true' }), el('span', { text: playing ? 'Pause' : h >= H1 ? 'Replay' : 'Play' }));
      next.disabled = n >= N - 1; all.disabled = n >= N - 1;
    };
    const loop = (now) => { const dt = Math.min(.1, (now - last) / 1000); last = now; let nh = h + dt / DUR * span; if (nh >= H1) { nh = H1; playing = false; } set(nh); if (playing) raf = requestAnimationFrame(loop); };
    const start = () => { if (h >= H1) set(H0); playing = true; last = performance.now(); raf = requestAnimationFrame(loop); set(h); };
    const pause = () => { playing = false; cancelAnimationFrame(raf); set(h); };
    play.onclick = () => (playing ? pause() : start());
    all.onclick = () => { pause(); set(H1); };
    next.onclick = () => { pause(); const t = tail[lit + 1]; if (!t) return; set(t.h); const s = slots[lit]; if (s && !RM) { s.classList.remove('pop'); void s.offsetWidth; s.classList.add('pop'); } };
    scrub.addEventListener('input', () => { if (playing) { playing = false; cancelAnimationFrame(raf); } set(H0 + (+scrub.value / 1000) * span, true); });
    set(RM ? H1 : H0);
    if (!RM) new IntersectionObserver((es, io) => { if (es.some(e => e.isIntersecting) && !started) { started = true; io.disconnect(); start(); } }, { threshold: .45 }).observe(grid);

    // ---------- 2 · packs per percentage point ----------
    const chart = el('div', { class: 'eg-chart' });
    const cplate = el('div', { class: 'plate' },
      el('div', { class: 'plate-head' }, el('div', {}, el('div', { class: 'plate-title', text: 'Packs it took to find each 1% of the binder' }), el('div', { class: 'plate-sub', text: 'One bar per percentage point, from the first 1% to the last. Hover a bar.' }))),
      chart, el('div', { class: 'plate-foot', text: `Half the binder took ${fmt(D.steps[49].packs)} packs. The last 1% alone took ${fmt(tailPacks)}.` }));
    const drawChart = () => {
      const W = chart.clientWidth || 800, narrow = W < 560, Hh = narrow ? 200 : 240, m = { t: 14, r: narrow ? 6 : 10, b: 26, l: narrow ? 40 : 48 };
      const iw = W - m.l - m.r, ih = Hh - m.t - m.b, n = D.steps.length, bw = iw / n, max = Math.max(...D.steps.map(s => s.spent));
      const y = (v) => m.t + ih - v / max * ih;
      const NS = 'http://www.w3.org/2000/svg', mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
      const svg = mk('svg', { viewBox: `0 0 ${W} ${Hh}`, width: W, height: Hh, role: 'img', 'aria-label': `Packs per percentage point. Most points took under 100 packs; the last took ${fmt(tailPacks)}.` });
      const ticks = narrow ? [0, 10000] : [0, 5000, 10000, 15000];
      ticks.forEach(v => { svg.append(mk('line', { x1: m.l, x2: W - m.r, y1: y(v), y2: y(v), class: 'eg-grid-l' })); const tx = mk('text', { x: m.l - 6, y: y(v) + 4, class: 'eg-ax', 'text-anchor': 'end' }); tx.textContent = v ? (v / 1000) + 'k' : '0'; svg.append(tx); });
      (narrow ? [1, 50, 100] : [1, 50, 90, 100]).forEach(p => { const tx = mk('text', { x: m.l + (p - .5) * bw, y: Hh - 8, class: 'eg-ax', 'text-anchor': p === 100 ? 'end' : p === 1 ? 'start' : 'middle' }); tx.textContent = p + '%'; svg.append(tx); });
      D.steps.forEach((s, i) => {
        const x = m.l + i * bw, hh = Math.max(1.5, ih - (y(s.spent) - m.t)), lastBar = i === n - 1;
        const r = mk('rect', { x: x + Math.min(1, bw * .15), y: m.t + ih - hh, width: Math.max(1, bw - Math.min(2, bw * .3)), height: hh, rx: Math.min(3, bw / 3), class: 'eg-bar' + (lastBar ? ' last' : s.pct > 90 ? ' hot' : '') });
        const hit = mk('rect', { x, y: m.t, width: bw, height: ih, fill: 'transparent' });
        const show = (e) => { r.classList.add('hov'); tip.show(e, t => { t.append(el('b', { text: s.pct === 1 ? 'The first 1%' : `From ${s.pct - 1}% to ${s.pct}%` })); t.append(el('div', { class: 'k', text: `${fmt(s.spent)} packs, done by hour ${s.h.toFixed(1)}` })); }); };
        hit.addEventListener('pointerenter', show); hit.addEventListener('pointerdown', show); hit.addEventListener('pointermove', tip.move); hit.addEventListener('pointerleave', () => { r.classList.remove('hov'); tip.hide(); });
        svg.append(r, hit);
      });
      const lx = m.l + (n - 1) * bw, ly = y(max);
      const lab = mk('text', { x: lx - 8, y: ly + 14, class: 'eg-lab', 'text-anchor': 'end' }); lab.textContent = `The last 1%: ${fmt(tailPacks)} packs`;
      svg.append(lab);
      chart.replaceChildren(svg);
    };

    // ---------- 3 · two cards no pack ever gave us ----------
    const nv = D.never.map(v => {
      const c = card(v.id) || {}; const a = cardArt(v.id, { holo: c.r >= 500 });
      touchable(a, v.id, () => `${v.who} got it ${ROUTE[v.route]} at hour ${v.h.toFixed(1)}`);
      return el('figure', { class: 'eg-nv' }, a, el('figcaption', {}, el('b', { text: nameOf(v.id) }), el('span', { text: v.route === 'wonder' ? `${v.who} took it in a Wonder Pick` : `${v.who} found it in a free reward pack` })));
    });
    const never = el('details', { class: 'eg-which' }, el('summary', { text: 'Which two?' }),
      el('div', { class: 'eg-never' }, el('div', { class: 'eg-never-cards' }, nv),
        el('p', { class: 'small', text: `Each was expected only 3 or 4 times across our ${fmt(D.packsTotal)} logged packs, so missing them there was ordinary bad luck.` })));
    if (lede && !lede.nextElementSibling?.classList.contains('eg-which')) lede.after(never);

    // ---------- 4 · the very last pack ----------
    const F = D.final, fc = card(F.id) || {};
    const bigArt = cardArt(F.id, { holo: true }); bigArt.classList.add('eg-final-art'); touchable(bigArt, F.id, () => `The last card, found at hour ${F.h.toFixed(1)}`);
    const row = el('div', { class: 'eg-pack' }, F.cards.slice().sort((a, b) => (card(a)?.r || 0) - (card(b)?.r || 0)).map(id => {
      const c = card(id) || {}; const a = cardArt(id, { holo: c.r >= 500 }); touchable(a, id, () => id === F.id ? 'The last card' : '');
      return el('span', { class: 'eg-pc' + (id === F.id ? ' star' : '') }, a);
    }));
    const pack = PPA.catalog.packById[F.packId];
    const finale = el('div', { class: 'eg-final' },
      el('div', { class: 'eg-final-l' }, bigArt),
      el('div', { class: 'eg-final-r' },
        el('div', { class: 'eyebrow', text: `Hour ${F.h.toFixed(1)} · day ${PPA.dayOf(F.h * 3600)}` }),
        el('h3', { text: `The last card: ${nameOf(F.id)}` }),
        el('p', { text: `${F.who} opened pack ${fmt(F.pack)} of the week, a ${pack?.name || 'Mega Rising'} pack, and out came the final crown. No other account ever pulled one.` }),
        row,
        el('button', { type: 'button', class: 'btn eg-see', text: 'See this pack in Explore ›', onclick: () => window.Explore && Explore.openPack && Explore.openPack(F.index) })));

    node.replaceChildren(binder, cplate, finale);
    let cw = 0; drawChart(); new ResizeObserver(() => { if (chart.clientWidth !== cw) { cw = chart.clientWidth; drawChart(); } }).observe(chart);
  };
})();
