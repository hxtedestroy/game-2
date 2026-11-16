// Хрю-карт: статический сайт, лобби по WebSocket и таблица рангов. Без зависимостей, Node 18+.
const http = require('http'), fs = require('fs'), path = require('path'), https = require('https'), crypto = require('crypto');
const PORT = process.env.PORT || 3000;
const DIR = __dirname;
const DATA = process.env.DATA_FILE || path.join(DIR, 'data.json');
const SAFE_FILE = /^[a-z0-9_\-]+\.(html|js|css)$/;
const HIDDEN = new Set(['server.js']);

/* ---------- хранение рангов ---------- */
let db = { players: {} };
try { db = JSON.parse(fs.readFileSync(DATA, 'utf8')); } catch (e) {}
if (!db.players) db.players = {};
let dirty = false;
function flush() { if (!dirty) return; dirty = false; try { fs.writeFileSync(DATA, JSON.stringify(db)); } catch (e) { console.error('save failed', e.message); } }
setInterval(flush, 5000);
for (const sig of ['SIGTERM', 'SIGINT']) process.on(sig, () => { flush(); process.exit(0); });

/* three.js кладём рядом, чтобы игра не зависела от внешнего CDN */
const threePath = path.join(DIR, 'three.min.js');
if (!fs.existsSync(threePath)) {
  https.get('https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js', res => {
    if (res.statusCode !== 200) { console.log('three.js не скачан, статус', res.statusCode, '(игра возьмёт его с CDN)'); res.resume(); return; }
    const ch = []; res.on('data', c => ch.push(c));
    res.on('end', () => { fs.writeFileSync(threePath, Buffer.concat(ch)); console.log('three.js сохранён локально'); });
  }).on('error', e => console.log('three.js не скачан:', e.message));
}

