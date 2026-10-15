// Decodes data/openings.b64.txt: every pack in time order.
// Record: u32 t (s since t0), u16 account, u8 pack, u8 kind (0 normal,2 god,3 deluxe-special,4 rare-04,5 pity GR,6 six-card bonus pack), u8 n, n × u16 card index
window.Openings = (() => {
  let P;
  const load = async () => {
    if (P) return P;
    const [buf, idx] = await Promise.all([PPA.bin('data/openings.b64.txt'), PPA.json('data/openings_index.json'), PPA.loadCatalog()]);
    const dv = new DataView(buf);
    const n = 61000;
    const t = new Uint32Array(n), acct = new Uint16Array(n), pack = new Uint8Array(n), kind = new Uint8Array(n), cnt = new Uint8Array(n), start = new Uint32Array(n);
    const cards = new Uint16Array(330000);
    let o = 0, ci = 0, i = 0;
    while (o < buf.byteLength) {
      t[i] = dv.getUint32(o, true); acct[i] = dv.getUint16(o + 4, true); pack[i] = dv.getUint8(o + 6); kind[i] = dv.getUint8(o + 7); cnt[i] = dv.getUint8(o + 8);
      o += 9; start[i] = ci;
      for (let k = 0; k < cnt[i]; k++) { cards[ci++] = dv.getUint16(o, true); o += 2; }
      i++;
    }
    const rarityByIdx = new Uint16Array(idx.cards.length);
    idx.cards.forEach((id, j) => { const c = PPA.card(id); rarityByIdx[j] = c ? c.r : 100; });
    P = { n: i, t, acct, pack, kind, cnt, start, cards: cards.subarray(0, ci), idx, t0: idx.t0, rarityByIdx,
      cardId: (j) => idx.cards[j], packId: (j) => idx.packs[j], account: (j) => idx.accounts[j],
      cardsOf: (i) => Array.from(cards.subarray(start[i], start[i] + cnt[i]), j => idx.cards[j]) };
    return P;
  };
  return { load };
})();
