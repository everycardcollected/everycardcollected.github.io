// Reusable D3 chart builders. All colors come from CSS tokens; every chart has hover tooltips.
window.Charts = (() => {
  const { el, tip, fmt, css } = PPA;
  const W = (node) => Math.max(280, node.clientWidth || 640);
  const svgOf = (node, w, h) => {
    node.replaceChildren();
    return d3.select(node).append('svg').attr('viewBox', `0 0 ${w} ${h}`).attr('role', 'img');
  };
  const redrawOnResize = (node, fn) => {
    let last = node.clientWidth, t;
    new ResizeObserver(() => { if (Math.abs(node.clientWidth - last) < 30) return; last = node.clientWidth; clearTimeout(t); t = setTimeout(fn, 120); }).observe(node);
    const mo = new MutationObserver(fn); mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    matchMedia('(prefers-color-scheme: dark)').addEventListener('change', fn);
  };
  const hover = (sel, build) => sel
    .on('pointerenter pointermove', function (e, d) { tip.show(e, t => build(t, d, this)); d3.select(this).classed('hot', true); })
    .on('pointerleave', function () { tip.hide(); d3.select(this).classed('hot', false); })
    .attr('tabindex', 0)
    .on('focus', function (e, d) { const r = this.getBoundingClientRect(); tip.show({ clientX: r.right, clientY: r.top }, t => build(t, d, this)); })
    .on('blur', () => tip.hide());
  const tipRows = (t, title, rows) => {
    t.append(el('b', { text: title }));
    rows.forEach(([k, v]) => t.append(el('div', {}, el('span', { class: 'k', text: k + ' ' }), String(v))));
  };
  const axisStyle = (g) => { g.selectAll('.domain').attr('stroke', css('--line-2')); g.selectAll('.tick line').attr('stroke', css('--line-2')); g.selectAll('text').attr('fill', css('--muted')); };
  const grid = (g) => { g.selectAll('.domain').remove(); g.selectAll('.tick line').attr('stroke', css('--line')); g.selectAll('text').remove(); };

  // Horizontal bars. rows: [{label, value, color?, lo?, hi?, ref?, tip?:[[k,v]]}]
  function hbar(node, rows, o = {}) {
    const draw = () => {
      const w = W(node), lw = Math.min(o.labelWidth || 200, w * .42), bh = o.barH || 22, gap = o.gap ?? 8;
      const h = rows.length * (bh + gap) + 30;
      const svg = svgOf(node, w, h);
      const max = o.max ?? d3.max(rows, r => Math.max(r.value, r.hi ?? 0, r.ref ?? 0)) * 1.08;
      const x = d3.scaleLinear([o.min ?? 0, max], [lw, w - (o.rightPad ?? 56)]);
      svg.append('g').attr('transform', `translate(0,${h - 22})`).call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 120)), o.tickFmt)).call(grid);
      svg.append('g').attr('transform', `translate(0,${h - 24})`).call(d3.axisBottom(x).ticks(Math.max(2, Math.floor(w / 120))).tickFormat(o.tickFmt ? d3.format(o.tickFmt) : null)).call(axisStyle).call(g => g.select('.domain').remove());
      const g = svg.append('g').selectAll('g').data(rows).join('g').attr('transform', (d, i) => `translate(0,${i * (bh + gap)})`);
      g.append('text').attr('x', lw - 10).attr('y', bh / 2).attr('dy', '.35em').attr('text-anchor', 'end').attr('fill', css('--ink-2')).style('font', '13px var(--font-body)').text(d => d.label);
      if (!o.dot) g.append('path').attr('fill', d => d.color || css('--r-dia')).attr('d', d => {
        const x0 = x(o.min ?? 0), x1 = x(d.value), r = Math.min(4, (x1 - x0) / 2), hh = Math.min(bh, 24), y0 = (bh - hh) / 2;
        return `M${x0},${y0}H${x1 - r}Q${x1},${y0} ${x1},${y0 + r}V${y0 + hh - r}Q${x1},${y0 + hh} ${x1 - r},${y0 + hh}H${x0}Z`;
      });
      g.filter(d => d.lo != null).append('line').attr('x1', d => x(d.lo)).attr('x2', d => x(d.hi)).attr('y1', bh / 2).attr('y2', bh / 2).attr('stroke', css('--ink')).attr('stroke-width', 1.5).attr('opacity', .7);
      if (o.dot) g.append('circle').attr('cx', d => x(d.value)).attr('cy', bh / 2).attr('r', 6).attr('fill', d => d.color || css('--r-dia')).attr('stroke', css('--surface')).attr('stroke-width', 2);
      g.filter(d => d.ref != null).append('line').attr('x1', d => x(d.ref)).attr('x2', d => x(d.ref)).attr('y1', -2).attr('y2', bh + 2).attr('stroke', css('--ink')).attr('stroke-width', 2);
      g.append('text').attr('x', d => x(d.hi ?? d.value) + 6).attr('y', bh / 2).attr('dy', '.35em').attr('fill', css('--ink')).style('font', '600 12px var(--font-data)').text(d => d.text ?? (o.valFmt ? o.valFmt(d.value) : fmt(d.value)));
      hover(g.append('rect').attr('x', 0).attr('width', w).attr('height', bh + gap).attr('y', -gap / 2).attr('fill', 'transparent'), (t, d) => tipRows(t, d.label, d.tip || [['Value', o.valFmt ? o.valFmt(d.value) : fmt(d.value)]]));
    };
    draw(); redrawOnResize(node, draw);
  }

  // Line/area over x. series: [{name, color, points:[{x,y}], band?:[{x,lo,hi}], dash?}]
  function lines(node, series, o = {}) {
    const draw = () => {
      const w = W(node), h = o.height || Math.min(380, Math.max(240, w * .45)), m = { t: 14, r: o.right ?? 70, b: 30, l: o.left ?? 48 };
      const svg = svgOf(node, w, h);
      const all = series.flatMap(s => s.points.concat((s.band || []).map(b => ({ x: b.x, y: b.hi }))));
      const xs = o.xScale === 'log' ? d3.scaleLog() : o.xTime ? d3.scaleUtc() : d3.scaleLinear();
      const x = xs.domain(o.xDomain || d3.extent(all, d => d.x)).range([m.l, w - m.r]);
      const ys = o.yScale === 'log' ? d3.scaleLog() : d3.scaleLinear();
      const y = ys.domain(o.yDomain || [o.yMin ?? 0, d3.max(all, d => d.y) * 1.05]).nice().range([h - m.b, m.t]);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat('')).call(grid);
      svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.floor(w / 110), o.xFmt).tickFormat(o.xTickFmt || null)).call(axisStyle);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, o.yFmt)).call(axisStyle).call(g => g.select('.domain').remove());
      if (o.yLabel) svg.append('text').attr('x', m.l).attr('y', m.t - 2).attr('fill', css('--muted')).style('font', '11px var(--font-data)').text(o.yLabel);
      series.forEach(s => {
        if (s.band) svg.append('path').datum(s.band).attr('fill', s.color).attr('opacity', .12).attr('d', d3.area().x(d => x(d.x)).y0(d => y(d.lo)).y1(d => y(d.hi)).curve(d3.curveMonotoneX));
        svg.append('path').datum(s.points).attr('fill', 'none').attr('stroke', s.color).attr('stroke-width', s.width || 2).attr('stroke-dasharray', s.dash || null).attr('stroke-linejoin', 'round').attr('stroke-linecap', 'round').attr('d', d3.line().x(d => x(d.x)).y(d => y(d.y)).curve(s.step ? d3.curveStepAfter : d3.curveMonotoneX));
        const last = s.points[s.points.length - 1];
        if (s.label !== false && last) {
          svg.append('circle').attr('cx', x(last.x)).attr('cy', y(last.y)).attr('r', 4).attr('fill', s.color).attr('stroke', css('--surface')).attr('stroke-width', 2);
          svg.append('text').attr('x', x(last.x) + 8).attr('y', y(last.y)).attr('dy', '.35em').attr('fill', css('--ink-2')).style('font', '12px var(--font-body)').text(s.endLabel || s.name);
        }
      });
      // crosshair
      const ch = svg.append('line').attr('y1', m.t).attr('y2', h - m.b).attr('stroke', css('--ink')).attr('opacity', 0);
      svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent')
        .on('pointermove', (e) => {
          const [px] = d3.pointer(e); const xv = x.invert(px);
          const near = series[0].points.reduce((a, b) => Math.abs(b.x - xv) < Math.abs(a.x - xv) ? b : a);
          ch.attr('x1', x(near.x)).attr('x2', x(near.x)).attr('opacity', .35);
          tip.show(e, t => {
            t.append(el('b', { text: o.xLabelFmt ? o.xLabelFmt(near.x) : fmt(near.x, 1) }));
            series.forEach(s => {
              const p = s.points.reduce((a, b) => Math.abs(b.x - near.x) < Math.abs(a.x - near.x) ? b : a);
              t.append(el('div', {}, el('i', { style: `display:inline-block;width:12px;height:2px;background:${s.color};margin-right:6px;vertical-align:3px` }), (o.yValFmt ? o.yValFmt(p.y) : fmt(p.y, 1)) + ' ', el('span', { class: 'k', text: s.name })));
            });
          });
        }).on('pointerleave', () => { ch.attr('opacity', 0); tip.hide(); });
      if (o.after) o.after(svg, x, y, { w, h, m });
    };
    draw(); redrawOnResize(node, draw);
  }

  // Columns (vertical bars) with optional expected overlay line. data: [{x(label), y, exp?, color?, tip?}]
  function columns(node, data, o = {}) {
    const draw = () => {
      const w = W(node), h = o.height || 260, m = { t: 16, r: 10, b: o.bottom ?? 34, l: 44 };
      const svg = svgOf(node, w, h);
      const x = d3.scaleBand(data.map(d => d.x), [m.l, w - m.r]).padding(o.pad ?? .18);
      const ymax = d3.max(data, d => Math.max(d.y, d.exp ?? 0, d.hi ?? 0)) * 1.08;
      const y = (o.yScale === 'log' ? d3.scaleLog([o.yMin || .5, ymax], [h - m.b, m.t]) : d3.scaleLinear([0, ymax], [h - m.b, m.t]).nice());
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat('')).call(grid);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, o.yFmt)).call(axisStyle).call(g => g.select('.domain').remove());
      const every = Math.ceil(data.length / Math.max(4, Math.floor(w / (o.labelW || 46))));
      svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).tickValues(data.map(d => d.x).filter((_, i) => i % every === 0))).call(axisStyle);
      const bw = Math.min(x.bandwidth(), 24);
      const g = svg.append('g').selectAll('g').data(data).join('g').attr('transform', d => `translate(${x(d.x) + (x.bandwidth() - bw) / 2},0)`);
      g.append('path').attr('fill', d => d.color || o.color || css('--r-dia')).attr('d', d => {
        const y0 = y.range()[0], y1 = Math.min(y0, y(Math.max(d.y, o.yScale === 'log' ? (o.yMin || .5) : 0))), r = Math.min(4, bw / 2, (y0 - y1) / 2);
        return `M0,${y0}V${y1 + r}Q0,${y1} ${r},${y1}H${bw - r}Q${bw},${y1} ${bw},${y1 + r}V${y0}Z`;
      });
      if (data.some(d => d.exp != null)) {
        svg.append('path').datum(data).attr('fill', 'none').attr('stroke', css('--ink')).attr('stroke-width', 2).attr('d', d3.line().x(d => x(d.x) + x.bandwidth() / 2).y(d => y(Math.max(d.exp, o.yScale === 'log' ? (o.yMin || .5) : 0))).curve(d3.curveMonotoneX));
      }
      hover(g.append('rect').attr('x', -2).attr('width', bw + 4).attr('y', m.t).attr('height', h - m.t - m.b).attr('fill', 'transparent'), (t, d) => tipRows(t, o.xName ? o.xName(d.x) : String(d.x), d.tip || [['Observed', fmt(d.y, o.dec || 0)], ...(d.exp != null ? [['Expected', fmt(d.exp, 1)]] : [])]));
      if (o.after) o.after(svg, x, y, { w, h, m });
    };
    draw(); redrawOnResize(node, draw);
  }

  // Heatmap. cells: [{r,c,v,tip}], rows/cols label arrays, diverging around 0 (or sequential)
  function heat(node, cells, rows, cols, o = {}) {
    const draw = () => {
      const w = W(node), m = { t: 22, r: 8, b: 8, l: o.left ?? 44 };
      const cw = (w - m.l - m.r) / cols.length, ch = Math.max(14, Math.min(28, cw));
      const h = m.t + rows.length * ch + m.b;
      const svg = svgOf(node, w, h);
      const ext = o.domain || [-d3.max(cells, c => Math.abs(c.v)), d3.max(cells, c => Math.abs(c.v))];
      const neg = css('--r-dia'), pos = css('--r-star'), mid = css('--surface-2');
      const color = o.sequential ? d3.scaleLinear([ext[0], ext[1]], [mid, css('--r-dia')]) : d3.scaleLinear([ext[0], 0, ext[1]], [neg, mid, pos]).clamp(true);
      const ci = Object.fromEntries(cols.map((c, i) => [c, i])), ri = Object.fromEntries(rows.map((r, i) => [r, i]));
      svg.append('g').selectAll('text').data(cols).join('text').attr('x', (d, i) => m.l + i * cw + cw / 2).attr('y', m.t - 7).attr('text-anchor', 'middle').text((d, i) => (cols.length > 12 && i % 3) ? '' : d);
      svg.append('g').selectAll('text').data(rows).join('text').attr('x', m.l - 6).attr('y', (d, i) => m.t + i * ch + ch / 2).attr('dy', '.35em').attr('text-anchor', 'end').text(d => d);
      hover(svg.append('g').selectAll('rect').data(cells).join('rect').attr('x', d => m.l + ci[d.c] * cw + 1).attr('y', d => m.t + ri[d.r] * ch + 1).attr('width', cw - 2).attr('height', ch - 2).attr('rx', 3).attr('fill', d => d.v == null ? 'transparent' : color(d.v)),
        (t, d) => tipRows(t, `${d.r} · ${d.c}`, d.tip || [['Value', fmt(d.v, 2)]]));
    };
    draw(); redrawOnResize(node, draw);
  }

  // Beeswarm/strip of many dots on x. pts: [{x, color, r?, tip, id}]
  function swarm(node, pts, o = {}) {
    const draw = () => {
      const w = W(node), h = o.height || 300, m = { t: 10, r: 16, b: 30, l: 16 };
      const svg = svgOf(node, w, h);
      const x = d3.scaleLinear(o.xDomain || d3.extent(pts, p => p.x), [m.l, w - m.r]);
      svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.floor(w / 100), o.xFmt)).call(axisStyle);
      const r = o.r || (w < 600 ? 2.2 : 3.2);
      const sim = pts.map(p => ({ ...p, X: x(p.x), Y: (h - m.b + m.t) / 2 }));
      const s = d3.forceSimulation(sim).force('x', d3.forceX(d => d.X).strength(1)).force('y', d3.forceY((h - m.b + m.t) / 2).strength(.06)).force('c', d3.forceCollide(r + .4)).stop();
      for (let i = 0; i < 160; i++) s.tick();
      sim.forEach(d => { d.y = Math.max(m.t + r, Math.min(h - m.b - r, d.y)); });
      const dots = svg.append('g').selectAll('circle').data(sim).join('circle').attr('cx', d => d.x).attr('cy', d => d.y).attr('r', d => d.r || r).attr('fill', d => d.color || css('--r-dia')).attr('stroke', css('--surface')).attr('stroke-width', .8);
      // nearest-point hit layer
      const del = d3.Delaunay.from(sim, d => d.x, d => d.y);
      let hot = null;
      svg.append('rect').attr('width', w).attr('height', h - m.b).attr('fill', 'transparent').on('pointermove', (e) => {
        const [px, py] = d3.pointer(e); const i = del.find(px, py); const d = sim[i];
        if (Math.hypot(d.x - px, d.y - py) > 24) { tip.hide(); if (hot) hot.attr('stroke', css('--surface')).attr('stroke-width', .8); return; }
        if (hot) hot.attr('stroke', css('--surface')).attr('stroke-width', .8);
        hot = dots.filter((_, j) => j === i).attr('stroke', css('--ink')).attr('stroke-width', 2).raise();
        tip.show(e, t => o.tip(t, d));
      }).on('pointerleave', () => { tip.hide(); if (hot) hot.attr('stroke', css('--surface')).attr('stroke-width', .8); })
        .on('click', (e) => { const [px, py] = d3.pointer(e); const d = sim[del.find(px, py)]; o.onClick && o.onClick(d); });
      if (o.after) o.after(svg, x, { w, h, m });
    };
    draw(); redrawOnResize(node, draw);
  }

  // Scatter. pts: [{x,y,color,r,tip}]
  function scatter(node, pts, o = {}) {
    const draw = () => {
      const w = W(node), h = o.height || Math.min(420, w * .7), m = { t: 14, r: 16, b: 34, l: 50 };
      const svg = svgOf(node, w, h);
      const xs = o.xScale === 'log' ? d3.scaleLog() : d3.scaleLinear(), ys = o.yScale === 'log' ? d3.scaleLog() : d3.scaleLinear();
      const x = xs.domain(o.xDomain || d3.extent(pts, p => p.x)).nice().range([m.l, w - m.r]);
      const y = ys.domain(o.yDomain || d3.extent(pts, p => p.y)).nice().range([h - m.b, m.t]);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w - m.l - m.r)).tickFormat('')).call(grid);
      svg.append('g').attr('transform', `translate(0,${h - m.b})`).call(d3.axisBottom(x).ticks(Math.floor(w / 100), o.xFmt)).call(axisStyle);
      svg.append('g').attr('transform', `translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5, o.yFmt)).call(axisStyle).call(g => g.select('.domain').remove());
      if (o.xLabel) svg.append('text').attr('x', w - m.r).attr('y', h - 4).attr('text-anchor', 'end').text(o.xLabel);
      if (o.yLabel) svg.append('text').attr('x', m.l + 4).attr('y', m.t + 10).text(o.yLabel);
      if (o.before) o.before(svg, x, y, { w, h, m });
      const dots = svg.append('g').selectAll('circle').data(pts).join('circle').attr('cx', d => x(d.x)).attr('cy', d => y(d.y)).attr('r', d => d.r || 4).attr('fill', d => d.color || css('--r-dia')).attr('fill-opacity', o.opacity ?? .85).attr('stroke', css('--surface')).attr('stroke-width', 1.5);
      const del = d3.Delaunay.from(pts, d => x(d.x), d => y(d.y));
      svg.append('rect').attr('x', m.l).attr('y', m.t).attr('width', w - m.l - m.r).attr('height', h - m.t - m.b).attr('fill', 'transparent').on('pointermove', (e) => {
        const [px, py] = d3.pointer(e); const i = del.find(px, py); const d = pts[i];
        if (Math.hypot(x(d.x) - px, y(d.y) - py) > 28) return tip.hide();
        tip.show(e, t => o.tip(t, d));
      }).on('pointerleave', tip.hide);
      if (o.after) o.after(svg, x, y, { w, h, m });
    };
    draw(); redrawOnResize(node, draw);
  }

  return { hbar, lines, columns, heat, swarm, scatter, tipRows, hover, svgOf, W, axisStyle, grid, redrawOnResize };
})();
