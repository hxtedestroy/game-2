/* Хрю-карт: игровой контроллер, часть 1. Сохранение, звук, управление, сеть. */
(function (root) {
'use strict';
const KC = root.KC, { clamp, lerp } = KC; const $ = id => document.getElementById(id);
const Game = KC.game = { S: null, state: 'boot', paused: false, hooks: {} };

/* ---------- сохранение ---------- */
function merge(a, b) { for (const k in b) { if (b[k] && typeof b[k] === 'object' && !Array.isArray(b[k]) && a[k] && typeof a[k] === 'object') merge(a[k], b[k]); else a[k] = b[k]; } return a; }
const rid = () => (Math.random().toString(36).slice(2) + Date.now().toString(36) + Math.random().toString(36).slice(2)).replace(/[^a-z0-9]/g, '').slice(0, 32);
Game.load = function () {
  let s = null; try { s = JSON.parse(localStorage.getItem('hrukart') || 'null'); } catch (e) {}
  const S = merge(KC.defaultSave(), s || {}); if (!S.pid || S.pid.length < 8) S.pid = rid(); if (!S.name) S.name = ''; Game.S = S; return S;
};
Game.save = function () { try { localStorage.setItem('hrukart', JSON.stringify(Game.S)); } catch (e) {} };
Game.reset = function () { const keep = { pid: Game.S.pid, name: Game.S.name, set: Game.S.set }; Game.S = merge(KC.defaultSave(), keep); Game.save(); };
const today = () => { const d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };
Game.owns = key => !!Game.S.owned[key] || /:(none)$/.test(key);
Game.canAfford = p => Game.S.coins >= p;
Game.buy = function (key) {
  const pr = KC.allProducts().find(x => x.key === key); if (!pr || Game.owns(key) || pr.rw !== undefined) return false;
  if (Game.S.coins < pr.p) return false; Game.S.coins -= pr.p; Game.S.owned[key] = 1; Game.save(); Sfx.ui('buy'); return true;
};
Game.dailyAvailable = () => Game.S.daily.last !== today();
Game.claimDaily = function () {
  const D = Game.S.daily; if (D.last === today()) return null;
  const y = new Date(); y.setDate(y.getDate() - 1); const ys = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  D.streak = D.last === ys ? D.streak + 1 : 1; D.last = today(); const r = KC.DAILY[(D.streak - 1) % 7]; Game.S.coins += r.c; let gift = null;
  if (r.gift) { const pool = KC.allProducts().filter(p => p.p > 0 && p.p <= 220 && p.rw === undefined && !Game.owns(p.key)); if (pool.length) { gift = pool[Math.floor(Math.random() * pool.length)]; Game.S.owned[gift.key] = 1; } }
  Game.save(); return { coins: r.c, gift, day: (D.streak - 1) % 7 + 1, streak: D.streak };
};
Game.addXp = function (x) {
  const S = Game.S, ups = []; S.xp += x;
  while (S.xp >= KC.xpNeed(S.level)) { S.xp -= KC.xpNeed(S.level); S.level++; const r = KC.levelReward(S.level); S.coins += r.coins; let gift = null;
    if (r.item) { const pool = KC.allProducts().filter(p => p.p > 0 && p.p <= 400 && p.rw === undefined && !Game.owns(p.key)); if (pool.length) { gift = pool[Math.floor(Math.random() * pool.length)]; S.owned[gift.key] = 1; } }
    ups.push({ level: S.level, coins: r.coins, gift }); }
  return ups;
};
Game.unlockChapterRewards = function (ch) { const got = []; for (const p of KC.allProducts()) if (p.rw === ch && !Game.S.owned[p.key]) { Game.S.owned[p.key] = 1; got.push(p); } return got; };
Game.stageStars = (ch, st) => (Game.S.story.stars[ch + ':' + st] || 0);
Game.stageUnlocked = function (ch, st) { if (ch === 0 && st === 0) return true; const prev = st > 0 ? Game.stageStars(ch, st - 1) : Game.stageStars(ch - 1, 2); return prev > 0; };
Game.totalStars = () => Object.values(Game.S.story.stars).reduce((a, b) => a + b, 0);
Game.storyDone = () => Game.stageStars(7, 2) > 0;

/* ---------- звук ---------- */
let AC = null, master = null, noiseBuf = null, eng = null, musGain = null, sfxGain = null, musTimer = null, musStep = 0;
const Sfx = Game.sfx = {
  init() {
    if (AC) { if (AC.state === 'suspended') AC.resume(); return; }
    try {
      AC = new (root.AudioContext || root.webkitAudioContext)(); master = AC.createGain(); master.connect(AC.destination);
      sfxGain = AC.createGain(); sfxGain.connect(master); musGain = AC.createGain(); musGain.connect(master);
      noiseBuf = AC.createBuffer(1, AC.sampleRate * 2, AC.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      const o = AC.createOscillator(); o.type = 'sawtooth'; const lp = AC.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 600; const g = AC.createGain(); g.gain.value = 0; o.connect(lp); lp.connect(g); g.connect(sfxGain); o.start();
      const w = AC.createBufferSource(); w.buffer = noiseBuf; w.loop = true; const bp = AC.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 800; const wg = AC.createGain(); wg.gain.value = 0; w.connect(bp); bp.connect(wg); wg.connect(sfxGain); w.start();
      eng = { o, g, wg, bp }; Sfx.vol();
    } catch (e) { AC = null; }
  },
  vol() { if (!AC) return; const s = Game.S.set; sfxGain.gain.value = s.sfx; musGain.gain.value = s.mus * .35; },
  tone(f0, f1, dur, type, vol, delay) { if (!AC) return; const t = AC.currentTime + (delay || 0), o = AC.createOscillator(); o.type = type || 'square'; o.frequency.setValueAtTime(f0, t); if (f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t + dur); const g = AC.createGain(); g.gain.setValueAtTime(vol || .2, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); o.connect(g); g.connect(sfxGain); o.start(t); o.stop(t + dur + .02); },
  noise(dur, f0, f1, vol, delay) { if (!AC) return; const t = AC.currentTime + (delay || 0), s = AC.createBufferSource(); s.buffer = noiseBuf; const f = AC.createBiquadFilter(); f.type = 'bandpass'; f.Q.value = .8; f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t + dur); const g = AC.createGain(); g.gain.setValueAtTime(vol || .3, t); g.gain.exponentialRampToValueAtTime(.001, t + dur); s.connect(f); f.connect(g); g.connect(sfxGain); s.start(t, Math.random(), dur + .05); },
  ui(k) { if (k === 'buy') { Sfx.tone(660, 990, .12, 'triangle', .22); Sfx.tone(990, 1320, .15, 'triangle', .2, .09); } else if (k === 'err') Sfx.tone(180, 120, .2, 'sawtooth', .18); else Sfx.tone(520, 700, .06, 'triangle', .12); },
  beep(go) { Sfx.tone(go ? 880 : 440, go ? 880 : 440, go ? .5 : .18, 'square', .18); },
  boost() { Sfx.noise(.5, 500, 2600, .3); Sfx.tone(200, 600, .35, 'sawtooth', .12); },
  hit() { Sfx.noise(.45, 1200, 120, .45); Sfx.tone(220, 60, .35, 'sawtooth', .2); },
  boom() { Sfx.noise(.7, 1600, 80, .5); Sfx.tone(110, 35, .5, 'sine', .4); },
  pickup() { Sfx.tone(700, 1100, .1, 'triangle', .2); Sfx.tone(1100, 1500, .12, 'triangle', .18, .08); },
  coin() { Sfx.tone(1200, 1700, .08, 'square', .1); },
  lap() { Sfx.tone(660, 660, .1, 'triangle', .22); Sfx.tone(880, 880, .18, 'triangle', .22, .1); },
  fin() { for (let i = 0; i < 4; i++) Sfx.tone(520 + i * 130, 520 + i * 130, .22, 'triangle', .22, i * .12); },
  wall() { Sfx.noise(.2, 400, 100, .3); },
  mud() { Sfx.noise(.35, 300, 80, .35); },
  zap() { Sfx.tone(900, 90, .35, 'sawtooth', .22); Sfx.noise(.3, 3000, 300, .25); },
  tp() { Sfx.tone(300, 1400, .3, 'sine', .22); Sfx.tone(1400, 300, .3, 'sine', .15, .15); },
  horn(id) { if (!AC) return; if (id === 'oink') { Sfx.tone(260, 140, .12, 'sawtooth', .25); Sfx.tone(230, 110, .22, 'sawtooth', .25, .13); } else if (id === 'trumpet') { Sfx.tone(392, 392, .2, 'sawtooth', .2); Sfx.tone(523, 523, .3, 'sawtooth', .2, .2); } else if (id === 'duck') { Sfx.tone(700, 420, .18, 'square', .18); Sfx.tone(650, 380, .18, 'square', .18, .2); } else Sfx.tone(330, 330, .35, 'square', .18); },
  engine(speed, gas, boost, on) {
    if (!AC || !eng) return; const t = AC.currentTime;
    eng.o.frequency.setTargetAtTime(50 + speed * 3.4 + (boost ? 40 : 0), t, .08); eng.g.gain.setTargetAtTime(on ? (.05 + gas * .07) : 0, t, .1);
    eng.wg.gain.setTargetAtTime(on ? clamp(speed / 60, 0, 1) * .09 : 0, t, .1); eng.bp.frequency.setTargetAtTime(500 + speed * 18, t, .1);
  },
  /* простая процедурная музыка: бас и арпеджио, тема влияет на лад и темп */
  music(theme) {
    if (!AC) return; Sfx.stopMusic(); const sc = { farm: [0, 2, 4, 7, 9], metro: [0, 3, 5, 7, 10], hell: [0, 1, 4, 5, 8], lab: [0, 2, 3, 7, 8], portal: [0, 2, 4, 6, 9], neon: [0, 3, 5, 7, 10], ice: [0, 2, 4, 7, 11], final: [0, 3, 4, 7, 8], menu: [0, 2, 4, 7, 9] }[theme] || [0, 2, 4, 7, 9];
    const bpm = { hell: 150, neon: 140, final: 148, menu: 100, metro: 120 }[theme] || 128, step = 60 / bpm / 2, root = { hell: 41, metro: 43, neon: 45, final: 40 }[theme] || 48; musStep = 0;
    const pat = [0, 2, 1, 3, 0, 4, 2, 3, 0, 2, 1, 4, 3, 2, 1, 0];
    musTimer = setInterval(() => {
      if (!AC || Game.S.set.mus <= 0) return; const t = AC.currentTime + .05, i = musStep++, n = sc[pat[i % 16] % 5] + (((i >> 4) % 4) === 2 ? 5 : 0);
      const mk = (f, d, ty, v) => { const o = AC.createOscillator(); o.type = ty; o.frequency.value = f; const g = AC.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.001, t + d); o.connect(g); g.connect(musGain); o.start(t); o.stop(t + d + .02); };
      const f = m => 440 * Math.pow(2, (m - 69) / 12);
      if (i % 4 === 0) mk(f(root + (((i >> 4) % 4) === 2 ? 5 : 0) - 12), step * 3.5, 'triangle', .5);
      mk(f(root + 12 + n), step * .9, theme === 'hell' ? 'sawtooth' : 'square', .12);
    }, step * 1000);
  },
  stopMusic() { if (musTimer) { clearInterval(musTimer); musTimer = null; } }
};

/* ---------- управление ---------- */
const keys = {}, touch = { left: 0, right: 0, gas: 0, brk: 0, drift: 0, item: 0, joy: 0, tilt: 0 };
Game.input = { steer: 0, gas: 0, brake: 0, drift: false, item: false };
Game.keyHooks = {};
addEventListener('keydown', e => {
  if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
  if (Game.rebind) { e.preventDefault(); Game.rebind(e.code); return; }
  keys[e.code] = true; const K = Game.S && Game.S.set.keys; if (!K) return;
  if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
  if (e.code === K.pause && Game.hooks.pause) Game.hooks.pause(); if (e.code === K.cam && Game.hooks.cam) Game.hooks.cam();
  if (e.code === 'KeyH' && Game.hooks.horn) Game.hooks.horn();
});
addEventListener('keyup', e => { keys[e.code] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
let joyId = null, joyO = { x: 0, y: 0 };
Game.bindTouch = function () {
  const bind = (id, key) => { const el = $(id); if (!el) return; const on = e => { e.preventDefault(); e.stopPropagation(); touch[key] = 1; el.classList.add('on'); try { el.setPointerCapture(e.pointerId); } catch (_) {} Sfx.init(); }, off = e => { e.preventDefault(); touch[key] = 0; el.classList.remove('on'); }; el.addEventListener('pointerdown', on); el.addEventListener('pointerup', off); el.addEventListener('pointercancel', off); el.addEventListener('lostpointercapture', off); };
  bind('tLeft', 'left'); bind('tRight', 'right'); bind('tGas', 'gas'); bind('tBrk', 'brk'); bind('tDrift', 'drift'); bind('tItem', 'item');
  const jz = $('joyZone'), knob = $('joyKnob'), base = $('joyBase');
  jz.addEventListener('pointerdown', e => { if (joyId !== null) return; e.preventDefault(); joyId = e.pointerId; joyO = { x: e.clientX, y: e.clientY }; try { jz.setPointerCapture(e.pointerId); } catch (_) {} base.style.display = 'block'; base.style.left = e.clientX + 'px'; base.style.top = e.clientY + 'px'; knob.style.transform = 'translate(0,0)'; Sfx.init(); });
  jz.addEventListener('pointermove', e => { if (e.pointerId !== joyId) return; const R = 56 * (Game.S.set.size || 1); const dx = clamp((e.clientX - joyO.x) / R, -1, 1); touch.joy = dx; knob.style.transform = 'translate(' + (dx * R * .8) + 'px,0)'; });
  const jend = e => { if (e.pointerId !== joyId) return; joyId = null; touch.joy = 0; base.style.display = 'none'; };
  jz.addEventListener('pointerup', jend); jz.addEventListener('pointercancel', jend);
  addEventListener('deviceorientation', ev => {
    if (Game.S.set.scheme !== 'tilt' || ev.beta === null) return; const a = (screen.orientation && screen.orientation.angle !== undefined) ? screen.orientation.angle : (root.orientation || 0);
    let t = a === 90 ? -ev.beta : (a === 270 || a === -90) ? ev.beta : ev.gamma; if (Game.S.set.invert) t = -t; if (Game.tiltZero === undefined) Game.tiltZero = t; touch.tilt = clamp((t - Game.tiltZero) / 28, -1, 1);
  });
};
Game.calibrateTilt = () => { Game.tiltZero = undefined; };
Game.enableTilt = async function () { try { if (root.DeviceOrientationEvent && DeviceOrientationEvent.requestPermission) { const r = await DeviceOrientationEvent.requestPermission(); return r === 'granted'; } } catch (e) { return false; } return true; };
Game.readInput = function () {
  const set = Game.S.set, K = set.keys, o = Game.input, istouch = Game.isTouch;
  let steer = 0, gas = 0, brake = 0, drift = false, item = false;
  if (keys[K.left] || keys.KeyA) steer -= 1; if (keys[K.right] || keys.KeyD) steer += 1; if (keys[K.gas] || keys.KeyW) gas = 1; if (keys[K.brake] || keys.KeyS) brake = 1; if (keys[K.drift]) drift = true; if (keys[K.item] || keys.KeyE) item = true;
  if (istouch) {
    const sc = set.scheme;
    if (sc === 'btn') steer += touch.right - touch.left; else if (sc === 'joy') steer += touch.joy; else if (sc === 'tilt') steer += touch.tilt + (touch.right - touch.left);
    if (touch.gas) gas = 1; if (touch.brk) brake = 1; if (touch.drift) drift = true; if (touch.item) item = true; if (set.auto && !brake) gas = 1;
  }
  const dz = set.dead; if (Math.abs(steer) < dz) steer = 0; else steer = Math.sign(steer) * (Math.abs(steer) - dz) / (1 - dz);
  o.steer = clamp(steer * set.sens, -1, 1); o.gas = gas; o.brake = brake; o.drift = drift; o.item = item; return o;
};

/* ---------- сеть ---------- */
const net = Game.net = { ws: null, ok: false, room: null, you: -1, onMsg: null, onState: null, online: 0 };
net.url = function () { return root.WS_URL || ((location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host + '/ws'); };
net.connect = function () {
  return new Promise((res, rej) => {
    if (net.ok && net.ws && net.ws.readyState === 1) return res(true);
    let ws; try { ws = new WebSocket(net.url()); } catch (e) { return rej(e); }
    const to = setTimeout(() => { try { ws.close(); } catch (e) {} rej(new Error('timeout')); }, 9000);
    ws.onopen = () => { clearTimeout(to); net.ws = ws; net.ok = true; net.send({ t: 'hello', pid: Game.S.pid, name: Game.S.name || 'Свин', look: Game.compactLook() }); if (net.onState) net.onState(true); res(true); };
    ws.onmessage = ev => { let m; try { m = JSON.parse(ev.data); } catch (e) { return; } if (m.t === 'welcome') net.online = m.online; if (m.t === 'room') { net.room = m.room; net.you = m.you; } if (m.t === 'left_room') net.room = null; if (net.onMsg) net.onMsg(m); };
    ws.onclose = () => { net.ok = false; net.room = null; if (net.onState) net.onState(false); };
    ws.onerror = () => { clearTimeout(to); rej(new Error('ws error')); };
  });
};
net.send = o => { if (net.ws && net.ws.readyState === 1) net.ws.send(JSON.stringify(o)); };
net.close = () => { try { if (net.ws) net.ws.close(); } catch (e) {} net.ok = false; net.room = null; };
Game.compactLook = () => JSON.parse(JSON.stringify(Game.S.look));
/* таблица рангов */
Game.apiBase = () => root.API_BASE || '';
Game.postRank = function () { const S = Game.S; if (!S.name) return; try { fetch(Game.apiBase() + '/api/rank', { method: 'POST', body: JSON.stringify({ pid: S.pid, name: S.name, rp: S.rp, wins: S.wins, races: S.races, level: S.level }) }).catch(() => {}); } catch (e) {} };
Game.getRank = async function () { const r = await fetch(Game.apiBase() + '/api/rank?pid=' + encodeURIComponent(Game.S.pid)); if (!r.ok) throw new Error('bad'); return r.json(); };
})(typeof window !== 'undefined' ? window : globalThis);
