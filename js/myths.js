// Chapter 6 · What players believe, tested. Two lab panels reuse Story.wonderMini and Story.journeyTutorial.
(() => {
  const S = window.Story;
  const { el, json, fmt, css, tip, card } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const ART = 'art/';
  const img = (src, cls, alt = '') => el('img', { src: ART + src, class: cls, alt, loading: 'lazy', decoding: 'async' });
  // DOM tooltip binding (pointer + keyboard)
  const hov = (n, build) => {
    n.addEventListener('pointerenter', e => tip.show(e, build));
    n.addEventListener('pointermove', tip.move);
    n.addEventListener('pointerleave', tip.hide);
    if (!n.hasAttribute('tabindex')) n.setAttribute('tabindex', '0');
    n.addEventListener('focus', () => { const r = n.getBoundingClientRect(); tip.show({ clientX: r.right, clientY: r.top }, build); });
    n.addEventListener('blur', tip.hide);
    return n;
  };
  const rows = (t, title, rs) => Charts.tipRows(t, title, rs);
  // Redraw on resize/theme; skip while hidden (inside an inactive tab).
  const live = (node, draw) => { const d = () => { if (node.clientWidth > 0) draw(); }; d(); Charts.redrawOnResize(node, d); };
  const seg = (labels, onPick, init = 0, aria = 'Choose view') => {
    const g = el('div', { class: 'seg', role: 'group', 'aria-label': aria });
    const bs = labels.map((l, i) => el('button', { type: 'button', 'aria-pressed': String(i === init), onclick: () => { bs.forEach((b, j) => b.setAttribute('aria-pressed', String(i === j))); onPick(i); } }, l));
    g.append(...bs);
    return g;
  };
  const txt = (svg, x, y, s, o = {}) => svg.append('text').attr('x', x).attr('y', y).attr('text-anchor', o.anchor || 'start').attr('fill', o.fill || css('--muted')).style('font', o.font || '11px var(--font-data)').text(s);

  // =====================================================================
  // 4 · PITY
  // =====================================================================

  // Forest plot: rows [{group?, label, v, lo, hi, tip}] around 1.0.
  const forest = (node, rs, o = {}) => live(node, () => {
    const w = Charts.W(node), lw = Math.min(150, w * .34), rh = 26, gh = 26;
    const groups = [...new Set(rs.map(r => r.group || ''))];
    const h = 20 + rs.length * rh + groups.filter(Boolean).length * gh + 30;
    const svg = Charts.svgOf(node, w, h);
    const ext = [d3.min(rs, r => r.lo), d3.max(rs, r => r.hi)];
    const x = d3.scaleLinear([Math.min(.9, ext[0] - .02), Math.max(1.1, ext[1] + .02)], [lw, w - 50]).nice();
    svg.append('g').attr('transform', `translate(0,${h - 24})`).call(d3.axisBottom(x).ticks(Math.max(3, Math.floor((w - lw) / 80))).tickFormat(v => d3.format('.2~f')(v) + '×')).call(Charts.axisStyle);
    svg.append('rect').attr('x', x(.95)).attr('width', x(1.05) - x(.95)).attr('y', 14).attr('height', h - 38).attr('fill', css('--good')).attr('opacity', .07);
    svg.append('line').attr('x1', x(1)).attr('x2', x(1)).attr('y1', 14).attr('y2', h - 24).attr('stroke', css('--ink')).attr('stroke-width', 1.5).attr('opacity', .5);
    txt(svg, x(1), 10, 'published odds', { anchor: 'middle' });
    let y = 20;
    groups.forEach(gname => {
      if (gname) { txt(svg, 0, y + 16, gname.toUpperCase(), { fill: css('--ink-2'), font: '600 10.5px var(--font-data)' }); y += gh; }
      rs.filter(r => (r.group || '') === gname).forEach(r => {
        const g = svg.append('g').attr('transform', `translate(0,${y})`);
        txt(g, lw - 10, rh / 2 + 4, r.label, { anchor: 'end', fill: css('--ink-2'), font: '13px var(--font-body)' });
        g.append('line').attr('x1', x(Math.max(x.domain()[0], r.lo))).attr('x2', x(Math.min(x.domain()[1], r.hi))).attr('y1', rh / 2).attr('y2', rh / 2).attr('stroke', o.color || css('--r-star')).attr('stroke-width', 2.5).attr('stroke-linecap', 'round').attr('opacity', .55);
        g.append('circle').attr('cx', x(r.v)).attr('cy', rh / 2).attr('r', 5.5).attr('fill', o.color || css('--r-star')).attr('stroke', css('--surface')).attr('stroke-width', 2);
        txt(g, w - 2, rh / 2 + 4, r.v.toFixed(2) + '×', { anchor: 'end', fill: css('--ink'), font: '600 11.5px var(--font-data)' });
        Charts.hover(g.append('rect').attr('width', w).attr('height', rh).attr('fill', 'transparent'), t => rows(t, (r.group ? r.group + ': ' : '') + r.label, r.tip));
        y += rh;
      });
    });
  });

  const MYTHS = [
    { id: 'age', icon: 'ui/profile/profile-icon-pikachu.webp', tab: 'New accounts', claim: 'Brand-new accounts get a hidden luck boost.', verdict: 'Myth',
      body: 'Packs opened in an account\'s first hour hit ☆-or-better at 17.7% against 17.4% expected. Four days in, 20.0% against 20.4%. The ten hand-made seed accounts were dead on expectation too.',
      foot: 'Dots are ☆+ luck (observed ÷ expected); bars are 95% intervals; the green band is ±5%. Accounts 11–100 ran a little cold on ◆◆◆◆+, but with 15 tests in this table that is within chance (corrected p ≈ 0.06).' },
    { id: 'level', icon: 'icons/items/exp-player.webp', tab: 'Player level', claim: 'Higher-level players pull better cards.', verdict: 'Myth',
      body: 'Level 3 or level 20, the packs are the same. Every level bucket sits within 2σ of the published odds. The spread across levels is what chance gives (p = 0.92 for ◆◆◆◆+, 0.50 for ☆+).',
      foot: 'Level at the moment of opening. Only 127 packs were opened at level 21+, hence the wide bar.' },
    { id: 'dupes', icon: 'icons/items/shinedust.webp', tab: 'Duplicates', claim: 'The game steers you away from cards you already own.', verdict: 'Myth',
      body: 'For each of 302,600 pulled cards we worked out the chance it was a card the account already had. Predicted duplicates: 10.19%. Actual: 10.17%. Whether a card had a 3% or a 55% chance of being a dupe, it was a dupe exactly that often.',
      foot: 'Each circle groups pulls by predicted duplicate chance; size = number of pulls. On the diagonal = no protection. Accounts only got about 40% through a pack\'s pool, so protection near a complete collection is untested.' },
    { id: 'memory', icon: 'icons/rarity/rarity-star_detail.webp', tab: 'Hot & cold', claim: 'A big pull uses up your luck for a while.', verdict: 'Myth',
      body: 'We correlated each pack\'s ☆ result with the pack 1 to 20 openings later on the same account. After a ☆ pack, the next pack ran at 0.98× luck; after a dry pack, 0.99×. One lag pokes out: six packs after a ☆, luck was 1.04×. Lag 12 points the other way, and the test across all 20 lags is p = 0.21.',
      foot: 'Stems are the correlation at each lag; the band is what 400 within-account shuffles produce. Lag 6 is flagged as a curiosity, not a finding.' },
    { id: 'fleet', icon: 'ui/home-battle-illustration.webp', tab: 'Lucky hours', claim: 'Sometimes the whole server runs hot.', verdict: 'Myth',
      body: '☆ hits from 1,486 accounts, binned in real time, rise and fall with the number of packs opened and nothing else. Variation between bins matches chance at 1 minute, 10 minutes and 1 hour.',
      foot: 'The 6-hour scale is nominally p = 0.042, not significant after correcting for 79 tests. ☆ packs from different accounts within 2 seconds of each other: 68 vs 56 expected (p = 0.08).' },
    { id: 'hourglass', icon: 'icons/items/pack-hourglass.webp', tab: 'Hourglasses', claim: 'Hourglass packs are worse than free packs.', verdict: 'Myth',
      body: 'Packs bought with 12 Pack Hourglasses hit ☆ at 0.995× the published rate; free Pack Power packs at 0.977× (p = 0.42). God packs: 0.049% for both.',
      foot: 'Expected counts come from the published odds of each pack table opened.' },
    { id: 'pos', icon: 'ui/card-back.webp', tab: 'Card order', claim: 'When you open a pack, the better card always shows up in the same place.', verdict: 'Myth',
      body: 'This is about opening your own pack, not Wonder Pick. In a normal pack, cards 1 to 3 are commons and card 4 is the one that can be better. The server shuffles those four before sending them, so card 4 is revealed 1st, 2nd, 3rd or 4th a quarter of the time each. The one fixed spot is the 5th card, the one with the best odds, which is always revealed last.',
      foot: '56,435 standard packs, χ² p = 0.69. The 4th- and 5th-slot rarities are independent too (χ² p = 0.54).' },
    { id: 'wonder', icon: 'ui/wonder-chansey-pick-badge.webp', tab: 'Wonder Pick', claim: 'In Wonder Pick, the card you tap (or how you follow the shuffle) decides what you get.', verdict: 'Myth',
      body: 'Players have long suspected this, and it holds: your tap is never sent to the server. The server picks one of the five cards and the flip-and-shuffle animation just plays its choice back. The new part: the game files contain a rarity weight table that could have made rare cards come up less, but the real picks show no sign of it: across 797 picks, each card was taken about 1 time in 5. Two more things worth knowing: packs holding a crown, 3-star or shiny never appear in Wonder Pick, and the stamina cost is set by the rarest card in the five, not the one you get.',
      foot: 'From 797 real picks. Cards our accounts were missing came up no more often than chance either.',
      how: [['Observed', '797 picks by our accounts. Every rarity was picked about 1 time in 5. A model using the weight table fits 10^105 times worse; the best-fitting tilt is essentially zero (0.02, with 95% confidence between −0.05 and 0.09).'],
        ['Seen in the app', 'The pick request carries no card position. The rarity weight table is in the game files, but the real picks don\u2019t follow it.'],
        ['Limits', '797 picks can’t rule out a very small tilt. Feeds were ones our accounts chose because they held a wanted card; that doesn’t change which of the five the server hands out.']] },
    { id: 'tap', icon: 'icons/items/pack-icon.webp', tab: 'The pack you tap', claim: 'Picking the right pack in the carousel, or swiping a certain way, gets better cards.', verdict: 'Myth',
      body: 'Players worked this out soon after launch, and the app confirms it: the server decides your cards the moment you buy the pack, and your phone never even reports which pack in the carousel you tapped. By the time the pack starts to tear, the cards are already on your phone. Swipe speed, pinching and pack choice change nothing.',
      foot: 'From the app\'s network messages, checked against 51,776 saved purchase replies.' },
    { id: 'tells', icon: 'ui/fx-glitter-white.webp', tab: 'Animation clues', claim: 'Some opening animations give away a good pack.', verdict: 'True',
      body: 'Because the animation is built after the cards arrive, it knows what\'s inside. A few effects are only allowed when the pack holds a 4-diamond or better. Seeing one means a hit. Not seeing one tells you nothing, since most hit packs show none of them.',
      foot: 'From the app\'s animation settings. Percentages are the chance each effect is shown when a pack does have a hit.' },
    { id: 'starter', icon: 'ui/profile/profile-icon-eevee.webp', tab: 'Starting cards', claim: 'Everyone who picks the same tutorial pack starts with the same cards.', verdict: 'True',
      body: 'All 1,486 of our accounts made the same tutorial pick, and all got the exact same 31 cards from the tutorial and the starter deck before their first real pack, including a 1-star Charmander. A different tutorial pick gives a different start, but within a pick, if your start looked lucky, so did everyone\'s. The first pack after the tutorial is genuinely random.',
      foot: 'Hover a card for details; ×2 marks a doubled copy.' },
  ];

  const LAB = {
    async wonder(node) { await window.Story.wonderMini(node); },
    async tap(node) {
      const step = (ic, h, t) => el('div', { class: 'v4-tapstep' }, img(ic, 'v4-tapic'), el('b', { text: h }), el('span', { text: t }));
      node.append(el('div', { class: 'v4-tap' },
        step('icons/items/pack-hourglass.webp', '1. You tap Open', 'Your phone sends a purchase: which product and how you pay. Not which pack you tapped.'),
        step('icons/items/pack-icon.webp', '2. The server rolls', 'It picks the kind of pack, then every card, from the published odds.'),
        step('ui/card-back.webp', '3. The cards arrive', 'All five are on your phone before the pack art even starts to tear.'),
        step('ui/fx-glitter-white.webp', '4. The show', 'Swiping, tearing and flipping replay a result that was already decided.')));
    },
    async tells(node) {
      const d = await F('internals/pack_tells');
      const rows = d.data.filter(r => /RR/.test(r.gate) && r.p_if_hit < 1).sort((a, b) => b.p_if_hit - a.p_if_hit);
      node.append(el('div', { class: 'v4-tells' }, rows.map(r => el('div', { class: 'v4-tell' }, el('b', { text: r.effect.replace(' (inward-facing)', ' (facing inward)') }), el('div', { class: 'v4-tellbar' }, el('i', { style: `width:${r.p_if_hit * 100}%` })), el('span', { class: 'num', text: Math.round(r.p_if_hit * 100) + '% of hit packs' })))));
    },
    async starter(node) {
      const seg = el('div', { class: 'seg', id: 'v3journey-tut-seg', role: 'group', 'aria-label': 'Group', style: 'margin-bottom:12px' });
      const fig = el('div'), foot = el('p', { class: 'plate-foot', id: 'v3journey-tut-foot' });
      node.append(seg, fig, foot);
      await window.Story.journeyTutorial(fig);
    },
    async age(node) {
      const d = await F('new-player-luck/luck_by_account_age');
      const mk = (r, g) => ({ group: g, label: r.bucket, v: r.star_oe, lo: r.star_oe_ci95[0], hi: r.star_oe_ci95[1], tip: [['☆+ rate', `${(r.star_obs_rate * 100).toFixed(1)}% (expected ${(r.star_exp_rate * 100).toFixed(1)}%)`], ['◆◆◆◆+ luck', r.rr_oe.toFixed(2) + '×'], ['Packs', fmt(r.n_packs)], ['Accounts', fmt(r.n_players)]] });
      forest(node, [...d.data.filter(r => r.series === 'hours_since_start').map(r => mk(r, 'Time since account start')), ...d.data.filter(r => r.series === 'creation_rank').map(r => mk(r, 'Order the account was created'))]);
    },
    async level(node) {
      const d = await F('new-player-luck/luck_by_level');
      forest(node, d.data.map(r => ({ label: r.bucket.startsWith('onboarding') ? 'Tutorial (1–2)' : 'Level ' + r.bucket, v: r.star_oe, lo: r.star_oe_ci95[0], hi: r.star_oe_ci95[1], tip: [['☆+ rate', `${(r.star_obs_rate * 100).toFixed(1)}% (expected ${(r.star_exp_rate * 100).toFixed(1)}%)`], ['◆◆◆◆+ luck', r.rr_oe.toFixed(2) + '×'], ['Packs', fmt(r.n_packs)], ['Accounts', fmt(r.n_players)]] })), { color: css('--r-rr') });
    },
    async dupes(node) {
      const d = await F('new-player-luck/dupe_protection_test');
      const pts = d.data.filter(r => r.series === 'calibration' && r.n_pulls >= 100);
      live(node, () => {
        const w = Charts.W(node), side = Math.min(w, 420), h = side, m = { t: 12, r: 14, b: 36, l: 46 };
        const svg = Charts.svgOf(node, w, h);
        const ox = (w - side) / 2;
        const x = d3.scaleLinear([0, .65], [ox + m.l, ox + side - m.r]), y = d3.scaleLinear([0, .65], [h - m.b, m.t]);
        svg.append('g').attr('transform', `translate(${ox + m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(side - m.l - m.r)).tickFormat('')).call(Charts.grid);
        svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(5, '.0%')).call(Charts.axisStyle);
        svg.append('g').attr('transform', `translate(${ox + m.l},0)`).call(d3.axisLeft(y).ticks(5, '.0%')).call(Charts.axisStyle).call(g => g.select('.domain').remove());
        svg.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(.65)).attr('y2', y(.65)).attr('stroke', css('--ink')).attr('stroke-dasharray', '5 5').attr('opacity', .45);
        txt(svg, x(.6), y(.6) - 8, 'no protection', { anchor: 'end' });
        // what protection would look like: dupes suppressed by half
        svg.append('line').attr('x1', x(0)).attr('y1', y(0)).attr('x2', x(.65)).attr('y2', y(.325)).attr('stroke', css('--bad')).attr('stroke-dasharray', '2 5').attr('stroke-linecap', 'round').attr('opacity', .7);
        txt(svg, x(.62), y(.31) + 16, 'if dupes were halved', { anchor: 'end', fill: css('--bad') });
        const rr = d3.scaleSqrt([0, d3.max(pts, p => p.n_pulls)], [3, 18]);
        const g = svg.append('g').selectAll('g').data(pts).join('g');
        g.append('line').attr('x1', p => x(p.exp_dup_rate)).attr('x2', p => x(p.exp_dup_rate)).attr('y1', p => y(p.exp_dup_rate * p.oe_ci95[0])).attr('y2', p => y(p.exp_dup_rate * p.oe_ci95[1])).attr('stroke', css('--ink')).attr('stroke-width', 1.5);
        g.append('circle').attr('cx', p => x(p.exp_dup_rate)).attr('cy', p => y(p.obs_dup_rate)).attr('r', p => rr(p.n_pulls)).attr('fill', css('--r-dia')).attr('fill-opacity', .7).attr('stroke', css('--surface')).attr('stroke-width', 1.5);
        Charts.hover(g, (t, p) => rows(t, `Predicted dupe chance ${p.q_bin.replace('-', '–')}`, [['Pulls', fmt(p.n_pulls)], ['Predicted', (p.exp_dup_rate * 100).toFixed(1) + '%'], ['Actually dupes', (p.obs_dup_rate * 100).toFixed(1) + '%'], ['Ratio', p.oe.toFixed(3) + '×']]));
        txt(svg, ox + side - m.r, h - 4, 'predicted chance of a duplicate →', { anchor: 'end' });
        txt(svg, ox + m.l + 4, m.t + 8, '↑ actually a duplicate', {});
      });
    },
    async memory(node) {
      const d = await F('timing-rng/timing_autocorrelation');
      const L = d.data.lags;
      live(node, () => {
        const w = Charts.W(node), h = 260, m = { t: 26, r: 12, b: 34, l: 54 };
        const svg = Charts.svgOf(node, w, h);
        const x = d3.scaleBand(L.map(l => l.lag), [m.l, w - m.r]).padding(.3);
        const lim = .018, y = d3.scaleLinear([-lim, lim], [h - m.b, m.t]);
        svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat('')).call(Charts.grid);
        svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, '+.3f')).call(Charts.axisStyle).call(g => g.select('.domain').remove());
        svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(L.map(l => l.lag).filter(v => w > 520 || v % 2 === 0 || v === 1))).call(Charts.axisStyle).call(g => g.select('.domain').remove());
        svg.append('path').datum(L).attr('fill', css('--ink')).attr('opacity', .09).attr('d', d3.area().x(l => x(l.lag) + x.bandwidth() / 2).y0(l => y(l.null_lo)).y1(l => y(l.null_hi)).curve(d3.curveStep));
        svg.append('line').attr('x1', m.l).attr('x2', w - m.r).attr('y1', y(0)).attr('y2', y(0)).attr('stroke', css('--line-2'));
        const odd = (l) => l.lag === 6 ? css('--accent') : l.lag === 12 ? css('--r-dia') : css('--r-star2');
        const g = svg.append('g').selectAll('g').data(L).join('g').attr('transform', l => `translate(${x(l.lag) + x.bandwidth() / 2},0)`);
        g.append('line').attr('y1', y(0)).attr('y2', l => y(l.r)).attr('stroke', odd).attr('stroke-width', 2).attr('stroke-linecap', 'round');
        g.append('circle').attr('cy', l => y(l.r)).attr('r', l => l.lag === 6 ? 6 : 4).attr('fill', odd).attr('stroke', css('--surface')).attr('stroke-width', 1.5);
        Charts.hover(g.append('rect').attr('x', -x.step() / 2).attr('width', x.step()).attr('y', m.t).attr('height', h - m.t - m.b).attr('fill', 'transparent'), (t, l) => rows(t, `${l.lag} pack${l.lag > 1 ? 's' : ''} later`, [['Correlation', (l.r >= 0 ? '+' : '') + l.r.toFixed(4)], ['Chance band', `${l.null_lo.toFixed(4)} to +${l.null_hi.toFixed(4)}`], ['Pairs of packs', fmt(l.pairs)], ['z', l.z.toFixed(2)]]));
        const l6 = L.find(l => l.lag === 6);
        txt(svg, x(6) + x.bandwidth() / 2 + 10, y(l6.r) - 4, 'lag 6: 1.04× luck', { fill: css('--ink'), font: '600 11px var(--font-data)' });
        txt(svg, m.l, 12, 'correlation with the pack k openings later', {});
        txt(svg, w - m.r, h - 4, 'packs later (k) →', { anchor: 'end' });
      });
    },
    async fleet(node) {
      const d = await F('timing-rng/timing_fleet_clusters');
      const H = d.data.hourly.map(r => ({ ...r, t: r.t / 3600 }));
      const chips = el('div', { class: 'v3luck-pchips' }, ...d.data.tests.map(t => el('span', { class: 'v3luck-pchip' + (t.p < .05 ? ' warn' : '') }, el('b', { text: t.bin }), ` p = ${t.p.toFixed(2)}`)));
      const c = el('div', { class: 'chart' });
      node.append(chips, c);
      Charts.lines(c, [
        { name: '☆ packs, expected', color: css('--ink-2'), width: 1.5, dash: '4 4', points: H.map(r => ({ x: r.t, y: r.expected })), label: false },
        { name: '☆ packs, observed', color: css('--r-star'), width: 1.8, points: H.map(r => ({ x: r.t, y: r.stars })), label: false },
      ], { height: 240, right: 14, yLabel: '☆ packs per hour', xTickFmt: v => 'h' + v, xLabelFmt: v => `Hour ${Math.round(v)} (day ${PPA.dayOf(v * 3600)})`, yValFmt: v => fmt(v, 1) });
      c.after(el('div', { class: 'legend', style: 'margin-top:6px' }, el('span', {}, el('i', { class: 'line', style: 'background:var(--r-star)' }), 'Observed'), el('span', {}, el('i', { class: 'line', style: 'background:var(--ink-2)' }), 'Expected from the packs opened that hour')));
    },
    async hourglass(node) {
      const d = await F('timing-rng/timing_hourglass_vs_free');
      const ic = ['icons/items/pack-icon.webp', 'icons/items/pack-hourglass.webp'];
      const wrap = el('div', { class: 'v3luck-hg' });
      d.data.forEach((r, i) => {
        const t = el('div', { class: 'v3luck-hgtile' },
          img(ic[i], 'v3luck-hgic'),
          el('div', {}, el('div', { class: 'v3luck-hgname', text: i ? 'Paid with 12 Pack Hourglasses' : 'Free Pack Power' }),
            el('div', { class: 'v3luck-big num', text: r.star_luck.toFixed(3) + '×' }), el('div', { class: 'small', text: '☆ luck vs published odds' }),
            el('dl', { class: 'v3luck-dl' }, el('dt', { text: 'Packs' }), el('dd', { class: 'num', text: fmt(r.packs) }), el('dt', { text: '☆ packs vs expected' }), el('dd', { class: 'num', text: `${fmt(r.stars)} of ${fmt(r.expected_stars, 0)}` }), el('dt', { text: '◆◆◆◆+ luck' }), el('dd', { class: 'num', text: r.rr_luck.toFixed(3) + '×' }), el('dt', { text: 'God packs' }), el('dd', { class: 'num', text: `${r.god_packs} (${r.god_rate_pct}%)` }))));
        hov(t, tt => rows(tt, r.source, [['☆ luck', r.star_luck + '×'], ['z', r.star_z], ['God-pack rate', r.god_rate_pct + '% (published 0.05%)']]));
        wrap.append(t);
      });
      const scale = el('div', { class: 'v3luck-hgscale' }, el('span', { class: 'mid' }),
        ...d.data.map((r, i) => el('span', { class: 'dot' + (i ? ' b' : ''), style: `left:${((r.star_luck - .9) / .2 * 100).toFixed(1)}%`, title: r.source })),
        el('span', { class: 'lab l', text: '0.90×' }), el('span', { class: 'lab c', text: '1.00× published' }), el('span', { class: 'lab r', text: '1.10×' }));
      node.append(wrap, scale);
    },
    async pos(node) {
      const [s, c] = await Promise.all([F('server-inference/slot_shuffle_positions'), F('timing-rng/timing_slot_correlation')]);
      const P = s.data.standard_5card, BR = c.data.display_position_of_4th_card.by_rarity;
      const stage = el('div', { class: 'v3luck-pos' });
      const msg = el('p', { class: 'v3luck-posmsg', text: 'You\'re opening a pack. Which of the first four cards to flip will be card 4, the one that can be better than a common? Guess one.' });
      P.forEach((p, i) => {
        const inner = el('div', { class: 'v3luck-flip' },
          el('div', { class: 'fr' }, img('ui/card-back.webp', 'v3luck-cb', 'Face-down card ' + p.position)),
          el('div', { class: 'bk' }, el('div', { class: 'v3luck-pct num', text: p.share_pct.toFixed(1) + '%' }), el('div', { class: 'small num', text: fmt(p.count) + ' packs' }), el('div', { class: 'v3luck-p4 small', text: 'about 1 in 4' })));
        const b = el('button', { type: 'button', class: 'v3luck-slot', 'aria-label': `Position ${p.position}`, style: `--i:${i}` }, inner, el('span', { class: 'v3luck-slotn', text: '#' + p.position }));
        b.onclick = () => {
          stage.classList.add('open'); stage.querySelectorAll('.v3luck-slot').forEach(x => x.classList.toggle('mine', x === b));
          msg.textContent = `You guessed #${p.position}. In ${fmt(s.data.standard_n)} real packs, card 4 was revealed there ${p.share_pct.toFixed(2)}% of the time (±${p.ci95_pct}). Every one of the first four spots is a 1-in-4 chance.`;
        };
        hov(b, t => rows(t, `Position ${p.position}`, [['Hit landed here', `${fmt(p.count)} (${p.share_pct}%)`], ['…when it was ◆◆', fmt(BR.U[i])], ['…when ◆◆◆', fmt(BR.R[i])], ['…when ◆◆◆◆', fmt(BR.RR[i])], ['…when ☆+', fmt(BR.star[i])]]));
        stage.append(b);
      });
      const fifth = el('div', { class: 'v3luck-slot fifth' }, el('div', { class: 'v3luck-flip' }, el('div', { class: 'fr' }, img('ui/card-back.webp', 'v3luck-cb', 'Fifth card'))), el('span', { class: 'v3luck-slotn', text: '#5 always last' }));
      hov(fifth, t => rows(t, 'Position 5', [['', 'The 5th-slot card is always revealed last'], ['Packs checked', fmt(s.data.position5_always_nonCommon.true)]]));
      stage.append(fifth);
      const reset = el('button', { type: 'button', class: 'v3luck-reset', text: 'Shuffle again', onclick: () => { stage.classList.remove('open'); stage.querySelectorAll('.mine').forEach(x => x.classList.remove('mine')); msg.textContent = 'You\'re opening a pack. Which of the first four cards to flip will be card 4, the one that can be better than a common? Guess one.'; } });
      node.append(stage, el('div', { class: 'v3luck-posfoot' }, msg, reset));
    },
  };

  S.luckMythLab = async (node) => {
    const stage = el('div', { class: 'v3luck-lab-stage' });
    const done = {};
    const panels = MYTHS.map(m => el('div', { class: 'v3luck-lab-panel', hidden: '' },
      el('div', { class: 'v3luck-lab-text' },
        el('span', { class: 'verdict ' + (m.verdict === 'True' ? 'true' : 'false'), text: (m.verdict === 'True' ? '✓ ' : '✗ ') + m.verdict }),
        el('q', { class: 'v3luck-claim', text: m.claim }),
        el('p', { text: m.body }),
        el('p', { class: 'plate-foot', text: m.foot }),
        m.how ? el('details', { class: 'hwk' }, el('summary', { text: 'How we know' }), el('dl', {}, m.how.flatMap(([k, v]) => [el('dt', { text: k }), el('dd', { text: v })]))) : null),
      el('div', { class: 'v3luck-lab-fig' })));
    const show = (i) => {
      panels.forEach((p, j) => { if (j === i) p.removeAttribute('hidden'); else p.setAttribute('hidden', ''); });
      tabs.forEach((t, j) => t.setAttribute('aria-selected', String(i === j)));
      if (!done[i]) { done[i] = true; const fig = panels[i].querySelector('.v3luck-lab-fig'); LAB[MYTHS[i].id](fig).catch(e => { console.error(e); fig.append(el('p', { class: 'small', text: 'This figure could not load: ' + e.message })); }); }
    };
    const tabs = MYTHS.map((m, i) => el('button', { type: 'button', role: 'tab', class: 'v3luck-lab-tab', 'aria-selected': 'false', onclick: () => show(i) }, img(m.icon, 'v3luck-lab-ic'), el('span', { text: m.tab })));
    const bar = el('div', { class: 'v3luck-lab-tabs', role: 'tablist', 'aria-label': 'Myths' }, ...tabs);
    bar.addEventListener('keydown', (e) => {
      const i = tabs.indexOf(document.activeElement); if (i < 0) return;
      const j = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : -1;
      if (j >= 0) { e.preventDefault(); tabs[j].focus(); show(j); }
    });
    stage.append(...panels);
    node.append(bar, stage);
    show(0);
  };

  // =====================================================================
  // 7 · WONDER PICK
  // =====================================================================
})();

