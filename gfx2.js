/* Хрю-карт: графика, часть 2. Карты, водитель, эффекты, камера, предпросмотр. */
(function (root) {
'use strict';
const KC = root.KC, THREE = root.THREE, G = KC.gfx; const { clamp, lerp, wrapAng } = KC;
const H = G.hex;
const box = (g, sx, sy, sz, x, y, z, col, basic) => { const m = new THREE.Mesh(G.geo('b'), basic ? G.basic(col) : G.mat(col)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
const cyl = (g, r, h, x, y, z, col, rx, rz) => { const m = new THREE.Mesh(G.geo('c'), G.mat(col)); m.scale.set(r, h, r); m.position.set(x, y, z); if (rx) m.rotation.x = rx; if (rz) m.rotation.z = rz; g.add(m); return m; };
const sph = (g, sx, sy, sz, x, y, z, col) => { const m = new THREE.Mesh(G.geo('s'), G.mat(col)); m.scale.set(sx, sy, sz); m.position.set(x, y, z); g.add(m); return m; };
const cone = (g, r, h, x, y, z, col, rx) => { const m = new THREE.Mesh(G.geo('k'), G.mat(col)); m.scale.set(r, h, r); m.position.set(x, y, z); if (rx) m.rotation.x = rx; g.add(m); return m; };

/* ---------- водитель ---------- */
G.buildDriver = function (look) {
  const g = new THREE.Group(), pig = look.av === 'pig', skin = H(pig ? KC.SKINS_P[look.skin | 0] : KC.SKINS_H[look.skin | 0]);
  const head = new THREE.Group(); head.position.set(0, 1.85, 0); g.add(head);
  const torso = new THREE.Group(); torso.position.set(0, .7, 0); g.add(torso);
  const legs = new THREE.Group(); legs.position.set(0, .25, .55); g.add(legs);
  const back = new THREE.Group(); back.position.set(0, .8, 0); g.add(back);
  const neck = new THREE.Group(); neck.position.set(0, 1.3, .05); g.add(neck);
  const anchors = { head, torso, legs, back, neck };
  // тело
  box(torso, 1.1, 1.2, .7, 0, 0, 0, skin);
  for (const s of [-1, 1]) { box(g, .28, .28, .95, s * .7, 1.0, .5, skin); box(legs, .4, .4, 1.1, s * .3, 0, 0, skin); box(legs, .44, .36, .36, s * .3, -.02, .6, pig ? 0x4a2f3a : 0xf2f2f2); }
  // голова
  if (pig) {
    box(head, 1.1, .95, .95, 0, 0, 0, skin);
    const sn = cyl(head, .3, .3, 0, -.12, .6, H(KC.SKINS_P[(look.skin | 0)]) - 0x101010, Math.PI / 2); sn.scale.set(.3, .3, .26);
    box(head, .08, .12, .05, -.1, -.12, .76, 0x5a2a3a); box(head, .08, .12, .05, .1, -.12, .76, 0x5a2a3a);
    for (const s of [-1, 1]) { cone(head, .22, .45, s * .42, .6, -.05, skin - 0x0a0a0a); box(head, .12, .14, .06, s * .26, .15, .49, 0x111111); }
  } else {
    box(head, .95, .95, .95, 0, 0, 0, skin);
    box(head, 1.0, .3, 1.0, 0, .42, -.05, 0x3a2a1a); for (const s of [-1, 1]) box(head, .12, .14, .06, s * .24, .08, .48, 0x111111); box(head, .3, .06, .06, 0, -.22, .48, 0xaa5544);
  }
  const top = KC.findItem('top', look.top), bot = KC.findItem('bot', look.bot), hat = KC.findItem('hat', look.hat), face = KC.findItem('face', look.face), acc = KC.findItem('acc', look.acc);
  for (const it of [top, bot, hat, face, acc]) if (it) for (const d of it.parts) anchors[it.a].add(G.part(d, look));
  g.userData = { head, torso };
  return g;
};

/* ---------- карт ---------- */
G.paintColor = function (kl) { const p = KC.PAINTS.find(x => x.id === kl.paint); return p && p.c ? H(p.c) : H(KC.PALETTE[kl.c | 0]); };
G.makeKart = function (look, name) {
  const kl = look.kart || {}, root = new THREE.Group(), inner = new THREE.Group(); root.add(inner);
  const col = G.paintColor(kl), acc = H(KC.PALETTE[kl.c2 | 0]), body = kl.body || 'classic', dark = 0x22222a;
  const R = { root, inner, look, wheels: [], front: [], sw: null };
  if (body === 'classic') {
    box(inner, 2.0, .5, 3.4, 0, .55, 0, col); box(inner, 1.7, .36, 1.3, 0, .9, 1.2, col); box(inner, 2.0, .7, .8, 0, .85, -1.3, col); box(inner, 1.3, .9, .2, 0, 1.25, -.7, acc);
    box(inner, 2.1, .25, .5, 0, .45, 1.85, dark); box(inner, 2.1, .25, .5, 0, .45, -1.85, dark);
  } else if (body === 'rocket') {
    cyl(inner, .85, 3.6, 0, .9, 0, col, Math.PI / 2); cone(inner, .85, 1.6, 0, .9, 2.6, acc, Math.PI / 2); box(inner, 2.4, .12, .9, 0, .6, -1.3, acc); box(inner, .12, 1.0, .9, 0, 1.2, -1.5, acc); box(inner, 1.4, .3, 1.5, 0, .35, 0, dark);
  } else if (body === 'pickup') {
    box(inner, 2.0, .5, 3.6, 0, .55, 0, col); box(inner, 2.0, .9, 1.4, 0, 1.3, .9, col); box(inner, 1.7, .5, .06, 0, 1.4, 1.62, 0x9fd8ff, true); box(inner, 2.1, .6, 1.8, 0, .95, -1.1, acc); box(inner, 1.8, .35, 1.5, 0, 1.15, -1.1, 0x181820);
  } else {
    sph(inner, 1.15, .7, 1.8, 0, .85, 0, col); sph(inner, .8, .45, .9, 0, 1.3, -.4, acc); box(inner, 2.1, .2, .5, 0, .5, 1.9, dark); box(inner, 2.1, .2, .5, 0, .5, -1.9, dark);
  }
  // фары
  for (const s of [-1, 1]) { box(inner, .4, .25, .1, s * .7, .85, 1.95, 0xffffcc, true); box(inner, .4, .2, .1, s * .7, .85, -1.95, 0xff3030, true); }
  // колёса
  const big = kl.wheel === 'off', wr = big ? .62 : .5;
  for (const [x, z, f] of [[-1.15, 1.25, 1], [1.15, 1.25, 1], [-1.15, -1.2, 0], [1.15, -1.2, 0]]) {
    const steer = new THREE.Group(); steer.position.set(x, wr, z); const spin = new THREE.Group(); steer.add(spin);
    const tire = new THREE.Mesh(G.geo('c'), G.mat(0x15151a)); tire.scale.set(wr, .5, wr); tire.rotation.z = Math.PI / 2; spin.add(tire);
    const rimC = kl.wheel === 'gold' ? 0xffc83d : kl.wheel === 'rim' ? acc : 0xb0b4bc;
    const rim = new THREE.Mesh(G.geo('c'), kl.wheel === 'rim' || kl.wheel === 'gold' ? G.basic(rimC) : G.mat(rimC)); rim.scale.set(wr * .55, .54, wr * .55); rim.rotation.z = Math.PI / 2; spin.add(rim);
    if (big) { for (let k = 0; k < 6; k++) { const a = k / 6 * Math.PI * 2, kn = new THREE.Mesh(G.geo('b'), G.mat(0x15151a)); kn.scale.set(.5, .16, .16); kn.position.set(0, Math.sin(a) * wr, Math.cos(a) * wr); kn.rotation.x = -a; spin.add(kn); } }
    inner.add(steer); R.wheels.push(spin); if (f) R.front.push(steer);
  }
  // спойлер
  if (kl.spoil === 'wing' || kl.spoil === 'twin') { box(inner, 2.2, .1, .6, 0, 1.55, -1.7, acc); box(inner, .1, .6, .3, -.8, 1.25, -1.7, dark); box(inner, .1, .6, .3, .8, 1.25, -1.7, dark); if (kl.spoil === 'twin') box(inner, 2.2, .1, .6, 0, 1.9, -1.7, col); }
  else if (kl.spoil === 'fin') box(inner, .12, 1.1, 1.4, 0, 1.55, -1.6, acc);
  // руль и водитель
  const sw = new THREE.Group(); sw.position.set(0, 1.45, .75); sw.rotation.x = -.6; inner.add(sw); R.sw = sw;
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.32, .06, 6, 14), G.mat(0x222222)); sw.add(ring);
  const drv = G.buildDriver(look); drv.position.set(0, .75, -.45); inner.add(drv); R.driver = drv; R.head = drv.userData.head;
  // подсветка днища
  const glowDef = KC.GLOWS.find(x => x.id === kl.glow); R.glowDef = glowDef && glowDef.id !== 'none' ? glowDef : null;
  const gm = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 5.4), new THREE.MeshBasicMaterial({ map: G.tex('glow'), color: R.glowDef ? R.glowDef.c : 0xffffff, transparent: true, opacity: .7, blending: THREE.AdditiveBlending, depthWrite: false }));
  gm.rotation.x = -Math.PI / 2; gm.position.y = .1; gm.visible = !!R.glowDef; root.add(gm); R.glow = gm;
  // щит
  const sh = new THREE.Mesh(new THREE.SphereGeometry(2.7, 14, 10), new THREE.MeshBasicMaterial({ color: 0x66d9ff, transparent: true, opacity: .28, depthWrite: false })); sh.position.y = 1.3; sh.visible = false; root.add(sh); R.shield = sh;
  if (name) { R.tag = G.nameTag(name); R.tag.position.set(0, 4.6, 0); root.add(R.tag); }
  root.traverse(o => { if (o.isMesh && o !== gm && o !== sh) o.castShadow = true; });
  return R;
};
G.nameTag = function (txt) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 64; const g = cv.getContext('2d');
  g.font = 'bold 30px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineWidth = 6; g.strokeStyle = 'rgba(0,0,0,.7)'; g.strokeText(txt, 128, 34); g.fillStyle = '#fff'; g.fillText(txt, 128, 34);
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false, fog: false })); sp.scale.set(8, 2, 1); return sp;
};
G.removeKart = function (R) { if (R && R.root.parent) R.root.parent.remove(R.root); };
/* покадровое обновление модели по состоянию карта */
G.updateRig = function (R, k, dt, time) {
  R.root.position.set(k.x, 0, k.z); R.root.rotation.y = k.h;
  const sp = Math.hypot(k.vx, k.vz), sf = clamp(sp / 40, 0, 1), st = k.steer || 0;
  R.inner.rotation.z = -st * .1 * sf; R.inner.rotation.y = k.drift ? -k.dir * .32 : 0; R.inner.position.y = Math.sin(time * 34 + k.id) * .02 * sf;
  R.inner.rotation.x = k.boost > 0 ? -.06 : 0;
  for (const w of R.wheels) w.rotation.x += (k.v || sp) * dt / .5;
  for (const f of R.front) f.rotation.y = -st * .45;
  if (R.sw) R.sw.rotation.z = -st * 1.1; if (R.head) R.head.rotation.z = -st * .14;
  R.shield.visible = k.shield > 0; if (k.shield > 0) R.shield.scale.setScalar(1 + Math.sin(time * 8) * .03);
  if (R.glowDef) { const gd = R.glowDef; if (gd.anim) R.glow.material.color.setHSL((time * .4) % 1, 1, .55); R.glow.material.opacity = .55 + Math.sin(time * 6) * .12; }
  if (R.tag) R.tag.visible = !k.local;
};

