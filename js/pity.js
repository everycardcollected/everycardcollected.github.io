// Chapter 4 · Bad-luck protection: the pity counter board and the trainers who hit it.
(() => {
  const S = window.Story;
  const { $, el, json, fmt, css, card, compact } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  // ---------- 4 · pity ----------
  S.pityboard = async (node) => {
    const d = await F('pity/pity_state_machine');
    const tr = d.data.transitions_from_balance_readbacks;
    const fwd = {}, rst = {};
    tr.forEach(t => { if (t.to === t.from + 1) fwd[t.from] = t.n; else if (t.to === 0 && t.from > 0) rst[t.from] = t.n; });
    const draw = () => {
      const w = Charts.W(node), n = 13, narrow = w < 640;
      const cols = narrow ? 7 : 13, rows = Math.ceil(n / cols);
      const cw = (w - 20) / cols, sz = Math.min(64, cw - 10), rowH = sz + 70;
      const h = rows * rowH + 20;
      const svg = Charts.svgOf(node, w, h);
      const pos = (i) => ({ x: 10 + (i % cols) * cw + cw / 2, y: 20 + Math.floor(i / cols) * rowH + sz / 2 + 18 });
      const maxF = d3.max(Object.values(fwd));
      for (let i = 0; i < n; i++) {
        const p = pos(i);
        const g = svg.append('g').attr('transform', `translate(${p.x},${p.y})`);
        const isPity = i === 12;
        g.append('rect').attr('x', -sz / 2).attr('y', -sz / 2).attr('width', sz).attr('height', sz).attr('rx', 10).attr('fill', isPity ? css('--accent') : css('--surface-2')).attr('stroke', isPity ? 'none' : css('--line-2'));
        g.append('text').attr('text-anchor', 'middle').attr('dy', '.35em').style('font', `700 ${Math.round(sz * .38)}px var(--font-display)`).attr('fill', isPity ? '#1c1600' : css('--ink')).text(i);
        if (i < 12) {
          const q = pos(i + 1), sameRow = Math.floor(i / cols) === Math.floor((i + 1) / cols);
          if (sameRow) svg.append('path').attr('d', `M${p.x + sz / 2 + 2},${p.y}L${q.x - sz / 2 - 4},${q.y}`).attr('stroke', css('--r-dia')).attr('stroke-width', 1 + 5 * Math.sqrt((fwd[i] || 1) / maxF)).attr('marker-end', 'url(#arr)');
        }
        const r = rst[i];
        g.append('text').attr('y', sz / 2 + 16).attr('text-anchor', 'middle').style('font', '10px var(--font-data)').attr('fill', css('--muted')).text(i === 12 ? 'PITY' : r ? '↺ ' + compact(r) : '');
        Charts.hover(g.append('rect').attr('x', -cw / 2).attr('y', -sz / 2 - 6).attr('width', cw).attr('height', sz + 30).attr('fill', 'transparent'), (t) => Charts.tipRows(t, i === 12 ? 'Counter 12: pity' : `Counter ${i}`, i === 12 ? [['Next pack', 'Guarantee table: 5th card ◆◆◆◆ or better'], ['Seen', '2 of 2 packs opened here were pity packs']] : [['Dry pack → ' + (i + 1), fmt(fwd[i] || 0)], ['Hit → reset to 0', fmt(r || 0)]]));
      }
      svg.append('defs').append('marker').attr('id', 'arr').attr('markerUnits', 'userSpaceOnUse').attr('viewBox', '0 0 8 8').attr('refX', 6).attr('refY', 4).attr('markerWidth', 9).attr('markerHeight', 9).attr('orient', 'auto').append('path').attr('d', 'M0,0L8,4L0,8Z').attr('fill', css('--r-dia'));
    };
    draw(); Charts.redrawOnResize(node, draw);
    node.after(el('div', { class: 'legend', style: 'margin-top:10px' }, el('span', {}, el('i', { class: 'line', style: 'background:var(--r-dia)' }), 'Dry pack: counter +1 (thicker = more common)'), el('span', { text: '↺ = packs that hit ◆◆◆◆+ and reset to 0 from that square' })));
  };
})();

