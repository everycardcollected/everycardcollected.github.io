// Chapter 3 · God packs: the four kinds of pack, and the gallery of every god, pity and Deluxe pack.
(() => {
  const S = window.Story;
  const { el, json, fmt, tip, card, cardArt } = PPA;
  S.packKinds = async (node) => {
    const [P, hof, tab, acc] = await Promise.all([Openings.load(), json('data/f/god-packs/hall_of_fame.json'), json('data/f/odds-audit/table_odds.json'), json('data/accounts.json'), PPA.loadCatalog()]);
    const sum = (k) => tab.data.filter(r => r.kind === k).reduce((a, r) => ({ obs: a.obs + r.obs, exp: a.exp + r.exp, n: a.n + r.n }), { obs: 0, exp: 0, n: 0 });
    const god = sum('god'), six = sum('plus1'), theme = sum('theme');
    const R = (id) => card(id)?.r || 0;
    const idsOf = (i) => { const o = []; for (let q = P.start[i]; q < P.start[i] + P.cnt[i]; q++) o.push(P.idx.cards[P.cards[q]]); return o; };
    const pname = (i) => PPA.catalog.packById[P.idx.packs ? P.idx.packs[P.pack[i]] : '']?.name || '';
    let normal = -1, plus = -1;
    for (let i = 0; i < P.n && (normal < 0 || plus < 0); i++) {
      if (normal < 0 && P.kind[i] === 0 && P.cnt[i] === 5 && i > 30000) { const ids = idsOf(i); if (Math.max(...ids.map(R)) === 300) normal = i; }
      if (plus < 0 && P.kind[i] === 6 && P.cnt[i] === 6 && i > 30000) { const ids = idsOf(i); if (R(ids[5]) === 830 || R(ids[ids.length - 1]) === 830) plus = i; }
    }
    const gp = hof.data.god_packs.filter(x => x.table_kind === '_02');
    const gpEx = gp.find(x => x.cards.some(c => c.rarity === 'UR')) || gp[0];
    const th = hof.data.god_packs.find(x => x.table_kind === '_04');
    const rows = [
      { name: 'Normal pack', odds: 'almost every pack', stat: `${fmt(P.kind.reduce((a, k) => a + (k === 0), 0))} of our ${fmt(P.n)}`, note: 'Three 1-diamond cards, then two cards that can be anything. This is the typical result: nothing above 3-diamond.', ids: normal >= 0 ? idsOf(normal) : [], hot: () => false, who: normal >= 0 ? `${acc.alias[P.acct[normal]]} · ${pname(normal)}` : '' },
      { name: '6-card pack', odds: '1 in 19 (newer sets)', stat: `${fmt(six.obs)} in the packs we could check, ${fmt(six.exp, 0)} expected`, note: 'A normal pack plus a bonus sixth card, usually a shiny. In newer sets this is the only way to pull a shiny.', ids: plus >= 0 ? idsOf(plus) : [], hot: (id, k, a) => k === a.length - 1, who: plus >= 0 ? `${acc.alias[P.acct[plus]]} · ${pname(plus)}` : '' },
      { name: 'God pack', odds: '1 in 2,000', stat: `${god.obs} seen, ${god.exp.toFixed(1)} expected`, note: `Every card is 1-star or better (the game calls these rare packs). ${gp.filter(x => x.cards.some(c => c.rarity === 'UR')).length} of our ${gp.length} held a crown, and no account got two.`, ids: gpEx.cards.map(c => c.card_id), hot: () => true, who: `${gpEx.alias} · ${gpEx.pack_name}` },
      { name: 'Themed rare pack', icon: 'art/ui/drop-event-badge.webp', odds: '1 in 20,000', stat: `${theme.obs} seen, ${theme.exp.toFixed(1)} expected`, note: 'Only in the Mega Shine pack: a special roll that hands you five 2-shiny ex cards at once. Rarer than a god pack, and the rarest pack of our whole run.', ids: th ? th.cards.map(c => c.card_id) : [], hot: () => true, who: th ? `${th.alias} · ${th.pack_name}` : '' },
    ];
    const findPack = (x) => { if (!x) return -1; const ai = P.idx.accounts.indexOf(x.anon_id), t = x.opened_at; let best = -1, bd = 1e9; for (let i = 0; i < P.n; i++) if (P.acct[i] === ai) { const d = Math.abs(P.t[i] - t); if (d < bd) { bd = d; best = i; } } return bd <= 5 ? best : -1; };
    const packIx = [normal, plus, findPack(gpEx), findPack(th)];
    const wrap = el('div', { class: 'v4-kinds' });
    rows.forEach((r, ri) => {
      const cards = el('div', { class: 'v4-kcards' + (r.ids.length > 5 ? ' six' : '') }, r.ids.map((id, k, a) => {
        const on = r.hot(id, k, a), x = cardArt(id, { holo: on || R(id) >= 500 });
        x.classList.toggle('on', on);
        x.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, id))); x.addEventListener('pointermove', tip.move); x.addEventListener('pointerleave', tip.hide);
        x.style.cursor = 'pointer'; x.onclick = () => window.Explore && Explore.openCard(id);
        return x;
      }));
      wrap.append(el('div', { class: 'v4-kind k' + ri },
        el('div', { class: 'v4-ktext' }, r.icon ? el('img', { class: 'v4-kicon', src: r.icon, alt: '' }) : null, el('div', { class: 'v4-kodds', text: r.odds }), el('b', { text: r.name }), el('p', { text: r.note }), el('div', { class: 'v4-kstat num', text: r.stat })),
        el('div', {}, cards, el('div', { class: 'v4-kwho' }, el('span', { text: 'Real pack: ' + r.who }), packIx[ri] >= 0 ? el('button', { type: 'button', class: 'gp-link gp-see', text: ' See this pack →', onclick: () => window.Explore && Explore.openPack(packIx[ri]) }) : null))));
    });
    node.replaceChildren(wrap);
  };
})();

