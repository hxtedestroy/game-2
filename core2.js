/* Хрю-карт: ядро, часть 2. Физика карта, предметы, боты, правила гонки. */
(function (root) {
'use strict';
const KC = root.KC; const { clamp, lerp, wrapAng } = KC;

KC.BODIES = {
  classic: { name: 'Классик', top: 1, acc: 1, turn: 1, grip: 1, mass: 1 },
  rocket:  { name: 'Ракета', top: 1.07, acc: .94, turn: .88, grip: .95, mass: 1 },
  pickup:  { name: 'Пикап', top: .96, acc: 1.05, turn: .95, grip: 1.15, mass: 1.3 },
  bug:     { name: 'Жук', top: .97, acc: 1.1, turn: 1.15, grip: 1, mass: .85 }
};
KC.makeStats = function (body, up) {
  const b = KC.BODIES[body] || KC.BODIES.classic; up = up || {};
  return { top: b.top * (1 + .035 * (up.top | 0)), acc: b.acc * (1 + .05 * (up.acc | 0)), turn: b.turn * (1 + .03 * (up.turn | 0)), grip: b.grip, mass: b.mass };
};
KC.ITEMS = { boost: 'Ускоритель', boost3: 'Тройной ускоритель', mud: 'Лужа', rocket: 'Ракета', shield: 'Щит' };
const BASE_TOP = 40, BASE_ACC = 26, BASE_TURN = 1.9, GRIP = 7.5, SUB = 1 / 60, WALL = 3.2;
KC.CONST = { BASE_TOP, WALL };

class Race {
  constructor(cfg) {
    this.T = KC.buildTrack(cfg.track); this.laps = cfg.laps || 3; this.rnd = KC.rng(cfg.seed || 1);
    this.t = -3.2; this.ev = []; this.ents = []; this.done = false; this.doneT = 0; this.finCount = 0; this.net = !!cfg.net; this.isHost = cfg.isHost !== false;
    const T = this.T;
    this.karts = cfg.karts.map((c, i) => {
      const row = i >> 1, col = i & 1, q = T.at(T.L - 6 - row * 7, col ? 4 : -4);
      return { id: i, name: c.name, human: !!c.human, local: !!c.local, sim: c.sim !== false, look: c.look || {}, stats: c.stats || KC.makeStats('classic'),
        x: q.x, z: q.z, h: q.h, vx: 0, vz: 0, v: 0, vl: 0, steer: 0, ds: 0, dir: 0, charge: 0, drift: false, boost: 0, spin: 0, slow: 0, shield: 0, inv: 0, burn: 0, zap: 0, tpCd: 0,
        item: null, itemN: 0, ip: false, i: -1, s: 0, d: 0, lap: 0, vis: new Uint8Array(8), prog: 0, place: i + 1, finished: false, ftime: 0, coins: 0, got: new Set(),
        ai: c.ai ? { skill: c.ai.skill || .93, lane: 0, laneT: 0, itemT: 2 + this.rnd() * 3, line: (this.rnd() - .5) * 2 } : null, auto: false, tgt: null, tx: q.x, tz: q.z, th: q.h, wallT: 0 };
    });
    for (const k of this.karts) { const n = T.nearest(k.x, k.z); k.i = n.i; k.s = n.s; k.d = n.d; k.prog = k.s; }
  }
  push(k, o) { o.k = k; this.ev.push(o); }
  kartById(id) { return this.karts[id]; }

  step(dt, inputs) {
    let rem = Math.min(dt, .1);
    while (rem > 1e-6) { const h = Math.min(SUB, rem); rem -= h; this.sub(h, inputs); }
  }
  sub(dt, inputs) {
    const prev = this.t; this.t += dt;
    if (prev < 0 && this.t >= 0) this.push('go', {});
    const T = this.T;
    for (const k of this.karts) {
      if (!k.sim) { this.stepRemote(k, dt); continue; }
      let inp = inputs && inputs[k.id];
      if (k.ai || k.auto) inp = this.aiInput(k, dt);
      this.stepKart(k, inp || { steer: 0, gas: 0, brake: 0, drift: false, item: false }, dt);
    }
    this.collide();
    this.stepEnts(dt);
    for (const b of T.boxes) if (b.cd > 0) b.cd -= dt;
    this.rank();
    if (!this.done) {
      let allDone = true, anyHuman = false;
      for (const k of this.karts) if (k.human) { anyHuman = true; if (!k.finished) allDone = false; }
      if (!anyHuman) allDone = this.karts.every(k => k.finished);
      if (allDone || this.t > 20 * 60) { this.done = true; this.doneT = this.t; this.push('done', {}); }
    }
  }

  stepRemote(k, dt) {
    const f = Math.min(1, dt * 14);
    k.vx = k.rvx || 0; k.vz = k.rvz || 0; k.tx += k.vx * dt; k.tz += k.vz * dt;
    k.x += (k.tx - k.x) * f; k.z += (k.tz - k.z) * f; k.h += wrapAng(k.th - k.h) * f;
    if (k.spin > 0) k.spin -= dt; if (k.boost > 0) k.boost -= dt;
    const n = this.T.nearest(k.x, k.z, k.i); k.i = n.i; k.s = n.s; k.d = n.d;
  }
  /* снимок для сети */
  snap(k) { return { x: +k.x.toFixed(2), z: +k.z.toFixed(2), h: +k.h.toFixed(3), vx: +k.vx.toFixed(2), vz: +k.vz.toFixed(2), lap: k.lap, b: k.boost > 0 ? 1 : 0, dr: k.drift ? k.dir : 0, sp: k.spin > 0 ? 1 : 0, sh: k.shield > 0 ? 1 : 0, f: k.finished ? 1 : 0 }; }
  applySnap(id, m) {
    const k = this.karts[id]; if (!k || k.sim) return;
    k.tx = m.x; k.tz = m.z; k.th = m.h; k.rvx = m.vx; k.rvz = m.vz; k.lap = m.lap;
    k.boost = m.b ? .3 : 0; k.drift = !!m.dr; k.dir = m.dr || 0; k.spin = m.sp ? .3 : 0; k.shield = m.sh; if (m.f && !k.finished) { k.finished = true; }
    if (Math.hypot(k.x - m.x, k.z - m.z) > 30) { k.x = m.x; k.z = m.z; k.h = m.h; }
  }

  stepKart(k, inp, dt) {
    const T = this.T, st = k.stats, n = T.nearest(k.x, k.z, k.i);
    const prevS = k.s; k.i = n.i; k.s = n.s; k.d = n.d;
    const ad = Math.abs(n.d), off = ad > T.half;
    // круги и сектора
    k.vis[Math.floor(k.s / T.L * 8) & 7] = 1;
    if (prevS > T.L * .75 && k.s < T.L * .25) {
      let cnt = 0; for (let q = 0; q < 8; q++) cnt += k.vis[q];
      if (k.lap === 0 || cnt >= 6) {
        k.lap++; k.vis.fill(0); k.vis[0] = 1;
        if (k.lap > this.laps && !k.finished) { k.finished = true; k.ftime = this.t; k.auto = true; this.finCount++; this.push('finish', { id: k.id, time: this.t }); }
        else if (k.lap > 1) this.push('lap', { id: k.id, lap: k.lap });
      }
    } else if (prevS < T.L * .25 && k.s > T.L * .75 && k.lap > 0 && !k.finished) { k.lap--; }
    k.prog = k.lap * T.L + k.s;

    if (this.t < 0) { k.vx = k.vz = 0; return; }
    if (k.boost > 0) k.boost -= dt; if (k.slow > 0) k.slow -= dt; if (k.inv > 0) k.inv -= dt; if (k.burn > 0) k.burn -= dt; if (k.zap > 0) k.zap -= dt; if (k.tpCd > 0) k.tpCd -= dt;
    if (k.shield > 0) { k.shield -= dt; if (k.shield < 0) k.shield = 0; }
    let top = BASE_TOP * st.top, acc = BASE_ACC * st.acc, grip = GRIP * st.grip, gas = clamp(inp.gas, 0, 1), brake = clamp(inp.brake, 0, 1), steer = clamp(inp.steer, -1, 1);
    if (off) { top *= .55; acc *= .8; }
    if (T.def.theme === 'ice' && !off) grip *= .2;
    if (k.slow > 0) top *= .55;
    if (k.spin > 0) { gas = 0; brake = 0; steer = 0; }

    // зоны и препятствия
    const fx = Math.sin(k.h), fz = Math.cos(k.h);
    for (const z of T.haz) {
      if (z.k === 'mud') { if ((k.x - z.x) ** 2 + (k.z - z.z) ** 2 < z.r * z.r) { top *= .6; k.slow = Math.max(k.slow, .15); } }
      else if (z.k === 'lava') { if ((k.x - z.x) ** 2 + (k.z - z.z) ** 2 < z.r * z.r && k.burn <= 0) this.hit(k, 'burn', 1.0, .45); }
      else if (z.k === 'pad') { let ds = k.s - z.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L; if (Math.abs(ds) < z.len / 2 && Math.abs(k.d - z.lat) < z.w / 2 && k.boost < .8) { k.boost = 1.1; this.push('boost', { id: k.id, pad: 1 }); } }
      else if (z.k === 'belt') { let ds = k.s - z.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L; if (ds >= 0 && ds < z.len && !off) { k.vx += z.tx * z.dir * 22 * dt; k.vz += z.tz * z.dir * 22 * dt; } }
      else if (z.k === 'cone') { const dx = k.x - z.x, dz = k.z - z.z, d = Math.hypot(dx, dz), R = z.r + 1.1; if (d < R && d > 1e-3) { k.x += dx / d * (R - d); k.z += dz / d * (R - d); const vn = k.vx * dx / d + k.vz * dz / d; if (vn < 0) { k.vx -= 1.5 * vn * dx / d; k.vz -= 1.5 * vn * dz / d; k.vx *= .75; k.vz *= .75; } if (k.wallT <= 0) { this.push('bump', { id: k.id }); k.wallT = .3; } } }
      else if (z.k === 'laser') {
        if (this.laserOn(z) && k.zap <= 0) { let ds = k.s - z.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L; if (Math.abs(ds) < 1.3 && !off) this.hit(k, 'zap', .9, .3); }
      } else if (z.k === 'train') {
        const tr = this.trainPos(z);
        if (tr !== null) { let al = k.s - z.s; if (al < -T.L / 2) al += T.L; if (al > T.L / 2) al -= T.L; if (Math.abs(al) < 3.4 && Math.abs(k.d - tr) < 11.5 && k.zap <= 0) this.hit(k, 'train', 1.4, .25); }
      } else if (z.k === 'portal') {
        if (k.tpCd <= 0 && (k.x - z.x) ** 2 + (k.z - z.z) ** 2 < 6.5 * 6.5) this.teleport(k, z);
      }
    }
    // предметы
    if (!k.item) for (const b of T.boxes) if (b.cd <= 0 && (k.x - b.x) ** 2 + (k.z - b.z) ** 2 < 3.4 * 3.4) { b.cd = 4; k.item = this.rollItem(k); k.itemN = k.item === 'boost3' ? 3 : 1; this.push('pickup', { id: k.id, item: k.item, box: T.boxes.indexOf(b) }); break; }
    for (let ci = 0; ci < T.coins.length; ci++) { const c = T.coins[ci]; if (!k.got.has(ci) && (k.x - c.x) ** 2 + (k.z - c.z) ** 2 < 3.2 * 3.2) { k.got.add(ci); k.coins++; this.push('coin', { id: k.id, i: ci }); } }
    if (inp.item && !k.ip && k.item) this.useItem(k);
    k.ip = !!inp.item;

    // продольная и боковая скорости
    const rx = -fz, rz = fx; // вправо по ходу взгляда: (-cos h, sin h) = (-fz, fx)
    let vf = k.vx * fx + k.vz * fz, vl = k.vx * rx + k.vz * rz;
    if (k.boost > 0) { const tb = top * 1.4; if (vf < tb) vf = Math.min(tb, vf + 90 * dt); }
    else if (gas > 0) { if (vf < top) vf += acc * (1 - .6 * clamp(vf / top, 0, 1)) * gas * dt; }
    if (vf > top && k.boost <= 0) vf -= (vf - top) * 1.6 * dt;
    if (brake > 0) { if (vf > .5) vf -= 52 * brake * dt; else vf = Math.max(-12, vf - acc * .5 * dt); }
    if (gas === 0 && brake === 0) vf *= Math.exp(-.45 * dt);
    if (off) vf *= Math.exp(-.7 * dt);
    if (k.spin > 0) { k.spin -= dt; vf *= Math.exp(-2.2 * dt); k.h += 11 * dt; }

    // рулёж и дрифт
    k.steer += (steer - k.steer) * Math.min(1, dt * 11);
    const speedF = clamp(Math.abs(vf) / 14, 0, 1);
    let turn = BASE_TURN * st.turn * speedF * (1 - .22 * clamp(vf / top, 0, 1)) * (vf < 0 ? -1 : 1);
    let gripE = grip;
    if (!k.drift && inp.drift && vf > 18 && Math.abs(steer) > .3 && k.spin <= 0) { k.drift = true; k.dir = steer > 0 ? 1 : -1; k.charge = 0; this.push('driftstart', { id: k.id }); }
    if (k.drift) {
      if (!inp.drift || vf < 12 || k.spin > 0) {
        let b = 0; if (k.charge > 2.6) b = 1.5; else if (k.charge > 1.5) b = .95; else if (k.charge > .7) b = .5;
        if (b > 0 && k.spin <= 0) { k.boost = Math.max(k.boost, b); this.push('boost', { id: k.id, mt: b }); }
        k.drift = false; k.charge = 0;
      } else {
        k.charge += dt * (.85 + .35 * Math.abs(k.steer)); gripE *= .16;
        const eff = clamp(.95 + k.steer * k.dir * .5, .4, 1.45) * k.dir; k.h -= eff * turn * 1.12 * dt;
      }
    } else if (k.spin <= 0) k.h -= k.steer * turn * dt;
    if (k.wallT > 0) k.wallT -= dt;

    // мировая скорость после двигателя, затем поворот корпуса: боковая составляющая в новой системе и есть занос
    const wx = fx * vf + rx * vl, wz = fz * vf + rz * vl;
    const nfx = Math.sin(k.h), nfz = Math.cos(k.h), nrx = -nfz, nrz = nfx;
    vf = wx * nfx + wz * nfz; vl = (wx * nrx + wz * nrz) * Math.exp(-gripE * dt);
    k.vx = nfx * vf + nrx * vl; k.vz = nfz * vf + nrz * vl;
    k.x += k.vx * dt; k.z += k.vz * dt; k.v = vf; k.vl = vl;

    // стены по краям
    const n2 = T.nearest(k.x, k.z, k.i), lim = T.half + WALL;
    if (Math.abs(n2.d) > lim) {
      const sg = n2.d > 0 ? 1 : -1, over = Math.abs(n2.d) - lim, nx = -n2.tz * sg, nz = n2.tx * sg; // наружу
      k.x -= nx * over; k.z -= nz * over;
      const vn = k.vx * nx + k.vz * nz;
      if (vn > 0) { k.vx -= 1.4 * vn * nx; k.vz -= 1.4 * vn * nz; k.vx *= .88; k.vz *= .88; if (k.wallT <= 0 && vn > 6) { this.push('wall', { id: k.id, v: vn }); k.wallT = .25; } }
      if (k.drift) { k.drift = false; k.charge = 0; }
    }
  }

  laserOn(z, tt) { if (tt === undefined) tt = this.t; const c = z.on + z.off; return ((tt + z.ph) % c + c) % c < z.on; }
  trainPos(z, tt) {
    if (tt === undefined) tt = this.t;
    const T = this.T, sweep = (2 * T.half + 30) / 17, cyc = sweep + z.period, tm = (((tt + z.ph * 2) % cyc) + cyc) % cyc;
    if (tm > sweep) return null; return -(T.half + 15) + tm * 17; // боковая координата центра поезда (+ справа)
  }
  hit(k, kind, spin, inv) {
    if (k.inv > 0) return;
    if (k.shield > 0) { k.shield = 0; k.inv = .6; this.push('shield', { id: k.id }); return; }
    k.spin = spin; k.inv = spin + .8; k.vx *= .35; k.vz *= .35; if (kind === 'burn') k.burn = 1.4; if (kind === 'zap') k.zap = 1.2; if (kind === 'train') k.zap = 1.5;
    k.drift = false; k.charge = 0; k.hits = (k.hits || 0) + 1; this.push('hit', { id: k.id, kind });
  }
  teleport(k, z) {
    const T = this.T, tp = z.s2, dh = wrapAng(k.h - Math.atan2(z.tx, z.tz)), nd = clamp(k.d * .5, -6, 6), q = T.at(tp + 6, nd);
    // отметим все пройденные сектора между входом и выходом
    let a = Math.floor(z.s / T.L * 8), b = Math.floor(tp / T.L * 8); for (let s = a; s !== ((b + 1) % 8); s = (s + 1) % 8) k.vis[s] = 1;
    const sp = Math.hypot(k.vx, k.vz), nh = q.h + dh * .5; k.x = q.x; k.z = q.z; k.h = nh; k.vx = Math.sin(nh) * sp; k.vz = Math.cos(nh) * sp; k.tpCd = 1.5; k.boost = Math.max(k.boost, .6);
    const n = T.nearest(k.x, k.z); k.i = n.i; k.prevJump = true; k.s = n.s; k.d = n.d;
    this.push('tp', { id: k.id, x0: z.x, z0: z.z, x1: q.x, z1: q.z });
  }
  rollItem(k) {
    const p = this.karts.length > 1 ? (k.place - 1) / (this.karts.length - 1) : .5, r = this.rnd();
    const w = { boost: 3, boost3: .8 + 2 * p, mud: 2.2 * (1 - p) + .4, rocket: 1 + 3 * p, shield: 1.6 }; let sum = 0; for (const q in w) sum += w[q];
    let x = r * sum; for (const q in w) { x -= w[q]; if (x <= 0) return q; } return 'boost';
  }
  useItem(k) {
    const it = k.item, fx = Math.sin(k.h), fz = Math.cos(k.h);
    if (it === 'boost' || it === 'boost3') { k.boost = Math.max(k.boost, 1.3); this.push('boost', { id: k.id, item: 1 }); }
    else if (it === 'shield') { k.shield = 9; this.push('shieldon', { id: k.id }); }
    else if (it === 'mud') { this.ents.push({ k: 'mud', x: k.x - fx * 4, z: k.z - fz * 4, life: 25, owner: k.id, hits: 0 }); this.push('drop', { id: k.id, x: k.x - fx * 4, z: k.z - fz * 4 }); }
    else if (it === 'rocket') {
      let tg = null, bd = 1e9; for (const o of this.karts) if (o !== k && !o.finished) { const ahead = o.prog - k.prog; if (ahead > 0 && ahead < bd) { bd = ahead; tg = o.id; } }
      this.ents.push({ k: 'rocket', x: k.x + fx * 3, z: k.z + fz * 3, vx: fx * 62, vz: fz * 62, owner: k.id, tgt: tg, life: 6, age: 0 }); this.push('rocket', { id: k.id, tgt: tg, x: k.x + fx * 3, z: k.z + fz * 3, h: k.h });
    }
    k.itemN--; if (k.itemN <= 0) k.item = null;
  }
  spawnRemote(e) {
    if (e.kind === 'rocket') this.ents.push({ k: 'rocket', x: e.x, z: e.z, vx: Math.sin(e.h) * 62, vz: Math.cos(e.h) * 62, owner: e.id, tgt: e.tgt, life: 6, age: 0 });
    else if (e.kind === 'mud') this.ents.push({ k: 'mud', x: e.x, z: e.z, life: 25, owner: e.id, hits: 0 });
  }
  stepEnts(dt) {
    const T = this.T;
    for (let i = this.ents.length - 1; i >= 0; i--) {
      const e = this.ents[i]; e.life -= dt; let dead = e.life <= 0;
      if (e.k === 'rocket') {
        e.age += dt; const tg = e.tgt !== null && e.tgt !== undefined ? this.karts[e.tgt] : null; let dx, dz;
        if (tg && !tg.finished) { dx = tg.x - e.x; dz = tg.z - e.z; } else { const n = T.nearest(e.x, e.z), q = T.at(n.s + 25, clamp(n.d, -T.half + 3, T.half - 3)); dx = q.x - e.x; dz = q.z - e.z; }
        const want = Math.atan2(dx, dz), cur = Math.atan2(e.vx, e.vz), nh = cur + clamp(wrapAng(want - cur), -2.6 * dt, 2.6 * dt);
        e.vx = Math.sin(nh) * 62; e.vz = Math.cos(nh) * 62; e.x += e.vx * dt; e.z += e.vz * dt;
        const n = T.nearest(e.x, e.z); if (Math.abs(n.d) > T.half + WALL + 1) dead = true;
        for (const k of this.karts) {
          if ((k.id === e.owner && e.age < .5) || k.finished) continue;
          if ((k.x - e.x) ** 2 + (k.z - e.z) ** 2 < 2.6 * 2.6) { if (k.sim) this.hit(k, 'rocket', 1.3, 0); dead = true; this.push('boom', { x: e.x, z: e.z }); break; }
        }
        if (dead && e.life > 0 && !this.ev.some(q => q.k === 'boom' && q.x === e.x)) this.push('boom', { x: e.x, z: e.z });
      } else if (e.k === 'mud') {
        for (const k of this.karts) if (k.sim && !k.finished && (k.x - e.x) ** 2 + (k.z - e.z) ** 2 < 3.3 * 3.3 && (k.id !== e.owner || e.life < 23)) {
          if (k.inv <= 0 && k.shield <= 0) { k.slow = 1.6; k.vx *= .6; k.vz *= .6; this.push('mudhit', { id: k.id }); e.hits++; k.inv = .5; } else if (k.shield > 0) { k.shield = 0; k.inv = .6; e.hits++; this.push('shield', { id: k.id }); }
        }
        if (e.hits >= 2) dead = true;
      }
      if (dead) this.ents.splice(i, 1);
    }
  }
  collide() {
    const K = this.karts;
    for (let a = 0; a < K.length; a++) for (let b = a + 1; b < K.length; b++) {
      const p = K[a], q = K[b]; const dx = q.x - p.x, dz = q.z - p.z, d2 = dx * dx + dz * dz;
      if (d2 > 3.6 * 3.6 || d2 < 1e-6) continue;
      const d = Math.sqrt(d2), nx = dx / d, nz = dz / d, pen = 3.6 - d, mp = p.stats.mass, mq = q.stats.mass, tot = mp + mq;
      if (p.sim) { p.x -= nx * pen * (mq / tot) * (q.sim ? 1 : 1.6); p.z -= nz * pen * (mq / tot) * (q.sim ? 1 : 1.6); }
      if (q.sim) { q.x += nx * pen * (mp / tot) * (p.sim ? 1 : 1.6); q.z += nz * pen * (mp / tot) * (p.sim ? 1 : 1.6); }
      const rv = (q.vx - p.vx) * nx + (q.vz - p.vz) * nz;
      if (rv < 0) { const j = -rv * 1.1; if (p.sim) { p.vx -= nx * j * (mq / tot); p.vz -= nz * j * (mq / tot); } if (q.sim) { q.vx += nx * j * (mp / tot); q.vz += nz * j * (mp / tot); } if (-rv > 4) this.push('bump', { id: p.sim ? p.id : q.id }); }
    }
  }
  rank() {
    const K = this.karts.slice().sort((a, b) => (a.finished && b.finished) ? a.ftime - b.ftime : a.finished ? -1 : b.finished ? 1 : b.prog - a.prog);
    K.forEach((k, i) => k.place = i + 1);
  }
  results() { return this.karts.slice().sort((a, b) => a.place - b.place).map(k => ({ id: k.id, name: k.name, human: k.human, local: k.local, place: k.place, time: k.finished ? k.ftime : 0, coins: k.coins })); }

  /* ---------- бот ---------- */
  aiInput(k, dt) {
    const T = this.T, a = k.ai || k._ai || (k._ai = { skill: .9, lane: 0, laneT: 0, itemT: 3, line: 0 });
    const st = k.stats, top = BASE_TOP * st.top * a.skill * (k.finished ? .8 : 1);
    a.laneT -= dt; if (a.laneT <= 0) { a.laneT = 2.5 + this.rnd() * 3; a.lane = (this.rnd() - .5) * (T.half - 3) * 1.1 + a.line * 1.5; }
    let lane = a.lane; const look = 11 + Math.max(0, k.v) * .5;
    for (const z of T.haz) {
      if (z.k !== 'lava' && z.k !== 'mud' && z.k !== 'cone') continue;
      let ds = z.s - k.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L;
      if (ds > -2 && ds < look + 20) { const r = (z.r || 1.3) + 3.4; if (Math.abs(z.lat - lane) < r) lane = z.lat > 0 ? z.lat - r : z.lat + r; }
    }
    lane = clamp(lane, -T.half + 2.5, T.half - 2.5);
    const q = T.at(k.s + look, lane); const want = Math.atan2(q.x - k.x, q.z - k.z), diff = wrapAng(want - k.h);
    let steer = clamp(-diff * 2.1, -1, 1) + (this.rnd() - .5) * .04;
    const c1 = Math.abs(T.curv[(k.i + Math.round(28 / T.ds)) % T.N]); let vt = Math.min(top, Math.sqrt(75 / Math.max(c1, 1e-4)));
    if (T.def.theme === 'ice') vt = Math.min(vt, 27 * a.skill); if (Math.abs(k.d) > T.half) vt = Math.min(vt, 22);
    // резиновая лента
    let human = null; for (const o of this.karts) if (o.human && !o.finished && o !== k) { if (!human || o.prog > human.prog) human = o; }
    if (human && !k.finished) { const gap = human.prog - k.prog; vt *= 1 + clamp(gap / 400, -.05, .08); }
    // лазеры и поезда: подгоняем скорость, чтобы проехать в безопасное окно
    for (const z of T.haz) {
      if (z.k !== 'laser' && z.k !== 'train') continue;
      let ds = z.s - k.s; if (ds < -T.L / 2) ds += T.L; if (ds > T.L / 2) ds -= T.L;
      if (ds < 2 || ds > 55) continue;
      const bad = tt => { if (z.k === 'laser') { const c = z.on + z.off; return (((tt + z.ph) % c) + c) % c < z.on + .4; } const tr = this.trainPos(z, tt); return tr !== null && Math.abs(tr - lane) < 15; };
      const ta = ds / Math.max(k.v, 14);
      if (bad(this.t + ta) || bad(this.t + ta + .35)) { let w = .1; for (; w < 9; w += .1) if (!bad(this.t + ta + w) && !bad(this.t + ta + w + .5)) break; vt = Math.min(vt, Math.max(5, ds / (ta + w))); }
    }
    const gas = k.v < vt ? 1 : 0, brake = k.v > vt + 3 ? clamp((k.v - vt) / 10, 0, .9) : 0;
    // предметы
    let item = false; a.itemT -= dt;
    if (k.item && a.itemT <= 0 && this.t > 0) {
      if (k.item === 'boost' || k.item === 'boost3') { if (Math.abs(diff) < .2) item = true; }
      else if (k.item === 'shield') item = this.rnd() < .5;
      else if (k.item === 'rocket') { for (const o of this.karts) if (o !== k && o.prog > k.prog && o.prog - k.prog < 160) { item = true; break; } }
      else if (k.item === 'mud') { for (const o of this.karts) if (o !== k && o.prog < k.prog && k.prog - o.prog < 40) { item = true; break; } }
      if (item) a.itemT = 2 + this.rnd() * 4; else a.itemT = .5;
    }
    return { steer, gas, brake, drift: false, item };
  }
}
KC.Race = Race;
})(typeof window !== 'undefined' ? window : globalThis);
