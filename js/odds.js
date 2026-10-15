// Chapter 2: the odds scoreboard (expected vs pulled per rarity, with each row's chance range) and three small test tiles.
(() => {
  const S = window.Story;
  const { el, json, fmt, tip, card, cardArt } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const LO = 0.8, HI = 1.2;
  const pos = (r) => (Math.max(LO, Math.min(HI, r)) - LO) / (HI - LO) * 100;
  const ROWS = [
    { b: 'U', name: '2-diamond', g: 'dia', ex: 'U' },
    { b: 'R', name: '3-diamond', g: 'dia', ex: 'R' },
    { b: 'RR', name: '4-diamond ex', g: 'rr', ex: 'RR' },
    { b: 'AR', name: '1-star', g: 'star', ex: 'AR' },
    { b: 'SR_AND_SAR', name: '2-star', g: 'star2', ex: 'SAR', code: 'SR' },
    { b: 'IM', name: '3-star', g: 'star2', ex: 'IM' },
    { b: 'S', name: '1-shiny', g: 'shiny', ex: 'S' },
    { b: 'SSR', name: '2-shiny', g: 'shiny', ex: 'SSR' },
    { b: 'UR', name: 'Crown', g: 'crown', ex: 'UR' },
  ];

  S.oddsBoard = async (node) => {
    const [cal, tab, lad] = await Promise.all([F('odds-audit/odds_calibration'), F('odds-audit/table_odds'), F('cards/rarity_ladder'), PPA.loadCatalog()]);
    const exOf = Object.fromEntries(lad.data.map(r => [r.code, r.example]));
    const cells = cal.data.filter(r => r.pub_pct > 0);
    const rows = ROWS.map(R => {
      const cs = cells.filter(c => c.bucket === R.b);
      const obs = cs.reduce((a, c) => a + c.obs, 0), exp = cs.reduce((a, c) => a + c.exp, 0);
      return { ...R, cs, obs, exp, ex: exOf[R.ex] };
    });
    const kind = (k) => tab.data.filter(r => r.kind === k).reduce((a, r) => ({ obs: a.obs + r.obs, exp: a.exp + r.exp }), { obs: 0, exp: 0 });
    const god = kind('god'), six = kind('plus1');
    rows.push({ b: 'god', name: 'God pack', g: 'star2', obs: god.obs, exp: god.exp, icon: 'art/icons/rarity/rarity-star_detail.webp', pack: true, note: 'whole packs, 1 in 2,000' });
    rows.push({ b: 'six', name: '6-card pack', g: 'shiny', obs: six.obs, exp: six.exp, icon: 'art/icons/items/pack-icon.webp', pack: true, note: 'whole packs; a few hundred went unlogged, see Method' });
    rows.forEach(r => { r.ratio = r.obs / r.exp; r.band = 1.96 / Math.sqrt(r.exp); r.inside = Math.abs(r.ratio - 1) <= r.band; });

    const inside = rows.filter(r => r.inside).length;
    const allStar = rows.filter(r => ['AR', 'SR_AND_SAR', 'IM', 'S', 'SSR', 'UR'].includes(r.b));
    const starRatio = allStar.reduce((a, r) => a + r.obs, 0) / allStar.reduce((a, r) => a + r.exp, 0);

    const head = el('div', { class: 'ob-head' },
      el('div', { class: 'ob-big' }, el('b', { class: 'num', text: `${inside} of ${rows.length}` }), el('span', { text: 'landed inside the range chance allows' })),
      el('div', { class: 'ob-big' }, el('b', { class: 'num', text: starRatio.toFixed(2) + '×' }), el('span', { text: 'star-or-better cards, pulled vs promised' })));
    const axis = el('div', { class: 'ob-row ob-axis', 'aria-hidden': 'true' }, el('span'), el('span'), el('div', { class: 'ob-track' },
      ...[0.8, 0.9, 1, 1.1, 1.2].map(v => el('span', { class: 'ob-tick' + (v === 1 ? ' one' : ''), style: `left:${pos(v)}%`, text: v === 1 ? 'as promised' : v.toFixed(1) + '×' }))));
    const list = el('div', { class: 'ob-list', role: 'list' }, axis);
    const dots = [];
    rows.forEach(r => {
      const vis = r.pack ? el('img', { class: 'ob-icon', src: r.icon, alt: '' }) : cardArt(r.ex, { holo: ['star', 'star2', 'shiny', 'crown'].includes(r.g) });
      const dot = el('i', { class: 'ob-dot' + (r.inside ? '' : ' out') + (RM ? ' in' : ''), style: `left:${RM ? pos(r.ratio) : 50}%` });
      dots.push([dot, pos(r.ratio)]);
      const band = el('span', { class: 'ob-band', style: `left:${pos(1 - r.band)}%;right:${100 - pos(1 + r.band)}%` });
      const label = el('div', { class: 'ob-name' }, el('b', { text: r.name }), r.pack ? el('span', { class: 'ob-sub', text: r.note }) : (S.glyphs ? S.glyphs(r.code || r.b) : null));
      const nums = el('div', { class: 'ob-nums num' }, el('span', {}, 'Expected ', el('b', { text: fmt(r.exp, r.exp < 100 ? 1 : 0) })), el('span', {}, 'Got ', el('b', { text: fmt(r.obs) })));
      const track = el('div', { class: 'ob-track' }, band, el('span', { class: 'ob-mid' }), dot, el('span', { class: 'ob-ratio num', style: `left:${pos(r.ratio)}%`, text: r.ratio.toFixed(2) + '×' }));
      const row = el('div', { class: 'ob-row', role: 'listitem', style: `--rc:var(--r-${r.g})`, tabindex: r.cs ? 0 : null, 'aria-expanded': r.cs ? 'false' : null },
        el('div', { class: 'ob-vis' }, vis), el('div', { class: 'ob-lab' }, label, nums), track);
      const show = (e) => tip.show(e, t => {
        t.append(el('b', { text: r.name }));
        t.append(el('div', { class: 'k', text: `Odds screen promised ${fmt(r.exp, 1)}, we pulled ${fmt(r.obs)} (${r.ratio.toFixed(3)}×).` }));
        t.append(el('div', { class: 'k', text: `With this many, chance alone moves the result by up to ±${(r.band * 100).toFixed(1)}%. ${r.inside ? 'Inside that range.' : 'Just outside that range.'}` }));
        if (r.cs) t.append(el('div', { class: 'k', text: 'Tap to see every pack.' }));
      });
      row.addEventListener('pointerenter', show); row.addEventListener('pointermove', tip.move); row.addEventListener('pointerleave', tip.hide);
      list.append(row);
      if (r.cs) {
        const det = el('div', { class: 'ob-detail', hidden: '', style: `--rc:var(--r-${r.g})` });
        const toggle = () => {
          const open = det.hidden; det.hidden = !open; row.setAttribute('aria-expanded', String(open)); row.classList.toggle('open', open); tip.hide();
          if (open && !det.firstChild) fillDetail(det, r);
        };
        row.addEventListener('click', toggle);
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); } });
        list.append(det);
      }
    });
    node.replaceChildren(head, list, el('p', { class: 'ob-foot small' }, `Each dot is everything we pulled at that rarity across all packs, divided by what the odds screens promised for exactly those packs. The shaded band is how far chance alone could push it. The rarest kinds ran a touch under, each well within its band; star-or-better cards overall came out at ${starRatio.toFixed(2)}×.`));
    if (!RM) {
      const io = new IntersectionObserver((es, o) => { if (es.some(e => e.isIntersecting)) { o.disconnect(); dots.forEach(([d, x], i) => setTimeout(() => { d.style.left = x + '%'; d.classList.add('in'); }, 120 + i * 70)); setTimeout(() => list.classList.add('done'), 120 + dots.length * 70 + 900); } }, { threshold: .25 });
      io.observe(list);
      setTimeout(() => { dots.forEach(([d, x]) => { if (!d.classList.contains('in')) { d.style.left = x + '%'; d.classList.add('in'); } }); list.classList.add('done'); }, 6000);
    }
  };

  // per-pack drill-down: each pack's own result for that rarity, card 4 and card 5 combined
  const fillDetail = (det, r) => {
    const by = {};
    r.cs.forEach(c => { const k = c.pack; (by[k] ||= { pack: k, obs: 0, exp: 0 }); by[k].obs += c.obs; by[k].exp += c.exp; });
    const ps = Object.values(by).filter(p => p.exp > 0).sort((a, b) => b.exp - a.exp);
    // single packs swing far more than the totals, so this view uses a wider 0×–2× scale
    const P2 = (v) => Math.max(0, Math.min(2, v)) / 2 * 100;
    const wrap = el('div', { class: 'ob-packs' }, el('div', { class: 'ob-prow ob-paxis', 'aria-hidden': 'true' }, el('span'), el('span'), el('div', { class: 'ob-track sm' }, ...[0, 0.5, 1, 1.5, 2].map(v => el('span', { class: 'ob-tick' + (v === 1 ? ' one' : ''), style: `left:${P2(v)}%`, text: v + '×' })))));
    ps.forEach(p => {
      const ratio = p.obs / p.exp, band = 1.96 / Math.sqrt(p.exp), pk = PPA.catalog.packById[p.pack];
      const off = ratio > 2 ? '▸' : '';
      wrap.append(el('div', { class: 'ob-prow' },
        el('span', { class: 'ob-pname', text: pk ? pk.name : p.pack }),
        el('span', { class: 'ob-pnums num', text: `${fmt(p.obs)} / ${fmt(p.exp, p.exp < 10 ? 1 : 0)}` }),
        el('div', { class: 'ob-track sm' }, el('span', { class: 'ob-band', style: `left:${P2(1 - band)}%;right:${100 - P2(1 + band)}%` }), el('span', { class: 'ob-mid' }), el('i', { class: 'ob-dot in sm', style: `left:${P2(ratio)}%`, title: `${ratio.toFixed(2)}×` }), off ? el('span', { class: 'ob-off', style: `left:${P2(ratio)}%`, text: off }) : null)));
    });
    det.append(el('div', { class: 'ob-dhead small', text: `Every pack's own ${r.name} result: pulled / promised. Note the wider scale: one pack on its own swings a lot, and packs we opened less have wider bands.` }), wrap);
  };

  // three short tests, each with a tiny picture instead of a paragraph
  S.oddsTests = async (node) => {
    const [dev, typ] = await Promise.all([F('odds-audit/card_deviation'), F('cards/type_breakdown')]);
    const NS = 'http://www.w3.org/2000/svg', mk = (t, a) => { const e = document.createElementNS(NS, t); for (const k in a) e.setAttribute(k, a[k]); return e; };
    // 1 · z-scores of 3,240 cards vs the bell curve chance predicts
    const zi = dev.columns.indexOf('z'), zs = dev.data.map(r => r[zi]);
    const bins = Array(24).fill(0); zs.forEach(z => { const b = Math.floor((z + 4) / 8 * 24); if (b >= 0 && b < 24) bins[b]++; });
    const W = 220, H = 70, bw = W / 24, peak = Math.max(...bins), bell = (z) => zs.length * (8 / 24) * Math.exp(-z * z / 2) / Math.sqrt(2 * Math.PI);
    const s1 = mk('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ot-svg', role: 'img', 'aria-label': 'Histogram of all card deviations, matching the bell curve chance predicts' });
    bins.forEach((n, i) => s1.append(mk('rect', { x: i * bw + 1, y: H - 4 - n / peak * (H - 10), width: bw - 2, height: n / peak * (H - 10), rx: 1.5, class: 'ot-bar' })));
    let d = ''; for (let i = 0; i <= 48; i++) { const z = -4 + i / 6, x = (z + 4) / 8 * W, y = H - 4 - bell(z) / peak * (H - 10); d += (i ? 'L' : 'M') + x.toFixed(1) + ' ' + y.toFixed(1); }
    s1.append(mk('path', { d, class: 'ot-line' }));
    // 2 · each Pokémon type's deviation, inside the ±2 band
    const T = typ.data.map(r => Object.fromEntries(typ.columns.map((k, i) => [k, r[i]]))).filter(r => r.kind === 'pokemon');
    const s2 = mk('svg', { viewBox: `0 0 ${W} ${H}`, class: 'ot-svg', role: 'img', 'aria-label': `${T.length} Pokémon types, all within chance of their expected share` });
    const zx = (z) => (z + 3) / 6 * W;
    s2.append(mk('rect', { x: zx(-2), y: 8, width: zx(2) - zx(-2), height: H - 22, rx: 6, class: 'ot-band' }));
    s2.append(mk('line', { x1: zx(0), x2: zx(0), y1: 6, y2: H - 12, class: 'ot-mid' }));
    T.forEach((r, i) => { const c = mk('circle', { cx: zx(Math.max(-3, Math.min(3, r.z))), cy: 14 + (i % 5) * 9, r: 4, class: 'ot-dot' }); const tt = mk('title', {}); tt.textContent = `${r.type}: ${r.ratio.toFixed(3)}× its expected share`; c.append(tt); s2.append(c); });
    const tx = mk('text', { x: zx(0), y: H - 1, 'text-anchor': 'middle', class: 'ot-ax' }); tx.textContent = 'as expected'; s2.append(tx);
    // 3 · card 4 and card 5: what card 5 looked like after a hit vs a miss on card 4
    // from 56,433 normal 5-card packs: how often card 5 was 4-diamond or better, split by card 4
    const PAIR = [['After a hit on card 4', 637, 2940], ['After a miss on card 4', 11257, 53493]];
    const s3 = el('div', { class: 'ot-pair' }, PAIR.map(([k, hit, n]) => el('div', { class: 'ot-pr' }, el('span', { class: 'ot-k', text: k }), el('div', { class: 'ot-mini' }, el('i', { style: `width:${(hit / n * 100 / 30 * 100).toFixed(1)}%` })), el('b', { class: 'num', text: (hit / n * 100).toFixed(1) + '%' }))));
    const tile = (vis, title, stat, text) => el('div', { class: 'ot-tile' }, el('div', { class: 'ot-vis' }, vis), el('b', { class: 'ot-t', text: title }), el('span', { class: 'ot-stat num', text: stat }), el('p', { text: text }));
    const beyond = zs.filter(z => Math.abs(z) > 2).length / zs.length * 100;
    node.replaceChildren(el('div', { class: 'ot-grid' },
      tile(s1, 'Every card in a rarity is equally likely', `${fmt(zs.length)} cards · 0 outliers`, `No chase card is quietly rarer than its neighbours. The spread of all cards (bars) matches the bell curve chance draws (line): ${beyond.toFixed(1)}% sit beyond the usual range, about the 4.6% chance predicts.`),
      tile(s2, 'Pokémon types come up as often as they should', `${T.length} types · all in range`, 'Each dot is a type. All sit inside the shaded band chance allows, so no type is favoured or starved.'),
      tile(s3, 'Cards 4 and 5 are separate rolls', '56,433 packs', 'How often card 5 was 4-diamond or better: the same whether card 4 hit or missed. A good card 4 doesn’t use up your luck for card 5.')));
  };
})();
