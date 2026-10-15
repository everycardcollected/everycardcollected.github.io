// Chapter 5 · Luck: every trainer's luck score (beeswarm) and the luckiest / unluckiest leaderboards.
(() => {
  const S = window.Story;
  const { $, el, json, fmt, pct, css, tip, badge, cardArt, card } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  // ---------- 5 · luck ----------
  S.swarm = async (node) => {
    const [d] = await Promise.all([F('luck/all_players'), PPA.loadCatalog()]);
    const rows = d.data.map(r => Object.fromEntries(d.columns.map((c, i) => [c, r[i]])));
    window.__luckPlayers = rows;
    const N = rows.length, Z1 = 2.326, clip = (z) => Math.max(-3.6, Math.min(3.6, z));
    // a fair fleet: one luck score per account drawn from pure chance (standard normal), seeded so it never changes
    let seed = 1500; const R = () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
    const simZ = Array.from({ length: N }, () => Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R())).sort((a, b) => a - b);
    // pair each real account with the simulated score of the same rank, so the morph shows how little moves
    const order = rows.map((_, i) => i).sort((a, b) => rows[a].luck_z - rows[b].luck_z);
    const sz = new Float64Array(N); order.forEach((i, k) => { sz[i] = simZ[k]; });
    const realTop = rows.filter(p => p.luck_pct >= 99).length, realBot = rows.filter(p => p.luck_pct <= 1).length;
    const simTop = simZ.filter(z => z >= Z1).length, simBot = simZ.filter(z => z <= -Z1).length;
    const colReal = (p) => p.god_packs ? css('--r-star2') : p.crowns ? css('--r-crown') : (p.luck_pct >= 99 ? css('--r-star') : p.luck_pct <= 1 ? css('--r-dia') : css('--line-2'));
    const colSim = (z) => z >= Z1 ? css('--r-star') : z <= -Z1 ? css('--r-dia') : css('--line-2');
    let mode = 'real';
    const seg = el('div', { class: 'seg v5swarm-seg', role: 'group', 'aria-label': 'Compare with a fair fleet' });
    const modes = [['real', 'Our 1,486 trainers'], ['sim', 'A fair fleet (simulated)']];
    const mbtn = modes.map(([k, l]) => { const b = el('button', { type: 'button', 'aria-pressed': String(k === mode), text: l }); b.onclick = () => setMode(k); return b; });
    seg.append(...mbtn);
    const badge = el('span', { class: 'v5swarm-badge', text: 'Simulated: pure chance, no favourites', hidden: '' });
    const chart = el('div', { class: 'v5swarm-chart' });
    node.replaceChildren(el('div', { class: 'v5swarm-bar' }, seg, badge), chart);
    const legend = () => $('#swarm-legend').replaceChildren(...(mode === 'real'
      ? [el('span', {}, el('i', { style: 'background:var(--r-star)' }), 'Top 1% luck'), el('span', {}, el('i', { style: 'background:var(--r-dia)' }), 'Bottom 1%'), el('span', {}, el('i', { style: 'background:var(--r-crown)' }), 'Pulled a crown'), el('span', {}, el('i', { style: 'background:var(--r-star2)' }), 'Opened a god pack')]
      : [el('span', {}, el('i', { style: 'background:var(--r-star)' }), 'Top 1% by chance'), el('span', {}, el('i', { style: 'background:var(--r-dia)' }), 'Bottom 1% by chance')]));
    const foot = () => { $('#swarm-foot').textContent = mode === 'real'
      ? `Someone always ends up luckiest. Each account was replayed 20,000 times with the published odds: ${realTop} landed in the top 1% of their own replays and ${realBot} in the bottom 1%, where chance predicts about 15 each. Flip to the fair fleet to see what pure chance looks like. An account's luck in its first half of packs said nothing about its second half (correlation +0.003).`
      : `A made-up fleet of ${fmt(N)} trainers where luck is pure chance: ${simTop} in the top 1% and ${simBot} in the bottom 1%. Our real spread is 1.03× this one's, well within what chance allows (p = 0.18). Every dot here is simulated; tap back to see our trainers.`; };
    let dots, sim, del, geo;
    const draw = () => {
      const w = Charts.W(chart), h = Math.min(380, Math.max(260, w * .32)), m = { t: 10, r: 16, b: 30, l: 16 };
      const svg = Charts.svgOf(chart, w, h).attr('aria-label', 'Beeswarm of luck scores, one dot per account');
      const x = d3.scaleLinear([-3.6, 3.6], [m.l, w - m.r]);
      svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.floor(w / 100), '+~g')).call(Charts.axisStyle);
      const r = w < 600 ? 2.2 : 3.2, cy = (h - m.b + m.t) / 2;
      const lay = (zs, rad) => {
        const n = zs.map((z, i) => ({ X: x(clip(z)), x: x(clip(z)), y: cy, rr: rad(i) }));
        const f = d3.forceSimulation(n).force('x', d3.forceX(q => q.X).strength(1)).force('y', d3.forceY(cy).strength(.06)).force('c', d3.forceCollide(q => q.rr + .4)).stop();
        for (let i = 0; i < 160; i++) f.tick();
        n.forEach(q => { q.y = Math.max(m.t + q.rr, Math.min(h - m.b - q.rr, q.y)); });
        return n;
      };
      const big = (i) => (rows[i].god_packs || rows[i].crowns) ? 4.5 : r;
      const A = lay(rows.map(p => p.luck_z), big), B = lay(Array.from(sz), () => r);
      sim = rows.map((p, i) => ({ p, i, a: A[i], b: B[i] }));
      svg.append('line').attr('x1', x(0)).attr('x2', x(0)).attr('y1', m.t).attr('y2', h - m.b).attr('stroke', css('--ink')).attr('opacity', .3);
      svg.append('text').attr('x', x(0) + 4).attr('y', m.t + 10).text('exactly as expected');
      svg.append('text').attr('x', x(3.5)).attr('y', h - m.b - 6).attr('text-anchor', 'end').text('luckier →');
      svg.append('text').attr('x', x(-3.5)).attr('y', h - m.b - 6).text('← unluckier');
      const pos = (q) => mode === 'real' ? q.a : q.b;
      dots = svg.append('g').selectAll('circle').data(sim).join('circle')
        .attr('cx', q => pos(q).x).attr('cy', q => pos(q).y).attr('r', q => mode === 'real' ? q.a.rr : r)
        .attr('fill', q => mode === 'real' ? colReal(q.p) : colSim(sz[q.i])).attr('stroke', css('--surface')).attr('stroke-width', .8);
      const hit = svg.append('rect').attr('width', w).attr('height', h - m.b).attr('fill', 'transparent');
      let hot = null;
      const unhot = () => { if (hot) hot.attr('stroke', css('--surface')).attr('stroke-width', .8); hot = null; };
      const near = (e) => { const [px, py] = d3.pointer(e); const i = del.find(px, py); const q = sim[i], P = pos(q); return Math.hypot(P.x - px, P.y - py) > 24 ? null : q; };
      hit.on('pointermove', (e) => {
        const q = near(e); unhot(); if (!q) return tip.hide();
        hot = dots.filter(x => x === q).attr('stroke', css('--ink')).attr('stroke-width', 2).raise();
        if (mode === 'real') { const p = q.p; tip.show(e, t => Charts.tipRows(t, p.alias, [['Luckier than', p.luck_pct.toFixed(1) + '% of replays'], ['Packs', p.packs], ['☆+ pulled', `${p.star_plus} (expected ${p.star_plus_expected.toFixed(1)})`], ['Longest dry spell', p.longest_dry_spell + ' packs'], ...(p.crowns ? [['Crowns', p.crowns]] : []), ...(p.god_packs ? [['God packs', p.god_packs]] : [])])); }
        else { const z = sz[q.i], pc = 50 * (1 + erf(z / Math.SQRT2)); tip.show(e, t => Charts.tipRows(t, 'A simulated trainer', [['Luck score', (z >= 0 ? '+' : '') + z.toFixed(2)], ['Luckier than', pc.toFixed(1) + '% of a fair fleet'], ['Real account?', 'No, made up to show pure chance']])); }
      }).on('pointerleave', () => { tip.hide(); unhot(); })
        .on('click', (e) => { if (mode !== 'real') return; const q = near(e); if (q && window.__luckSpot) { window.__luckSpot(q.p); document.querySelector('#leaderboards')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } });
      geo = () => { del = d3.Delaunay.from(sim, q => pos(q).x, q => pos(q).y); };
      geo();
      setTimeout(() => mode === 'real' && window.__luckSpotMark && window.__luckSpotMark());
    };
    const erf = (x) => { const t = 1 / (1 + .3275911 * Math.abs(x)); const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - .284496736) * t + .254829592) * t * Math.exp(-x * x); return x >= 0 ? y : -y; };
    const setMode = (k) => {
      if (k === mode) return; mode = k;
      mbtn.forEach((b, i) => b.setAttribute('aria-pressed', String(modes[i][0] === k)));
      badge.hidden = k !== 'sim'; node.classList.toggle('is-sim', k === 'sim');
      legend(); foot(); tip.hide();
      const rm = matchMedia('(prefers-reduced-motion: reduce)').matches;
      const t = dots.interrupt().transition().duration(rm ? 0 : 900).delay(rm ? 0 : (q) => (q.a.x / 8) % 220).ease(d3.easeCubicInOut);
      t.attr('cx', q => (k === 'real' ? q.a : q.b).x).attr('cy', q => (k === 'real' ? q.a : q.b).y).attr('r', q => k === 'real' ? q.a.rr : q.b.rr)
        .attr('fill', q => k === 'real' ? colReal(q.p) : colSim(sz[q.i])).attr('stroke', css('--surface')).attr('stroke-width', .8);
      geo();
      if (k === 'real') t.end().then(() => window.__luckSpotMark && window.__luckSpotMark()).catch(() => {});
    };
    legend(); foot(); draw(); Charts.redrawOnResize(chart, draw);
  };
  // trainer spotlight: pick a trainer (shortcut or dot) and see their story
  // drawn when it nears the screen
  PPA.lazy($('#leaderboards') || document.createElement('i'), async (host) => {
    const [d, P, acc] = await Promise.all([F('luck/all_players'), Openings.load(), json('data/accounts.json'), PPA.loadCatalog()]);
    const rows = d.data.map(r => Object.fromEntries(d.columns.map((c, i) => [c, r[i]])));
    const AV = ['charizard', 'eevee', 'mewtwo', 'pikachu', 'slowpoke', 'snorlax'];
    const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
    const best = (aid) => {
      const ai = P.idx.accounts.indexOf(aid); const seen = new Map();
      if (ai < 0) return [];
      for (let i = 0; i < P.n; i++) if (P.acct[i] === ai) for (let q = P.start[i]; q < P.start[i] + P.cnt[i]; q++) { const id = P.idx.cards[P.cards[q]]; seen.set(id, (seen.get(id) || 0) + 1); }
      return [...seen.keys()].sort((a, b) => (card(b)?.r || 0) - (card(a)?.r || 0)).slice(0, 6);
    };
    const pick = {
      lucky: () => rows.reduce((a, b) => (b.luck_pct > a.luck_pct ? b : a)),
      unlucky: () => rows.reduce((a, b) => (b.luck_pct < a.luck_pct ? b : a)),
      crowns: () => rows.reduce((a, b) => (b.crowns > a.crowns || (b.crowns === a.crowns && b.luck_pct > a.luck_pct) ? b : a)),
      drought: () => rows.reduce((a, b) => (b.longest_dry_spell > a.longest_dry_spell ? b : a)),
      random: () => rows[Math.floor(Math.random() * rows.length)],
    };
    const btns = [['lucky', 'Luckiest'], ['unlucky', 'Unluckiest'], ['crowns', 'Most crowns'], ['drought', 'Longest drought'], ['random', 'Surprise me']]
      .map(([k, l]) => { const b = el('button', { type: 'button', text: l, 'aria-pressed': 'false' }); b.onclick = () => { show(pick[k]()); btns.forEach(x => x.setAttribute('aria-pressed', String(x === b))); }; return b; });
    const card_ = el('div', { class: 'spot-card' });
    host.className = 'spot';
    host.replaceChildren(el('div', { class: 'spot-bar' }, el('span', { class: 'spot-k', text: 'Spotlight a trainer' }), el('div', { class: 'seg', role: 'group', 'aria-label': 'Pick a trainer' }, btns), el('span', { class: 'spot-or', text: 'or click any dot above' })), card_);
    const mark = (aid) => document.querySelector('[data-chart="swarm"].is-sim') ? null : d3.selectAll('[data-chart="swarm"] circle').attr('stroke', x => x && x.p && x.p.anon_id === aid ? css('--ink') : css('--surface')).attr('stroke-width', x => x && x.p && x.p.anon_id === aid ? 3 : .8).filter(x => x && x.p && x.p.anon_id === aid).raise();
    // luck tier badge, borrowing the game's rank balls
    const rank = (pct) => pct >= 99 ? ['master-ball', 'Master Ball luck: top 1%'] : pct >= 90 ? ['ultra-ball', 'Ultra Ball luck: top 10%'] : pct >= 50 ? ['great-ball', 'Great Ball luck: better than half'] : pct >= 10 ? ['poke-ball', 'Poké Ball luck: below average'] : ['beginner', 'Beginner luck: bottom 10%'];
    const show = (p) => {
      const ratio = p.star_plus_expected ? p.star_plus / p.star_plus_expected : 1;
      const lucky = p.luck_pct >= 50;
      const verdict = p.luck_pct >= 99 ? 'Top 1% luck' : p.luck_pct <= 1 ? 'Bottom 1% luck' : lucky ? 'Luckier than most' : 'Unluckier than most';
      const max = Math.max(p.star_plus, p.star_plus_expected) * 1.1 || 1;
      const arts = el('div', { class: 'spot-arts' }, best(p.anon_id).map(id => { const a = cardArt(id, { holo: (card(id)?.r || 0) >= 500 }); a.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, id))); a.addEventListener('pointermove', tip.move); a.addEventListener('pointerleave', tip.hide); a.style.cursor = 'pointer'; a.onclick = () => window.Explore && Explore.openCard(id); return a; }));
      card_.replaceChildren(
        el('div', { class: 'spot-who' }, el('div', { class: 'spot-av' }, el('img', { src: `art/ui/profile/profile-icon-${AV[hash(p.alias) % AV.length]}.webp`, alt: '' }), el('img', { class: 'spot-rank', src: `art/icons/rank/rank-${rank(p.luck_pct)[0]}.webp`, alt: '', title: rank(p.luck_pct)[1] })), el('div', {}, el('b', { text: p.alias }), el('span', { class: 'spot-v ' + (lucky ? 'up' : 'down'), text: verdict }), el('span', { class: 'spot-tier', text: rank(p.luck_pct)[1] }))),
        el('div', { class: 'spot-meter' },
          el('div', { class: 'spot-pct num' }, el('b', { text: (lucky ? p.luck_pct : 100 - p.luck_pct).toFixed(1) + '%' }), el('span', { text: lucky ? 'of 20,000 replays of their exact packs came out less lucky' : 'of 20,000 replays of their exact packs came out luckier' })),
          el('div', { class: 'spot-bars' },
            el('div', { class: 'spot-row' }, el('span', { text: 'Star cards pulled' }), el('i', { style: `width:${p.star_plus / max * 100}%;background:var(--r-star)` }), el('b', { class: 'num', text: String(p.star_plus) })),
            el('div', { class: 'spot-row' }, el('span', { text: 'Their packs should give' }), el('i', { style: `width:${p.star_plus_expected / max * 100}%;background:var(--muted)` }), el('b', { class: 'num', text: p.star_plus_expected.toFixed(1) }))),
          el('div', { class: 'spot-facts' }, [['Packs', fmt(p.packs)], ['Longest dry spell', p.longest_dry_spell + ' packs'], ['Crowns', String(p.crowns || 0)], ['God packs', String(p.god_packs || 0)]].map(([k, v]) => el('div', {}, el('b', { class: 'num', text: v }), el('span', { text: k }))))),
        el('div', { class: 'spot-best' }, el('div', { class: 'spot-k', text: 'Their best pulls' }), arts, el('button', { type: 'button', class: 'btn ghost', text: 'Open full profile →', onclick: () => window.Explore && Explore.showTrainer(p.anon_id) })));
      cur = p.anon_id; mark(cur);
    };
    let cur = null;
    window.__luckSpot = show; window.__luckSpotMark = () => cur && mark(cur);
    btns[0].click();
  });
})();