(() => {
  const S = window.Story;
  const { el, json, gColor, tip, cardArt, card, BY_CODE } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const sym = (code) => (BY_CODE[code] || {}).sym || code;
  const rc = (code) => gColor((BY_CODE[code] || BY_CODE.C).g);
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
  const packName = (tableOrPack) => { const id = String(tableOrPack).replace(/^GR_/, '').slice(0, 10) + '_00_000'; return PPA.catalog?.packById[id]?.name || 'Genetic Apex'; };
  // The three accounts that reached the wall, step by step.
  S.luckPityStories = async (node) => {
    const [ev, tl] = await Promise.all([F('pity/pity_events'), F('internals/pity_timeline'), PPA.loadCatalog()]);
    const byPlayer = {};
    ev.data.forEach(e => (byPlayer[e.anon_id] ||= { alias: e.alias, evs: [] }).evs.push(e));
    const tlBy = {};
    tl.data.forEach(r => (tlBy[r.player] ||= []).push(r));
    const avatars = ['pikachu', 'eevee', 'snorlax'];
    const ts = (s) => s * 1000;
    const gap = (a, b) => { const s = (ts(b) - ts(a)) / 1000; return s < 120 ? Math.round(s) + ' seconds later' : s < 7200 ? Math.round(s / 60) + ' minutes later' : Math.round(s / 3600) + ' hours later'; };
    const chips = (rar) => el('div', { class: 'v3luck-chips' }, ...rar.map(r => { const c = el('span', { class: 'v3luck-chip', text: sym(r) }); c.style.setProperty('--rc', rc(r)); return c; }));
    const grid = el('div', { class: 'v3luck-stories' });
    Object.entries(byPlayer).forEach(([id, p], k) => {
      const t = tlBy[id] || [];
      const dry = t.find(r => r.before === 11), pity = t.find(r => r.before === 12);
      const e11 = p.evs.find(e => e.counter_before === 11), e12 = p.evs.find(e => e.counter_before === 12);
      const steps = el('ol', { class: 'v3luck-steps' });
      steps.append(el('li', {}, el('div', { class: 'v3luck-step-k', text: 'Counter 11 → 12' }), el('div', { class: 'v3luck-step-t', text: `${packName(e11.pack_table)} · best card ${sym(e11.best_rarity)}` }), dry ? chips(dry.rarities) : ''));
      if (e12) {
        steps.append(el('li', { class: 'v3luck-wait' }, el('div', { class: 'v3luck-step-k', text: gap(e11.opened_at, e12.opened_at) })));
        const slots = el('div', { class: 'v3luck-pitypack' });
        (pity ? pity.rarities : ['C', 'C', 'C', 'C', 'RR']).forEach((r, i) => {
          let id = null;
          if (i === 4) id = e12.fifth_card;
          else if (r !== 'C' && r !== 'U' && r !== 'R') id = Object.keys(ev.pity_cards).find(c => c !== e12.fifth_card && ev.pity_cards[c].includes(r)) || null;
          if (id) {
            const a = cardArt(id, { holo: true }); a.classList.add(i === 4 ? 'v3luck-glow' : 'v3luck-bonus');
            hov(a, tt => PPA.cardTip(tt, id, i === 4 ? 'Guaranteed 5th card from the pity table' : 'A natural ☆ in the 4th slot, in the same pity pack'));
            slots.append(a);
          } else { const c = el('span', { class: 'v3luck-mini', text: sym(r) }); c.style.setProperty('--rc', rc(r)); slots.append(c); }
        });
        steps.append(el('li', { class: 'v3luck-final' }, el('div', { class: 'v3luck-step-k', text: 'Counter 12: the pity pack' }), el('div', { class: 'v3luck-step-t', text: `${card(e12.fifth_card)?.n || 'ex card'} in slot 5 · counter back to 0` }), slots));
      } else {
        steps.append(el('li', { class: 'v3luck-wait' }, el('div', { class: 'v3luck-step-k', text: 'and then…' })));
        steps.append(el('li', { class: 'v3luck-final v3luck-unopened' }, el('div', { class: 'v3luck-step-k', text: 'Counter 12: never opened' }), el('div', { class: 'v3luck-step-t', text: 'This account never opened another Genetic Apex pack. Its guarantee is still waiting.' }), el('div', { class: 'v3luck-pitypack' }, img('ui/card-back.webp', 'v3luck-back', 'Unopened card'))));
      }
      grid.append(el('article', { class: 'v3luck-story' },
        el('header', {}, img(`ui/profile/profile-icon-${avatars[k % 3]}.webp`, 'v3luck-ava'), el('div', {}, el('b', { text: p.alias }), el('div', { class: 'small', text: e12 ? 'Opened a pity pack' : 'Reached 12, walked away' }))),
        steps));
    });
    node.append(grid);
  };
})();
