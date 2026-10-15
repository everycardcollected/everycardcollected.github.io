// Chapter 1 · A lifetime of free packs, opened in a week.
(() => {
  const S = window.Story;
  const { el, json, fmt, css, compact } = PPA;
  const PER_DAY = 2, PER_MONTH = PER_DAY * 365.25 / 12; // free timer: about 2 packs a day

  S.weekLifetime = async (node) => {
    const P = await Openings.load();
    const n = P.n, M = Math.ceil(n / PER_MONTH);
    const day0 = Math.floor(P.t0 / 86400) * 86400;
    const dayOf = (i) => Math.floor((P.t0 + P.t[i] - day0) / 86400);
    const nDays = dayOf(n - 1) + 1;
    const dayPacks = new Array(nDays).fill(0); for (let i = 0; i < n; i++) dayPacks[dayOf(i)]++;
    const cellDay = new Uint8Array(M), cellPack = new Uint32Array(M);
    for (let m = 0; m < M; m++) { const i = Math.min(n - 1, Math.floor((m + .5) * PER_MONTH)); cellPack[m] = i; cellDay[m] = dayOf(i); }
    const legend = el('div', { class: 'v4-lt-legend' });
    const svgHost = el('div', { class: 'v4-lt-svg' });
    node.replaceChildren(legend, svgHost);
    const dayName = (d) => `Day ${d + 1}`;
    let played = false, raf = 0;
    const draw = () => {
      cancelAnimationFrame(raf);
      const W = Charts.W(node), narrow = W < 700, yPer = narrow ? 2 : 1;
      const rows = 12 * yPer, cols = Math.ceil(M / rows);
      const gap = narrow ? 1 : 2, cs = Math.max(4, Math.floor((W - 4) / cols) - gap);
      const H = rows * (cs + gap) + 34;
      const ramp = d3.piecewise(d3.interpolateLab, [css("--r-dia"), css("--r-star2"), css("--r-shiny"), css("--r-crown")]);
      const col = (d) => ramp(nDays > 1 ? d / (nDays - 1) : 0);
      const svg = Charts.svgOf(svgHost, W, H);
      const g = svg.append('g');
      const pos = (m) => ({ x: Math.floor(m / rows) * (cs + gap), y: (m % rows) * (cs + gap) });
      const cells = g.selectAll('rect').data(d3.range(M)).join('rect')
        .attr('x', m => pos(m).x).attr('y', m => pos(m).y).attr('width', cs).attr('height', cs).attr('rx', Math.min(3, cs / 4))
        .attr('fill', css('--surface-2'));
      Charts.hover(cells, (t, m) => {
        const a = Math.round(m * PER_MONTH) + 1, b = Math.min(n, Math.round((m + 1) * PER_MONTH));
        Charts.tipRows(t, `Year ${Math.floor(m / 12) + 1}, month ${m % 12 + 1}`, [['Your packs', `#${fmt(a)} to #${fmt(b)}`], ['We opened them', PPA.when(P.t[cellPack[m]])], ['That day alone', `${fmt(dayPacks[cellDay[m]])} packs = ${(dayPacks[cellDay[m]] / PER_DAY / 365.25).toFixed(1)} years of yours`]]);
      });
      // decade ticks
      const ax = svg.append('g').attr('transform', `translate(0,${rows * (cs + gap) + 14})`);
      for (let y = 10; y <= Math.ceil(M / 12); y += (W < 520 ? 20 : 10)) {
        const m = y * 12; if (m >= M) continue;
        ax.append('text').attr('x', pos(m).x).attr('y', 0).attr('fill', css('--muted')).style('font', '11px var(--font-data)').text(y + ' yrs');
      }
      const end = pos(M - 1);
      ax.append('text').attr('x', Math.min(W - 2, end.x + cs)).attr('y', 14).attr('text-anchor', 'end').attr('fill', css('--ink')).style('font', '600 11px var(--font-body)').text(`${fmt(M / 12, 0)} years later: pack 60,689`);
      ax.append('text').attr('x', 0).attr('y', 14).attr('fill', css('--ink')).style('font', '600 11px var(--font-body)').text('You start');
      // fill animation
      const fillTo = (k) => cells.attr('fill', m => m < k ? col(cellDay[m]) : css('--surface-2'));
      if (played || matchMedia('(prefers-reduced-motion: reduce)').matches) fillTo(M);
      else {
        const t0 = performance.now(), dur = 4200;
        const step = (now) => { const f = Math.min(1, (now - t0) / dur); fillTo(Math.round(M * f)); if (f < 1) raf = requestAnimationFrame(step); else played = true; };
        raf = requestAnimationFrame(step);
      }
      legend.replaceChildren(...dayPacks.map((c, d) => el('span', { class: 'v4-lt-day' }, el('i', { style: `background:${col(d)}` }), el('b', { text: dayName(d) }), el('span', { text: `${(c / PER_DAY / 365.25).toFixed(1)} yrs` }))));
    };
    draw(); Charts.redrawOnResize(node, draw);
  };

  S.weekStats = async (node) => {
    const d = (await json('data/f/expedition/totals.json')).data;
    const logged = d.packs_by_resource.hourglass + d.packs_by_resource.pack_power;
    const secs = d.span_days * 86400;
    const items = [
      ['icons/items/pack-icon.webp', '60,689', 'packs opened', `one every ${Math.round(secs / 60689)} seconds, all week`],
      ['icons/rarity/rarity-star.webp', '302,600', 'cards pulled', 'from packs; 359,412 held at the end, counting starter cards'],
      ['icons/stamina/stamina-pve.webp', fmt(d.solo_battle_first_clears), 'solo battles won', 'each one for the first time'],
      ['icons/items/exp-player.webp', fmt(d.level_ups), 'level-ups', 'each paying 12 Pack Hourglasses'],
      ['icons/items/pack-hourglass.webp', Math.round(d.packs_by_resource.hourglass / logged * 100) + '%', 'of packs paid with hourglasses', `only ${Math.round(d.packs_by_resource.pack_power / logged * 100)}% came from the free timer`],
      ['icons/items/wonder-hourglass.webp', fmt(d.wonder_picks), 'Wonder Picks', 'no sign of rigging (see Myths)'],
      ['icons/items/pokegold.webp', '0', 'packs bought with PokéGold', `every one of the ${fmt(logged)} packs with a known source came from the free timer or hourglasses`],
      ['icons/items/shop-ticket.webp', fmt(d.free_claims), 'free rewards claimed', 'missions, daily gifts and free shop items'],
      ['icons/items/exp-pack.webp', compact(60689 * 25), 'XP from opening packs', 'every pack is worth 25 XP'],
    ];
    node.replaceChildren(el('div', { class: 'v4-istats' }, items.map(([ic, v, l, s]) => el('div', { class: 'v4-istat' }, el('img', { src: 'art/' + ic, alt: '' }), el('div', {}, el('b', { class: 'num', text: v }), el('span', { class: 'l', text: l }), el('span', { class: 's', text: s }))))));
  };
})();