/* ---------- частицы ---------- */
const NF = 700; let fxMesh = null; const F = { life: new Float32Array(NF), max: new Float32Array(NF), x: new Float32Array(NF), y: new Float32Array(NF), z: new Float32Array(NF), vx: new Float32Array(NF), vy: new Float32Array(NF), vz: new Float32Array(NF), s0: new Float32Array(NF), s1: new Float32Array(NF), c0: new Uint32Array(NF), c1: new Uint32Array(NF), g: new Float32Array(NF) };
let fxHead = 0; const _m = new THREE.Matrix4(), _c = new THREE.Color(), _c2 = new THREE.Color(), ZERO = new THREE.Matrix4().makeScale(0, 0, 0);
G.initFx = function () {
  if (fxMesh) G.scene.remove(fxMesh);
  fxMesh = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(1, 0), new THREE.MeshBasicMaterial({ fog: true }), NF); fxMesh.frustumCulled = false;
  fxMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(NF * 3), 3); for (let i = 0; i < NF; i++) { fxMesh.setMatrixAt(i, ZERO); F.life[i] = 0; } G.scene.add(fxMesh);
};
G.puff = function (x, y, z, vx, vy, vz, life, s0, s1, c0, c1, g) {
  const i = fxHead; fxHead = (fxHead + 1) % NF; F.life[i] = life; F.max[i] = life; F.x[i] = x; F.y[i] = y; F.z[i] = z; F.vx[i] = vx; F.vy[i] = vy; F.vz[i] = vz; F.s0[i] = s0; F.s1[i] = s1; F.c0[i] = c0; F.c1[i] = c1; F.g[i] = g || 0;
};
G.updateFx = function (dt) {
  if (!fxMesh) return;
  for (let i = 0; i < NF; i++) {
    if (F.life[i] <= 0) continue; F.life[i] -= dt;
    if (F.life[i] <= 0) { fxMesh.setMatrixAt(i, ZERO); continue; }
    F.vy[i] -= F.g[i] * dt; F.x[i] += F.vx[i] * dt; F.y[i] += F.vy[i] * dt; F.z[i] += F.vz[i] * dt; if (F.y[i] < .1) { F.y[i] = .1; F.vy[i] *= -.3; }
    const t = 1 - F.life[i] / F.max[i], s = lerp(F.s0[i], F.s1[i], t) * (t > .8 ? (1 - t) * 5 : 1);
    _m.makeScale(s, s, s); _m.setPosition(F.x[i], F.y[i], F.z[i]); fxMesh.setMatrixAt(i, _m);
    _c.setHex(F.c0[i]); _c2.setHex(F.c1[i]); _c.lerp(_c2, Math.min(1, t * 1.4)); fxMesh.setColorAt(i, _c);
  }
  fxMesh.instanceMatrix.needsUpdate = true; fxMesh.instanceColor.needsUpdate = true;
};
G.burst = function (x, y, z, n, c0, c1, sp, size) { for (let i = 0; i < n; i++) { const a = Math.random() * 6.283, b = Math.random() * 3; G.puff(x, y, z, Math.cos(a) * sp * Math.random(), b * sp * .6, Math.sin(a) * sp * Math.random(), .5 + Math.random() * .5, size, size * .2, c0, c1, 12); } };
/* эффекты одного карта: след, дрифт, ускорение, пыль */
G.kartFx = function (R, k, dt, time, T) {
  const fx = Math.sin(k.h), fz = Math.cos(k.h), rx = -fz, rz = fx, sp = Math.hypot(k.vx, k.vz); if (sp < 2 && !(k.boost > 0)) return;
  const tr = KC.TRAILS.find(t => t.id === (R.look.kart || {}).trail);
  R.acc = (R.acc || 0);
  if (tr && tr.id !== 'none' && sp > 6) {
    R.acc += tr.rate * dt * clamp(sp / 30, .4, 1.3);
    while (R.acc >= 1) { R.acc -= 1; let c0 = tr.c0, c1 = tr.c1; if (tr.rainbow) { _c.setHSL((time * .8 + Math.random() * .1) % 1, 1, .6); c0 = c1 = _c.getHex(); }
      G.puff(k.x - fx * 2.1 + (Math.random() - .5) * 1.0, .5 + Math.random() * .3, k.z - fz * 2.1 + (Math.random() - .5) * 1.0, -fx * 2 + (Math.random() - .5) * 2, tr.g < 0 ? 1.5 : .6, -fz * 2 + (Math.random() - .5) * 2, tr.life, tr.s0, tr.s1, c0, c1, tr.g); }
  }
  if (k.drift) {
    const c = k.charge < .7 ? 0xffffff : k.charge < 1.5 ? 0x5ac8ff : k.charge < 2.6 ? 0xff9a2a : 0xc77bff;
    for (const s of [-1, 1]) G.puff(k.x - fx * 1.3 + rx * s * 1.1, .3, k.z - fz * 1.3 + rz * s * 1.1, rx * s * (2 + Math.random() * 3) - fx * 3, 2 + Math.random() * 2, rz * s * (2 + Math.random() * 3) - fz * 3, .3 + Math.random() * .2, .28, .05, c, c, 14);
  }
  if (k.boost > 0) G.puff(k.x - fx * 2.2 + (Math.random() - .5) * .4, .8, k.z - fz * 2.2 + (Math.random() - .5) * .4, -fx * 12, .5, -fz * 12, .3, .9, .1, 0xffd34a, 0xff4a1a, 0);
  if (T && Math.abs(k.d) > T.half && sp > 8 && Math.random() < dt * 40) G.puff(k.x - fx * 1.5, .4, k.z - fz * 1.5, (Math.random() - .5) * 4, 2, (Math.random() - .5) * 4, .7, .5, 1.6, 0x8a7a5a, 0x6a5a3a, 2);
  if (k.spin > 0 && Math.random() < dt * 30) G.puff(k.x, 2.6, k.z, (Math.random() - .5) * 3, 3, (Math.random() - .5) * 3, .6, .35, .05, 0xffe27a, 0xffc83d, 4);
};