(() => {
  const S = window.Story;
  const { el, json, fmt, tip, card, cardArt } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const NICK = { C: '1-diamond', U: '2-diamond', R: '3-diamond', RR: '4-diamond', AR: '1-star', SR: '2-star', SAR: '2-star', IM: '3-star' };
  const feed = (g, label) => {
    const row = el('div', { class: 'v4-feed' }, g.candidates.map(c => {
      const got = c.card_id ? g.picked.card_id === c.card_id : !!(g.picked.item && g.picked.item === c.item);
      let face;
      if (c.card_id) { face = cardArt(c.card_id, { holo: (card(c.card_id)?.r || 0) >= 500 }); face.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, c.card_id))); face.addEventListener('pointermove', tip.move); face.addEventListener('pointerleave', tip.hide); }
      else face = el('span', { class: 'cardart v4-item' }, el('img', { src: 'art/icons/items/pack-hourglass.webp', alt: '' }), el('small', { text: c.item }));
      return el('div', { class: 'v4-fc' + (got ? ' got' : '') }, face, el('span', { class: 'v4-fl', text: got ? 'You got this' : (c.rarity ? NICK[c.rarity] || c.rarity : 'item') }));
    }));
    return el('div', { class: 'v4-feedwrap' }, el('div', { class: 'v4-fh', text: label }), row);
  };
  S.wonderMini = async (node) => {
    const [w, gal] = await Promise.all([F('wonder-pick/wonder_weighting_test'), F('wonder-pick/wonder_gallery'), PPA.loadCatalog()]);
    const r = w.data.rarest_card_picked;
    const hit = gal.data.find(g => g.category.startsWith('Rarest card picked')), miss = gal.data.find(g => g.category.startsWith('Missed'));
    node.append(el('div', { class: 'v4-feeds one' }, feed(hit, 'One of our picks: got the rare card'), feed(miss, 'Another: got a common instead')),
      el('div', { class: 'v4-wbig' }, el('b', { class: 'num', text: `${r.observed} of ${fmt(r.n)}` }), el('span', { text: ` picks gave us the rarest card in the five. A fair 1-in-5 pick predicts ${Math.round(r.expected_uniform)}.` })));
  };
})();

