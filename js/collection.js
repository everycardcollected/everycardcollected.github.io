// Chapter 10 · The collection: most-copied cards, single copies and the credits roll.
(() => {
  const S = window.Story;
  const { el, json, fmt, tip, card, cardArt } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const hoverCard = (node, id, extra) => {
    node.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, id, extra)));
    node.addEventListener('pointermove', tip.move); node.addEventListener('pointerleave', tip.hide);
    node.style.cursor = 'pointer';
    node.addEventListener('click', () => window.Explore && Explore.openCard && Explore.openCard(id));
  };
  const tile = (id, big, small) => {
    const c = card(id) || {};
    const a = cardArt(id, { holo: c.r >= 500 }); hoverCard(a, id);
    return el('figure', { class: 'v4-tile' }, a, el('figcaption', {}, el('b', { class: 'v4-big', text: big }), el('span', { text: small })));
  };

  // ---------- finale: the collection ----------
  S.finaleMost = async (node) => {
    const [d] = await Promise.all([F('cards/holdings'), PPA.loadCatalog()]);
    const g = el('div', { class: 'v4-tiles' });
    d.most_copies.slice(0, 12).forEach((r, i) => g.append(tile(r.card_id, fmt(r.copies) + ' copies', `${i + 1}. ${r.name} · in all ${fmt(r.owners)} accounts`)));
    node.replaceChildren(g);
  };
  S.finaleSingles = async (node) => {
    const [d] = await Promise.all([F('cards/holdings'), PPA.loadCatalog()]);
    const g = el('div', { class: 'v4-tiles' });
    const nick = { UR: 'Crown', S: '1-shiny', SSR: '2-shiny', SAR: '2-star', SR: '2-star', IM: '3-star' };
    d.single_copy.slice(0, 12).forEach(r => g.append(tile(r.card_id, r.name, nick[r.rarity] || r.rarity)));
    const parts = Object.entries(d.single_by_rarity).map(([k, v]) => `${v} ${nick[k] || k}`).join(', ');
    node.replaceChildren(g, el('p', { class: 'plate-foot', text: `All ${d.single_copy_count} single-copy cards are star or better: ${parts}.` }));
  };
})();

(() => {
  const S = window.Story;
  const { el } = PPA;
  const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  const rng = (seed) => () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const whenSeen = (node, fn, threshold = .35) => {
    if (!('IntersectionObserver' in window)) return fn();
    const io = new IntersectionObserver(es => { if (es.some(e => e.isIntersecting)) { io.disconnect(); fn(); } }, { threshold });
    io.observe(node);
  };
  const img = (src, attrs = {}) => { const i = el('img', { src, alt: '', loading: 'lazy', decoding: 'async', ...attrs }); i.onerror = () => i.remove(); return i; };

  S.serverCredits = async (node) => {
    const cards = [['L03', -26], ['L02', -13], ['L01', 0], ['L04', 13], ['M01', 26]];
    const fan = el('div', { class: 'v3server-fan', 'aria-hidden': 'true' });
    cards.forEach(([c, a], i) => { const w = el('div', { class: 'v3server-fcard', style: `--a:${a}deg;--i:${i};--z:${i === 2 ? 5 : 4 - Math.abs(i - 2)}` }, img(`art/ui/title/title-card_${c}.webp`, { loading: 'eager' })); fan.append(w); });
    const lillie = el('div', { class: 'v3server-float', 'aria-hidden': 'true' }, img('art/ui/title/title-card_M05.webp'));
    const photo = el('div', { class: 'v3server-photo', 'aria-hidden': 'true' }, img('art/ui/pikachu.webp'));
    const R = rng(5); const spark = el('div', { class: 'v3server-sparks', 'aria-hidden': 'true' });
    for (let i = 0; i < 16; i++) { const c = ['white', 'pink', 'blue'][i % 3]; const s = img(`art/ui/fx-glitter-${c}.webp`); s.style.cssText = `left:${(R() * 96).toFixed(1)}%;top:${(R() * 92).toFixed(1)}%;--s:${(.3 + R() * .55).toFixed(2)};--dl:${(R() * 4).toFixed(2)}s;--du:${(2.4 + R() * 2.6).toFixed(2)}s`; spark.append(s); }
    const faces = ['charizard', 'eevee', 'mewtwo', 'pikachu', 'slowpoke', 'snorlax'];
    const cast = el('div', { class: 'v3server-stack small' }, ...faces.map((f, i) => { const a = img(`art/ui/profile/profile-icon-${f}.webp`); a.style.setProperty('--i', i); return a; }), el('span', { class: 'v3server-more', text: '+1,494' }));
    const nums = [['60,689', 'packs'], ['302,600', 'cards'], ['3,480', 'distinct cards'], ['170.6 h', 'to catch them all']];
    const txt = el('div', { class: 'v3server-ctext' },
      el('div', { class: 'v3server-kick', text: 'Fin' }),
      el('h3', { class: 'v3server-ctitle' }, 'Every card, ', el('span', { class: 'v3server-holo', text: 'in someone\'s binder.' })),
      el('div', { class: 'v3server-cnums' }, ...nums.map(([v, l]) => el('div', {}, el('b', { text: v }), el('span', { text: l })))),
      el('div', { class: 'v3server-cast-row' }, cast, el('span', { class: 'small', text: 'Starring 1,500 anonymous trainers' })),
      el('p', { class: 'small', style: 'margin:14px 0 0' }, 'Thanks for reading. The odds were honest, the pity counter is real, and the pack you tap was never the one that mattered.'));
    const bg = el('div', { class: 'v3server-cbg', 'aria-hidden': 'true' }, img('art/ui/pikachu-ex.webp'));
    const stage = el('div', { class: 'v3server-stage' }, bg, spark, photo, lillie, fan);
    node.append(stage, txt);
    if (!reduced()) {
      node.addEventListener('pointermove', (e) => { const r = node.getBoundingClientRect(); node.style.setProperty('--px', ((e.clientX - r.left) / r.width - .5).toFixed(3)); node.style.setProperty('--py', ((e.clientY - r.top) / r.height - .5).toFixed(3)); });
      node.addEventListener('pointerleave', () => { node.style.setProperty('--px', 0); node.style.setProperty('--py', 0); });
    }
    whenSeen(node, () => node.classList.add('in'), .25);
  };
})();
