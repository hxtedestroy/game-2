/* Хрю-карт: контроллер гонки (часть 2). */
(function (root) {
'use strict';
const KC = root.KC, G = KC.gfx, Game = KC.game, { clamp } = KC, Sfx = Game.sfx;
let R = null, rigs = [], raf = 0, last = 0, clock = 0, canvas = null, running = false, lastSent = 0, endT = 0, localId = 0, cfg = null, camMode = 0, mini = null;
Game.race = () => R;

Game.initGfx = function (cv) { canvas = cv; G.init(cv); G.initFx(); addEventListener('resize', G.resize); };

/* cfg: {track,laps,seed,kind:'story'|'solo'|'ranked'|'online'|'duel'|'quick', bots, skill, stage, players, you, isHost, ghost} */
Game.startRace = function (c) {
  Game.stopRace(); cfg = c; const S = Game.S, karts = [];
  const rnd = KC.rng((c.seed || 1) * 7 + 3);
  const myStats = KC.makeStats(S.look.kart.body, S.upg);
  if (c.kind === 'online' || c.kind === 'quick' || c.kind === 'duel') {
    const pl = c.players; pl.forEach((p, i) => { const mine = p.slot === c.you; karts.push({ name: p.name, human: true, local: mine, sim: mine, look: p.look, stats: KC.makeStats((p.look.kart || {}).body, p.slot === c.you ? S.upg : null), slot: p.slot }); });
    localId = pl.findIndex(p => p.slot === c.you);
    const want = c.max || 4; for (let i = pl.length; c.bots && i < want; i++) karts.push({ name: KC.BOT_NAMES[(c.seed + i * 5) % KC.BOT_NAMES.length], human: false, sim: !!c.isHost, look: KC.randLook(rnd), stats: KC.makeStats(KC.BODYSHOP[Math.floor(rnd() * KC.BODYSHOP.length)].id), ai: { skill: .86 + rnd() * .06 } });
  } else {
    karts.push({ name: S.name || 'Ты', human: true, local: true, look: S.look, stats: myStats }); localId = 0;
    const used = new Set(); for (let i = 0; i < (c.bots == null ? 3 : c.bots); i++) {
      let ni; do { ni = Math.floor(rnd() * KC.BOT_NAMES.length); } while (used.has(ni)); used.add(ni);
      const bodies = KC.BODYSHOP; const lk = KC.randLook(rnd); const sk = (c.skill || .85) + (rnd() - .5) * .04;
      karts.push({ name: KC.BOT_NAMES[ni], human: false, look: lk, stats: KC.makeStats(bodies[Math.floor(rnd() * bodies.length)].id, { top: Math.min(6, Math.floor((sk - .75) * 40)), acc: 1, turn: 1 }), ai: { skill: sk } });
    }
    if (c.kind === 'ranked') karts.forEach(k => { if (k.ai) k.ai.skill = KC.botSkillForRank(S.rp); });
  }
  const online = c.kind === 'online' || c.kind === 'quick' || c.kind === 'duel';
  R = new KC.Race({ track: c.track, laps: c.laps, seed: c.seed, karts, net: online, isHost: online ? !!c.isHost : true });
  if (online) { R.karts.forEach((k, i) => { if (k.human && karts[i].slot !== undefined) k.slot = karts[i].slot; }); }
  G.buildWorld(R.T); G.camReset();
  rigs = R.karts.map(k => { const r = G.makeKart(k.look, k.name); r.look = k.look; G.scene.add(r.root); k.local = (k.id === localId); return r; });
  const th = R.T.theme; Sfx.init(); Sfx.vol(); Sfx.music((R.T.def && R.T.def.theme) || 'farm');
  Game.paused = false; endT = 0; camMode = 0; Game.state = 'race'; Game.finishedShown = false; clock = 0; last = performance.now(); running = true;
  mini = document.getElementById('mini'); if (!Game._mini) Game._mini = true;
  if (!raf) raf = requestAnimationFrame(loop);
  if (Game.hooks.raceStart) Game.hooks.raceStart(R, cfg);
};
Game.stopRace = function () {
  running = false; if (raf) { cancelAnimationFrame(raf); raf = 0; } Sfx.stopMusic(); if (Sfx.engine) Sfx.engine(0, 0, 0, false);
  for (const r of rigs) G.removeKart(r); rigs = []; if (R) { try { G.disposeWorld(); } catch (e) {} } R = null; Game.state = 'menu';
};
Game.isOnline = () => !!cfg && (cfg.kind === 'online' || cfg.kind === 'quick' || cfg.kind === 'duel');
Game.togglePause = function () { if (!R || Game.state !== 'race') return; if (Game.isOnline()) { if (Game.hooks.pauseMenu) Game.hooks.pauseMenu(true); return; } Game.paused = !Game.paused; if (Game.hooks.pauseMenu) Game.hooks.pauseMenu(Game.paused); };
Game.hooks.pause = Game.togglePause; Game.hooks.cam = () => { camMode = (camMode + 1) % 3; Game.S.set.camd = [1, .75, 1.35][camMode]; };
Game.hooks.horn = () => { if (!R) return; Sfx.horn(Game.S.look.kart.horn); };
Game.resume = () => { Game.paused = false; };
Game.leaveRace = function () { if (Game.isOnline()) { Game.net.send({ t: 'leave' }); Game.net.room = null; } Game.stopRace(); };

/* сетевые сообщения гонки */
Game.netRace = function (m) {
  if (!R || !cfg) return;
  const idBySlot = s => R.karts.findIndex(k => k.slot === s);
  if (m.t === 'st') { const id = idBySlot(m.s); if (id >= 0 && R.karts[id].sim === false) R.applySnap(id, m.k); if (m.b && !cfg.isHost) for (const key in m.b) R.applySnap(+key, m.b[key]); }
  else if (m.t === 'ev') { const id = idBySlot(m.s); if (m.kind === 'rocket' || m.kind === 'mud') R.spawnRemote({ kind: m.kind, id: m.id === undefined ? id : m.id, x: m.x, z: m.z, h: m.h, tgt: m.tgt }); }
  else if (m.t === 'fin') { const id = idBySlot(m.slot); if (id >= 0) { const k = R.karts[id]; k.finished = true; k.ftime = m.time; } }
  else if (m.t === 'left') { const id = idBySlot(m.slot); if (id >= 0) { const k = R.karts[id]; k.human = false; k.finished = true; k.ftime = k.ftime || 0; if (rigs[id]) rigs[id].root.visible = false; } }
};

function sendNet(now) {
  if (!Game.isOnline() || now - lastSent < 66) return; lastSent = now;
  const me = R.karts[localId]; const msg = { t: 'st', k: R.snap(me) };
  if (cfg.isHost) { msg.b = {}; for (const k of R.karts) if (!k.human && k.sim) msg.b[k.id] = R.snap(k); }
  Game.net.send(msg);
}

function handleEvents() {
  const me = R.karts[localId], T = R.T, vib = Game.S.set.vib && navigator.vibrate;
  const online = Game.isOnline();
  for (const e of R.ev.splice(0)) {
    const mine = e.id === localId;
    switch (e.k) {
      case 'go': Sfx.beep(true); break;
      case 'pickup': if (mine) { Sfx.pickup(); } break;
      case 'coin': if (mine) Sfx.coin(); break;
      case 'boost': if (mine) { Sfx.boost(); G.shake(.5); } break;
      case 'hit': if (mine) { Sfx.hit(); G.shake(1.2); if (vib) navigator.vibrate(120); if (Game.hooks.flash) Game.hooks.flash('hit'); } else { const k = R.karts[e.id]; Sfx.hit(); G.burst(k.x, 2, k.z, 14, 0xffe27a, 0xff9a2a, 7, .5); } break;
      case 'wall': if (mine) { Sfx.wall(); G.shake(.25); } break;
      case 'bump': if (mine) { Sfx.wall(); if (vib) navigator.vibrate(30); } break;
      case 'lap': if (mine) { Sfx.lap(); if (Game.hooks.toast) Game.hooks.toast(me.lap >= R.laps ? 'ПОСЛЕДНИЙ КРУГ!' : 'Круг ' + me.lap + ' из ' + R.laps); } break;
      case 'finish': if (mine) { Sfx.fin(); } if (online && mine) Game.net.send({ t: 'fin', time: R.karts[localId].ftime }); break;
      case 'mudhit': if (mine) { Sfx.mud(); G.shake(.4); } break;
      case 'shield': case 'shieldon': if (mine) Sfx.pickup(); break;
      case 'tp': Sfx.tp(); G.burst(e.x0, 2, e.z0, 20, 0xb07bff, 0x4a9bff, 9, .6); G.burst(e.x1, 2, e.z1, 20, 0x4a9bff, 0xb07bff, 9, .6); break;
      case 'boom': Sfx.boom(); G.burst(e.x, 1.5, e.z, 30, 0xffe27a, 0xff4a1a, 12, .9); { const d = Math.hypot(e.x - me.x, e.z - me.z); if (d < 40) G.shake(1 - d / 40); } break;
      case 'rocket': case 'drop': {
        const kk = R.karts[e.id]; if (!kk) break;
        if (online && kk.sim) Game.net.send({ t: 'ev', kind: e.k === 'rocket' ? 'rocket' : 'mud', id: e.id, x: e.x, z: e.z, h: e.k === 'rocket' ? e.h : 0, tgt: e.tgt });
        break;
      }
      case 'done': break;
    }
    if (e.k === 'hit' && e.kind === 'zap') Sfx.zap();
  }
}

function hud() {
  const me = R.karts[localId], sp = Math.hypot(me.vx, me.vz);
  const o = { t: R.t, place: me.place, n: R.karts.length, lap: Math.max(1, Math.min(R.laps, me.lap)), laps: R.laps, speed: Math.round(sp * 3.6 * .9), item: me.item, itemN: me.itemN, coins: me.coins, charge: me.drift ? me.charge : 0, boost: me.boost > 0, finished: me.finished, ftime: me.ftime };
  if (Game.hooks.hud) Game.hooks.hud(o);
  if (Game.S.set.minimap && mini) drawMini();
}
function drawMini() {
  const T = R.T, g = mini.getContext('2d'), W = mini.width, H = mini.height; if (!T.mm) { let a = 1e9, b = -1e9, c = 1e9, d = -1e9; for (let i = 0; i < T.N; i++) { a = Math.min(a, T.x[i]); b = Math.max(b, T.x[i]); c = Math.min(c, T.z[i]); d = Math.max(d, T.z[i]); } const sc = Math.min((W - 16) / (b - a), (H - 16) / (d - c)); T.mm = { a, c, sc, ox: (W - (b - a) * sc) / 2, oz: (H - (d - c) * sc) / 2 }; }
  const m = T.mm, X = x => m.ox + (x - m.a) * m.sc, Y = z => H - (m.oz + (z - m.c) * m.sc);
  g.clearRect(0, 0, W, H); g.lineWidth = 5; g.strokeStyle = 'rgba(255,255,255,.55)'; g.lineJoin = 'round'; g.beginPath(); for (let i = 0; i < T.N; i += 2) { const x = X(T.x[i]), y = Y(T.z[i]); i ? g.lineTo(x, y) : g.moveTo(x, y); } g.closePath(); g.stroke();
  const cols = ['#ff5d73', '#5ac8ff', '#ffd34a', '#9bff6a', '#c77bff', '#ff9a2a'];
  R.karts.forEach(k => { g.fillStyle = k.id === localId ? '#fff' : cols[k.id % 6]; g.beginPath(); g.arc(X(k.x), Y(k.z), k.id === localId ? 5 : 3.6, 0, 6.3); g.fill(); if (k.id === localId) { g.strokeStyle = '#000'; g.lineWidth = 2; g.stroke(); } });
}

function loop(now) {
  raf = requestAnimationFrame(loop); if (!running || !R) return;
  let dt = Math.min(.05, (now - last) / 1000); last = now; if (dt <= 0) dt = .001; clock += dt;
  const me = R.karts[localId]; const sets = Game.S.set;
  if (!Game.paused) {
    const inp = Game.readInput(), inputs = {}; inputs[localId] = (me.finished ? { steer: 0, gas: 0, brake: 0, drift: false, item: false } : inp);
    // автопилот после финиша
    if (me.finished && !me.auto) me.auto = true;
    const t0 = R.t; R.step(dt, inputs);
    if (t0 < 0) { for (const s of [-3, -2, -1]) if (t0 < s && R.t >= s) Sfx.beep(false); }
    handleEvents(); sendNet(now);
  }
  // графика
  for (let i = 0; i < rigs.length; i++) { const k = R.karts[i], r = rigs[i]; if (!r.root.visible) continue; G.updateRig(r, k, dt, clock); G.kartFx(r, k, dt, clock, R.T); }
  G.updateWorld(R, dt, clock, localId); G.updateFx(dt);
  G.followCam(me, dt, sets, clock, me.finished ? 'orbit' : null);
  G.render();
  const sp = Math.hypot(me.vx, me.vz); Sfx.engine(sp, me.finished ? 0 : (Game.input.gas || 0), me.boost > 0, !Game.paused && R.t > 0 && !me.finished);
  hud();
  // конец гонки
  if (me.finished && !endT) endT = clock;
  if (!Game.finishedShown && me.finished) {
    const online = Game.isOnline();
    const cond = online ? (R.done || clock - endT > 25) : (clock - endT > 2.6);
    if (cond) {
      if (online && !R.done) { R.done = true; }
      Game.finishedShown = true; finishRace();
    }
  }
}

function finishRace() {
  const me = R.karts[localId], res = R.results(), S = Game.S, n = R.karts.length; const total = R.T.L * R.laps;
  const others = R.karts.filter(k => k.id !== localId); let lead = 0;
  if (others.length) { const o = others.reduce((a, b) => (b.place < a.place ? b : a)); lead = o.finished && o.ftime ? o.ftime - me.ftime : Math.max(0, (total - o.prog)) / 36; if (me.place !== 1) lead = -lead; }
  const place = me.place, coins = me.coins, hits = me.hits || 0;
  const info = { res, place, n, coins, hits, time: me.ftime, lead, track: cfg.track, kind: cfg.kind, stage: cfg.stage, rpDelta: 0, reward: null, ups: [], stars: null, newBest: false, items: [] };
  let kind = cfg.kind;
  const hs = res.filter(r => r.human).length;
  // награды
  const rw = KC.raceReward(place, n, coins, kind);
  info.reward = { coins: rw.coins, xp: rw.xp };
  if (kind === 'story') { const g = KC.evalStage(cfg.type, { place, coins, hits, lead }); info.goals = g; const st = g.filter(Boolean).length; info.stars = st;
    const key = cfg.stage.ch + ':' + cfg.stage.st, prev = S.story.stars[key] || 0; if (st > prev) { S.story.stars[key] = st; }
    if (st > 0) { const sc = KC.stageConfig(cfg.stage.ch, cfg.stage.st); const bonus = prev === 0 ? sc.reward : 0; info.reward.coins += bonus; info.firstClear = prev === 0; if (!prev && cfg.stage.st === 2) { info.chapterDone = cfg.stage.ch; info.items = Game.unlockChapterRewards(cfg.stage.ch); } } else { info.reward.coins = Math.round(info.reward.coins * .4); info.reward.xp = Math.round(info.reward.xp * .4); }
  }
  if (kind === 'quick' || kind === 'online' || kind === 'duel') { kind = cfg.kind === 'duel' ? 'duel' : 'online'; if (cfg.kind === 'online') { info.reward.coins = Math.round(info.reward.coins * .6); } info.rpDelta = cfg.kind === 'online' ? 0 : KC.rpDelta(kind, place, n); }
  else if (kind === 'ranked') info.rpDelta = KC.rpDelta('ranked', place, n);
  if (info.rpDelta) { const before = S.rp; S.rp = Math.max(0, S.rp + info.rpDelta); info.rpBefore = before; info.rpAfter = S.rp; }
  S.coins += info.reward.coins; info.ups = Game.addXp(info.reward.xp); S.races++; if (place === 1) S.wins++;
  const bk = cfg.track + ':' + R.laps; if (me.finished && me.ftime > 0 && (!S.bestTimes[bk] || me.ftime < S.bestTimes[bk])) { S.bestTimes[bk] = me.ftime; info.newBest = true; }
  Game.save(); if (info.rpDelta || kind === 'online' || kind === 'ranked') Game.postRank();
  Sfx.stopMusic(); if (Sfx.engine) Sfx.engine(0, 0, 0, false);
  if (Game.hooks.results) Game.hooks.results(info);
}
Game.fmtTime = function (t) { if (!t || t <= 0) return '--:--.--'; const m = Math.floor(t / 60), s = t - m * 60; return m + ':' + (s < 10 ? '0' : '') + s.toFixed(2); };
})(typeof window !== 'undefined' ? window : globalThis);
