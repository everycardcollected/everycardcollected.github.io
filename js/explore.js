// Explore: the binder (every card, with fleet copy counts), trainers, every pack.
window.Explore = (() => {
  const { $, $$, el, json, fmt, tip, cardArt, card, RARITY, oneIn } = PPA;
  let odds, P, accounts, players, inited = false;
  const root = () => $('#explore');

  // ---------- rarity words + icons (the players' names) ----------
  const RW = { 100: '1-diamond', 200: '2-diamond', 300: '3-diamond', 400: '4-diamond (ex)', 500: '1-star', 600: '2-star', 700: '2-star', 800: '3-star (immersive)', 830: 'shiny', 860: '2-shiny', 900: 'crown' };
  const ICON = { 100: ['diamond', 1], 200: ['diamond', 2], 300: ['diamond', 3], 400: ['diamond', 4], 500: ['star', 1], 600: ['star', 2], 700: ['star', 2], 800: ['star', 3], 830: ['shiny', 1], 860: ['shiny', 2], 900: ['crown', 1] };
  const TIERS = [[900, 'Crown'], [860, '2-shiny'], [830, 'Shiny'], [800, '3-star (immersive)'], [700, '2-star'], [500, '1-star'], [400, '4-diamond (ex)'], [300, '3-diamond'], [200, '2-diamond'], [100, '1-diamond']];
  const tierOf = (r) => r === 600 ? 700 : r;
  const rIcons = (r, cls = '') => {
    const [k, n] = ICON[r] || ICON[100];
    return el('span', { class: 'xr ' + cls, title: RW[r], role: 'img', 'aria-label': RW[r] }, Array.from({ length: n }, () => el('img', { src: `art/icons/rarity/rarity-${k}.webp`, alt: '', loading: 'lazy', decoding: 'async' })));
  };
  const rg = (r) => (RARITY[r] || RARITY[100]).g;
  const plural = (n, one, many) => `${fmt(n)} ${n === 1 ? one : many}`;
  // history: Explore owns #x-*, #card=, #trainer=, #pack=; app.js routes back to us on popstate
  const nav = (h, replace) => { if (location.hash !== h) history[replace ? 'replaceState' : 'pushState'](null, '', h); };
  const binderHash = (o = {}) => {
    const u = new URLSearchParams();
    if (o.set) u.set('set', o.set); if (o.r && o.r.length) u.set('r', [].concat(o.r).join(',')); if (o.q) u.set('q', o.q);
    if (o.sort && o.sort !== 'rare') u.set('sort', o.sort); if (o.one) u.set('one', '1');
    const qs = u.toString(); return '#x-binder' + (qs ? '?' + qs : '');
  };
  const hoverTip = (node, build) => { node.addEventListener('pointerenter', e => tip.show(e, build)); node.addEventListener('pointermove', tip.move); node.addEventListener('pointerleave', tip.hide); };

  // ---------- odds (for the dialog's chance-per-pack) ----------
  const tablesOf = (pid) => odds[pid].tables;
  const cardChance = (cid) => {
    let best = 0, bestPack = null;
    for (const pid of Object.keys(odds)) {
      let pNo = 1;
      for (const t of tablesOf(pid)) { if (!(t.p > 0)) continue; let tNo = 1; for (const [, rar] of t.slots) { let q = 0; for (const [, pr, items] of rar) { const tot = items.reduce((a, c) => a + c[1], 0) || 1; for (const [c, cp] of items) if (c === cid) q += pr * cp / tot; } tNo *= (1 - q); } pNo -= t.p * (1 - tNo); }
      const p = 1 - pNo; if (p > best) { best = p; bestPack = pid; }
    }
    return { p: best, pack: bestPack };
  };

  // ---------- pulls from the openings binary ----------
  let pullCount, pullTrainers, firstPull, cidx;
  const countPulls = () => {
    if (pullCount) return;
    cidx = Object.fromEntries(P.idx.cards.map((c, i) => [c, i]));
    pullCount = new Uint32Array(P.idx.cards.length); const tr = Array.from({ length: P.idx.cards.length }, () => new Set()); firstPull = new Int32Array(P.idx.cards.length).fill(-1);
    for (let i = 0; i < P.n; i++) for (let k = 0; k < P.cnt[i]; k++) { const j = P.cards[P.start[i] + k]; pullCount[j]++; tr[j].add(P.acct[i]); if (firstPull[j] < 0) firstPull[j] = i; }
    pullTrainers = tr.map(s => s.size);
  };

  // ---------- per-card fleet stats ----------
  let statsP;
  const cardStats = () => statsP || (statsP = PPA.json('data/f/cards/card_stats.json').then(d => Object.fromEntries(d.data.map(r => [r[0], Object.fromEntries(d.columns.map((k, i) => [k, r[i]]))]))));
  const ROUTE = { P: 'a pack', W: 'Wonder Pick', F: 'a free reward', B: 'a battle reward', U: 'an untracked source' };
  const cardStatBlock = (s, c) => {
    const out = [];
    if (s.exp1000 > 0) {
      const max = Math.max(s.per1000, s.exp1000) * 1.15, ratio = s.per1000 / s.exp1000;
      out.push(el('div', { class: 'dlg-gauge' },
        el('div', { class: 'small', text: 'Copies per 1,000 packs of its pack' }),
        el('div', { class: 'g-row' }, el('span', { class: 'g-k', text: 'We pulled' }), el('span', { class: 'g-bar' }, el('i', { style: `width:${s.per1000 / max * 100}%;background:var(--r-${PPA.rarityOf(c.r).g})` })), el('b', { class: 'num', text: fmt(s.per1000, 1) })),
        el('div', { class: 'g-row' }, el('span', { class: 'g-k', text: 'Odds say' }), el('span', { class: 'g-bar' }, el('i', { style: `width:${s.exp1000 / max * 100}%;background:var(--muted)` })), el('b', { class: 'num', text: fmt(s.exp1000, 1) })),
        el('div', { class: 'small', text: ratio > 1.15 ? `Pulled ${((ratio - 1) * 100).toFixed(0)}% more often than the odds predict. No card is a significant outlier once you account for testing 3,480 of them.` : ratio < 0.87 ? `Pulled ${((1 - ratio) * 100).toFixed(0)}% less often than the odds predict. No card is a significant outlier once you account for testing 3,480 of them.` : 'Right where the odds say it should be.' })));
    }
    const routes = [['Packs', s.pulls, 'var(--r-dia)'], ['Wonder Pick', s.wonder_pick, 'var(--r-shiny)'], ['Free rewards', s.free_claim, 'var(--r-rr)'], ['Other', s.other, 'var(--muted)']].filter(r => r[1] > 0);
    const tot = routes.reduce((a, r) => a + r[1], 0);
    if (tot) out.push(el('div', { class: 'dlg-gauge' }, el('div', { class: 'small', text: `How the copies arrived, of the ${tot === 1 ? 'one' : fmt(tot)} we logged during the week` }),
      el('div', { class: 'g-stack' }, routes.map(([k, v, col]) => el('i', { style: `flex:${v};background:${col}`, title: `${k}: ${fmt(v)}` }))),
      el('div', { class: 'legend' }, routes.map(([k, v, col]) => el('span', {}, el('i', { class: 'sw', style: `background:${col}` }), `${k} ${fmt(v)}`)))));
    const gap = (s.held ?? 0) - tot;
    out.push(el('p', { class: 'small', style: 'margin:10px 0 0' }, `${fmt(s.owners)} of 1,500 trainers held it when the run ended` + (gap > 0 ? `, ${plural(gap, 'copy', 'copies')} more than our logs caught arriving (a few hundred packs went unlogged). ` : '. '), s.first_hour != null ? `The fleet first got one ${s.first_hour < 1 ? 'in the first hour' : 'after ' + fmt(s.first_hour, 1) + ' hours'}, from ${ROUTE[s.first_route] || 'somewhere'}.` : ''));
    return out;
  };

  // ---------- binder model ----------
  let B;
  const cmpRare = (a, b) => b.pull - a.pull || b.tier - a.tier || a.copies - b.copies || a.si - b.si || a.c.no - b.c.no;
  // copies = final inventory (same snapshot as owners); logged = arrivals we saw during the week, which misses a few unlogged packs
  const loggedOf = (s) => s ? s.pulls + s.wonder_pick + s.free_claim + s.other : 0;
  const copiesOf = (s) => !s ? 0 : s.held != null ? s.held : loggedOf(s);
  const buildModel = async () => {
    if (B) return B;
    const S = await cardStats();
    const cat = PPA.catalog;
    const setName = {}; cat.packs.forEach(p => { setName[p.exp] = p.expName; });
    setName['PROMO-A'] = 'Promo-A'; setName['PROMO-B'] = 'Promo-B';
    const sets = [...new Set(cat.packs.map(p => p.exp)), 'PROMO-A', 'PROMO-B'];
    cat.cards.forEach(c => { if (!sets.includes(c.x)) sets.push(c.x); });
    const setIx = Object.fromEntries(sets.map((s, i) => [s, i]));
    // Deluxe Pack: ex lists reprints under its own numbers; the fleet pulled them as their originals.
    const DX = 'AN011_0010_00_000';
    const orig = cat.cards.filter(c => S[c.id] && (c.p || []).includes(DX));
    const reprintOf = {};
    cat.cards.forEach(c => {
      if (S[c.id] || c.x !== 'A4b') return;
      const m = orig.find(o => o.n === c.n && o.r === c.r && o.il === c.il) || orig.find(o => o.n === c.n && o.r === c.r);
      if (m) reprintOf[c.id] = m.id;
    });
    const E = cat.cards.map((c, i) => {
      const src = S[c.id] ? c.id : reprintOf[c.id];
      const s = src ? S[src] : null;
      return { c, id: c.id, src: src || c.id, s, copies: copiesOf(s), logged: loggedOf(s), pulls: s ? s.pulls : 0, owners: s ? s.owners : 0, pull: !!(s && s.exp1000 > 0), reprint: !!reprintOf[c.id], tier: tierOf(c.r), set: c.x, si: setIx[c.x] ?? 99, q: (c.n + ' ' + (c.il || '') + ' ' + c.x).toLowerCase(), i };
    });
    const per = Object.fromEntries(sets.map(s => [s, { set: s, name: setName[s] || s, total: 0, pullable: 0, found: 0, copies: 0, done: null, promo: s.startsWith('PROMO'), owned: 0, reprints: 0 }]));
    for (const e of E) {
      const p = per[e.set]; p.total++;
      if (e.reprint) p.reprints++;
      if (e.owners > 0) p.owned++;
      if (!e.pull) continue;
      p.pullable++;
      if (e.copies > 0 || e.logged > 0) p.found++;
      if (!e.reprint) p.copies += e.copies;
      const fh = e.s.first_hour; if (fh != null && (p.done == null || fh > p.done)) p.done = fh;
    }
    const uniq = E.filter(e => !e.reprint);
    const pullable = uniq.filter(e => e.pull);
    const last = pullable.reduce((a, e) => (e.s.first_hour ?? -1) > (a?.s.first_hour ?? -1) ? e : a, null);
    B = { E, sets, setName, per, reprintOf, uniq, pullable, found: pullable.filter(e => e.copies > 0 || e.logged > 0).length, ones: pullable.filter(e => e.copies === 1).length, packPulls: pullable.reduce((a, e) => a + e.pulls, 0), copies: pullable.reduce((a, e) => a + e.copies, 0), last };
    return B;
  };
  const statFor = (cid) => B && (B.E.find(e => e.id === cid));

  // ---------- layout ----------
  const SECTIONS = [['binder', 'The binder'], ['week', 'The whole week'], ['trainers', 'Trainers'], ['viewer', 'Every pack']];
  const ALIAS = { dex: 'binder' };
  const setTop = () => { const t = $('.topbar'); document.documentElement.style.setProperty('--xb-top', (t ? Math.round(t.getBoundingClientRect().height) : 56) + 'px'); };
  const build = () => {
    const r = root();
    r.replaceChildren();
    const wrap = el('div', { class: 'wrap xb-wrap' }, el('div', { class: 'wide' }));
    const w = wrap.firstChild;
    const navEl = el('div', { class: 'seg xb-nav', role: 'tablist', 'aria-label': 'Explore' });
    SECTIONS.forEach(([k, label]) => {
      const b = el('button', { type: 'button', role: 'tab', 'aria-selected': 'false', 'data-k': k, text: label });
      b.onclick = () => { show(k); nav(k === 'binder' && binderNow ? binderNow() : '#x-' + k); scrollTo({ top: 0 }); }; navEl.append(b);
    });
    w.append(navEl);
    SECTIONS.forEach(([k]) => w.append(el('section', { class: 'xb-sec', id: 'x-' + k, hidden: '' })));
    r.append(wrap);
    setTop(); addEventListener('resize', setTop);
  };
  const made = {};
  const show = (k) => {
    k = ALIAS[k] || k;
    $$('.xb-nav button').forEach(b => b.setAttribute('aria-selected', String(b.dataset.k === k)));
    $$('.xb-sec').forEach(s => s.hidden = s.id !== 'x-' + k);
    if (!made[k]) { made[k] = true; ({ binder, week, trainers, viewer })[k]($('#x-' + k)); }
  };

  // ---------- the binder ----------
  const ring = (found, total, big) => {
    const p = total ? found / total : 0;
    return el('span', { class: 'xb-ring' + (p >= 1 ? ' full' : '') + (big ? ' big' : ''), style: `--p:${p}`, role: 'img', 'aria-label': `${found} of ${total} found` },
      el('span', { class: 'xb-ring-in' }, big ? [el('b', { class: 'num', text: fmt(found) }), el('small', { class: 'num', text: 'of ' + fmt(total) })] : el('b', { class: 'num', text: Math.round(p * 100) + '%' })));
  };
  const logoOf = (set) => set.startsWith('PROMO') ? `art/logos/expansion-badge_${set}.webp` : `art/logos/expansion-logo_${set}.webp`;

  let binderList = null, binderNow = null;
  function binder(host) {
    const st = { set: '', tiers: new Set(), q: '', sort: 'rare', one: false };
    // hero
    const lastE = B.last;
    const hero = el('div', { class: 'xb-hero' },
      ring(B.found, B.pullable.length, true),
      el('div', { class: 'xb-hero-txt' },
        el('div', { class: 'eyebrow', text: 'The collection' }),
        el('h2', { text: 'Every card, collected' }),
        el('p', { class: 'lede' }, `All ${fmt(B.pullable.length)} cards you can pull from a pack, with how many copies our trainers got and how many own each. Open any card to follow it to the pack it first came out of and the trainer who pulled it.`)));
    const strip = el('div', { class: 'xb-facts' },
      el('div', { class: 'xb-fact' }, el('img', { src: 'art/icons/items/pack-icon.webp', alt: '', loading: 'lazy' }), el('div', {}, el('b', { class: 'num', text: fmt(B.packPulls) }), el('span', { text: 'cards pulled from 60,689 packs' }))),
      el('div', { class: 'xb-fact' }, el('img', { src: 'art/icons/rarity/rarity-crown.webp', alt: '', loading: 'lazy' }), el('div', {}, el('b', { class: 'num', text: fmt(B.copies) }), el('span', { text: 'copies of pack cards held when the run ended' }))),
      el('button', { type: 'button', class: 'xb-fact act', onclick: () => { st.one = true; st.sort = 'rare'; sync(); apply(true); } }, el('span', { class: 'xb-one-dot', 'aria-hidden': 'true', text: '1' }), el('div', {}, el('b', { class: 'num', text: fmt(B.ones) }), el('span', { text: 'cards exist only once in the whole fleet. Show them →' }))),
      lastE ? el('button', { type: 'button', class: 'xb-fact act', onclick: () => openCard(lastE.id) }, el('span', { class: 'xb-fact-art' }, cardArt(lastE.id)), el('div', {}, el('b', { text: lastE.c.n }), el('span', { text: `the last card found, ${fmt(lastE.s.first_hour, 0)} hours in` }))) : null);
    // set shelf
    const shelf = el('div', { class: 'xb-shelf', role: 'list', 'aria-label': 'Completion by expansion' });
    const setBtns = {};
    const allBtn = el('button', { type: 'button', class: 'xb-set-tile all', role: 'listitem', onclick: () => { st.set = ''; sync(); apply(true); } },
      el('span', { class: 'xb-set-logo all', text: 'All sets' }), el('span', { class: 'xb-set-row' }, ring(B.found, B.pullable.length), el('span', { class: 'xb-set-n' }, el('b', { class: 'num', text: fmt(B.found) }), el('small', { text: `of ${fmt(B.pullable.length)} pack cards found` }))));
    shelf.append(allBtn); setBtns[''] = allBtn;
    for (const s of B.sets) {
      const p = B.per[s]; if (!p.total) continue;
      const promo = p.promo, a4b = p.reprints > 0;
      const b = el('button', { type: 'button', class: 'xb-set-tile' + (promo ? ' promo' : ''), role: 'listitem', title: p.name, onclick: () => { st.set = st.set === s ? '' : s; sync(); apply(true); } },
        el('img', { class: 'xb-set-logo', src: logoOf(s), alt: p.name, loading: 'lazy' }),
        el('span', { class: 'xb-set-row' }, promo ? ring(p.owned, p.total) : ring(p.found, p.pullable),
          el('span', { class: 'xb-set-n' }, promo ? [el('b', { class: 'num', text: `${p.owned}/${p.total}` }), el('small', { text: 'promos · not in packs' })]
            : [el('b', { class: 'num', text: `${p.found}/${p.pullable}` }), el('small', { text: a4b ? `reprints, pulled from other packs` : p.done != null ? `all found by hour ${Math.ceil(p.done)}` : 'found' })])));
      hoverTip(b, t => { t.append(el('b', { text: p.name }), el('div', { class: 'k', text: promo ? `${p.total} promo cards. None come from packs; ${p.owned} were held by fleet trainers.` : a4b ? `${p.total} cards. Its pack wasn't on sale during the run. The ${p.pullable} reprints were all pulled from their original packs; ${p.total - p.pullable} exclusives were out of reach.` : `${p.pullable} pack cards, all found. ${fmt(p.copies)} copies. The last one arrived ${fmt(p.done, 1)} hours in.` })); });
      shelf.append(b); setBtns[s] = b;
    }
    // sticky filter bar
    const q = el('input', { type: 'search', id: 'xb-q', placeholder: 'Search a card, set or illustrator', 'aria-label': 'Search cards', autocomplete: 'off' });
    const setSel = el('select', { id: 'xb-set', 'aria-label': 'Expansion' }, el('option', { value: '', text: 'All sets' }), B.sets.filter(s => B.per[s].total).map(s => el('option', { value: s, text: `${B.per[s].name} (${s})` })));
    const SORTS = [['rare', 'Rarest first'], ['hard', 'Hardest to pull'], ['first', 'First found'], ['last', 'Last found'], ['owned', 'Most owned'], ['most', 'Most copies'], ['fewest', 'Fewest copies'], ['set', 'Set order']];
    const sortSel = el('select', { class: 'xb-sort-sel', 'aria-label': 'Sort' }, SORTS.map(([k, t]) => el('option', { value: k, text: 'Sort: ' + t })));
    const nOff = B.uniq.filter(e => !e.pull).length;
    const scope = el('p', { class: 'xb-scope small' }, el('b', { class: 'num', text: fmt(B.pullable.length) }), ' cards you can pull from a pack · ', el('b', { class: 'num', text: fmt(nOff) }), " more are promos or Deluxe Pack: ex exclusives you can't pull, shown at the end");
    const sortNote = el('span', { class: 'xb-sortnote small', hidden: '' });
    const count = el('span', { class: 'xb-count small num', 'aria-live': 'polite' });
    const tierCount = (t) => B.pullable.filter(e => e.tier === t).length, tierOff = (t) => B.uniq.filter(e => e.tier === t && !e.pull).length;
    const chips = el('div', { class: 'xb-chips', role: 'group', 'aria-label': 'Rarity' },
      TIERS.map(([t, label]) => { const b = el('button', { type: 'button', class: 'xb-chip', 'data-t': t, 'aria-pressed': 'false', style: `--rc:var(--r-${rg(t)})`, title: `${label}: ${fmt(tierCount(t))} you can pull from packs` + (tierOff(t) ? `, plus ${fmt(tierOff(t))} promo or exclusive not in packs` : ''), onclick: () => { st.tiers.has(t) ? st.tiers.delete(t) : st.tiers.add(t); sync(); apply(true); } }, rIcons(t), el('span', { class: 'xb-chip-l', text: label.replace(' (immersive)', '').replace(' (ex)', '') }), el('small', { class: 'num', text: fmt(tierCount(t)) })); return b; }),
      el('button', { type: 'button', class: 'xb-chip one', 'aria-pressed': 'false', 'data-one': '1', onclick: () => { st.one = !st.one; sync(); apply(true); } }, el('span', { class: 'xb-one-dot', 'aria-hidden': 'true', text: '1' }), el('span', { class: 'xb-chip-l', text: 'Only 1 copy' }), el('small', { class: 'num', text: fmt(B.ones) })));
    let quiet = false; try { quiet = localStorage.getItem('xb-gallery') === '1'; } catch {}
    const galBtn = el('button', { type: 'button', class: 'xb-gal', 'aria-pressed': String(quiet), title: 'Just the cards, no badges or counts', text: 'Gallery view' });
    galBtn.onclick = () => { quiet = !quiet; galBtn.setAttribute('aria-pressed', String(quiet)); grid.classList.toggle('quiet', quiet); try { localStorage.setItem('xb-gallery', quiet ? '1' : '0'); } catch {} };
    const clear = el('button', { type: 'button', class: 'xb-clear', text: 'Clear filters', hidden: '', onclick: () => { st.set = ''; st.tiers.clear(); st.one = false; st.q = ''; q.value = ''; sync(); apply(true); } });
    const bar = el('div', { class: 'xb-bar' },
      el('div', { class: 'xb-bar-row' }, el('label', { class: 'xb-search' }, el('span', { 'aria-hidden': 'true', text: '⌕' }), q), setSel, sortSel),
      el('div', { class: 'xb-bar-row' }, chips),
      el('div', { class: 'xb-bar-row xb-status' }, count, sortNote, clear, galBtn));
    const setHead = el('div', { class: 'xb-sethead', hidden: '' });
    const grid = el('div', { class: 'xb-grid' + (quiet ? ' quiet' : ''), role: 'list' });
    const sentinel = el('div', { class: 'xb-sentinel', 'aria-hidden': 'true' });
    const empty = el('p', { class: 'xb-empty', hidden: '', text: 'No cards match. Try clearing a filter.' });
    host.append(hero, strip, el('div', { class: 'xb-shelf-wrap' }, shelf), scope, bar, setHead, grid, empty, sentinel);

    const sync = () => {
      setSel.value = st.set; sortSel.value = st.sort;
      const NOTE = { most: 'Copy counts also reflect which packs our accounts chose to open, not just rarity.', fewest: 'Copy counts also reflect which packs our accounts chose to open, not just rarity.', hard: 'By the published chance of pulling it from its best pack.', first: 'By the hour the fleet first got a copy.', last: 'By the hour the fleet first got a copy, latest first.' };
      sortNote.hidden = !NOTE[st.sort]; sortNote.textContent = NOTE[st.sort] || '';
      $$('.xb-chip', chips).forEach(b => b.setAttribute('aria-pressed', String(b.dataset.one ? st.one : st.tiers.has(+b.dataset.t))));
      Object.entries(setBtns).forEach(([k, b]) => b.classList.toggle('on', k === st.set));
      clear.hidden = !(st.set || st.tiers.size || st.one || st.q);
    };
    let list = [], shown = 0, groupKey = null, groups = {};
    const fh = (e) => e.s?.first_hour ?? 1e9, qb = (e) => e.s?.q_best_pack_pct ?? 1e9;
    const SORTF = {
      rare: cmpRare,
      hard: (a, b) => b.pull - a.pull || qb(a) - qb(b) || b.tier - a.tier,
      first: (a, b) => b.pull - a.pull || fh(a) - fh(b) || b.tier - a.tier,
      last: (a, b) => b.pull - a.pull || (b.s?.first_hour ?? -1) - (a.s?.first_hour ?? -1) || b.tier - a.tier,
      owned: (a, b) => b.pull - a.pull || b.owners - a.owners || b.tier - a.tier,
      most: (a, b) => b.pull - a.pull || b.copies - a.copies || b.tier - a.tier,
      fewest: (a, b) => b.pull - a.pull || a.copies - b.copies || b.tier - a.tier || a.si - b.si,
      set: (a, b) => a.si - b.si || a.c.no - b.c.no,
    };
    const groupOf = (e) => st.sort === 'rare' ? (e.pull ? 't' + e.tier : 'off') : st.sort === 'set' ? 's' + e.set : null;
    const apply = (jump) => {
      const t = st.q.trim().toLowerCase();
      list = B.E.filter(e => (st.set ? e.set === st.set : !e.reprint) && (!st.tiers.size || st.tiers.has(e.tier)) && (!st.one || (e.pull && e.copies === 1)) && (!t || e.q.includes(t)));
      list.sort(SORTF[st.sort]);
      groups = {}; for (const e of list) { const g = groupOf(e); if (g) { const G = groups[g] || (groups[g] = { n: 0, copies: 0 }); G.n++; G.copies += e.copies; } }
      const nP = list.filter(e => e.pull).length, nO = list.length - nP;
      count.textContent = `${fmt(nP)} pack ${nP === 1 ? 'card' : 'cards'}` + (nO ? ` + ${fmt(nO)} not in packs` : '') + (st.set ? ` in ${B.per[st.set].name}` : '');
      empty.hidden = list.length > 0;
      drawSetHead();
      grid.replaceChildren(); shown = 0; groupKey = null; page();
      if (/^#(x-binder|explore$|$)/.test(location.hash) && !dlg().open) nav(binderHash({ ...st, r: [...st.tiers] }), true);
      if (jump) { const y = bar.getBoundingClientRect().top + scrollY - parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--xb-top') || 56) - 4; if (scrollY > y) scrollTo({ top: y }); }
    };
    const drawSetHead = () => {
      if (!st.set) { setHead.hidden = true; return; }
      const p = B.per[st.set]; setHead.hidden = false;
      setHead.replaceChildren(el('img', { src: logoOf(st.set), alt: '' }),
        el('div', {}, el('b', { text: p.name }), el('span', { class: 'small', text: p.promo ? ` · ${p.total} promo cards, none from packs` : p.reprints ? ` · ${p.total} cards: ${p.pullable} reprints counted with their originals, ${p.total - p.pullable} exclusives from a pack that wasn't on sale` : ` · ${p.pullable} cards · ${fmt(p.copies)} copies · last one found ${fmt(p.done, 1)} hours in` })));
    };
    const groupHead = (g) => {
      const G = groups[g];
      if (g === 'off') return el('div', { class: 'xb-ghead', role: 'presentation' }, el('span', { class: 'xb-gname', text: 'Not in any pack we could open' }), el('span', { class: 'small', text: `${fmt(G.n)} promos and Deluxe Pack: ex exclusives` }));
      if (g[0] === 't') { const t = +g.slice(1); return el('div', { class: 'xb-ghead', role: 'presentation', style: `--rc:var(--r-${rg(t)})` }, rIcons(t), el('span', { class: 'xb-gname', text: TIERS.find(x => x[0] === t)[1] }), el('span', { class: 'small num', text: `${plural(G.n, 'card', 'cards')} · ${plural(G.copies, 'copy', 'copies')}` })); }
      const s = g.slice(1), p = B.per[s];
      return el('div', { class: 'xb-ghead', role: 'presentation' }, el('img', { class: 'xb-glogo', src: logoOf(s), alt: '', loading: 'lazy' }), el('span', { class: 'xb-gname', text: p.name }), el('span', { class: 'small num', text: `${plural(G.n, 'card', 'cards')} · ${plural(G.copies, 'copy', 'copies')}` }));
    };
    const PAGE = 48;
    const page = () => {
      const frag = document.createDocumentFragment();
      for (const e of list.slice(shown, shown + PAGE)) {
        const g = groupOf(e);
        if (g && g !== groupKey) { groupKey = g; frag.append(groupHead(g)); }
        frag.append(tile(e));
      }
      grid.append(frag);
      shown += PAGE;
      sentinel.hidden = shown >= list.length;
    };
    const sortVal = (e) => {
      if ((st.sort === 'first' || st.sort === 'last') && e.s?.first_hour != null) return `Found ${e.s.first_hour < 1 ? 'in hour 1' : 'at hour ' + fmt(e.s.first_hour, 1)}`;
      if (st.sort === 'hard' && e.s?.q_best_pack_pct > 0) return `1 in ${fmt(100 / e.s.q_best_pack_pct)} packs`;
      return '';
    };
    const tile = (e) => {
      const c = e.c, star = c.r >= 500, one = e.pull && e.copies === 1;
      const b = el('button', { type: 'button', role: 'listitem', class: 'xb-card' + (star ? ' star' : '') + (c.r >= 800 ? ' ultra' : '') + (one ? ' one' : '') + (e.pull ? '' : ' off'), 'data-id': c.id, style: `--rc:var(--r-${rg(c.r)})`,
        'aria-label': `${c.n}, ${RW[c.r]}, ${e.pull ? plural(e.copies, 'copy', 'copies') + ', ' + plural(e.owners, 'trainer', 'trainers') : 'not in packs'}` },
        el('span', { class: 'xb-art' }, cardArt(c.id, { size: 'm' }), el('span', { class: 'xb-shine', 'aria-hidden': 'true' }), one ? el('span', { class: 'xb-ribbon', text: 'Only 1 copy in the fleet' }) : null, !e.pull ? el('span', { class: 'xb-off', text: 'Not in packs' }) : null),
        el('span', { class: 'xb-cap' },
          el('span', { class: 'xb-name', text: c.n }),
          el('span', { class: 'xb-meta' }, rIcons(c.r), el('span', { class: 'xb-setc num', text: `${c.x} ${c.no}` })),
          e.pull ? el('span', { class: 'xb-nums' },
            el('span', { class: 'xb-copies' }, el('b', { class: 'num', text: fmt(e.copies) }), e.copies === 1 ? ' copy' : ' copies'),
            el('span', { class: 'xb-owners' }, el('b', { class: 'num', text: fmt(e.owners) }), e.owners === 1 ? ' owner' : ' owners'))
            : el('span', { class: 'xb-nums muted', text: e.owners ? `${plural(e.owners, 'trainer', 'trainers')} own it` : 'No fleet copies' }),
          e.reprint ? el('span', { class: 'xb-note', text: `Reprint · counted with ${card(e.src)?.x || ''} ${card(e.src)?.no || ''}` }) : null,
          e.pull && sortVal(e) ? el('span', { class: 'xb-sortv num', text: sortVal(e) }) : null));
      return b;
    };
    // infinite scroll
    const io = new IntersectionObserver(es => { if (es.some(x => x.isIntersecting) && shown < list.length) page(); }, { rootMargin: '1400px 0px' });
    io.observe(sentinel);
    // interactions: delegated click + holo/tilt
    grid.addEventListener('click', ev => { const b = ev.target.closest('.xb-card'); if (b) openCard(b.dataset.id, { ctx: list.map(e => e.id) }); });
    let raf = 0, cur = null;
    grid.addEventListener('pointermove', ev => {
      if (ev.pointerType !== 'mouse') return;
      const b = ev.target.closest('.xb-card'); if (!b) return;
      if (cur && cur !== b) reset(cur); cur = b;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = b.firstChild.getBoundingClientRect(); const x = (ev.clientX - r.left) / r.width, y = (ev.clientY - r.top) / r.height;
        b.style.setProperty('--mx', (x * 100).toFixed(1) + '%'); b.style.setProperty('--my', (y * 100).toFixed(1) + '%');
        b.style.setProperty('--ry', ((x - .5) * 10).toFixed(2) + 'deg'); b.style.setProperty('--rx', ((.5 - y) * 10).toFixed(2) + 'deg');
      });
    });
    const reset = (b) => { ['--mx', '--my', '--rx', '--ry'].forEach(k => b.style.removeProperty(k)); };
    grid.addEventListener('pointerleave', () => { cancelAnimationFrame(raf); if (cur) reset(cur); cur = null; });
    let qt; q.addEventListener('input', () => { clearTimeout(qt); qt = setTimeout(() => { st.q = q.value; sync(); apply(false); }, 120); });
    setSel.addEventListener('input', () => { st.set = setSel.value; sync(); apply(true); });
    sortSel.addEventListener('input', () => { st.sort = sortSel.value; sync(); apply(true); });
    sync(); apply(false);
    api.binderSet = (s) => { st.set = s; sync(); apply(true); };
    api.binderState = (o) => { st.set = B.per[o.set] ? o.set : ''; st.tiers = new Set((o.r ? String(o.r).split(',') : []).map(Number).filter(t => TIERS.some(x => x[0] === t))); st.q = o.q || ''; q.value = st.q; st.sort = SORTF[o.sort] ? o.sort : 'rare'; st.one = !!o.one; sync(); apply(true); };
    binderList = () => list.map(e => e.id);
    binderNow = () => binderHash({ ...st, r: [...st.tiers] });
  }

  // ---------- card dialog ----------
  let dlgCtx = null, dlgPushed = false, dlgSilent = false, dlgId = null, closeHandled = true;
  // runs once per close, whether or not the browser fires the dialog's close event
  const finishClose = () => { if (closeHandled) return; closeHandled = true; onDlgClose(); };
  const closeDlg = () => { const d = $('#ppa-dialog'); if (d && d.open) d.close(); finishClose(); };
  const isExploreHash = (h) => /^#(explore$|x-|card=|trainer=|pack=)/.test(h);
  const onDlgClose = () => {
    $('#ppa-dialog')?.classList.remove('art-only');
    if (dlgSilent) { dlgSilent = false; return; }
    if (location.hash.startsWith('#card=')) { if (dlgPushed) { PPA.skipRoute = true; history.back(); } else nav(binderNow ? binderNow() : '#x-binder', true); }
    dlgPushed = false;
  };
  const closeSilently = () => { const d = $('#ppa-dialog'); if (d && d.open) { dlgSilent = true; dlgPushed = false; d.close(); finishClose(); } };
  const dlg = () => {
    let d = $('#ppa-dialog');
    if (!d) {
      d = el('dialog', { id: 'ppa-dialog', class: 'ppa-dialog xd', 'aria-label': 'Card details', tabindex: '-1' });
      d.addEventListener('click', e => { if (e.target === d) closeDlg(); });
      d.addEventListener('close', finishClose);
      d.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT') return; if (e.key === 'ArrowLeft') { e.preventDefault(); step(-1); } else if (e.key === 'ArrowRight') { e.preventDefault(); step(1); } });
      document.body.append(d);
    }
    return d;
  };
  // Back while the dialog is open: close it here, and stop app.js from re-scrolling the page underneath
  addEventListener('popstate', () => { const d = $('#ppa-dialog'); if (d && d.open && !location.hash.startsWith('#card=')) { dlgSilent = true; dlgPushed = false; d.close(); finishClose(); if (!isExploreHash(location.hash)) PPA.skipRoute = true; } });
  const step = (dir) => { if (!dlgCtx || dlgId == null) return; const k = dlgCtx.indexOf(dlgId); if (k < 0) return; const n = dlgCtx[(k + dir + dlgCtx.length) % dlgCtx.length]; openCard(n, { keepCtx: true }); };
  const goBinder = (o) => { closeSilently(); PPA.setView('explore'); show('binder'); nav(binderHash(o)); api.binderState && api.binderState(o); };
  const linkBtn = (text, onclick, cls = '') => el('button', { type: 'button', class: 'xd-link ' + cls, text, onclick });
  const copyLink = async (btn, id) => {
    const url = location.href.split('#')[0] + '#card=' + encodeURIComponent(id);
    let ok = false;
    try { await navigator.clipboard.writeText(url); ok = true; } catch {
      try { const ta = el('textarea', { style: 'position:fixed;top:0;left:0;opacity:0' }); ta.value = url; btn.closest('dialog').append(ta); ta.select(); ok = document.execCommand('copy'); ta.remove(); } catch {}
    }
    btn.textContent = ok ? 'Link copied' : 'Copy blocked here';
    setTimeout(() => { btn.textContent = 'Copy link'; }, 1800);
  };
  const printingsOf = (c, cid) => {
    const seen = new Set([cid, c.id]); const out = [];
    for (const x of PPA.catalog.cards) {
      if (x.n !== c.n) continue;
      const e = statFor(x.id), id = e && e.reprint ? e.src : x.id;
      if (seen.has(id) || seen.has(x.id)) continue; seen.add(id); seen.add(x.id); out.push(card(id) || x);
    }
    return out.sort((a, b) => b.r - a.r || String(a.x).localeCompare(b.x));
  };
  const openCard = (cidIn, opts = {}) => {
    countPulls();
    const c = card(cidIn); if (!c) return;
    const e = statFor(cidIn);
    const cid = e ? e.src : cidIn;
    const j = cidx[cid] ?? -1, ch = odds ? cardChance(cid) : { p: 0 };
    const d = dlg();
    const wasOpen = d.open;
    if (opts.ctx) dlgCtx = opts.ctx; else if (!opts.keepCtx) dlgCtx = binderList ? binderList() : B.uniq.slice().sort(cmpRare).map(x => x.id);
    if (dlgCtx && !dlgCtx.includes(cidIn)) dlgCtx = null;
    dlgId = cidIn;
    if (opts.push !== false) { const h = '#card=' + encodeURIComponent(cidIn); if (wasOpen) nav(h, true); else { nav(h); dlgPushed = location.hash === h; } }
    const artOnly = d.classList.contains('art-only');
    d.replaceChildren();
    const fpI = j >= 0 ? firstPull[j] : -1;
    const packs = (card(cid)?.p || []).filter(p => odds && odds[p]);
    const setName = B?.per[c.x]?.name || c.x;
    const first = fpI >= 0 ? el('span', { class: 'xd-first' },
      linkBtn(accounts.alias[P.acct[fpI]], () => { closeSilently(); api.showTrainer(P.idx.accounts[P.acct[fpI]]); }),
      el('span', { class: 'muted', text: `, ${PPA.when(P.t[fpI])} · ` }),
      linkBtn(`pack #${fmt(fpI + 1)} →`, () => { closeSilently(); openPack(fpI); }))
      : 'Never from a pack';
    const rows = [
      ['Rarity', el('span', { class: 'xb-dlg-r' }, rIcons(c.r), ' ' + RW[c.r][0].toUpperCase() + RW[c.r].slice(1))],
      ['Set', el('span', {}, linkBtn(setName, () => goBinder({ set: c.x })), el('span', { class: 'muted', text: ` · #${c.no}` + (e && e.reprint ? ` (reprint of ${card(cid)?.x} #${card(cid)?.no})` : '') }))],
      ['Found in', packs.map(p => PPA.catalog.packById[p]?.name || p).join(', ') || 'Not in any pack we could open'],
      ['Chance per pack', ch.p ? `${(ch.p * 100).toFixed(3)}% (${oneIn(ch.p)})` + (packs.length > 1 ? ' in ' + PPA.catalog.packById[ch.pack]?.name : '') : '–'],
      ['Copies held at the end', e ? `${fmt(e.copies)}, by ${plural(e.owners, 'trainer', 'trainers')}` : '–'],
      ['Pulled from packs', j >= 0 ? `${fmt(pullCount[j] || 0)}, by ${plural(pullTrainers[j] || 0, 'trainer', 'trainers')}` : '0'],
      ['First pulled', first],
      ...(c.il ? [['Illustrator', linkBtn(c.il, () => goBinder({ q: c.il.toLowerCase() }))]] : [])];
    const extra = el('div', { class: 'dlg-extra' });
    const one = e && e.pull && e.copies === 1;
    const k = dlgCtx ? dlgCtx.indexOf(cidIn) : -1;
    const artBtn = el('button', { type: 'button', class: 'btn ghost xd-tb', 'aria-pressed': String(artOnly), text: artOnly ? 'Show details' : 'Art only' });
    artBtn.onclick = () => { const on = d.classList.toggle('art-only'); artBtn.textContent = on ? 'Show details' : 'Art only'; artBtn.setAttribute('aria-pressed', String(on)); };
    // a framed host doesn't pass #card= through to this page, so only offer links when standalone
    const framed = (() => { try { return window.top !== window; } catch { return true; } })();
    const copyBtn = el('button', { type: 'button', class: 'btn ghost xd-tb', text: 'Copy link', hidden: framed ? '' : null }); copyBtn.onclick = () => copyLink(copyBtn, cidIn);
    const bar = el('div', { class: 'xd-bar' },
      k >= 0 ? el('div', { class: 'xd-step' },
        el('button', { type: 'button', class: 'btn ghost xd-arrow', 'aria-label': 'Previous card', text: '‹', onclick: () => step(-1) }),
        el('span', { class: 'small num', text: `${fmt(k + 1)} of ${fmt(dlgCtx.length)}` }),
        el('button', { type: 'button', class: 'btn ghost xd-arrow', 'aria-label': 'Next card', text: '›', onclick: () => step(1) })) : el('span'),
      el('div', { class: 'xd-acts' }, artBtn, copyBtn, el('button', { type: 'button', class: 'btn ghost xd-x', 'aria-label': 'Close', text: '×', onclick: closeDlg })));
    const others = printingsOf(c, cid);
    const prints = others.length ? el('div', { class: 'xd-prints' }, el('div', { class: 'small xd-h', text: `Other ${c.n} cards (${others.length})` }),
      el('div', { class: 'xd-prow' }, others.slice(0, 16).map(o => el('button', { type: 'button', class: 'xd-pr', style: `--rc:var(--r-${rg(o.r)})`, 'aria-label': `${o.n}, ${RW[o.r]}, ${o.x}`, title: `${RW[o.r]} · ${B?.per[o.x]?.name || o.x}`, onclick: () => openCard(o.id, { keepCtx: true }) }, cardArt(o.id, { size: 's' }), rIcons(o.r))))) : null;
    d.append(bar, el('div', { class: 'dlg-body' },
      el('div', { class: 'dlg-art' + (c.r >= 500 ? ' xb-dlg-holo' : '') }, cardArt(cidIn, { holo: c.r >= 500, size: 'm' }), one ? el('div', { class: 'xb-dlg-one', text: 'The only copy in the whole fleet' }) : null),
      el('div', { class: 'dlg-info', style: 'min-width:0' },
        el('div', { class: 'xb-dlg-top' }, el('img', { src: logoOf(c.x), alt: setName, class: 'xb-dlg-logo' }), c.t ? el('span', { class: 'xb-dlg-type', title: c.t + ' type' }, el('img', { src: `art/ui/deckbox/deckbox-${c.t.toLowerCase()}.webp`, alt: '' }), el('img', { class: 'xb-glyph', src: `art/icons/energy/type-${c.t.toLowerCase()}_glyph.webp`, alt: '' }), el('span', { text: c.t })) : null),
        el('h3', { style: 'margin-top:4px', text: c.n }),
        el('table', { class: 'data' }, el('tbody', {}, rows.map(([kk, v]) => el('tr', {}, el('th', { text: kk }), el('td', {}, v))))),
        extra, prints)));
    if (!wasOpen) { closeHandled = false; d.showModal(); d.focus({ preventScroll: true }); }
    cardStats().then(S => { const s = S[cid]; if (s && d.open && dlgId === cidIn) extra.append(...cardStatBlock(s, c)); }).catch(() => {});
  };

  // ---------- trainers ----------
  const AVATARS = ['pikachu', 'eevee', 'charizard', 'mewtwo', 'slowpoke', 'snorlax'];
  const avatar = (ai, cls = '') => el('img', { class: 'xt-av ' + cls, src: `art/ui/profile/profile-icon-${AVATARS[ai % AVATARS.length]}.webp`, alt: '', loading: 'lazy' });
  let T; // per-account aggregates
  const buildTrainers = () => {
    if (T) return T;
    countPulls();
    const n = P.idx.accounts.length;
    const packsOf = Array.from({ length: n }, () => []);
    for (let i = 0; i < P.n; i++) packsOf[P.acct[i]].push(i);
    const onlyOf = Array.from({ length: n }, () => []);
    if (B) for (const e of B.pullable) if (e.copies === 1 && e.pulls === 1) { const j = cidx[e.id]; if (j != null && firstPull[j] >= 0) onlyOf[P.acct[firstPull[j]]].push(e.id); }
    const lp = Object.fromEntries(players.map(p => [p.anon_id, p]));
    const list = P.idx.accounts.map((aid, ai) => {
      const L = lp[aid] || {};
      let star = 0, crowns = 0, god = 0; const seen = new Set();
      for (const i of packsOf[ai]) { if (P.kind[i] === 2) god++; for (let k = 0; k < P.cnt[i]; k++) { const j = P.cards[P.start[i] + k]; const r = P.rarityByIdx[j]; if (r >= 500) star++; if (r === 900) crowns++; seen.add(j); } }
      return { ai, anon_id: aid, alias: accounts.alias[ai], packs: packsOf[ai].length, distinct: seen.size, star_plus: L.star_plus ?? star, star_plus_expected: L.star_plus_expected, crowns: L.crowns ?? crowns, god_packs: L.god_packs ?? god, luck_pct: L.luck_pct, longest_dry_spell: L.longest_dry_spell, only: onlyOf[ai] };
    }).filter(p => p.alias);
    T = { list, packsOf };
    return T;
  };
  function week(host) {
    host.append(el('div', { class: 'h4-mosaic' },
      el('div', { class: 'h4-mhead' }, el('div', { class: 'plate-title', text: 'The whole week, one square per pack' }), el('div', { class: 'plate-sub', text: 'All 60,689 packs in the order they were opened, one band per day. Each square takes the colour of the best card inside. Move over the wall to look inside the packs, or click any square to open its hour.' })),
      el('div', { id: 'mosaic' })));
    window.PackWall && PackWall.mount($('#mosaic'));
  }
  function trainers(host) {
    const { list: L0, packsOf } = buildTrainers();
    const q = el('input', { type: 'search', id: 'tr-q', placeholder: 'Search a trainer alias', 'aria-label': 'Search trainers', autocomplete: 'off' });
    const SORTS = [['luck', 'Luckiest first'], ['unluck', 'Unluckiest first'], ['only', 'Fleet-only cards'], ['packs', 'Most packs'], ['crowns', 'Crowns'], ['alias', 'A–Z']];
    const so = el('select', { id: 'tr-sort', 'aria-label': 'Sort trainers' }, SORTS.map(([v, t]) => el('option', { value: v, text: t })));
    const listBox = el('div', { class: 'xt-list', role: 'list' }), prof = el('div', { class: 'xt-prof' }), cnt = el('div', { class: 'small xt-cnt' });
    const nOnly = L0.filter(p => p.only.length).length;
    host.append(
      el('div', { class: 'xt-head' }, el('div', { class: 'eyebrow', text: 'Trainers' }), el('h2', { text: `${fmt(L0.length)} trainers, one binder` }),
        el('p', { class: 'lede', text: `Every account in the fleet has a made-up alias. Pick one to see every pack it opened and the best cards in its binder. ${fmt(nOnly)} trainers hold a card nobody else in the fleet has.` })),
      el('div', { class: 'xt-wrap' }, el('div', { class: 'xt-side' }, el('div', { class: 'xt-ctl' }, q, so), cnt, listBox), prof));
    let active = null;
    const LIM = 200;
    const draw = () => {
      const t = q.value.trim().toLowerCase();
      const L = L0.filter(p => !t || p.alias.toLowerCase().includes(t));
      const nl = (x) => x == null ? -1 : x;
      const f = { luck: (a, b) => nl(b.luck_pct) - nl(a.luck_pct), unluck: (a, b) => (a.luck_pct ?? 101) - (b.luck_pct ?? 101), only: (a, b) => b.only.length - a.only.length || nl(b.luck_pct) - nl(a.luck_pct), packs: (a, b) => b.packs - a.packs, crowns: (a, b) => b.crowns - a.crowns || nl(b.luck_pct) - nl(a.luck_pct), alias: (a, b) => a.alias.localeCompare(b.alias) }[so.value];
      L.sort(f);
      cnt.textContent = L.length > LIM ? `Showing ${LIM} of ${fmt(L.length)}. Search to find any trainer.` : plural(L.length, 'trainer', 'trainers');
      listBox.replaceChildren(...L.slice(0, LIM).map(p => {
        const b = el('button', { type: 'button', role: 'listitem', class: 'xt-row' + (p.anon_id === active ? ' on' : ''), 'data-a': p.anon_id },
          avatar(p.ai), el('span', { class: 'xt-row-t' }, el('b', { text: p.alias }),
            el('span', { class: 'num small', text: `${p.packs} packs` + (p.luck_pct != null ? ` · luck ${p.luck_pct.toFixed(1)}%` : '') })),
          el('span', { class: 'xt-tags' }, p.only.length ? el('span', { class: 'xt-tag one', title: 'Cards only this trainer holds', text: p.only.length + ' unique' }) : null, p.crowns ? el('span', { class: 'xt-tag crown', title: 'Crowns' }, el('img', { src: 'art/icons/rarity/rarity-crown.webp', alt: 'crown' }), String(p.crowns)) : null));
        b.onclick = () => { profile(p.anon_id); nav('#trainer=' + p.anon_id, true); }; return b;
      }));
    };
    const profile = (aid, scroll = true) => {
      const p = L0.find(x => x.anon_id === aid); if (!p) return;
      active = aid; $$('.xt-row', listBox).forEach(r => r.classList.toggle('on', r.dataset.a === aid));
      const mine = packsOf[p.ai];
      const seen = new Map();
      for (const i of mine) for (const c of P.cardsOf(i)) seen.set(c, (seen.get(c) || 0) + 1);
      const ranked = [...seen.keys()].map(c => ({ c, r: card(c)?.r || 0, e: statFor(c) })).sort((a, b) => b.r - a.r || (a.e?.copies ?? 1e9) - (b.e?.copies ?? 1e9));
      const onlySet = new Set(p.only);
      const best = [...p.only.map(c => ranked.find(x => x.c === c)).filter(Boolean), ...ranked.filter(x => !onlySet.has(x.c))].slice(0, 12);
      // strip of every pack
      const strip = el('canvas', { class: 'tr-strip', width: Math.max(1, mine.length * 6), height: 6 }); const g = strip.getContext('2d');
      mine.forEach((i, k) => P.cardsOf(i).slice(-5).forEach((c, s) => { const r = card(c)?.r || 100; g.fillStyle = PPA.rColor(r); g.globalAlpha = r < 400 ? .25 + r / 1000 : 1; g.fillRect(k * 6, s, 5, 1.2); }));
      strip.style.width = '100%'; strip.style.height = '28px';
      const kAt = (e) => { const r = strip.getBoundingClientRect(); return mine[Math.floor((e.clientX - r.left) / r.width * mine.length)]; };
      strip.addEventListener('pointermove', e => { const i = kAt(e); if (i != null && window.PackTip) tip.show(e, t => window.PackTip(t, i)); });
      strip.addEventListener('pointerleave', tip.hide);
      strip.addEventListener('click', e => { const i = kAt(e); if (i != null) openPack(i); });
      const bestRow = el('div', { class: 'xt-best' }, best.map(x => {
        const one = onlySet.has(x.c), cc = card(x.c);
        const b = el('button', { type: 'button', class: 'xb-card mini' + (x.r >= 500 ? ' star' : '') + (one ? ' one' : ''), style: `--rc:var(--r-${rg(x.r)})`, 'aria-label': cc?.n || x.c },
          el('span', { class: 'xb-art' }, cardArt(x.c, { size: 'm' }), el('span', { class: 'xb-shine', 'aria-hidden': 'true' }), one ? el('span', { class: 'xb-ribbon', text: 'Fleet\'s only copy' }) : null),
          el('span', { class: 'xb-cap' }, el('span', { class: 'xb-name', text: cc?.n || x.c }), el('span', { class: 'xb-meta' }, rIcons(x.r)),
            el('span', { class: 'xb-nums small' }, x.e ? (onlySet.has(x.c) ? 'No one else has it' : `${plural(x.e.copies, 'copy', 'copies')} in the fleet`) : '')));
        b.onclick = () => openCard(x.c, { ctx: best.map(y => y.c) }); return b;
      }));
      const hits = [];
      for (const i of mine) P.cardsOf(i).forEach(c => { const r = card(c)?.r || 0; if (r >= 500) hits.push({ i, c, r }); });
      const HCAP = 18;
      const hitBox = el('div', { class: 'xt-hits' });
      const drawHits = (all) => {
        hitBox.replaceChildren(...hits.slice(0, all ? hits.length : HCAP).map(h => {
          const cc = card(h.c), kind = KIND[P.kind[h.i]];
          const b = el('button', { type: 'button', class: 'xt-hit', style: `--rc:var(--r-${rg(h.r)})`, 'aria-label': `${cc?.n || 'Card'}, ${RW[h.r]}, pack ${h.i + 1}. Open the pack` },
            cardArt(h.c), el('span', { class: 'xt-hit-t' }, el('b', { text: cc?.n || '' }), rIcons(h.r),
              el('span', { class: 'small num muted', text: `Pack #${fmt(h.i + 1)} · ${PPA.when(P.t[h.i])}` + (kind ? ' · ' + kind : '') })));
          b.onclick = () => openPack(h.i); return b;
        }), hits.length > HCAP && !all ? el('button', { type: 'button', class: 'btn ghost xt-hits-more', text: `Show all ${hits.length}`, onclick: () => drawHits(true) }) : '');
      };
      drawHits(false);
      const statsRow = [[p.luck_pct != null ? p.luck_pct.toFixed(1) + '%' : '–', 'of 20,000 replays of these exact packs were less lucky'], [fmt(p.packs), 'packs opened'], [fmt(p.distinct), 'different cards pulled'], [`${p.star_plus}`, p.star_plus_expected != null ? `☆+ cards (expected ${p.star_plus_expected.toFixed(1)})` : '☆+ cards'], [String(p.crowns), p.crowns === 1 ? 'crown' : 'crowns'], [String(p.only.length), 'cards no other trainer has']];
      prof.replaceChildren(el('div', { class: 'plate xt-card' },
        el('div', { class: 'xt-id' }, avatar(p.ai, 'big'), el('div', {}, el('div', { class: 'eyebrow', text: 'Trainer' + (accounts.rank[p.ai] ? ' #' + accounts.rank[p.ai] + ' by creation order' : '') }), el('h3', { text: p.alias }), p.god_packs ? el('span', { class: 'xt-gp', text: p.god_packs > 1 ? `${p.god_packs} god packs` : 'Opened a god pack' }) : null)),
        el('div', { class: 'stats xt-stats' }, statsRow.map(([v, l]) => el('div', { class: 'stat' }, el('div', { class: 'v', text: v }), el('div', { class: 'l', text: l })))),
        el('div', { class: 'plate-title', text: 'Binder highlights' }), el('div', { class: 'plate-sub', text: p.only.length ? 'Cards that exist nowhere else in the fleet come first, then the rarest pulls. Click a card for its full story.' : 'The rarest cards this trainer pulled. Click a card for its full story.' }), bestRow,
        hits.length ? el('div', { class: 'plate-title', style: 'margin-top:22px', text: `Every star-or-better pull (${hits.length})` }) : null,
        hits.length ? el('div', { class: 'plate-sub', text: 'In the order they were pulled. Click one to open the pack it came out of.' }) : null, hits.length ? hitBox : null,
        el('div', { class: 'plate-title', style: 'margin-top:22px', text: 'Every pack, in order' }), el('div', { class: 'plate-sub', text: 'Each column is one pack, coloured by rarity. Hover to see it, click to open it.' }), strip));
      if (scroll && innerWidth < 860) prof.scrollIntoView({ block: 'start', behavior: 'smooth' });
    };
    [q, so].forEach(x => x.addEventListener('input', draw)); draw();
    const first = L0.filter(p => p.luck_pct != null).sort((a, b) => b.luck_pct - a.luck_pct)[0] || L0[0];
    profile(first.anon_id, false);
    trainerProfile = (aid) => { q.value = ''; draw(); profile(aid, false); };
  }
  let trainerProfile = null;

  // ---------- pack viewer ----------
  let viewerAt = 0, redrawViewer = null;
  const KIND = { 2: 'God pack', 4: 'Themed rare pack', 5: 'Pity pack', 3: 'Deluxe bonus', 6: '6-card bonus pack' };
  function viewer(host) {
    const idx = el('input', { type: 'number', id: 'pv-n', min: 1, max: P.n, value: viewerAt + 1, 'aria-label': 'Pack number' });
    const prev = el('button', { class: 'btn ghost', type: 'button', text: '←', 'aria-label': 'Previous pack' }), next = el('button', { class: 'btn ghost', type: 'button', text: '→', 'aria-label': 'Next pack' });
    const rnd = el('button', { class: 'btn', type: 'button', text: 'Random pack' });
    const jump = el('select', { id: 'pv-jump', 'aria-label': 'Jump to a special pack' }, el('option', { value: '', text: 'Jump to a special pack…' }));
    const groups = {};
    for (let i = 0; i < P.n; i++) { const k = P.kind[i]; if (k === 2 || k === 4 || k === 5 || k === 3) (groups[k] || (groups[k] = [])).push(i); }
    [2, 4, 3, 5].forEach(k => { if (!groups[k]) return; const og = el('optgroup', { label: `${KIND[k]}s (${groups[k].length})` }); groups[k].slice(0, 300).forEach(i => og.append(el('option', { value: i, text: `${accounts.alias[P.acct[i]]} · ${PPA.catalog.packById[P.packId(P.pack[i])]?.name || ''}` }))); jump.append(og); });
    const body = el('div', { class: 'xv-body' });
    host.append(
      el('div', { class: 'xt-head' }, el('div', { class: 'eyebrow', text: 'Every pack' }), el('h2', { text: `All ${fmt(P.n)} packs, in the order we opened them` }),
        el('p', { class: 'lede', text: 'Step through the run one pack at a time, or jump straight to the god packs.' })),
      el('div', { class: 'plate xv' }, el('div', { class: 'controls xv-ctl' }, prev, el('label', { class: 'small xv-n' }, 'Pack ', idx, el('span', { class: 'num', text: ` of ${fmt(P.n)}` })), next, rnd, jump), body));
    const draw = () => {
      const i = viewerAt; idx.value = i + 1;
      const pk = PPA.catalog.packById[P.packId(P.pack[i])];
      const cs = P.cardsOf(i);
      const kind = KIND[P.kind[i]];
      const ai = P.acct[i];
      const row = el('div', { class: 'xv-row', style: `--n:${cs.length}` });
      cs.forEach(c => {
        const r = card(c)?.r || 100, e = statFor(c), one = e && e.pull && e.copies === 1;
        const b = el('button', { type: 'button', class: 'xb-card mini' + (r >= 500 ? ' star' : '') + (one ? ' one' : ''), style: `--rc:var(--r-${rg(r)})`, 'aria-label': card(c)?.n || c },
          el('span', { class: 'xb-art' }, cardArt(c, { size: 'm' }), el('span', { class: 'xb-shine', 'aria-hidden': 'true' }), one ? el('span', { class: 'xb-ribbon', text: 'Fleet\'s only copy' }) : null),
          el('span', { class: 'xb-cap' }, el('span', { class: 'xb-name', text: card(c)?.n || c }), el('span', { class: 'xb-meta' }, rIcons(r)), e ? el('span', { class: 'xb-nums small' }, `${plural(e.copies, 'copy', 'copies')} in the fleet`) : null));
        b.onclick = () => openCard(c, { ctx: cs }); row.append(b);
      });
      const who = el('button', { type: 'button', class: 'xv-who', onclick: () => api.showTrainer(P.idx.accounts[ai]) }, avatar(ai), el('b', { text: accounts.alias[ai] }));
      body.replaceChildren(
        el('div', { class: 'xv-head', style: pk ? `--c1:${pk.c1};--c2:${pk.c2}` : '' },
          pk ? el('img', { class: 'xv-pack', src: `art/packs/pack-art_${pk.exp}.webp`, alt: '' }) : null,
          el('div', { class: 'xv-meta' }, el('div', { class: 'xv-name', text: pk?.name || 'Pack' }), el('div', { class: 'small' }, 'opened by ', who),
            el('div', { class: 'num small', text: PPA.when(P.t[i]) }),
            kind ? el('span', { class: 'xv-kind k' + P.kind[i], text: kind }) : null)),
        row,
        kind ? el('p', { class: 'small', style: 'margin:12px 0 0', text: `${kind}. Rolled from a special table.` }) : '');
    };
    const go = (k) => { viewerAt = Math.max(0, Math.min(P.n - 1, k)); draw(); if (!host.hidden) nav('#pack=' + (viewerAt + 1), true); };
    prev.onclick = () => go(viewerAt - 1); next.onclick = () => go(viewerAt + 1);
    rnd.onclick = () => go(Math.floor(Math.random() * P.n));
    idx.onchange = () => go((+idx.value || 1) - 1);
    jump.onchange = () => { if (jump.value !== '') go(+jump.value); };
    host.addEventListener('keydown', e => { if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return; if (e.key === 'ArrowLeft') go(viewerAt - 1); else if (e.key === 'ArrowRight') go(viewerAt + 1); });
    host.tabIndex = -1;
    redrawViewer = draw; draw();
  }
  const openPack = (i, push = true) => { viewerAt = Math.max(0, Math.min(P.n - 1, i)); PPA.setView('explore'); show('viewer'); nav('#pack=' + (viewerAt + 1), !push); redrawViewer && redrawViewer(); scrollTo({ top: 0 }); };

  let initP;
  const api = {
    init() {
      return initP || (initP = (async () => {
        inited = true;
        root().replaceChildren(el('p', { class: 'wrap small', style: 'padding-block:40px', text: 'Loading the binder…' }));
        let lp;
        [odds, P, accounts, lp] = await Promise.all([json('data/odds.json'), Openings.load(), json('data/accounts.json'), json('data/f/luck/all_players.json')]);
        players = lp.data.map(r => Object.fromEntries(lp.columns.map((c, i) => [c, r[i]])));
        await buildModel();
        countPulls();
        build();
        const want = ALIAS[location.hash.slice(3)] || location.hash.slice(3);
        show(location.hash.startsWith('#x-') && SECTIONS.some(x => x[0] === want) ? want : 'binder');
      })());
    },
    openPack: async (i) => { await api.init(); openPack(i); },
    showTrainer: async (aid, push = true) => { await api.init(); if (!/^T\d+$/.test(aid)) aid = P.idx.accounts[accounts.alias.findIndex(a => a.toLowerCase() === String(aid).toLowerCase().replace(/[-+]/g, ' '))] || aid; PPA.setView('explore'); show('trainers'); nav('#trainer=' + aid, !push); trainerProfile && trainerProfile(aid); scrollTo({ top: 0 }); },
    openCard: async (cid, opts) => { await api.init(); openCard(cid, opts); },
    route: async (h) => {
      await api.init();
      if (h.startsWith('card=')) { const id = decodeURIComponent(h.slice(5)); if ($$('.xb-sec').every(x => x.hidden)) show('binder'); if (card(id)) openCard(id, { push: false }); return; }
      closeSilently();
      if (h.startsWith('trainer=')) return api.showTrainer(decodeURIComponent(h.slice(8)), false);
      if (h.startsWith('pack=')) return openPack((parseInt(h.slice(5), 10) || 1) - 1, false);
      if (h.startsWith('x-')) {
        const [k0, qs] = h.split('?'); const k = ALIAS[k0.slice(2)] || k0.slice(2);
        if (!SECTIONS.some(x => x[0] === k)) return;
        show(k);
        if (k === 'binder' && api.binderState) api.binderState(Object.fromEntries(new URLSearchParams(qs || '')));
      }
    },
  };
  return api;
})();
