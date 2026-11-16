/* Хрю-карт: ядро, часть 1. Трассы и геометрия. Чистый JS без three.js, работает и в браузере и в node. */
(function (root) {
'use strict';
const KC = root.KC = root.KC || {};
if (typeof module !== 'undefined') module.exports = KC;

KC.rng = function (a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; };
KC.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
KC.lerp = (a, b, t) => a + (b - a) * t;
KC.wrapAng = a => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };

/* Восемь трасс. Тема задаёт вид и механики: tunnel (метро), lava (ад), laser/belt (лаборатория), portal, neon, ice. */
KC.TRACKS = [
  { id: 'farm', name: 'Ферма Хрюшки', sub: 'Грязь и колосья', theme: 'farm', R: 190, half: 13,
    h: [[2, .12, .3], [3, .10, 1.2], [5, .05, 2.0]],
    hz: [['mud', .18, -5, 7], ['mud', .47, 5, 7], ['mud', .78, -4, 7], ['pad', .30, 0], ['pad', .64, 3], ['cone', .10, -8], ['cone', .10, 8], ['cone', .55, 0], ['cone', .90, -6]] },
  { id: 'metro', name: 'Подземка', sub: 'Поезда пересекают путь', theme: 'metro', R: 200, half: 12,
    h: [[2, .15, 1], [4, .09, .4], [6, .04, 2.2]],
    hz: [['train', .22, 0, 0, 7.5], ['train', .52, 0, 3.7, 7.5], ['train', .80, 0, 1.5, 6.5], ['pad', .12, 0], ['pad', .38, -3], ['pad', .66, 3], ['cone', .30, 6], ['cone', .72, -7]] },
  { id: 'hell', name: 'Адская цитадель', sub: 'Лава на дороге', theme: 'hell', R: 215, half: 13,
    h: [[3, .14, .2], [5, .08, 1.7], [2, .10, 2.5]],
    hz: [['lava', .15, 4, 5.5], ['lava', .26, -5, 5.5], ['lava', .40, 0, 6], ['lava', .55, 6, 5.5], ['lava', .68, -4, 6], ['lava', .84, 3, 5.5], ['pad', .20, -4], ['pad', .47, 4], ['pad', .75, 0], ['cone', .34, -8], ['cone', .91, 7]] },
  { id: 'lab', name: 'Лаборатория «Каскад»', sub: 'Лазеры и конвейеры', theme: 'lab', R: 200, half: 12,
    h: [[2, .13, .8], [4, .10, 2.2], [7, .04, .5]],
    hz: [['laser', .16, 0, 2.0, 1.6], ['laser', .36, 0, 0.5, 1.5], ['laser', .62, 0, 1.2, 1.4], ['laser', .86, 0, 2.6, 1.8], ['belt', .24, 60, 1], ['belt', .70, 70, -1], ['pad', .45, 0], ['pad', .93, -3], ['cone', .08, 7]] },
  { id: 'portal', name: 'Полигон порталов', sub: 'Телепорты и срезки', theme: 'portal', R: 220, half: 13,
    h: [[2, .10, 0], [3, .12, 1.5], [5, .06, .7]],
    hz: [['portal', .20, 0, .30], ['portal', .55, 0, .66], ['pad', .12, 0], ['pad', .43, 4], ['pad', .80, -3], ['cone', .35, 6], ['cone', .35, -6], ['cone', .90, 0]] },
  { id: 'neon', name: 'Неон-город', sub: 'Ночь и ускорители', theme: 'neon', R: 230, half: 12,
    h: [[2, .14, 2], [3, .08, .6], [6, .06, 1.1]],
    hz: [['pad', .08, 0], ['pad', .22, -4], ['pad', .35, 4], ['pad', .52, 0], ['pad', .68, -3], ['pad', .88, 3], ['cone', .15, 5], ['cone', .28, -6], ['cone', .44, 6], ['cone', .60, -6], ['cone', .76, 5], ['cone', .95, -5]] },
  { id: 'ice', name: 'Ледяные пики', sub: 'Скользко. Очень', theme: 'ice', R: 235, half: 14,
    h: [[2, .12, 1.1], [3, .10, 2.8], [5, .07, .3]],
    hz: [['pad', .18, 0], ['pad', .50, 0], ['pad', .83, 0], ['cone', .12, 8], ['cone', .27, -8], ['cone', .40, 7], ['cone', .58, -7], ['cone', .72, 8], ['cone', .92, -8]] },
  { id: 'final', name: 'Свинодром', sub: 'Финал: всё сразу', theme: 'final', R: 250, half: 13,
    h: [[2, .13, .4], [3, .10, 1.9], [4, .07, .9], [7, .03, 2.6]],
    hz: [['lava', .10, -5, 5], ['mud', .17, 5, 6], ['laser', .24, 0, 0.7, 1.5], ['train', .33, 0, 0, 7], ['portal', .39, 0, .52], ['lava', .60, 4, 5], ['laser', .68, 0, 2.0, 1.4], ['belt', .72, 60, 1], ['train', .84, 0, 2.5, 6.5], ['pad', .06, 0], ['pad', .28, 3], ['pad', .57, -3], ['pad', .93, 0], ['cone', .45, 6], ['cone', .78, -7]] }
];
KC.THEME = {
  farm:   { sky: 0x9bd4ff, fog: 0xbfe3ff, fogD: .0035, ground: 0x6fb455, road: 0x575a63, edge: 0xffffff, wall: 0xd8c9a8, sun: 1.0, amb: 0xdcefff },
  metro:  { sky: 0x0b0d12, fog: 0x0b0d12, fogD: .012, ground: 0x23262c, road: 0x2e3138, edge: 0xffd23f, wall: 0x4d535c, sun: .35, amb: 0x8a93a3 },
  hell:   { sky: 0x2a0806, fog: 0x3a0e08, fogD: .008, ground: 0x2b1410, road: 0x4a3830, edge: 0xff5a1a, wall: 0x6b2a1a, sun: .55, amb: 0xff8a5a },
  lab:    { sky: 0xb8d0c4, fog: 0xa9c6b8, fogD: .006, ground: 0x7f9488, road: 0x8d949a, edge: 0xffb300, wall: 0xe2e6e8, sun: .95, amb: 0xe4f4ee },
  portal: { sky: 0xe9eef3, fog: 0xe3e9ef, fogD: .004, ground: 0xcfd6de, road: 0xf1f3f6, edge: 0x34c4ff, wall: 0xffffff, sun: 1.0, amb: 0xffffff },
  neon:   { sky: 0x070418, fog: 0x120a30, fogD: .007, ground: 0x0d0a1e, road: 0x1d1a30, edge: 0xff2bd6, wall: 0x2a2060, sun: .4, amb: 0x7a6aff },
  ice:    { sky: 0xcfe6f7, fog: 0xdcecf7, fogD: .005, ground: 0xe7f2fa, road: 0xa9d4ee, edge: 0xffffff, wall: 0xcfe9fb, sun: 1.0, amb: 0xe8f6ff },
  final:  { sky: 0x1a0f2a, fog: 0x2a1a3a, fogD: .006, ground: 0x2a2038, road: 0x3b3550, edge: 0xffc83d, wall: 0x6a4a8a, sun: .6, amb: 0xc8a8ff }
};

/* Строим трассу: замкнутая кривая в полярных координатах (она не самопересекается), затем равномерная по длине выборка. */
KC.buildTrack = function (idx) {
  const d = KC.TRACKS[idx]; const M = 3000, P = new Float64Array(M * 2);
  for (let i = 0; i < M; i++) {
    const th = i / M * Math.PI * 2; let r = 1;
    for (const [k, a, ph] of d.h) r += a * Math.sin(k * th + ph);
    P[i * 2] = d.R * r * Math.cos(th); P[i * 2 + 1] = d.R * r * Math.sin(th);
  }
  const cum = new Float64Array(M + 1);
  for (let i = 0; i < M; i++) { const j = (i + 1) % M; cum[i + 1] = cum[i] + Math.hypot(P[j * 2] - P[i * 2], P[j * 2 + 1] - P[i * 2 + 1]); }
  const L0 = cum[M], N = Math.round(L0 / 3), ds = L0 / N;
  const x = new Float64Array(N), z = new Float64Array(N);
  let seg = 0;
  for (let n = 0; n < N; n++) {
    const s = n * ds; while (cum[seg + 1] < s) seg++;
    const j = (seg + 1) % M, f = (s - cum[seg]) / (cum[seg + 1] - cum[seg]);
    x[n] = P[seg * 2] + (P[j * 2] - P[seg * 2]) * f; z[n] = P[seg * 2 + 1] + (P[j * 2 + 1] - P[seg * 2 + 1]) * f;
  }
  const tx = new Float64Array(N), tz = new Float64Array(N), curv = new Float64Array(N), ang = new Float64Array(N);
  for (let n = 0; n < N; n++) {
    const a = (n + N - 2) % N, b = (n + 2) % N, dx = x[b] - x[a], dz = z[b] - z[a], l = Math.hypot(dx, dz);
    tx[n] = dx / l; tz[n] = dz / l; ang[n] = Math.atan2(tx[n], tz[n]);
  }
  for (let n = 0; n < N; n++) curv[n] = KC.wrapAng(ang[(n + 3) % N] - ang[(n + N - 3) % N]) / (6 * ds);
  const T = { def: d, idx, N, L: L0, ds, half: d.half, x, z, tx, tz, curv, ang, theme: KC.THEME[d.theme], haz: [], boxes: [], coins: [] };
  T.at = function (s, lat) {
    s = ((s % T.L) + T.L) % T.L; const f = s / ds, i = Math.floor(f) % N, j = (i + 1) % N, u = f - Math.floor(f);
    const px = x[i] + (x[j] - x[i]) * u, pz = z[i] + (z[j] - z[i]) * u;
    let ttx = tx[i] + (tx[j] - tx[i]) * u, ttz = tz[i] + (tz[j] - tz[i]) * u; const l = Math.hypot(ttx, ttz) || 1; ttx /= l; ttz /= l;
    lat = lat || 0; return { x: px - ttz * lat, z: pz + ttx * lat, tx: ttx, tz: ttz, h: Math.atan2(ttx, ttz), s };
  };
  /* ближайшая точка: ищем рядом с подсказкой, при потере делаем глобальный поиск */
  T.nearest = function (px, pz, hint) {
    let best = -1, bd = 1e18;
    if (hint !== undefined && hint >= 0) {
      for (let k = -8; k <= 14; k++) { const i = (hint + k + N * 4) % N, dd = (x[i] - px) ** 2 + (z[i] - pz) ** 2; if (dd < bd) { bd = dd; best = i; } }
      if (bd > 70 * 70) best = -1;
    }
    if (best < 0) { bd = 1e18; for (let i = 0; i < N; i++) { const dd = (x[i] - px) ** 2 + (z[i] - pz) ** 2; if (dd < bd) { bd = dd; best = i; } } }
    const i0 = best, a = (i0 + N - 1) % N, b = (i0 + 1) % N;
    // проекция на ближайший из двух соседних отрезков
    function proj(i, j) { const sx = x[j] - x[i], sz = z[j] - z[i], l2 = sx * sx + sz * sz, u = KC.clamp(((px - x[i]) * sx + (pz - z[i]) * sz) / l2, 0, 1); const cx = x[i] + sx * u, cz = z[i] + sz * u; return { u, cx, cz, dd: (px - cx) ** 2 + (pz - cz) ** 2 }; }
    const p1 = proj(a, i0), p2 = proj(i0, b);
    let i, p; if (p1.dd < p2.dd) { i = a; p = p1; } else { i = i0; p = p2; }
    const j = (i + 1) % N; let ttx = tx[i] + (tx[j] - tx[i]) * p.u, ttz = tz[i] + (tz[j] - tz[i]) * p.u; const l = Math.hypot(ttx, ttz) || 1; ttx /= l; ttz /= l;
    const d = (px - p.cx) * (-ttz) + (pz - p.cz) * ttx; // + справа по ходу
    let s = (i + p.u) * ds; if (s >= T.L) s -= T.L;
    return { i, s, d, tx: ttx, tz: ttz, h: Math.atan2(ttx, ttz) };
  };
  /* препятствия и зоны */
  for (const hz of d.hz) {
    const k = hz[0], t = hz[1], s = t * T.L, c = T.at(s, 0), o = { k, s, x: c.x, z: c.z, tx: c.tx, tz: c.tz };
    if (k === 'mud' || k === 'lava') { o.lat = hz[2]; o.r = hz[3]; const q = T.at(s, o.lat); o.x = q.x; o.z = q.z; }
    else if (k === 'pad') { o.lat = hz[2]; const q = T.at(s, o.lat); o.x = q.x; o.z = q.z; o.len = 8; o.w = 6; }
    else if (k === 'cone') { o.lat = hz[2]; const q = T.at(s, o.lat); o.x = q.x; o.z = q.z; o.r = 1.3; }
    else if (k === 'laser') { o.ph = hz[3]; o.on = hz[4]; o.off = 1.9; }
    else if (k === 'train') { o.ph = hz[3]; o.period = hz[4]; }
    else if (k === 'belt') { o.len = hz[2]; o.dir = hz[3]; o.s1 = s + o.len; }
    else if (k === 'portal') { o.s2 = hz[3] * T.L; const q = T.at(o.s2, 0); o.x2 = q.x; o.z2 = q.z; o.tx2 = q.tx; o.tz2 = q.tz; o.r = 4.5; }
    T.haz.push(o);
  }
  // коробки с предметами и монеты
  for (const t of [.06, .30, .55, .79]) for (const lat of [-6, 0, 6]) { const q = T.at(t * T.L, lat); T.boxes.push({ x: q.x, z: q.z, s: t * T.L, lat, cd: 0 }); }
  for (let i = 0; i < 48; i++) { const s = (i + .5) / 48 * T.L, lat = Math.sin(i * .7) * 7, q = T.at(s, lat); T.coins.push({ x: q.x, z: q.z, s, lat }); }
  return T;
};
})(typeof window !== 'undefined' ? window : globalThis);
