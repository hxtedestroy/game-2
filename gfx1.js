/* Хрю-карт: графика, часть 1. Сцена, трасса, декор. Требует three.js r128. */
(function (root) {
'use strict';
const KC = root.KC, THREE = root.THREE; const { clamp, lerp } = KC;
const G = KC.gfx = {};
G.IS_TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches;

/* ---------- кэши ---------- */
const matC = new Map(), geoC = {};
G.mat = function (hex, opt) { const key = hex + (opt ? JSON.stringify(opt) : ''); let m = matC.get(key); if (!m) { m = new THREE.MeshLambertMaterial(Object.assign({ color: hex }, opt || {})); matC.set(key, m); } return m; };
G.basic = function (hex, opt) { const key = 'b' + hex + (opt ? JSON.stringify(opt) : ''); let m = matC.get(key); if (!m) { m = new THREE.MeshBasicMaterial(Object.assign({ color: hex }, opt || {})); matC.set(key, m); } return m; };
G.geo = function (k) {
  if (geoC[k]) return geoC[k];
  const g = k === 'b' ? new THREE.BoxGeometry(1, 1, 1) : k === 'c' ? new THREE.CylinderGeometry(1, 1, 1, 10) : k === 's' ? new THREE.SphereGeometry(1, 12, 9) : new THREE.ConeGeometry(1, 1, 8);
  return geoC[k] = g;
};
const hexNum = s => typeof s === 'number' ? s : parseInt(s.slice(1), 16);
G.hex = hexNum;
/* деталь по описанию [форма, a, b, c, x, y, z, цвет] */
G.part = function (d, look) {
  const sh = d[0]; let col = d[7];
  if (col === '$a') col = KC.PALETTE[look.accC | 0]; else if (col === '$t') col = KC.PALETTE[look.topC | 0]; else if (col === '$b') col = KC.PALETTE[look.botC | 0];
  const m = new THREE.Mesh(G.geo(sh), G.mat(hexNum(col)));
  if (sh === 'b') m.scale.set(d[1], d[2], d[3]); else if (sh === 'c') m.scale.set(d[1], d[2], d[1]); else if (sh === 's') m.scale.set(d[1], d[1], d[1]); else m.scale.set(d[1], d[2], d[1]);
  m.position.set(d[4], d[5], d[6]); return m;
};

/* ---------- инициализация ---------- */
let renderer = null, scene = null, camera = null, world = null, sun = null, hemi = null, quality = 'med';
G.init = function (canvas) {
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(70, 1, .3, 1800); scene.add(camera);
  hemi = new THREE.HemisphereLight(0xffffff, 0x666666, .85); scene.add(hemi);
  sun = new THREE.DirectionalLight(0xffffff, .8); sun.position.set(-80, 140, 60); sun.target.position.set(0, 0, 0); scene.add(sun, sun.target);
  G.renderer = renderer; G.scene = scene; G.camera = camera;
  G.setQuality(quality); G.resize();
  return G;
};
G.setQuality = function (q) {
  if (q === 'auto') q = G.IS_TOUCH ? 'med' : 'high'; quality = q; G.quality = q;
  if (!renderer) return;
  const pr = q === 'low' ? 1 : q === 'med' ? Math.min(devicePixelRatio || 1, 1.5) : Math.min(devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pr); renderer.shadowMap.enabled = q === 'high'; sun.castShadow = q === 'high';
  if (q === 'high') { sun.shadow.mapSize.set(1024, 1024); Object.assign(sun.shadow.camera, { left: -45, right: 45, top: 45, bottom: -45, near: 10, far: 300 }); }
  G.resize();
};
G.resize = function () { if (!renderer) return; const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
G.render = function () { renderer.render(scene, camera); };

/* ---------- сборщик плоских деталей ---------- */
function Quads() { this.p = []; this.c = []; this.n = []; }
Quads.prototype.add = function (a, b, c, d, col, nx, ny, nz) {
  const cc = new THREE.Color(col), push = (v) => { this.p.push(v[0], v[1], v[2]); this.c.push(cc.r, cc.g, cc.b); this.n.push(nx, ny, nz); };
  push(a); push(b); push(c); push(c); push(b); push(d);
};
Quads.prototype.mesh = function (opt) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(this.p), 3)); g.setAttribute('color', new THREE.BufferAttribute(new Float32Array(this.c), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(this.n), 3));
  const m = new THREE.Mesh(g, new THREE.MeshLambertMaterial(Object.assign({ vertexColors: true, side: THREE.DoubleSide }, opt || {}))); m.frustumCulled = false; return m;
};
const latPt = (T, i, lat, y) => { i = ((i % T.N) + T.N) % T.N; return [T.x[i] - T.tz[i] * lat, y, T.z[i] + T.tx[i] * lat]; };