const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8' };
const clampInt = (v, a, b) => { v = Math.floor(Number(v)); return Number.isFinite(v) ? Math.max(a, Math.min(b, v)) : a; };
const cleanName = s => String(s || '').replace(/[\u0000-\u001f<>]/g, '').trim().slice(0, 16);
function send(res, code, obj) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8', 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(obj));
}
const lastHit = new Map();
setInterval(() => { const t = Date.now(); for (const [k, v] of lastHit) if (t - v > 60000) lastHit.delete(k); }, 60000);
const ipOf = req => (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

function handleRankPost(req, res) {
  const ip = ipOf(req), now = Date.now();
  if (now - (lastHit.get(ip) || 0) < 1500) return send(res, 429, { error: 'slow down' });
  lastHit.set(ip, now);
  let body = '';
  req.on('data', c => { body += c; if (body.length > 2048) req.destroy(); });
  req.on('end', () => {
    let d; try { d = JSON.parse(body); } catch (e) { return send(res, 400, { error: 'bad json' }); }
    const pid = String(d.pid || '');
    if (!/^[a-z0-9]{8,64}$/.test(pid)) return send(res, 400, { error: 'bad pid' });
    const name = cleanName(d.name); if (!name) return send(res, 400, { error: 'bad name' });
    let p = db.players[pid];
    if (!p) { if (Object.keys(db.players).length >= 20000) return send(res, 507, { error: 'full' }); p = db.players[pid] = {}; }
    p.name = name; p.rp = clampInt(d.rp, 0, 20000); p.wins = clampInt(d.wins, 0, 1e6); p.races = clampInt(d.races, 0, 1e6);
    p.level = clampInt(d.level, 1, 200); p.ts = now; dirty = true;
    send(res, 200, { ok: true });
  });
}
function handleRankGet(req, res, url) {
  const me = url.searchParams.get('pid') || '';
  const rows = Object.entries(db.players).map(([pid, p]) => ({ pid, name: p.name, rp: p.rp || 0, wins: p.wins || 0, races: p.races || 0, level: p.level || 1 }));
  rows.sort((a, b) => b.rp - a.rp || b.wins - a.wins);
  const idx = rows.findIndex(r => r.pid === me);
  send(res, 200, { total: rows.length, myRank: idx >= 0 ? idx + 1 : 0,
    rows: rows.slice(0, 50).map(r => ({ name: r.name, rp: r.rp, wins: r.wins, races: r.races, level: r.level, me: r.pid === me })) });
}

/* ---------- WebSocket вручную ---------- */
let nextId = 1;
const conns = new Set();
function wsSend(c, obj) {
  if (c.dead) return;
  const p = Buffer.from(JSON.stringify(obj)), n = p.length; let h;
  if (n < 126) h = Buffer.from([0x81, n]);
  else if (n < 65536) { h = Buffer.alloc(4); h[0] = 0x81; h[1] = 126; h.writeUInt16BE(n, 2); }
  else { h = Buffer.alloc(10); h[0] = 0x81; h[1] = 127; h.writeBigUInt64BE(BigInt(n), 2); }
  try { if (c.sock.writableLength > 1e6) return c.sock.destroy(); c.sock.write(Buffer.concat([h, p])); } catch (e) {}
}
function wsPong(c, data) { const h = Buffer.from([0x8a, data.length]); try { c.sock.write(Buffer.concat([h, data])); } catch (e) {} }
function onData(c, chunk) {
  c.buf = Buffer.concat([c.buf, chunk]);
  for (;;) {
    const b = c.buf; if (b.length < 2) return;
    const fin = !!(b[0] & 0x80), op = b[0] & 0x0f, masked = !!(b[1] & 0x80);
    let len = b[1] & 0x7f, off = 2;
    if (len === 126) { if (b.length < 4) return; len = b.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (b.length < 10) return; len = Number(b.readBigUInt64BE(2)); off = 10; }
    if (len > 8192 || !masked) { c.sock.destroy(); return; }
    if (b.length < off + 4 + len) return;
    const data = Buffer.alloc(len);
    for (let i = 0; i < len; i++) data[i] = b[off + 4 + i] ^ b[off + (i & 3)];
    c.buf = b.slice(off + 4 + len);
    if (op === 8) { c.sock.end(); return; }
    if (op === 9) { wsPong(c, data.slice(0, 125)); continue; }
    if (op === 1 || op === 0) {
      if (op === 1) c.frag = data; else if (c.frag) c.frag = Buffer.concat([c.frag, data]); else continue;
      if (c.frag.length > 8192) { c.sock.destroy(); return; }
      if (fin) { const t = c.frag.toString('utf8'); c.frag = null; onMsg(c, t); }
    }
  }
}

/* ---------- комнаты ---------- */
const rooms = new Map();
const MODES = { '4p': 4, duel: 2 };
function genCode() { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (;;) { let s = ''; for (let i = 0; i < 4; i++) s += A[crypto.randomInt(A.length)]; if (!rooms.has(s)) return s; } }
function roomInfo(r) {
  return { code: r.code, mode: r.mode, max: r.max, pub: r.pub, track: r.track, laps: r.laps, bots: r.bots, state: r.state, host: r.host.slot,
    players: r.players.map(p => ({ slot: p.slot, name: p.name, ready: p.ready, look: p.look })) };
}
function bcast(r, obj, except) { for (const p of r.players) if (p !== except) wsSend(p, obj); }
function pushRoom(r) { const info = roomInfo(r); for (const p of r.players) wsSend(p, { t: 'room', room: info, you: p.slot }); }
function makeRoom(c, mode, pub) {
  const r = { code: genCode(), mode, max: MODES[mode], pub: !!pub, host: c, players: [], track: 0, laps: 3, bots: true, state: 'lobby', fins: [], timers: [] };
  rooms.set(r.code, r); addToRoom(r, c); return r;
}
function addToRoom(r, c) {
  const used = new Set(r.players.map(p => p.slot)); let s = 0; while (used.has(s)) s++;
  c.slot = s; c.room = r; c.ready = false; r.players.push(c);
  if (r.pub && r.players.length >= 2 && !r.autoT) r.autoT = setTimeout(() => { r.autoT = null; if (rooms.has(r.code) && r.state === 'lobby' && r.players.length >= 2) startRoom(r); }, r.players.length >= r.max ? 3000 : 12000);
}
function leaveRoom(c) {
  const r = c.room; if (!r) return;
  r.players = r.players.filter(p => p !== c); c.room = null; c.ready = false;
  if (!r.players.length) { clearTimeout(r.autoT); clearTimeout(r.finT); rooms.delete(r.code); return; }
  if (r.host === c) r.host = r.players[0];
  bcast(r, { t: 'left', slot: c.slot });
  if (r.state === 'race') checkEnd(r); else pushRoom(r);
}
function startRoom(r) {
  if (r.state !== 'lobby') return;
  clearTimeout(r.autoT); r.autoT = null;
  r.state = 'race'; r.fins = []; r.seed = crypto.randomInt(1, 2 ** 30);
  bcast(r, { t: 'go', seed: r.seed, track: r.track, laps: r.laps, bots: r.bots, max: r.max, players: r.players.map(p => ({ slot: p.slot, name: p.name, look: p.look })) });
  r.raceT = setTimeout(() => endRace(r), 15 * 60 * 1000);
}
function checkEnd(r) {
  const humans = r.players.length;
  if (r.state !== 'race') return;
  if (!humans) return;
  if (r.fins.length >= humans) endRace(r);
  else if (r.fins.length === 1 && !r.finT) r.finT = setTimeout(() => endRace(r), 40000);
}
function endRace(r) {
  if (r.state !== 'race') return;
  clearTimeout(r.finT); clearTimeout(r.raceT); r.finT = null;
  const order = r.fins.slice().sort((a, b) => a.time - b.time);
  for (const p of r.players) if (!order.some(o => o.slot === p.slot)) order.push({ slot: p.slot, name: p.name, time: 0 });
  r.state = 'lobby'; for (const p of r.players) p.ready = false;
  bcast(r, { t: 'res', order });
  pushRoom(r);
}
function onMsg(c, text) {
  const now = Date.now();
  if (now - c.winT > 1000) { c.winT = now; c.winN = 0; }
  if (++c.winN > 60) return;
  let m; try { m = JSON.parse(text); } catch (e) { return; }
  if (!m || typeof m.t !== 'string') return;
  switch (m.t) {
    case 'hello': {
      const pid = String(m.pid || ''); if (!/^[a-z0-9]{8,64}$/.test(pid)) return;
      c.pid = pid; c.name = cleanName(m.name) || 'Свин'; c.look = sanitizeLook(m.look);
      wsSend(c, { t: 'welcome', id: c.id, online: conns.size });
      break;
    }
    case 'look': c.look = sanitizeLook(m.look); c.name = cleanName(m.name) || c.name; if (c.room && c.room.state === 'lobby') pushRoom(c.room); break;
    case 'create': { if (!c.pid || c.room) return; const mode = MODES[m.mode] ? m.mode : '4p'; pushRoom(makeRoom(c, mode, false)); break; }
    case 'quick': {
      if (!c.pid || c.room) return; const mode = MODES[m.mode] ? m.mode : '4p';
      let r = null; for (const x of rooms.values()) if (x.pub && x.mode === mode && x.state === 'lobby' && x.players.length < x.max) { r = x; break; }
      if (r) { addToRoom(r, c); pushRoom(r); } else pushRoom(makeRoom(c, mode, true));
      break;
    }
    case 'join': {
      if (!c.pid || c.room) return; const r = rooms.get(String(m.code || '').toUpperCase().slice(0, 4));
      if (!r) return wsSend(c, { t: 'err', m: 'Лобби с таким кодом не найдено' });
      if (r.state !== 'lobby') return wsSend(c, { t: 'err', m: 'Гонка уже идёт' });
      if (r.players.length >= r.max) return wsSend(c, { t: 'err', m: 'Лобби заполнено' });
      addToRoom(r, c); pushRoom(r); break;
    }
    case 'leave': leaveRoom(c); wsSend(c, { t: 'left_room' }); break;
    case 'ready': if (c.room && c.room.state === 'lobby') { c.ready = !!m.v; pushRoom(c.room); } break;
    case 'cfg': {
      const r = c.room; if (!r || r.host !== c || r.state !== 'lobby') return;
      r.track = clampInt(m.track, 0, 7); r.laps = clampInt(m.laps, 1, 5); r.bots = !!m.bots; pushRoom(r); break;
    }
    case 'start': { const r = c.room; if (r && r.host === c && r.state === 'lobby') startRoom(r); break; }
    case 'st': case 'ev': { const r = c.room; if (r && r.state === 'race') { m.s = c.slot; bcast(r, m, c); } break; }
    case 'fin': {
      const r = c.room; if (!r || r.state !== 'race' || r.fins.some(f => f.slot === c.slot)) return;
      r.fins.push({ slot: c.slot, name: c.name, time: Math.max(1, Math.min(3600, Number(m.time) || 1)) });
      bcast(r, { t: 'fin', slot: c.slot, time: r.fins[r.fins.length - 1].time }, c);
      checkEnd(r); break;
    }
    case 'ping': wsSend(c, { t: 'pong', n: m.n }); break;
  }
}
function sanitizeLook(l) {
  try { const s = JSON.stringify(l || {}); if (s.length > 900) return {}; return JSON.parse(s); } catch (e) { return {}; }
}
function dropConn(c) { if (c.dead) return; c.dead = true; conns.delete(c); leaveRoom(c); }
setInterval(() => { for (const c of conns) { if (c.dead) continue; try { c.sock.write(Buffer.from([0x89, 0])); } catch (e) {} } }, 25000);

/* ---------- HTTP ---------- */
const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method === 'OPTIONS') { res.writeHead(204, { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'GET,POST' }); return res.end(); }
  if (url.pathname === '/api/rank' && req.method === 'POST') return handleRankPost(req, res);
  if (url.pathname === '/api/rank' && req.method === 'GET') return handleRankGet(req, res, url);
  if (url.pathname === '/api/health') return send(res, 200, { ok: true, online: conns.size, rooms: rooms.size });
  if (url.pathname.startsWith('/api/')) return send(res, 404, { error: 'not found' });
  let f = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (f === '') f = 'index.html';
  if (!(SAFE_FILE.test(f) || f === 'three.min.js') || HIDDEN.has(f)) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
  fs.readFile(path.join(DIR, f), (err, buf) => {
    if (err) { res.writeHead(404, { 'Content-Type': 'text/plain' }); return res.end('404'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' });
    res.end(buf);
  });
});
server.on('upgrade', (req, sock) => {
  const url = new URL(req.url, 'http://x');
  const key = req.headers['sec-websocket-key'];
  if (url.pathname !== '/ws' || !key || conns.size > 2000) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\nSec-WebSocket-Accept: ' + accept + '\r\n\r\n');
  sock.setNoDelay(true);
  const c = { id: nextId++, sock, buf: Buffer.alloc(0), frag: null, dead: false, pid: '', name: 'Свин', look: {}, room: null, slot: 0, ready: false, winT: 0, winN: 0 };
  conns.add(c);
  sock.on('data', d => { try { onData(c, d); } catch (e) { sock.destroy(); } });
  sock.on('close', () => dropConn(c)); sock.on('error', () => dropConn(c));
});
server.listen(PORT, () => console.log('Хрю-карт: http://localhost:' + PORT));