(() => {
  const S = window.Story;
  const { $, el, json, fmt, tip, badge, cardArt, card, BY_CODE } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const img = (src, cls, alt = '') => el('img', { src, class: cls, alt, loading: 'lazy', decoding: 'async' });
  const rOf = (code) => (BY_CODE[code] || BY_CODE.C).r;
  const nameOf = (id, fallback) => card(id)?.n || fallback || id;
  const hoverEl = (node, build) => {
    node.setAttribute('tabindex', '0');
    node.addEventListener('pointerenter', e => tip.show(e, build));
    node.addEventListener('pointermove', tip.move);
    node.addEventListener('pointerleave', tip.hide);
    node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); tip.show({ clientX: r.right, clientY: r.top }, build); });
    node.addEventListener('blur', tip.hide);
  };
  const cardTip = (t, id, extra = []) => {
    const c = card(id);
    t.append(el('b', { text: nameOf(id) }));
    if (c) t.append(badge(c.r), ' ', el('span', { class: 'k', text: [c.x, c.no ? '#' + c.no : null].filter(Boolean).join(' ') }));
    extra.forEach(([k, v]) => t.append(el('div', {}, el('span', { class: 'k', text: k + ' ' }), String(v))));
    if (c?.il) t.append(el('div', { class: 'k', text: 'Illus. ' + c.il }));
  };
  const seg = (host, opts, cur, onPick) => {
    if (!host) return;
    const btns = opts.map(([v, label]) => el('button', { type: 'button', 'aria-pressed': String(v === cur), text: label, onclick: () => { btns.forEach(b => b.setAttribute('aria-pressed', String(b === btn(v)))); onPick(v); } }));
    const btn = (v) => btns[opts.findIndex(o => o[0] === v)];
    host.replaceChildren(...btns);
  };
  // ---------- The 31 scripted cards ----------
  S.journeyTutorial = async (node) => {
    const [d] = await Promise.all([F('new-player-luck/first_pack_analysis'), PPA.loadCatalog()]);
    const G = d.scripted_grants;
    const isTut = (g) => g.source.startsWith('tutorial');
    const copies = (f) => G.filter(f).reduce((a, g) => a + g.copies, 0);
    const star = G.find(g => g.rarity === 'AR');
    const feature = el('figure', { class: 'v3journey-feature' },
      el('div', { class: 'v3journey-feature-card' }, cardArt(star.card_id, { holo: true, size: 'm' }), img('art/ui/fx-glitter-white.webp', 'v3journey-glint g1'), img('art/ui/fx-glitter-blue.webp', 'v3journey-glint g2'), img('art/ui/fx-glitter-pink.webp', 'v3journey-glint g3')),
      el('figcaption', {}, el('b', { text: 'Charmander ☆' }), el('span', { text: `Art Rare, in all ${fmt(1486)} accounts` })));
    hoverEl(feature.firstChild, t => cardTip(t, star.card_id, [['Copies', '1 in every account'], ['From', star.source]]));
    const grid = el('div', { class: 'v3journey-tutgrid' });
    const tiles = G.filter(g => g !== star).sort((a, b) => (isTut(b) - isTut(a)) || rOf(b.rarity) - rOf(a.rarity) || a.card_id.localeCompare(b.card_id)).map(g => {
      const t = el('div', { class: 'v3journey-tut' + (isTut(g) ? ' tut' : ' starter') }, cardArt(g.card_id, { holo: g.rarity === 'RR' }), g.copies > 1 ? el('span', { class: 'v3journey-x2', text: '×' + g.copies }) : null);
      t.dataset.group = isTut(g) ? 'tut' : 'starter';
      hoverEl(t, tt => cardTip(tt, g.card_id, [['Copies', g.copies], ['From', g.source]]));
      return t;
    });
    grid.append(...tiles);
    node.replaceChildren(el('div', { class: 'v3journey-tutwrap' }, feature, grid));
    const nT = copies(isTut), nS = copies(g => !isTut(g));
    const pick = (v) => tiles.forEach(t => t.classList.toggle('dim', v !== 'all' && t.dataset.group !== v));
    seg($('#v3journey-tut-seg'), [['all', `All ${nT + nS}`], ['tut', `Tutorial (${nT})`], ['starter', `Grass starter (${nS})`]], 'all', pick);
    $('#v3journey-tut-foot').textContent = `${nT} copies trace to the tutorial packs and the tutorial Wonder Pick, and ${nS} to the Grass starter deck and its promo trainers. The exact split between tutorial pack and tutorial Wonder Pick can't be seen in the data. The next most common card outside this list showed up in only 101 accounts.`;
  };
})();