/* ---------- камера ---------- */
const cam = { x: 0, y: 6, z: 0, yaw: 0, lx: 0, lz: 0, init: false, shake: 0, fov: 70 };
G.camReset = function () { cam.init = false; cam.shake = 0; };
G.shake = function (v) { cam.shake = Math.max(cam.shake, v); };
G.followCam = function (k, dt, set, time, mode) {
  const camera = G.camera, fx = Math.sin(k.h), fz = Math.cos(k.h);
  if (mode === 'orbit') { const a = time * .6; camera.position.set(k.x + Math.sin(a) * 11, 4.5, k.z + Math.cos(a) * 11); camera.lookAt(k.x, 1.2, k.z); camera.fov = 60; camera.updateProjectionMatrix(); return; }
  const sp = Math.hypot(k.vx, k.vz), dist = 8.5 * (set.camd || 1) + sp * .02, hgt = 3.9 * (set.camd || 1);
  const yawT = k.h + (k.drift ? -k.dir * .22 : 0);
  if (!cam.init) { cam.yaw = yawT; cam.init = true; cam.x = k.x - Math.sin(yawT) * dist; cam.z = k.z - Math.cos(yawT) * dist; cam.y = hgt; }
  cam.yaw += wrapAng(yawT - cam.yaw) * (1 - Math.exp(-dt * 6));
  const tx = k.x - Math.sin(cam.yaw) * dist, tz = k.z - Math.cos(cam.yaw) * dist, f = 1 - Math.exp(-dt * 12);
  cam.x += (tx - cam.x) * f; cam.z += (tz - cam.z) * f; cam.y += (hgt + (k.boost > 0 ? .4 : 0) - cam.y) * (1 - Math.exp(-dt * 5));
  const sh = cam.shake * (set.shake === undefined ? 1 : set.shake); cam.shake = Math.max(0, cam.shake - dt * 2.5);
  camera.position.set(cam.x + (Math.random() - .5) * sh, cam.y + (Math.random() - .5) * sh, cam.z + (Math.random() - .5) * sh);
  camera.lookAt(k.x + Math.sin(cam.yaw) * 7, 1.6, k.z + Math.cos(cam.yaw) * 7);
  const wantFov = (66 + clamp(sp / 40, 0, 1.4) * 8 + (k.boost > 0 ? 8 : 0)) * (set.fov || 1); cam.fov += (wantFov - cam.fov) * (1 - Math.exp(-dt * 5));
  camera.fov = cam.fov * (camera.aspect < 1 ? 1.35 : 1); camera.updateProjectionMatrix();
  const W = G.world(); if (W) { G.sunFollow(k.x, k.z); }
};
G.sunFollow = function (x, z) { const s = G.scene.children.find(o => o.isDirectionalLight); if (!s) return; s.position.set(x - 80, 140, z + 60); s.target.position.set(x, 0, z); s.target.updateMatrixWorld(); };