/* текстуры */
function canvasTex(w, h, draw) { const cv = document.createElement('canvas'); cv.width = w; cv.height = h; draw(cv.getContext('2d'), w, h); const t = new THREE.CanvasTexture(cv); return t; }
const texs = {};
G.tex = function (name) {
  if (texs[name]) return texs[name];
  let t;
  if (name === 'chev') t = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#1a1a22'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffd23f'; for (let k = 0; k < 3; k++) { const y = 20 + k * 38; g.beginPath(); g.moveTo(6, y + 24); g.lineTo(32, y); g.lineTo(58, y + 24); g.lineTo(58, y + 36); g.lineTo(32, y + 12); g.lineTo(6, y + 36); g.fill(); } });
  else if (name === 'belt') t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#34383d'; g.fillRect(0, 0, w, h); g.fillStyle = '#ffb300'; g.beginPath(); g.moveTo(8, 48); g.lineTo(32, 16); g.lineTo(56, 48); g.lineTo(56, 58); g.lineTo(32, 28); g.lineTo(8, 58); g.fill(); });
  else if (name === 'box') t = canvasTex(64, 64, (g, w, h) => { g.fillStyle = '#ffb21a'; g.fillRect(0, 0, w, h); g.strokeStyle = '#fff'; g.lineWidth = 4; g.strokeRect(3, 3, w - 6, h - 6); g.fillStyle = '#fff'; g.font = 'bold 44px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', w / 2, h / 2 + 3); });
  else if (name === 'glow') t = canvasTex(64, 64, (g, w, h) => { const r = g.createRadialGradient(32, 32, 2, 32, 32, 32); r.addColorStop(0, 'rgba(255,255,255,1)'); r.addColorStop(.5, 'rgba(255,255,255,.55)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = r; g.fillRect(0, 0, w, h); });
  else if (name === 'swirl') t = canvasTex(128, 128, (g, w, h) => { g.translate(64, 64); for (let i = 0; i < 6; i++) { g.rotate(Math.PI / 3); const r = g.createLinearGradient(0, 0, 60, 0); r.addColorStop(0, 'rgba(255,255,255,.9)'); r.addColorStop(1, 'rgba(255,255,255,0)'); g.strokeStyle = r; g.lineWidth = 9; g.beginPath(); g.arc(30, 0, 30, -1.2, 1.2); g.stroke(); } });
  else if (name === 'win') t = canvasTex(64, 128, (g, w, h) => { g.fillStyle = '#10142a'; g.fillRect(0, 0, w, h); const cols = ['#ffd27a', '#7ad0ff', '#ff7ae0', '#9bff9b']; for (let y = 4; y < h; y += 10) for (let x = 4; x < w; x += 10) if (Math.random() < .55) { g.fillStyle = cols[(Math.random() * 4) | 0]; g.fillRect(x, y, 5, 6); } });
  else if (name === 'check') t = canvasTex(64, 64, (g, w, h) => { for (let y = 0; y < 2; y++) for (let x = 0; x < 8; x++) { g.fillStyle = (x + y) % 2 ? '#111' : '#fff'; g.fillRect(x * 8, y * 32, 8, 32); } });
  t.wrapS = t.wrapT = THREE.RepeatWrapping; return texs[name] = t;
};

/* ---------- мир ---------- */
G.buildWorld = function (T) {
  if (world) G.disposeWorld();
  const th = T.theme, W = world = { T, group: new THREE.Group(), haz: [], boxes: [], coins: [], anim: [], sparkle: [] };
  scene.add(W.group);
  scene.background = new THREE.Color(th.sky); scene.fog = new THREE.FogExp2(th.fog, th.fogD * (quality === 'low' ? 1.3 : 1));
  hemi.color.setHex(th.amb); hemi.groundColor.setHex(th.ground); hemi.intensity = .55 + th.sun * .45; sun.intensity = th.sun * .85;
  sun.color.setHex(T.def.theme === 'hell' ? 0xff9a6a : T.def.theme === 'neon' || T.def.theme === 'final' ? 0xb8a8ff : 0xffffff);
  const rnd = KC.rng(T.idx * 977 + 5), half = T.half, WALL = KC.CONST.WALL;
  // земля
  const gnd = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.MeshLambertMaterial({ color: th.ground })); gnd.rotation.x = -Math.PI / 2; gnd.position.y = -.08; gnd.receiveShadow = true; W.group.add(gnd);
  // дорога, бордюры, стены
  const Q = new Quads(), road = new THREE.Color(th.road), edge = new THREE.Color(th.edge), wall = new THREE.Color(th.wall), apron = new THREE.Color(th.ground).multiplyScalar(1.25);
  const N = T.N;
  for (let i = 0; i < N; i++) {
    const j = i + 1, sh = (i % 6 < 3) ? 1 : .93, rc = road.clone().multiplyScalar(sh);
    Q.add(latPt(T, i, -half, .02), latPt(T, i, half, .02), latPt(T, j, -half, .02), latPt(T, j, half, .02), rc, 0, 1, 0);
    const ec = (i % 4 < 2) ? edge : new THREE.Color(0x222222);
    Q.add(latPt(T, i, half - .7, .035), latPt(T, i, half, .035), latPt(T, j, half - .7, .035), latPt(T, j, half, .035), ec, 0, 1, 0);
    Q.add(latPt(T, i, -half, .035), latPt(T, i, -half + .7, .035), latPt(T, j, -half, .035), latPt(T, j, -half + .7, .035), ec, 0, 1, 0);
    Q.add(latPt(T, i, half, .01), latPt(T, i, half + WALL, .01), latPt(T, j, half, .01), latPt(T, j, half + WALL, .01), apron, 0, 1, 0);
    Q.add(latPt(T, i, -half - WALL, .01), latPt(T, i, -half, .01), latPt(T, j, -half - WALL, .01), latPt(T, j, -half, .01), apron, 0, 1, 0);
    if (i % 8 < 4) Q.add(latPt(T, i, -.15, .03), latPt(T, i, .15, .03), latPt(T, j, -.15, .03), latPt(T, j, .15, .03), new THREE.Color(0xffffff).multiplyScalar(.9), 0, 1, 0);
    const wc = (i % 10 < 5) ? wall : wall.clone().multiplyScalar(.8);
    for (const sg of [-1, 1]) {
      const l = sg * (half + WALL), a = latPt(T, i, l, 0), b = latPt(T, i, l, 1.5), c = latPt(T, j, l, 0), d = latPt(T, j, l, 1.5);
      Q.add(a, b, c, d, wc, -T.tz[i] * -sg, 0, T.tx[i] * -sg);
    }
  }
  const roadMesh = Q.mesh(); roadMesh.receiveShadow = true; W.group.add(roadMesh);
  // линия старта и финиша
  {
    const q = new Quads(); for (let r = 0; r < 2; r++) for (let c = 0; c < 12; c++) { const l0 = -half + c * (2 * half / 12), l1 = l0 + 2 * half / 12, i0 = r, i1 = r + 1; q.add(latPt(T, i0, l0, .045), latPt(T, i0, l1, .045), latPt(T, i1, l0, .045), latPt(T, i1, l1, .045), (r + c) % 2 ? 0x111111 : 0xffffff, 0, 1, 0); }
    W.group.add(q.mesh());
    const a = T.at(2, 0), arc = new THREE.Group();
    for (const sg of [-1, 1]) { const p = new THREE.Mesh(G.geo('b'), G.mat(0x2b2b33)); p.scale.set(1.2, 9, 1.2); p.position.set(-sg * (half + WALL + .8), 4.5, 0); arc.add(p); }
    const ban = new THREE.Mesh(G.geo('b'), new THREE.MeshBasicMaterial({ map: G.tex('check') })); ban.scale.set(2 * (half + WALL + 1.4), 2.6, 1.2); ban.position.set(0, 9, 0); G.tex('check').repeat.set(8, 1); arc.add(ban);
    arc.position.set(a.x, 0, a.z); arc.rotation.y = Math.atan2(a.tx, a.tz); W.group.add(arc);
  }
  buildHazards(W, rnd); buildPickups(W); buildDecor(W, rnd);
  return W;
};
G.disposeWorld = function () {
  if (!world) return; scene.remove(world.group);
  world.group.traverse(o => { if (o.geometry && !Object.values(geoC).includes(o.geometry)) o.geometry.dispose(); }); world = null;
};
G.world = () => world;

/* ---------- препятствия ---------- */
function buildHazards(W, rnd) {
  const T = W.T, half = T.half, grp = W.group, flat = (r, col, y) => { const m = new THREE.Mesh(new THREE.CircleGeometry(r, 24), new THREE.MeshBasicMaterial({ color: col })); m.rotation.x = -Math.PI / 2; m.position.y = y; return m; };
  for (const z of T.haz) {
    const o = { z, m: null };
    if (z.k === 'mud') { const m = flat(z.r, 0x4a3320, .05); m.position.x = z.x; m.position.z = z.z; grp.add(m); const m2 = flat(z.r * .7, 0x5d4129, .055); m2.position.set(z.x, .055, z.z); grp.add(m2); }
    else if (z.k === 'lava') { const m = flat(z.r, 0xff5a1a, .06); m.position.set(z.x, .06, z.z); grp.add(m); const m2 = flat(z.r * .55, 0xffd34a, .065); m2.position.set(z.x, .065, z.z); grp.add(m2); o.m = m; o.m2 = m2; }
    else if (z.k === 'pad') {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(z.w, z.len), new THREE.MeshBasicMaterial({ map: G.tex('chev'), side: THREE.DoubleSide })); m.rotation.x = Math.PI / 2;
      const pivot = new THREE.Group(); pivot.rotation.y = Math.atan2(z.tx, z.tz); pivot.position.set(z.x, .05, z.z); pivot.add(m); grp.add(pivot);
    }
    else if (z.k === 'cone') { const c = new THREE.Mesh(G.geo('k'), G.mat(0xff7a1a)); c.scale.set(1.3, 2.4, 1.3); c.position.set(z.x, 1.2, z.z); c.castShadow = true; grp.add(c); const b = new THREE.Mesh(G.geo('b'), G.mat(0x222222)); b.scale.set(2.2, .2, 2.2); b.position.set(z.x, .1, z.z); grp.add(b); const s = new THREE.Mesh(G.geo('c'), G.mat(0xffffff)); s.scale.set(.75, .35, .75); s.position.set(z.x, 1.2, z.z); grp.add(s); }
    else if (z.k === 'laser') {
      const c = T.at(z.s, 0), g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = Math.atan2(c.tx, c.tz);
      for (const sg of [-1, 1]) { const p = new THREE.Mesh(G.geo('c'), G.mat(0x39404a)); p.scale.set(.5, 2.2, .5); p.position.set(sg * (half + 1.4), 1.1, 0); g.add(p); const e = new THREE.Mesh(G.geo('s'), G.basic(0xff3b30)); e.scale.set(.45, .45, .45); e.position.set(sg * (half + 1.4), 2.3, 0); g.add(e); }
      const beam = new THREE.Mesh(G.geo('b'), G.basic(0xff2a2a)); beam.scale.set(2 * half + 2, .16, .16); beam.position.set(0, .9, 0); g.add(beam); o.beam = beam; grp.add(g);
    }
    else if (z.k === 'train') {
      const c = T.at(z.s, 0), g = new THREE.Group(); g.position.set(c.x, 0, c.z); g.rotation.y = Math.atan2(c.tx, c.tz); const body = new THREE.Group(); g.add(body);
      const b = new THREE.Mesh(G.geo('b'), G.mat(0x3d6fb5)); b.scale.set(5.2, 3.4, 22); b.position.y = 1.9; body.add(b); body.rotation.y = Math.PI / 2; // длинная ось поперёк трассы
      const st = new THREE.Mesh(G.geo('b'), G.mat(0xe8eef7)); st.scale.set(5.3, .5, 22.1); st.position.y = 2.3; body.add(st);
      for (let k = -4; k <= 4; k++) { const w = new THREE.Mesh(G.geo('b'), G.basic(0xfff2b0)); w.scale.set(5.35, 1, 1.6); w.position.set(0, 2.7, k * 2.3); body.add(w); }
      const hl = new THREE.Mesh(G.geo('s'), G.basic(0xffffcc)); hl.scale.set(.6, .6, .6); hl.position.set(0, 1.2, 11); body.add(hl);
      g.visible = false; o.g = g; o.c = c; grp.add(g);
      const lamp = new THREE.Mesh(G.geo('s'), G.basic(0xff3030)); lamp.scale.set(.7, .7, .7); const cc = T.at(z.s, half + 2.5); lamp.position.set(cc.x, 3.4, cc.z); grp.add(lamp); const pole = new THREE.Mesh(G.geo('c'), G.mat(0x444a55)); pole.scale.set(.2, 3.4, .2); pole.position.set(cc.x, 1.7, cc.z); grp.add(pole); o.lamp = lamp;
    }
    else if (z.k === 'belt') {
      const geo = new THREE.BufferGeometry(), pos = [], uv = [], idx = [], steps = Math.round(z.len / T.ds);
      for (let i = 0; i <= steps; i++) { const ii = Math.floor(z.s / T.ds) + i, a = latPt(T, ii, -half, .045), b = latPt(T, ii, half, .045); pos.push(...a, ...b); uv.push(0, i * T.ds / 6, 1, i * T.ds / 6); if (i < steps) { const k = i * 2; idx.push(k, k + 1, k + 2, k + 2, k + 1, k + 3); } }
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); geo.setIndex(idx);
      const tex = G.tex('belt').clone(); tex.needsUpdate = true; tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1);
      const m = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: tex, side: THREE.DoubleSide })); m.frustumCulled = false; grp.add(m); o.tex = tex;
    }
    else if (z.k === 'portal') {
      const mk = (x, zz, tx, tz, col) => {
        const g = new THREE.Group(); g.position.set(x, 4.6, zz); g.rotation.y = Math.atan2(tx, tz);
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.4, .5, 8, 28), G.basic(col)); g.add(ring);
        const disc = new THREE.Mesh(new THREE.CircleGeometry(4.2, 28), new THREE.MeshBasicMaterial({ map: G.tex('swirl'), color: col, transparent: true, opacity: .75, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false })); g.add(disc);
        grp.add(g); return disc;
      };
      o.d1 = mk(z.x, z.z, z.tx, z.tz, 0x34d4ff); o.d2 = mk(z.x2, z.z2, z.tx2, z.tz2, 0xff4fd8);
      const lbl = flat(5, 0x34d4ff, .07); lbl.position.set(z.x, .07, z.z); grp.add(lbl); lbl.material.transparent = true; lbl.material.opacity = .35;
    }
    W.haz.push(o);
  }
}
function buildPickups(W) {
  const T = W.T;
  for (const b of T.boxes) { const m = new THREE.Mesh(G.geo('b'), new THREE.MeshBasicMaterial({ map: G.tex('box') })); m.scale.set(1.8, 1.8, 1.8); m.position.set(b.x, 1.6, b.z); W.group.add(m); W.boxes.push(m); }
  const cg = new THREE.CylinderGeometry(.8, .8, .18, 14), cm = new THREE.MeshBasicMaterial({ color: 0xffc83d });
  for (const c of T.coins) { const m = new THREE.Mesh(cg, cm); m.rotation.x = Math.PI / 2; m.position.set(c.x, 1.3, c.z); const piv = new THREE.Group(); piv.position.set(c.x, 1.3, c.z); m.position.set(0, 0, 0); piv.add(m); W.group.add(piv); W.coins.push(piv); }
}
G.updateWorld = function (race, dt, time, localId) {
  const W = world; if (!W) return; const T = W.T, k = race.karts[localId] || race.karts[0];
  W.boxes.forEach((m, i) => { const b = T.boxes[i]; m.visible = b.cd <= 0; m.rotation.y = time * 1.6; m.rotation.x = time * .9; m.position.y = 1.7 + Math.sin(time * 2 + i) * .25; });
  W.coins.forEach((p, i) => { p.visible = !k.got.has(i); p.rotation.y = time * 3 + i; });
  for (const o of W.haz) {
    const z = o.z;
    if (z.k === 'lava' && o.m) { const s = 1 + Math.sin(time * 3 + z.s) * .04; o.m.scale.set(s, s, 1); o.m2.material.color.setHSL(.1 + .03 * Math.sin(time * 4 + z.s), 1, .55); }
    else if (z.k === 'laser') o.beam.visible = race.laserOn(z);
    else if (z.k === 'train') {
      const tr = race.trainPos(z); o.g.visible = tr !== null;
      if (tr !== null) { const q = T.at(z.s, tr); o.g.position.set(q.x, 0, q.z); }
      const soon = race.trainPos(z, race.t + 1.4) !== null || tr !== null; o.lamp.visible = soon && (Math.floor(time * 6) % 2 === 0);
    }
    else if (z.k === 'belt') o.tex.offset.y -= z.dir * dt * 1.6 * .8;
    else if (z.k === 'portal') { o.d1.rotation.z += dt * 2; o.d2.rotation.z -= dt * 2; }
  }
};

