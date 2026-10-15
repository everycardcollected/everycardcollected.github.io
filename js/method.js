// Method tab: rarity key and interface-art credits.
(() => {
  const host = document.getElementById('rarity-key'); if (!host) return;
  const { el, RARITY } = PPA;
  Object.entries(RARITY).forEach(([r, v]) => host.append(el('div', {}, el('span', { class: 'rb', style: `--rc:var(--r-${v.g})`, text: v.sym }), el('span', {}, el('b', { text: v.code + ' ' }), v.label))));
})();

(() => {
  const host = document.getElementById('art-credits'); if (!host) return;
  const G = [
    ['Items', ['pack-hourglass', 'wonder-hourglass', 'shinedust', 'pokegold', 'shop-ticket', 'premier-shop-ticket', 'premium-ticket', 'emblem-ticket', 'basic-pass', 'premium-pass', 'exp-player', 'exp-pack', 'pack-icon', 'revival-clock', 'pikachu-face'].map(n => 'icons/items/' + n)],
    ['Rank and stamina', ['rank/rank-beginner', 'rank/rank-poke-ball', 'rank/rank-great-ball', 'rank/rank-ultra-ball', 'rank/rank-master-ball', 'stamina/stamina-pve', 'stamina/stamina-pvp', 'stamina/stamina-trade', 'stamina/stamina-challenge'].map(n => 'icons/' + n)],
    ['Screens and events', ['home-battle-bg', 'home-social-bg', 'home-battle-illustration', 'wonder-pick-bg-chansey', 'wonder-pick-bg-event', 'wonder-chansey-pick-badge', 'drop-event-badge', 'event-poster-rocket', 'card-back'].map(n => 'ui/' + n)],
  ];
  G.forEach(([name, list]) => host.append(PPA.el('div', { class: 'ac-group' }, PPA.el('b', { text: name }), PPA.el('div', { class: 'ac-row' }, list.map(src => PPA.el('figure', {}, PPA.el('img', { loading: 'lazy', src: `art/${src}.webp`, alt: '', loading: 'lazy' }), PPA.el('figcaption', { text: src.split('/').pop().replace(/-/g, ' ') })))))));
})();