/* ---------- предпросмотр в гараже ---------- */
G.makePreview = function (canvas) {
  const r = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true }); r.setPixelRatio(Math.min(devicePixelRatio || 1, 2));
  const sc = new THREE.Scene(), cam = new THREE.PerspectiveCamera(38, 1, .1, 100); sc.add(new THREE.HemisphereLight(0xffffff, 0x8888aa, .95)); const d = new THREE.DirectionalLight(0xffffff, .8); d.position.set(5, 8, 6); sc.add(d);
  const P = { r, sc, cam, kart: null, mode: 'kart', t: 0, yaw: .6, drag: false };
  P.size = function () { const w = canvas.clientWidth || 300, h = canvas.clientHeight || 300; r.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); };
  P.set = function (look, mode) { if (P.kart) sc.remove(P.kart.root); P.look = look; if (mode) P.mode = mode; P.kart = G.makeKart(look); P.kart.glow.visible = !!P.kart.glowDef; sc.add(P.kart.root); };
  P.draw = function (dt) {
    if (!P.kart) return; P.t += dt; if (!P.drag) P.yaw += dt * .7; const k = P.kart.root; k.rotation.y = P.mode === 'face' ? Math.sin(P.t * .9) * .6 : P.yaw;
    for (const w of P.kart.wheels) w.rotation.x += dt * 2;
    if (P.kart.glowDef && P.kart.glowDef.anim) P.kart.glow.material.color.setHSL((P.t * .4) % 1, 1, .55);
    if (P.mode === 'face') { cam.position.set(0, 3.3, 5.2); cam.lookAt(0, 2.6, -.4); cam.fov = 34; }
    else { cam.position.set(0, 4.6, 9.5); cam.lookAt(0, 1.5, 0); cam.fov = 38; }
    cam.updateProjectionMatrix(); r.render(sc, cam);
  };
  P.dispose = function () { r.dispose(); };
  P.size(); return P;
};
})(typeof window !== 'undefined' ? window : globalThis);
