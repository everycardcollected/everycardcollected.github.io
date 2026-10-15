// Chapter 7 · Which pack? The pack inspector and set completion.
(() => {
  const S = window.Story;
  const { el, json, fmt, css, tip, BY_CODE } = PPA;
  const F = (p) => json('data/f/' + p + '.json');

  // ---------- rarity vocabulary ----------
  const ORDER = ['C', 'U', 'R', 'RR', 'AR', 'SR', 'SAR', 'SR_AND_SAR', 'IM', 'S', 'SSR', 'UR'];
  const RANK = Object.fromEntries(ORDER.map((k, i) => [k, i]));
  const RARE_FROM = RANK.RR, STAR_FROM = RANK.AR;
  const SHADE = { C: ['dia', 38], U: ['dia', 64], R: ['dia', 100], RR: ['rr', 100], AR: ['star', 100], SR: ['star2', 72], SAR: ['star2', 86], SR_AND_SAR: ['star2', 80], IM: ['star2', 100], S: ['shiny', 72], SSR: ['shiny', 100], UR: ['crown', 100] };
  const fillOf = (k) => { const [g, a] = SHADE[k] || SHADE.C; return a >= 100 ? `var(--r-${g})` : `color-mix(in oklab, var(--r-${g}) ${a}%, var(--surface))`; };
  const ICON = { C: ['diamond', 1], U: ['diamond', 2], R: ['diamond', 3], RR: ['diamond', 4], AR: ['star', 1], SR: ['star', 2], SAR: ['star', 2], SR_AND_SAR: ['star', 2], IM: ['star', 3], S: ['shiny', 1], SSR: ['shiny', 2], UR: ['crown', 1] };
  const SYM = (k) => k === 'SR_AND_SAR' ? '☆☆' : (BY_CODE[k]?.sym || k);
  const LABEL = (k) => k === 'SR_AND_SAR' ? 'Super / Special Art Rare' : (BY_CODE[k]?.label || k);
  const ricons = (k, h = 14) => {
    const [n, c] = ICON[k] || ['diamond', 1];
    const s = el('span', { class: 'v3packs-ri', title: LABEL(k), 'aria-label': SYM(k) + ' ' + LABEL(k), role: 'img' });
    for (let i = 0; i < c; i++) s.append(el('img', { src: `art/icons/rarity/rarity-${n}.webp`, alt: '', style: `height:${h}px` }));
    return s;
  };
  const isStar = (k) => RANK[k] >= STAR_FROM;
  const sum = (o, f) => Object.entries(o).reduce((a, [k, v]) => a + (f(k) ? v : 0), 0);
  const pctS = (x) => x == null ? '–' : x === 0 ? '0%' : x >= .1 ? (x * 100).toFixed(1) + '%' : x >= .01 ? (x * 100).toFixed(2) + '%' : (x * 100).toFixed(3).replace(/0+$/, '') + '%';
  // ---------- pack art (reuses the shelf mapping art/packs/pack-art_<expansion>.webp; multi-pack art is cropped) ----------
  const CROP = { AN001_0020: 0, AN001_0010: .49, AN001_0030: 1, BN001_0020: 0, BN001_0010: .49, BN001_0030: 1, AN003_0010: 0, AN003_0020: 1, AN006_0010: 0, AN006_0020: 1, AN009_0010: 0, AN009_0020: 1 };
  const packArt = (packId, exp, cls = '') => {
    const x = CROP[packId.slice(0, 10)];
    const three = ['A1', 'B1'].includes(exp), clip = three && x === 0 ? ';clip-path:inset(0 15% 0 0)' : three && x === 1 ? ';clip-path:inset(0 0 0 15%)' : '';
    return el('span', { class: 'v3packs-art ' + cls, role: 'img', 'aria-label': '', style: `background-image:url(art/packs/pack-art_${exp}.webp);background-position:${x == null ? 50 : x * 100}% 50%${clip}` });
  };
  const badgeImg = (exp, cls = 'v3packs-badge') => { const i = el('img', { class: cls, src: `art/logos/expansion-badge_${exp}.webp`, alt: exp, loading: 'lazy' }); i.onerror = () => { if (!i.dataset.r) { i.dataset.r = 1; i.src = i.src + '?r=1'; } else i.replaceWith(el('span', { class: cls + ' txt', text: exp })); }; return i; };
  const shortName = (n) => n.includes(':') ? n.split(':')[1].trim().replace(/^Mega /, 'M. ') : n.replace("Team Rocket's Ambition", "Rocket's Ambition");
  const hoverTip = (node, build) => { node.addEventListener('pointerenter', e => tip.show(e, build)); node.addEventListener('pointermove', tip.move); node.addEventListener('pointerleave', tip.hide); node.addEventListener('focus', () => { const r = node.getBoundingClientRect(); tip.show({ clientX: r.right, clientY: r.top }, build); }); node.addEventListener('blur', tip.hide); };
  const rows = (t, title, kv) => Charts.tipRows(t, title, kv);
  const kv = (t, pairs) => pairs.forEach(([k, v]) => t.append(el('div', {}, el('span', { class: 'k', text: k + ' ' }), String(v))));
  // Expand a table's slots: god-pack tables list one shared slot.
  const slotsOf = (t) => t.slots.length >= t.n_cards ? t.slots : Array.from({ length: t.n_cards }, (_, i) => t.slots[Math.min(i, t.slots.length - 1)]);
  // ======================================================================
  // PACK INSPECTOR (simplified: what each card can be, did it match, chase cards)
  // ======================================================================
  const PNAME = { C: '1-diamond', U: '2-diamond', R: '3-diamond', RR: '4-diamond', AR: '1-star', SR: '2-star', SAR: '2-star', SR_AND_SAR: '2-star', IM: '3-star', S: 'shiny', SSR: '2-shiny', UR: 'crown' };
  // merge SR + SAR into one "2-star" bucket so players see one name per colour
  const merge = (probs) => { const o = {}; Object.entries(probs).forEach(([k, v]) => { if (v <= 0) return; const kk = k === 'SR' || k === 'SAR' ? 'SR_AND_SAR' : k; o[kk] = (o[kk] || 0) + v; }); return o; };
  S.packsInspector = async (node) => {
    const [prof, brk] = await Promise.all([F('eras/pack_profiles'), F('odds-audit/pack_slot_breakdown'), PPA.loadCatalog()]);
    const packs = prof.data;
    const audit = {}; brk.data.forEach(r => { (audit[r.pack] ||= {})[r.group] = r; });
    let cur = packs.find(p => p.pack_id === 'BN005_0010_00_000') || packs[0];

    node.classList.add('v3packs-insp');
    const picker = el('div', { class: 'v3packs-picker', role: 'listbox', 'aria-label': 'Choose a pack', tabindex: -1 });
    const tiles = new Map();
    let lastEra = null;
    packs.forEach(p => {
      const era = p.expansion[0];
      if (era !== lastEra) { picker.append(el('div', { class: 'v3packs-era', 'aria-hidden': 'true' }, el('span', { text: 'Series ' + era }))); lastEra = era; }
      const b = el('button', { type: 'button', class: 'v3packs-tile', role: 'option', 'aria-selected': 'false', tabindex: -1, 'aria-label': p.name, style: `--c1:${p.color_left};--c2:${p.color_right}` },
        packArt(p.pack_id, p.expansion), badgeImg(p.expansion), el('span', { class: 'v3packs-tn', text: shortName(p.name) }));
      b.onclick = () => select(p, true);
      tiles.set(p.pack_id, b); picker.append(b);
    });
    picker.addEventListener('keydown', e => {
      if (!['ArrowRight', 'ArrowLeft', 'Home', 'End'].includes(e.key)) return;
      e.preventDefault();
      const i = packs.indexOf(cur), j = e.key === 'Home' ? 0 : e.key === 'End' ? packs.length - 1 : Math.max(0, Math.min(packs.length - 1, i + (e.key === 'ArrowRight' ? 1 : -1)));
      select(packs[j], true); tiles.get(packs[j].pack_id).focus();
    });
    const detail = el('div', { class: 'v3packs-detail', 'aria-live': 'polite' });
    node.append(picker, el('div', { class: 'v3packs-hint', text: '← scroll or use arrow keys →' }), detail);

    const select = (p, user) => {
      cur = p;
      tiles.forEach((b, id) => { const on = id === p.pack_id; b.setAttribute('aria-selected', String(on)); b.tabIndex = on ? 0 : -1; });
      const b = tiles.get(p.pack_id);
      if (b) { const L = b.offsetLeft - picker.offsetLeft, R = L + b.offsetWidth; if (L < picker.scrollLeft + 20 || R > picker.scrollLeft + picker.clientWidth - 20) picker.scrollTo({ left: L - picker.clientWidth / 2 + b.offsetWidth / 2, behavior: user ? 'smooth' : 'auto' }); }
      render();
    };
    document.addEventListener('v3packs:select', e => { const p = packs.find(x => x.pack_id === e.detail); if (p) { select(p, true); node.closest('.plate')?.scrollIntoView({ behavior: 'smooth', block: 'start' }); } });

    // ---- the card rows: normal pack, plus the bonus card when the pack has one ----
    const cardRows = (p) => {
      const normal = p.tables.find(t => t.kind === 'NORMAL'), plus = p.tables.find(t => t.kind === 'PLUS1');
      const slots = slotsOf(normal).map((s, i) => ({ label: `Card ${i + 1}`, probs: merge(s.rarity_probs) }));
      // collapse identical leading slots (cards 1–3 are usually all 1-diamond)
      const out = [];
      slots.forEach((s, i) => {
        const prev = out[out.length - 1], key = JSON.stringify(s.probs);
        if (prev && prev.key === key && Object.keys(s.probs).length === 1) { prev.to = i + 1; prev.label = `Cards ${prev.from}–${i + 1}`; }
        else out.push({ ...s, key, from: i + 1, to: i + 1 });
      });
      if (plus) { const last = plus.slots[plus.slots.length - 1]; out.push({ label: 'Bonus card', sub: `in 1 of ${fmt(Math.round(1 / plus.p))} packs`, probs: merge(last.rarity_probs), bonus: true }); }
      return out;
    };

    const render = () => {
      const p = cur, m = p.metrics, emp = p.empirical || {}, A = audit[p.pack_id] || {};
      detail.replaceChildren(); detail.classList.remove('in'); void detail.offsetWidth; detail.classList.add('in');

      // hero
      const art = packArt(p.pack_id, p.expansion, 'big');
      const shine = el('span', { class: 'v3packs-shine' });
      const stage = el('div', { class: 'v3packs-stage', style: `--c1:${p.color_left};--c2:${p.color_right}` }, art, shine);
      stage.addEventListener('pointermove', e => { const r = stage.getBoundingClientRect(), x = (e.clientX - r.left) / r.width - .5, y = (e.clientY - r.top) / r.height - .5; art.style.transform = `rotateY(${x * 22}deg) rotateX(${-y * 18}deg)`; shine.style.setProperty('--mx', (x + .5) * 100 + '%'); shine.style.setProperty('--my', (y + .5) * 100 + '%'); stage.classList.add('hot'); });
      stage.addEventListener('pointerleave', () => { art.style.transform = ''; stage.classList.remove('hot'); });
      const date = new Date(p.release + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
      const key = (v, l) => el('div', { class: 'v3packs-key' }, el('b', { text: v }), el('span', { text: l }));
      const hero = el('div', { class: 'v3packs-hero' }, stage,
        el('div', { class: 'v3packs-hid' },
          el('div', { class: 'v3packs-id' }, badgeImg(p.expansion), el('span', { text: date })),
          el('h4', { class: 'v3packs-name', text: p.name }),
          el('div', { class: 'v3packs-keys' },
            key(fmt(p.pool_size), 'cards in the pack'),
            key(pctS(m.p_any_star), 'of packs hold a 1-star or better'),
            key(emp.n ? fmt(emp.n) : '0', 'opened by our fleet'))));

      // 1. what can each card be
      const rowsHost = el('div', { class: 'v3packs-cards' });
      const present = new Set();
      cardRows(p).forEach(r => {
        const ks = Object.keys(r.probs).sort((a, b) => RANK[a] - RANK[b]);
        ks.forEach(k => present.add(k));
        const star = sum(r.probs, isStar);
        const bar = el('div', { class: 'v3packs-bar' });
        ks.forEach(k => {
          const v = r.probs[k];
          const seg = el('i', { class: SHADE[k][1] < 100 ? 'lt' : null, style: `flex:${v} 0 0;background:${fillOf(k)}`, tabindex: 0 });
          if (v >= .14) seg.append(ricons(k, 12), el('small', { text: v >= .99 ? PNAME[k] : pctS(v) }));
          else if (v >= .06) seg.append(ricons(k, 11));
          hoverTip(seg, t => { t.append(el('b', { text: `${r.label}: ${PNAME[k]}` }), el('div', {}, ricons(k, 13))); kv(t, [['Chance', pctS(v)], ...(p.pool_by_rarity[k] ? [['Cards like this in the pack', p.pool_by_rarity[k]]] : [])]); });
          bar.append(seg);
        });
        const right = ks.length === 1 ? el('span', { class: 'muted', text: 'always' }) : star ? el('span', {}, el('b', { text: pctS(star) }), el('em', { text: ' 1-star+' })) : el('span', {}, el('b', { text: pctS(sum(r.probs, k => RANK[k] >= RARE_FROM)) }), el('em', { text: ' 4-dia.+' }));
        rowsHost.append(el('div', { class: 'v3packs-crow' + (r.bonus ? ' bonus' : '') },
          el('div', { class: 'v3packs-rl' }, el('b', { text: r.label }), r.sub ? el('span', { text: r.sub }) : null), bar, el('div', { class: 'v3packs-rv' }, right)));
      });
      const legend = el('div', { class: 'v3packs-legend' });
      const seen = new Set();
      ORDER.filter(k => present.has(k)).forEach(k => { if (seen.has(PNAME[k])) return; seen.add(PNAME[k]); legend.append(el('span', {}, el('i', { style: `background:${fillOf(k)}` }), ricons(k, 11), el('em', { text: PNAME[k] }))); });

      // 2. did our packs match
      const groups = Object.values(A);
      let verdict, auditBox = null;
      if (!emp.n) verdict = el('p', { class: 'v3packs-verdict none' }, 'Our fleet never opened this pack: it had already left the shop.');
      else {
        const off = groups.filter(g => g.p < .05);
        const nPacks = emp.n;
        verdict = el('p', { class: 'v3packs-verdict' + (off.length ? ' soft' : '') }, el('span', { class: 'v3packs-vmark', text: '✓' }),
          el('span', {}, `We opened ${fmt(nPacks)} of these. `, el('b', { text: off.length ? 'The odds held up.' : 'Every line was within chance of the odds screen.' }),
            off.length ? ` One card landed a little off, about what luck alone produces across the 56 checks we ran.` : ''));
        if (groups.length) {
          const box = el('div', { class: 'v3packs-auditwrap' });
          auditBox = el('details', { class: 'v3packs-more' }, el('summary', { text: 'Show the check, card by card' }), box);
          auditBox.addEventListener('toggle', () => { if (auditBox.open && !box.childElementCount) groups.forEach(g => drawAudit(box, g, g.group === '1st-3rd' ? 'Cards 1–3' : `Card ${parseInt(g.group)}`)); }, { once: false });
        }
      }

      // 3. chase cards
      const im = (PPA.catalog.cards || []).filter(c => c.r === 800 && (c.p || []).includes(p.pack_id)).slice(0, 2);
      const items = [...(p.crowns || []).map(c => ({ id: c.card_id, name: c.name, k: 'UR', packs: c.expected_packs, p50: c.packs_50, p90: c.packs_90 })), ...im.map(c => ({ id: c.id, name: c.n, k: 'IM', packs: m.packs_specific?.IM }))].filter(d => d.packs).slice(0, 5);
      const chase = el('div', { class: 'v3packs-chase' });
      items.forEach(d => {
        const f = el('figure', { class: 'v3packs-cc', tabindex: 0 }, PPA.cardArt(d.id, { holo: true }),
          el('figcaption', {}, el('span', { class: 'r' }, ricons(d.k, 11), PNAME[d.k]), el('b', { text: d.name }), el('span', { class: 'odds', text: `1 in ${fmt(d.packs)} packs` })));
        hoverTip(f, t => { PPA.cardTip(t, d.id); kv(t, d.p50 ? [['Half of players have it by', fmt(d.p50) + ' packs'], ['9 in 10 have it by', fmt(d.p90) + ' packs']] : [['About', `1 in ${fmt(d.packs)} packs`]]); });
        chase.append(f);
      });
      if (!items.length) chase.append(el('p', { class: 'small', text: 'No crown or 3-star cards in this pack.' }));

      const sec = (title, ...kids) => el('section', { class: 'v3packs-sec' }, el('div', { class: 'v3packs-kicker', text: title }), ...kids);
      detail.append(el('div', { class: 'v3packs-top' }, hero,
        el('div', { class: 'v3packs-main' },
          sec('What each card can be', rowsHost, legend),
          sec('Did our packs match?', verdict, auditBox),
          sec('The chase cards', chase))));
    };

    const NAMEB = (b) => PNAME[b] || b;
    const drawAudit = (host, a, name) => {
      host.append(el('div', { class: 'v3packs-ahead' }, el('b', { text: name }), el('span', { text: ` · ${fmt(a.n)} packs` })));
      const ch = el('div', { class: 'chart' }); host.append(ch);
      const draw = () => {
        const w = Charts.W(ch), lw = 78, rw = w < 460 ? 46 : 92, bh = 24, h = a.buckets.length * bh + 26;
        const svg = Charts.svgOf(ch, w, h);
        const lo = d3.min(a.buckets, b => Math.min(Math.max(b.lo_pct, .005), b.pub_pct));
        const x = d3.scaleLog([Math.max(.004, lo / 1.8), 100], [lw, w - rw]);
        const ticks = [.01, .1, 1, 10, 100].filter(v => v >= x.domain()[0]);
        svg.append('g').selectAll('line').data(ticks).join('line').attr('x1', x).attr('x2', x).attr('y1', 0).attr('y2', h - 20).attr('stroke', css('--line'));
        svg.append('g').selectAll('text').data(ticks).join('text').attr('x', x).attr('y', h - 5).attr('text-anchor', 'middle').text(v => v + '%');
        const g = svg.append('g').selectAll('g').data(a.buckets).join('g').attr('transform', (d, i) => `translate(0,${i * bh})`);
        g.append('text').attr('x', lw - 8).attr('y', bh / 2).attr('dy', '.35em').attr('text-anchor', 'end').attr('fill', css('--ink-2')).style('font', '12px var(--font-body)').text(d => NAMEB(d.bucket));
        g.append('line').attr('x1', d => x(Math.max(d.lo_pct, x.domain()[0]))).attr('x2', d => x(d.hi_pct)).attr('y1', bh / 2).attr('y2', bh / 2).style('stroke', d => fillOf(d.bucket)).attr('stroke-width', 5).attr('stroke-linecap', 'round').attr('opacity', .35);
        g.append('line').attr('x1', d => x(d.pub_pct)).attr('x2', d => x(d.pub_pct)).attr('y1', 4).attr('y2', bh - 4).attr('stroke', css('--ink')).attr('stroke-width', 2).attr('stroke-linecap', 'round');
        g.append('circle').attr('cx', d => x(Math.max(d.obs_pct, x.domain()[0]))).attr('cy', bh / 2).attr('r', 5).style('fill', d => fillOf(d.bucket)).attr('stroke', css('--surface')).attr('stroke-width', 1.5);
        g.append('text').attr('x', w - 4).attr('y', bh / 2).attr('dy', '.35em').attr('text-anchor', 'end').attr('fill', css('--ink')).style('font', '600 11px var(--font-data)').text(d => fmt(d.obs));
        Charts.hover(g.append('rect').attr('width', w).attr('height', bh).attr('fill', 'transparent'), (t, d) => rows(t, `${name}: ${NAMEB(d.bucket)}`, [['Odds screen', d.pub_pct + '%'], ['We pulled', d.obs_pct.toFixed(2) + '%'], ['Likely range', `${d.lo_pct.toFixed(2)}–${d.hi_pct.toFixed(2)}%`], ['Cards', `${fmt(d.obs)} (expected ${fmt(d.exp, 1)})`]]));
      };
      draw(); Charts.redrawOnResize(ch, draw);
      host.append(el('div', { class: 'v3packs-alegend' }, el('span', {}, el('i', { class: 'tick' }), 'odds screen'), el('span', {}, el('i', { class: 'dot' }), 'what we pulled'), el('span', {}, el('i', { class: 'ci' }), 'range luck allows'), el('span', { class: 'muted', text: 'right: cards pulled' })));
    };

    select(cur, false);
    picker.scrollLeft = Math.max(0, tiles.get(cur.pack_id).offsetLeft - picker.offsetLeft - 60);
  };
})();

(() => {
  const { el, json, fmt, tip, css, card, cardArt } = PPA;
  const PPY = 2 * 365.25; // free packs per year
  const yrs = (packs) => packs / PPY;
  const nice = (y) => y < 1 ? `${Math.round(y * 12)} months` : `${y.toFixed(1)} years`;
  const NICK = { UR: 'Crown', SR: '2-star', SAR: '2-star', IM: '3-star', S: '1-shiny', SSR: '2-shiny', AR: '1-star', RR: '4-diamond', R: '3-diamond' };
  window.Story.completion = async (node) => {
    const [d] = await Promise.all([json('data/f/cards/completion_curves.json'), PPA.loadCatalog()]);
    const grid = d.grid;
    const rows = d.data.filter(r => r.full && r.base && r.packs.length === 1).map(r => ({ ...r, nm: r.name === r.unit ? (PPA.catalog.packById[r.unit]?.name || r.name).replace(/^BN010.*/, "Team Rocket's Ambition") : r.name, exp: PPA.catalog.packById[r.unit]?.exp })).sort((a, b) => a.full.median - b.full.median);
    rows.forEach(r => { if (r.nm === 'BN010_0010_00_000') r.nm = "Team Rocket's Ambition"; });
    let sel = rows.find(r => r.unit === 'AN001_0010_00_000') || rows[0];
    const list = el('div', { class: 'v4-cl', role: 'listbox', 'aria-label': 'Pick a pack' });
    const maxY = yrs(Math.max(...rows.map(r => r.full.median)));
    const head = el('div', { class: 'v4-ch' }), chart = el('div', { class: 'v4-cchart' }), last = el('div', { class: 'v4-clast' });
    node.replaceChildren(el('div', { class: 'v4-comp' }, el('div', { class: 'v4-cleft' }, el('div', { class: 'v4-ck', text: 'Every pack, fastest to finish first' }), list), el('div', { class: 'v4-cright' }, head, chart, last)));
    const items = rows.map(r => {
      const b = el('button', { type: 'button', class: 'v4-ci', role: 'option' },
        r.exp ? el('img', { src: `art/logos/expansion-badge_${r.exp}.webp`, alt: '', loading: 'lazy' }) : el('span'),
        el('span', { class: 'v4-cn', text: r.nm }),
        el('span', { class: 'v4-cbar' }, el('i', { style: `width:${yrs(r.full.median) / maxY * 100}%` })),
        el('b', { class: 'num', text: yrs(r.full.median).toFixed(1) + ' y' }));
      b.onclick = () => { sel = r; render(); };
      list.append(b); return [r, b];
    });
    const draw = () => {
      const r = sel, W = Charts.W(chart), H = Math.min(300, Math.max(220, W * .42)), m = { t: 16, r: 16, b: 34, l: 44 };
      const X = Math.min(7, Math.max(2, Math.ceil(yrs(r.full.p90)))), svg = Charts.svgOf(chart, W, H);
      const x = d3.scaleLinear([0, X], [m.l, W - m.r]), y = d3.scaleSqrt([0, r.n_full], [H - m.b, m.t]);
      svg.append('g').attr('transform', `translate(0,${H - m.b})`).call(d3.axisBottom(x).tickValues(d3.range(0, X + 1, W < 520 ? 2 : 1)).tickFormat(v => v === 0 ? '0' : v + (W < 520 ? 'y' : ' yr'))).call(Charts.axisStyle);
      const yt = [0, 1, 5, 20, 50, r.n_full].filter((v, i, a) => v <= r.n_full && a.indexOf(v) === i);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yt).tickFormat(d3.format('d'))).call(Charts.axisStyle);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).tickValues(yt).tickSize(-(W - m.l - m.r)).tickFormat('')).call(Charts.grid);
      svg.append('text').attr('x', m.l + 4).attr('y', m.t - 4).attr('fill', css('--muted')).style('font', '11px var(--font-body)').text('cards still missing');
      const miss = (k) => [[0, r['n_' + k]], ...grid.map((g, i) => [yrs(g), r['n_' + k] * (1 - r.curve_published[k][i])])].filter(p => p[0] <= X + 1);
      const line = d3.line().x(p => x(Math.min(X, p[0]))).y(p => y(Math.max(0, p[1]))).curve(d3.curveMonotoneX);
      [['base', css('--r-dia'), 'Diamond cards'], ['full', css('--r-crown'), 'Every card']].forEach(([k, c, lab]) => {
        svg.append('path').attr('d', line(miss(k))).attr('fill', 'none').attr('stroke', c).attr('stroke-width', 2.5).attr('stroke-linecap', 'round');
        const med = yrs(r[k].median); if (med <= X) {
          svg.append('circle').attr('cx', x(med)).attr('cy', y(0)).attr('r', 5).attr('fill', c).attr('stroke', css('--surface')).attr('stroke-width', 2);
          svg.append('line').attr('x1', x(med)).attr('x2', x(med)).attr('y1', y(0) - 6).attr('y2', y(k === 'base' ? 12 : 30)).attr('stroke', c).attr('stroke-dasharray', '2 3');
          svg.append('text').attr('x', x(med) + 5).attr('y', y(k === 'base' ? 12 : 30)).attr('text-anchor', 'start').attr('fill', css('--ink-2')).style('font', '600 11.5px var(--font-body)').text(`${lab} done: ${nice(med)}`);
        }
      });
      const hx = svg.append('line').attr('stroke', css('--line-2')).attr('y1', m.t).attr('y2', H - m.b).attr('opacity', 0);
      svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', W - m.l - m.r).attr('height', H - m.t - m.b).attr('fill', 'transparent')
        .on('pointermove', (e) => {
          const yy = Math.max(0, x.invert(d3.pointer(e)[0])); hx.attr('x1', x(yy)).attr('x2', x(yy)).attr('opacity', 1);
          const at = (k) => { const p = miss(k); for (let i = 1; i < p.length; i++) if (p[i][0] >= yy) { const a = p[i - 1], b = p[i], f = (yy - a[0]) / (b[0] - a[0] || 1); return a[1] + f * (b[1] - a[1]); } return 0; };
          tip.show(e, t => Charts.tipRows(t, `After ${nice(yy)} of free packs`, [['Packs opened', fmt(yy * PPY)], ['Diamond cards still missing', at('base').toFixed(1)], ['Cards still missing in all', `${at('full').toFixed(1)} of ${r.n_full}`]]));
        }).on('pointerleave', () => { tip.hide(); hx.attr('opacity', 0); });
    };
    const render = () => {
      const r = sel;
      items.forEach(([x, b]) => { b.classList.toggle('on', x === r); b.setAttribute('aria-selected', String(x === r)); });
      head.replaceChildren(el('div', { class: 'v4-ck', text: r.nm }), el('div', { class: 'v4-cbig' }, el('b', { text: nice(yrs(r.full.median)) }), el('span', { text: ` to finish all ${r.n_full} cards on free packs` })),
        el('div', { class: 'v4-csub', text: `Just the ${r.n_base} diamond cards: ${nice(yrs(r.base.median))}. The unluckiest 10% of players need ${nice(yrs(r.full.p90))} or more.` }));
      draw();
      last.replaceChildren(el('div', { class: 'v4-ck', text: 'Your most likely last card' }), el('div', { class: 'v4-clc' }, r.hardest_last_card_full.slice(0, 3).map(([id, name, rar, p]) => {
        const a = cardArt(id, { holo: true }); a.addEventListener('pointerenter', e => tip.show(e, t => PPA.cardTip(t, id))); a.addEventListener('pointermove', tip.move); a.addEventListener('pointerleave', tip.hide);
        return el('div', { class: 'v4-clci' }, a, el('b', { text: Math.round(p * 100) + '%' }), el('span', { text: `${name} · ${NICK[rar] || rar}` }));
      })));
    };
    render(); Charts.redrawOnResize(chart, draw);
  };
})();
