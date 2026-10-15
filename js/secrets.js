// Chapter 8 · What happens when you tap Open: the pack sequence, energy disguise, findings list and the Go server.
(() => {
  const { $, el, json, card } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  // ---------- 10 · secrets ----------
  // drawn when it nears the screen
  PPA.lazy($('#energy-grid') || document.createElement('i'), async (host) => {
    const d = await F('internals/insight_energy_mapping');
    const icon = (e) => `art/icons/energy/energy-${e.toLowerCase()}.webp`;
    d.data.filter(r => r.energy).forEach(r => {
      const orb = el('span', { class: 'orb', style: `background:${r.energy_color}` });
      const img = el('img', { src: icon(r.energy), alt: '', style: 'width:34px;height:34px' }); img.onerror = () => img.remove();
      host.append(el('div', { class: 'energy', style: r.ever_sent ? '' : 'opacity:.55;border-style:dashed' }, el('span', { style: 'position:relative;width:34px;height:34px;flex:none' }, orb, img), el('div', { style: 'min-width:0' }, el('div', { class: 't', text: r.energy }), el('div', { class: 'm', text: r.ever_sent ? r.detects : 'Decoy, never set' }), el('div', { class: 'small', text: r.plain_language }))));
      orb.style.position = img.style.position = 'absolute'; orb.style.inset = img.style.inset = '0';
    });
  });
  // drawn when it nears the screen
  PPA.lazy($('#secrets-grid') || document.createElement('i'), async (host) => {
    const d = await F('internals/secrets');
    // Curated: durable, player-relevant, and not already told elsewhere in the story.
    const KEEP = ['tutorial-sets-flair-route', 'deterministic-ml-ai', 'cpu-sees-decklists', 'deluxe-favours-regular-print', 'lucky-and-bonus-odds', 'ranked-bots', 'coin-flip-theater', 'wonder-pay-at-snoop', 'trade-vs-gift-flair', 'analytics-pack-gesture'];
    const SEC_IC = { Battle: 'icons/stamina/stamina-pvp.webp', 'Wonder Pick': 'ui/wonder-pick-magnifier.webp', Collection: 'icons/items/emblem-ticket.webp', Social: 'icons/stamina/stamina-trade.webp', Packs: 'icons/items/premium-ticket.webp', Economy: 'icons/items/pokegold.webp', Telemetry: 'icons/stamina/stamina-challenge.webp', 'Easter egg': 'ui/event-poster-rocket.webp' };
    const items = KEEP.map(id => d.data.find(s => s.id === id)).filter(Boolean);
    const cats = ['All', ...new Set(items.map(s => s.category))];
    let on = 'All';
    const filt = $('#secret-filter'); const seg = el('div', { class: 'seg', role: 'group', 'aria-label': 'Category' }); filt && filt.append(seg);
    const TOP = ['tutorial-sets-flair-route', 'deterministic-ml-ai', 'cpu-sees-decklists', 'deluxe-favours-regular-print'];
    items.sort((a, b) => (TOP.includes(b.id) - TOP.includes(a.id)) || TOP.indexOf(a.id) - TOP.indexOf(b.id));
    let open = false, q = '';
    const search = el('input', { type: 'search', class: 'sec-q', placeholder: 'Search the rest…', 'aria-label': 'Search findings' });
    search.oninput = () => { q = search.value.trim().toLowerCase(); render(); };
    const more = el('button', { type: 'button', class: 'btn ghost sec-more' });
    more.onclick = () => { open = !open; render(); if (open) search.focus({ preventScroll: true }); };
    host.after(el('div', { class: 'sec-tools' }, more, search));
    const render = () => {
      host.replaceChildren();
      const pool = items.filter(s => (on === 'All' || s.category === on) && (!q || (s.title + ' ' + s.tldr + ' ' + s.category).toLowerCase().includes(q)));
      const shown = open ? pool : pool.filter(s => TOP.includes(s.id));
      more.textContent = open ? 'Show fewer' : `Show all ${items.length} findings`;
      search.hidden = !open;
      shown.forEach(s => {
        host.append(el('article', { class: 'secret' }, el('div', { class: 'meta' }, el('img', { class: 'sec-ic', src: 'art/' + (SEC_IC[s.category] || 'icons/items/pack-icon.webp'), alt: '' }), el('span', { text: s.category }), el('span', { class: 'conf ' + s.confidence, text: s.confidence })), el('h4', { text: s.title }), el('p', { text: s.tldr }), s.player_impact ? el('p', { class: 'small', text: '→ ' + s.player_impact }) : null));
      });
    };
    cats.forEach(c => { const b = el('button', { type: 'button', 'aria-pressed': String(c === on), text: c }); b.onclick = () => { on = c; [...seg.children].forEach(x => x.setAttribute('aria-pressed', String(x === b))); render(); }; seg.append(b); });
    render();
  });

  // ---------- 11 · server ----------
  const seq = (host, steps) => steps.forEach(([who, txt]) => host.append(el('div', { class: 'seq-row ' + who.toLowerCase() }, el('div', { class: 'who', text: who }), el('div', { text: txt }))));
  if ($('#seq-pack')) seq($('#seq-pack'), [
    ['You', 'Tap a pack in the carousel. Nothing is sent yet, and which pack you tapped is never sent at all.'],
    ['Client', 'Sends a purchase: product id, how many, which stamina or hourglasses to spend, and a consistency token.'],
    ['Server', 'Rolls the pack table first: normal, 6-card bonus, god pack, themed rare pack, or the pity table if your counter is at 12.'],
    ['Server', 'Rolls each card slot from that table\'s published odds, independently, with repeats allowed.'],
    ['Server', 'Shuffles the first four cards, so the 4th-slot hit can land anywhere in positions 1–4 (25% each over 56,435 packs). The 5th card always comes last.'],
    ['Server', 'Updates your pity counter and Pack Points, then replies with the cards and the table it used, about half a second after stamping the order.'],
    ['Client', 'Builds the opening scene from the cards it already has. If the pack holds ◆◆◆◆+, it may show it backwards (6%) or add a glow.'],
    ['You', 'Swipe to open. The result was fixed two steps ago.'],
  ]);
})();