(() => {
  const { $, el, json, tip, cardArt, card } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  // drawn when it nears the screen
  PPA.lazy($('#gp-gallery') || document.createElement('i'), async (host) => {
    const [d] = await Promise.all([F('god-packs/hall_of_fame'), PPA.loadCatalog()]);
    const all = [...d.data.god_packs.map(p => ({ ...p, cls: p.table_kind === '_04' ? 'theme' : 'god' })), ...d.data.pity_packs.map(p => ({ ...p, cls: 'pity' })), ...d.data.deluxe_bonus_ssr_packs.map(p => ({ ...p, cls: 'deluxe' }))];
    // find this pack in the openings list (same account, same second) so it can open in the pack viewer
    const packIndex = async (p) => {
      const P = await Openings.load(), ai = P.idx.accounts.indexOf(p.anon_id), t = p.opened_at;
      let best = -1, bd = 1e9;
      for (let i = 0; i < P.n; i++) if (P.acct[i] === ai) { const d = Math.abs(P.t[i] - t); if (d < bd) { bd = d; best = i; } }
      return bd <= 5 ? best : -1;
    };
    const filt = $('#gp-filter');
    const n = (k) => all.filter(p => p.cls === k).length;
    const opts = [['god', `God packs (${n('god')})`], ['theme', `Themed rare pack (${n('theme')})`], ['pity', `Pity packs (${n('pity')})`], ['deluxe', `Deluxe bonus ✦✦ (${d.data.deluxe_bonus_ssr_packs.length})`]];
    let on = 'god', expanded = false;
    const render = () => {
      host.replaceChildren();
      const list = all.filter(p => p.cls === on), cap = expanded ? list.length : (innerWidth < 700 ? 6 : 9);
      list.slice(0, cap).forEach(p => {
        const crown = p.cards.some(c => c.rarity === 'UR');
        const title = p.table_kind === '_04' ? 'Themed rare pack · 1 in 20,000' : p.cls === 'pity' ? 'Pity guarantee' : p.cls === 'deluxe' ? 'Deluxe bonus' : crown ? 'God pack · with crown' : 'God pack';
        const row = el('div', { class: 'cardrow', style: `grid-template-columns:repeat(${p.cards.length},minmax(0,1fr))` });
        p.cards.forEach(c => { const a = cardArt(c.card_id, { holo: ['UR', 'IM', 'SSR', 'S'].includes(c.rarity) }); a.title = `${c.name} ${c.symbol}`; a.classList.add('gp-card'); a.tabIndex = 0; a.setAttribute('role', 'button'); a.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, c.card_id))); a.addEventListener('pointermove', tip.move); a.addEventListener('pointerleave', tip.hide); const open = () => { tip.hide(); window.Explore && Explore.openCard(c.card_id); }; a.addEventListener('click', open); a.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } }); row.append(a); });
        const who = el('button', { type: 'button', class: 'gp-link', text: p.alias, onclick: () => window.Explore && Explore.showTrainer(p.anon_id) });
        const see = el('button', { type: 'button', class: 'gp-link gp-see', text: 'See this pack →', onclick: () => packIndex(p).then(i => i >= 0 && window.Explore && Explore.openPack(i)) });
        host.append(el('article', { class: 'gp' + (p.cls === 'god' ? ' godpack' : '') },
          el('div', { class: 'gp-head' }, el('span', {}, who, ' · ' + (PPA.catalog.packById[p.pack_id]?.name || p.pack_name)), el('span', { class: 'num', text: PPA.when(p.opened_at) })),
          row, el('div', { class: 'cardcap gp-foot' }, el('span', { text: title + ' · ' + p.cards.map(c => c.symbol).join(' ') }), see)));
      });
      if (list.length > cap) host.append(el('button', { type: 'button', class: 'btn ghost gp-more', text: `Show all ${list.length}`, onclick: () => { expanded = true; render(); } }));
    };
    opts.forEach(([k, label]) => { const b = el('button', { type: 'button', 'aria-pressed': String(k === on), text: label }); b.onclick = () => { on = k; expanded = false; [...filt.children].forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }; filt.append(b); });
    render();
  });
})();
