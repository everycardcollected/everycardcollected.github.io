// Story: shared namespace. Each chapter file registers Story[key]; app.js draws every [data-chart=key] node when it scrolls into view.
window.Story = {};

(() => {
  const S = window.Story;
  const { el, BY_CODE } = PPA;
  const ICON = { dia: 'diamond', rr: 'diamond', star: 'star', star2: 'star', shiny: 'shiny', crown: 'crown' };
  // Game-style rarity glyphs: N repeated icons.
  const glyphs = (code) => {
    const R = BY_CODE[code]; if (!R) return el('span');
    const n = code === 'UR' ? 1 : [...R.sym].length;
    const kind = ICON[R.g];
    return el('span', { class: 'v4-glyphs', 'aria-label': R.sym }, Array.from({ length: n }, () => el('img', { src: `art/icons/rarity/rarity-${kind}.webp`, alt: '', loading: 'lazy' })));
  };
  S.glyphs = glyphs;
})();