(() => {
  const S = window.Story;
  const { el, json } = PPA;
  const F = (p) => json('data/f/' + p + '.json');
  const rows = (t, title, rs) => Charts.tipRows(t, title, rs);
  const img = (src, attrs = {}) => { const i = el('img', { src, alt: '', loading: 'lazy', decoding: 'async', ...attrs }); i.onerror = () => i.remove(); return i; };

  // ================= 11 · SERVER =================
  // --- The token that says Go: what we measured, and only that.
  // We know how many tokens each process minted, and how many different processes five accounts reached.
  // We do not know which account hit which process, so no links are drawn.
  S.serverGob = async (node) => {
    const d = await F('server-inference/gob_process_fingerprints');
    const procs = d.data.type_id_counts.map((p, i) => ({ ...p, i })).sort((a, b) => b.count - a.count);
    procs.forEach((p, j) => { p.rank = j + 1; });
    const total = d3.sum(procs, p => p.count);
    const accts = d.data.distinct_per_account.slice().sort((a, b) => a - b);
    const faces = ['slowpoke', 'eevee', 'charizard', 'mewtwo', 'pikachu'];
    const tm = el('div', { class: 'v5gob-tm' });
    const acc = el('div', { class: 'v5gob-acc' });
    node.replaceChildren(el('div', { class: 'v5gob' },
      el('div', { class: 'v5gob-panel' }, el('div', { class: 'v5gob-k', text: `${total} tokens, by the process that made them` }), tm),
      el('div', { class: 'v5gob-panel' }, el('div', { class: 'v5gob-k', text: 'Five accounts that sent 4 or more' }), acc)));
    const draw = () => {
      const w = Charts.W(tm), h = w < 560 ? 240 : 210;
      const svg = Charts.svgOf(tm, w, h).attr('aria-label', `Treemap: ${procs.length} server processes, sized by the ${total} tokens they made. The biggest made ${procs[0].count}.`);
      const root = d3.hierarchy({ children: procs }).sum(p => p.count || 0);
      d3.treemap().size([w, h]).paddingInner(2).round(true).tile(d3.treemapSquarify.ratio(1.3))(root);
      const g = svg.append('g').selectAll('g').data(root.leaves()).join('g').attr('transform', n => `translate(${n.x0},${n.y0})`);
      g.append('rect').attr('width', n => Math.max(0, n.x1 - n.x0)).attr('height', n => Math.max(0, n.y1 - n.y0)).attr('rx', 4)
        .style('fill', 'var(--r-dia)').style('fill-opacity', n => .25 + .6 * Math.sqrt(n.data.count / procs[0].count)).style('stroke', 'var(--r-dia)').style('stroke-opacity', .6);
      g.filter(n => n.x1 - n.x0 > 30 && n.y1 - n.y0 > 22).append('text').attr('x', 7).attr('y', 17).style('fill', 'var(--ink)').style('font', '700 12px var(--font-data)').style('pointer-events', 'none').text(n => n.data.count);
      g.filter(n => n.x1 - n.x0 > 150 && n.y1 - n.y0 > 44).append('text').attr('x', 7).attr('y', 33).style('fill', 'var(--ink-2)').style('font', '11px var(--font-body)').style('pointer-events', 'none').text(n => `tokens from process #${n.data.rank}`);
      Charts.hover(g, (t, n) => rows(t, `Server process #${n.data.rank}`, [['Tokens it made', `${n.data.count} of ${total}`], ['Share', (n.data.count / total * 100).toFixed(1) + '%'], ['Fingerprint (gob type id)', n.data.gob_type_id]]));
    };
    acc.replaceChildren(...accts.map((k, i) => el('div', { class: 'v5gob-row', tabindex: '0', 'aria-label': `Account ${'ABCDE'[i]} reached ${k} different processes` },
      el('img', { class: 'v5gob-av', src: `art/ui/profile/profile-icon-${faces[i]}.webp`, alt: '' }),
      el('span', { class: 'v5gob-name', text: 'Account ' + 'ABCDE'[i] }),
      el('span', { class: 'v5gob-slots', 'aria-hidden': 'true' }, Array.from({ length: procs.length }, (_, j) => el('i', { class: j < k ? 'on' : '' }))),
      el('b', { class: 'v5gob-n num' }, String(k), el('small', { text: ' of 23' })))));
    draw(); Charts.redrawOnResize(tm, draw);
  };
})();