/* ---------- декор ---------- */
function inst(geo, mat, n) { const m = new THREE.InstancedMesh(geo, mat, n); m.frustumCulled = false; m.count = 0; return m; }
function buildDecor(W, rnd) {
  const T = W.T, half = T.half, WALL = KC.CONST.WALL, th = T.def.theme, grp = W.group, dens = quality === 'low' ? .45 : quality === 'med' ? .75 : 1;
  const M = new THREE.Matrix4(), Q = new THREE.Quaternion(), P = new THREE.Vector3(), S = new THREE.Vector3(), C = new THREE.Color(), UP = new THREE.Vector3(0, 1, 0);
  function pool(geo, mat, n) { const m = inst(geo, mat, n); m.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(n * 3), 3); grp.add(m); return m; }
  function put(m, x, y, z, sx, sy, sz, ry, col) { if (m.count >= m.instanceMatrix.count) return; Q.setFromAxisAngle(UP, ry || 0); P.set(x, y, z); S.set(sx, sy, sz); M.compose(P, Q, S); m.setMatrixAt(m.count, M); C.setHex(col); m.setColorAt(m.count, C); m.count++; }
  const place = (minL, maxL) => { for (let t = 0; t < 30; t++) { const s = rnd() * T.L, sg = rnd() < .5 ? -1 : 1, lat = sg * (half + WALL + minL + rnd() * (maxL - minL)), q = T.at(s, lat), n = T.nearest(q.x, q.z); if (Math.abs(n.d) > half + WALL + 4) return { x: q.x, z: q.z, s, sg, lat, h: q.h }; } return null; };
  const N = n => Math.round(n * dens);
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const boxG = G.geo('b'), cylG = G.geo('c'), coneG = G.geo('k'), sphG = G.geo('s');
  if (th === 'farm' || th === 'ice' || th === 'final') {
    const tr = pool(cylG, mat, 400), lf = pool(coneG, mat, 400), ice = th === 'ice';
    for (let i = 0; i < N(th === 'final' ? 60 : 190); i++) { const p = place(3, 70); if (!p) continue; const s = .8 + rnd() * 1.2; put(tr, p.x, 1 * s, p.z, .35 * s, 2 * s, .35 * s, 0, ice ? 0x8a9ab0 : 0x7a5230); put(lf, p.x, 3.4 * s, p.z, 1.7 * s, 4 * s, 1.7 * s, 0, ice ? 0xe8f4ff : [0x3f8f3a, 0x4fa04a, 0x2f7a3a][(rnd() * 3) | 0]); }
    tr.instanceMatrix.needsUpdate = lf.instanceMatrix.needsUpdate = true;
    if (th === 'farm') {
      const hay = pool(boxG, mat, 80), barn = pool(boxG, mat, 30);
      for (let i = 0; i < N(50); i++) { const p = place(2, 20); if (p) put(hay, p.x, .9, p.z, 2.4, 1.8, 1.8, rnd() * 3, 0xe0c060); }
      for (let i = 0; i < N(7); i++) { const p = place(14, 60); if (p) { put(barn, p.x, 3, p.z, 14, 6, 10, p.h, 0xb03a2a); put(barn, p.x, 7, p.z, 14.6, 1.4, 10.6, p.h, 0x6a2a20); } }
    }
    if (ice) { const cr = pool(coneG, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .85 }), 200); for (let i = 0; i < N(120); i++) { const p = place(2, 60); if (p) { const s = 1 + rnd() * 3; put(cr, p.x, 3 * s, p.z, 1.2 * s, 6 * s, 1.2 * s, rnd() * 3, [0xbfe9ff, 0x9fd8ff, 0xe6f7ff][(rnd() * 3) | 0]); } } }
  }
  if (th === 'metro') {
    const pil = pool(boxG, mat, 700), lamp = pool(boxG, new THREE.MeshBasicMaterial({ color: 0xffffff }), 200), L = half + WALL + .6;
    for (let s = 0; s < T.L; s += 26) { const q = T.at(s, 0), ry = q.h; for (const sg of [-1, 1]) { const a = T.at(s, sg * L); put(pil, a.x, 4, a.z, .9, 8, .9, ry, 0x5a6270); } put(pil, q.x, 8.2, q.z, 2 * L + 1, .9, .9, ry + Math.PI / 2, 0x4a5260); put(lamp, q.x, 7.5, q.z, 2.2, .25, .6, ry + Math.PI / 2, (s / 26 | 0) % 3 ? 0xffe9b0 : 0xff8a3a); }
    const wl = pool(boxG, mat, 100); for (let i = 0; i < N(30); i++) { const p = place(6, 40); if (p) put(wl, p.x, 4, p.z, 6, 8, 6, p.h, 0x2b3038); }
  }
  if (th === 'hell' || th === 'final') {
    const sp = pool(coneG, mat, 300); for (let i = 0; i < N(th === 'final' ? 40 : 150); i++) { const p = place(3, 80); if (p) { const s = 1 + rnd() * 2.2; put(sp, p.x, 4 * s, p.z, 1.6 * s, 8 * s, 1.6 * s, 0, [0x2a1512, 0x3a1a14, 0x1a0c0a][(rnd() * 3) | 0]); } }
    const lv = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: 0xff6a1a }), 60); lv.count = 0; lv.frustumCulled = false; grp.add(lv);
    for (let i = 0; i < N(26); i++) { const p = place(6, 90); if (p) { Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); P.set(p.x, .03, p.z); const r = 6 + rnd() * 12; S.set(r, r, 1); M.compose(P, Q, S); lv.setMatrixAt(lv.count++, M); } }
  }
  if (th === 'lab' || th === 'portal' || th === 'final') {
    const tk = pool(cylG, new THREE.MeshLambertMaterial({ color: 0xffffff, transparent: true, opacity: .8 }), 120), pn = pool(boxG, mat, 260), lt = pool(boxG, new THREE.MeshBasicMaterial({ color: 0xffffff }), 160);
    for (let i = 0; i < N(th === 'final' ? 20 : 60); i++) { const p = place(4, 70); if (!p) continue; const r = 2 + rnd() * 3, h = 5 + rnd() * 9; if (th === 'lab') { put(tk, p.x, h / 2, p.z, r, h, r, 0, 0x9fe8c0); put(lt, p.x, h + .3, p.z, r * 1.6, .3, r * 1.6, 0, 0xc8ffd8); } else { put(pn, p.x, h, p.z, 2.5, h * 2, 2.5, p.h, 0xf4f6fa); put(lt, p.x, h * 1.4, p.z, 2.6, .4, .3 + rnd() * 2.4, p.h, rnd() < .5 ? 0x34d4ff : 0xff9a2a); } }
    if (th !== 'final') { const sl = new THREE.InstancedMesh(new THREE.CircleGeometry(1, 20), new THREE.MeshBasicMaterial({ color: th === 'lab' ? 0x6bff8a : 0x34d4ff }), 40); sl.count = 0; sl.frustumCulled = false; grp.add(sl); for (let i = 0; i < N(14); i++) { const p = place(8, 80); if (p) { Q.setFromAxisAngle(new THREE.Vector3(1, 0, 0), -Math.PI / 2); P.set(p.x, .03, p.z); const r = 5 + rnd() * 9; S.set(r, r, 1); M.compose(P, Q, S); sl.setMatrixAt(sl.count++, M); } } }
  }
  if (th === 'neon' || th === 'final') {
    const win = G.tex('win').clone(); win.needsUpdate = true; win.repeat.set(1, 1);
    const tw = pool(boxG, new THREE.MeshBasicMaterial({ map: win }), 160); tw.material.color.setHex(0xffffff);
    for (let i = 0; i < N(th === 'final' ? 30 : 90); i++) { const p = place(10, 120); if (p) { const h = 25 + rnd() * 70, w = 9 + rnd() * 10; put(tw, p.x, h / 2, p.z, w, h, w, p.h, [0xffffff, 0xd8d8ff, 0xffd8f0][(rnd() * 3) | 0]); } }
    const ringG = new THREE.TorusGeometry(half + WALL + 1.2, .5, 6, 24), ringM = [new THREE.MeshBasicMaterial({ color: 0xff2bd6 }), new THREE.MeshBasicMaterial({ color: 0x34e0ff })];
    for (let s = 40, i = 0; s < T.L; s += th === 'final' ? 160 : 70, i++) { const q = T.at(s, 0), r = new THREE.Mesh(ringG, ringM[i % 2]); r.position.set(q.x, half * .6 + 3, q.z); r.rotation.y = q.h; r.scale.set(1, .75, 1); grp.add(r); }
  }
  if (th === 'final') { const fl = pool(boxG, mat, 90); for (let i = 0; i < N(50); i++) { const p = place(2, 14); if (p) { put(fl, p.x, 3, p.z, .3, 6, .3, 0, 0x888888); put(fl, p.x + .9, 5.2, p.z, 1.8, 1.4, .1, p.h, [0xff4fa3, 0xffc83d, 0x7b5cff][(rnd() * 3) | 0]); } } }
  for (const c of grp.children) if (c.isInstancedMesh) { c.instanceMatrix.needsUpdate = true; if (c.instanceColor) c.instanceColor.needsUpdate = true; }
}
})(typeof window !== 'undefined' ? window : globalThis);
