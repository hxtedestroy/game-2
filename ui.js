/* Хрю-карт: интерфейс. */
(function (root) {
'use strict';
const KC = root.KC, G = KC.gfx, Game = KC.game, Sfx = Game.sfx, net = Game.net, $ = id => document.getElementById(id), ui = $('ui');
const esc = s => String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const A = {}; let screen = '', stack = [], pv = null, pvRaf = 0, garTab = 'hat', setTab = 'ctl', raceTab = 'free', rcfg = { track: 0, laps: 3, bots: 3, diff: .85 }, lastRace = null, lastInfo = null, onlineMsg = '';
const ITEMS = { boost: '⚡', boost3: '🔥', mud: '🟤', rocket: '🚀', shield: '🛡️' };
const AV = look => look && look.av === 'human' ? '🧑' : '🐷';
const S = () => Game.S;
ui.addEventListener('click', e => { const t = e.target.closest('[data-a]'); if (!t) return; Sfx.init(); Sfx.ui(); const f = A[t.dataset.a]; if (f) f(t.dataset.v, t); });

function rankBadge(rp, sz) { const r = KC.rankOf(rp); return '<div class="rb" style="background:' + r.color + (sz ? ';width:' + sz + 'px;height:' + sz + 'px' : '') + '">' + (r.tier === 7 ? '★' : ['I', 'II', 'III'][2 - r.div]) + '</div>'; }
function topbar(title, back) { return '<div class="top">' + (back === false ? '' : '<button class="btn s" data-a="back">◀</button>') + '<h2>' + esc(title) + '</h2><span class="pill">🪙 ' + S().coins + '</span></div>'; }
function render(name, html, cls) { screen = name; ui.innerHTML = '<div class="scr ' + (cls || '') + '">' + html + '</div>'; }
function go(name, arg, noPush) { if (!noPush && screen && screen !== name) stack.push(screen); stopPreview(); (SC[name] || SC.menu)(arg); }
A.back = () => { const p = stack.pop(); if (screen === 'lobby') { net.send({ t: 'leave' }); } if (p) { stopPreview(); (SC[p] || SC.menu)(); } else SC.menu(); };
A.go = v => go(v);
function toast(t, ms) { const el = $('toast'); el.textContent = t; el.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('on'), ms || 1400); }
function note(t) { const d = document.createElement('div'); d.style.cssText = 'position:absolute;left:12px;right:12px;bottom:calc(20px + env(safe-area-inset-bottom));background:#000c;border-radius:14px;padding:12px;text-align:center;z-index:50;font-weight:700'; d.textContent = t; ui.appendChild(d); setTimeout(() => d.remove(), 2200); }
function modal(html) { const d = document.createElement('div'); d.className = 'modal'; d.id = 'modal'; d.innerHTML = '<div class="mb">' + html + '</div>'; ui.appendChild(d); }
A.close = () => { const m = $('modal'); if (m) m.remove(); };

/* ---------- диалоги ---------- */
function dialog(lines, done) {
  let i = 0; const d = document.createElement('div'); d.className = 'dlg'; ui.appendChild(d);
  const step = () => { if (i >= lines.length) { d.remove(); done && done(); return; } const [nm, tx] = lines[i++]; d.innerHTML = '<div class="box"><div class="av">' + (KC.PORTRAITS[nm] || '🐷') + '</div><div style="flex:1"><div class="nm">' + esc(nm) + '</div><div class="tx">' + esc(tx) + '</div><div class="muted" style="margin-top:8px;text-align:right">нажми, чтобы дальше ▶</div></div></div>'; };
  d.onclick = step; step();
}

/* ---------- экраны ---------- */
const SC = {};
SC.name = function () {
  render('name', '<div class="body" style="display:flex;flex-direction:column;justify-content:center"><div class="title">ХРЮ-КАРТ</div><div class="muted" style="text-align:center;margin-bottom:18px">Гонки, кастомизация, онлайн и история про свинью Хрюнделя</div><div class="card"><div style="margin-bottom:8px;font-weight:700">Как тебя зовут?</div><input type="text" id="nm" maxlength="14" placeholder="Имя гонщика" value="' + esc(S().name) + '"><button class="btn p" style="width:100%;margin-top:12px" data-a="saveName">Поехали!</button></div></div>');
};
A.saveName = () => { let v = ($('nm').value || '').trim().replace(/\s+/g, ' ').slice(0, 14); if (v.length < 2) { note('Минимум 2 символа'); return; } const first = !S().name; S().name = v; Game.save(); Game.postRank(); stack = []; if (first && !S().intro) { SC.menu(); dialog([['Тётя Гайка', 'Привет, ' + v + '! Я Тётя Гайка. Добро пожаловать в гаражи Хрюнделя.'], ['Хрюндель', 'Хрю! Барон Бекон разбил Золотое Корыто. Нужно собрать осколки.'], ['Тётя Гайка', 'Начни с раздела «История». И загляни в «Гараж» — там можно одеть героя и тюнинговать машину.']], () => { S().intro = 1; Game.save(); }); } else SC.menu(); };
A.rename = () => { stack = []; SC.name(); };

SC.menu = function () {
  const s = S(), r = KC.rankOf(s.rp), need = KC.xpNeed(s.level), canDaily = Game.dailyAvailable();
  Sfx.stopMusic(); Sfx.music('menu');
  render('menu', '<div class="body"><div class="title" style="margin-top:4px">ХРЮ-КАРТ</div>' +
    '<div class="card"><div class="row"><div style="font-size:38px">' + AV(s.look) + '</div><div class="sp"><b style="font-size:18px">' + esc(s.name) + '</b><div class="muted">Уровень ' + s.level + ' · побед ' + s.wins + ' из ' + s.races + '</div><div class="bar" style="margin-top:5px"><i style="width:' + Math.min(100, s.xp / need * 100) + '%"></i></div></div><div style="text-align:center">' + rankBadge(s.rp) + '<div class="muted" style="font-size:11px;margin-top:2px">' + esc(r.name) + '</div></div></div><div class="row" style="margin-top:8px"><span class="pill">🪙 ' + s.coins + '</span><span class="pill">⭐ ' + Game.totalStars() + '/' + KC.STORY.length * 9 + '</span><span class="sp"></span><button class="btn s" data-a="rename">✏️</button></div></div>' +
    '<div class="menu"><button class="btn p wide" data-a="go" data-v="story"><b>📖</b>История</button><button class="btn" data-a="go" data-v="race"><b>🏁</b>Гонка</button><button class="btn" data-a="go" data-v="online"><b>🌐</b>Онлайн</button><button class="btn" data-a="go" data-v="garage"><b>👕</b>Гараж</button><button class="btn" data-a="go" data-v="ranks"><b>🏆</b>Ранги</button><button class="btn' + (canDaily ? ' y' : '') + '" data-a="go" data-v="rewards"><b>🎁</b>Награды' + (canDaily ? ' •' : '') + '</button><button class="btn" data-a="go" data-v="settings"><b>⚙️</b>Настройки</button></div></div>', '');
};

/* История */
SC.story = function () {
  let h = topbar('История: Золотое Корыто') + '<div class="body">';
  KC.STORY.forEach((ch, i) => { const un = Game.stageUnlocked(i, 0), st = [0, 1, 2].reduce((a, k) => a + Game.stageStars(i, k), 0);
    h += '<div class="card" style="' + (un ? '' : 'opacity:.45') + '"><div class="row"><div style="font-size:30px">' + (un ? (KC.PORTRAITS[ch.rival] || '🏁') : '🔒') + '</div><div class="sp"><b>Глава ' + (i + 1) + ': ' + esc(ch.title) + '</b><div class="muted">' + esc(ch.place) + ' · трасса «' + esc(KC.TRACKS[i].name) + '»</div></div><div class="star">' + st + '/9⭐</div></div>' + (un ? '<button class="btn p s" style="margin-top:10px;width:100%" data-a="chapter" data-v="' + i + '">Открыть</button>' : '') + '</div>'; });
  if (Game.storyDone()) h += '<div class="card"><b>🎉 История пройдена!</b><div class="muted">Играй в ранговые гонки и онлайн — Кубок легенд не кончается.</div></div>';
  render('story', h + '</div>');
};
A.chapter = v => go('chapter', +v);
SC.chapter = function (i) {
  const ch = KC.STORY[i]; let h = topbar('Глава ' + (i + 1) + ': ' + ch.title) + '<div class="body"><div class="card"><div class="muted">' + esc(ch.place) + '</div><button class="btn s" style="margin-top:8px" data-a="intro" data-v="' + i + '">💬 Диалог главы</button></div>';
  ch.stages.forEach((sg, k) => { const sc = KC.stageConfig(i, k), un = Game.stageUnlocked(i, k), stars = Game.stageStars(i, k), ico = { race: '🏁', coins: '🪙', duel: '⚔️' }[sg.type];
    h += '<div class="card" style="' + (un ? '' : 'opacity:.45') + '"><div class="row"><div style="font-size:28px">' + ico + '</div><div class="sp"><b>' + esc(sg.name) + '</b><div class="muted">' + ({ race: 'Гонка ' + sc.laps + ' круга, ' + sc.bots + ' соперника', coins: 'Собери монеты, ' + sc.laps + ' круга', duel: 'Дуэль с ' + esc(ch.rival) }[sg.type]) + '</div></div><div class="star">' + '★'.repeat(stars) + '<span class="star off">' + '★'.repeat(3 - stars) + '</span></div></div>' +
      '<div class="muted" style="margin:8px 0">' + sc.goals.map((g, j) => (stars > j ? '✅ ' : '▫️ ') + g).join('<br>') + '</div>' + (un ? '<button class="btn p" style="width:100%" data-a="playStage" data-v="' + i + ':' + k + '">Играть</button>' : '<div class="muted">🔒 Пройди предыдущий этап</div>') + '</div>'; });
  const items = KC.allProducts().filter(p => p.rw === i); if (items.length) h += '<div class="card"><b>🏆 Награда главы</b><div class="muted">' + items.map(p => esc(p.n)).join(', ') + '</div></div>';
  render('chapter', h + '</div>');
  if (!S().story.seen[i]) { S().story.seen[i] = 1; Game.save(); dialog(ch.intro); }
};
A.intro = v => dialog(KC.STORY[+v].intro);
A.playStage = v => { const [ch, st] = v.split(':').map(Number), sg = KC.STORY[ch].stages[st], sc = KC.stageConfig(ch, st);
  const go = () => launch({ kind: 'story', track: sc.track, laps: sc.laps, bots: sc.bots, skill: sc.skill, type: sc.type, stage: { ch, st }, seed: (Math.random() * 1e6) | 0 }); if (sg.say && sg.say.length) dialog(sg.say, go); else go(); };

/* Гонка против ботов */
SC.race = function () {
  const T = KC.TRACKS, r = KC.rankOf(S().rp);
  let h = topbar('Гонка') + '<div class="tabs"><button class="tab' + (raceTab === 'free' ? ' on' : '') + '" data-a="rtab" data-v="free">Свободная</button><button class="tab' + (raceTab === 'ranked' ? ' on' : '') + '" data-a="rtab" data-v="ranked">Ранговая</button></div><div class="body">';
  if (raceTab === 'ranked') h += '<div class="card"><div class="row">' + rankBadge(S().rp, 54) + '<div class="sp"><b>' + esc(r.name) + '</b><div class="muted">' + S().rp + ' RP · боты подстраиваются под твой ранг</div></div></div><div class="muted" style="margin:10px 0">Случайная трасса, 5 соперников. 1 место +28 RP, 2 место +18, 3 место +9, ниже — минус.</div><button class="btn p" style="width:100%" data-a="startRanked">В бой!</button></div>';
  else {
    h += '<div class="card"><b>Трасса</b><div class="grid g2" style="margin-top:8px">' + T.map((t, i) => '<button class="item' + (rcfg.track === i ? ' eq' : '') + '" data-a="rtrack" data-v="' + i + '"><b>' + esc(t.name) + '</b><span class="muted">' + esc(t.sub) + '</span><span class="muted">' + (S().bestTimes[i + ':' + rcfg.laps] ? '🏅 ' + Game.fmtTime(S().bestTimes[i + ':' + rcfg.laps]) : '') + '</span></button>').join('') + '</div></div>';
    h += '<div class="card"><div class="setrow"><label>Круги</label><div class="sch" style="width:60%">' + [1, 2, 3, 5].map(n => '<button class="btn' + (rcfg.laps === n ? ' on' : '') + '" data-a="rlaps" data-v="' + n + '">' + n + '</button>').join('') + '</div></div><div class="setrow"><label>Соперники</label><div class="sch" style="width:60%">' + [1, 3, 5].map(n => '<button class="btn' + (rcfg.bots === n ? ' on' : '') + '" data-a="rbots" data-v="' + n + '">' + n + '</button>').join('') + '</div></div><div class="setrow"><label>Сложность</label><select id="diff" data-a="rdiff">' + [['Лёгко', .78], ['Нормально', .85], ['Сложно', .92], ['Адская', .98]].map(([n, v]) => '<option value="' + v + '"' + (rcfg.diff === v ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><button class="btn p" style="width:100%;margin-top:12px" data-a="startFree">Старт</button></div>';
  }
  render('race', h + '</div>');
  const sel = $('diff'); if (sel) sel.onchange = () => { rcfg.diff = +sel.value; };
};
A.rtab = v => { raceTab = v; SC.race(); }; A.rtrack = v => { rcfg.track = +v; SC.race(); }; A.rlaps = v => { rcfg.laps = +v; SC.race(); }; A.rbots = v => { rcfg.bots = +v; SC.race(); };
A.startFree = () => launch({ kind: 'solo', track: rcfg.track, laps: rcfg.laps, bots: rcfg.bots, skill: rcfg.diff, seed: (Math.random() * 1e6) | 0 });
A.startRanked = () => launch({ kind: 'ranked', track: Math.floor(Math.random() * KC.TRACKS.length), laps: 3, bots: 5, skill: .9, seed: (Math.random() * 1e6) | 0 });

/* ---------- запуск и завершение гонки ---------- */
function launch(c) {
  lastRace = c; ui.innerHTML = ''; screen = 'race-run'; stopPreview(); $('hud').classList.remove('hide'); setupTouch();
  try { Game.startRace(c); } catch (e) { console.error(e); backToMenu(); note('Ошибка запуска гонки: ' + e.message); }
}
function backToMenu() { Game.stopRace(); $('hud').classList.add('hide'); $('touch').classList.add('hide'); stack = []; SC.menu(); }
Game.hooks.raceStart = (R, cfg) => { $('mini').classList.toggle('hide', !S().set.minimap); };
Game.hooks.toast = t => toast(t);
Game.hooks.flash = () => { const f = $('flash'); f.style.opacity = 1; setTimeout(() => f.style.opacity = 0, 150); };
Game.hooks.hud = o => {
  $('hPlace').innerHTML = o.place + '<small>/' + o.n + '</small>'; $('hLap').textContent = 'Круг ' + o.lap + '/' + o.laps; $('hTime').textContent = Game.fmtTime(Math.max(0, o.t)); $('hCoins').textContent = '🪙 ' + o.coins; $('hSpd').textContent = o.speed + ' км/ч';
  const ib = $('itemBox'); if (o.item) { ib.classList.remove('hide'); ib.innerHTML = ITEMS[o.item] + (o.itemN > 1 ? '<small>×' + o.itemN + '</small>' : ''); } else ib.classList.add('hide');
  const d = $('drift').firstChild; d.style.width = Math.min(100, o.charge / 3 * 100) + '%'; d.style.background = o.charge < .7 ? '#fff' : o.charge < 1.5 ? '#5ac8ff' : o.charge < 2.6 ? '#ff9a2a' : '#c77bff';
  const c = $('count'); if (o.t < -.05) c.textContent = Math.ceil(-o.t); else if (o.t < .9) c.textContent = 'ГО!'; else c.textContent = '';
};
Game.hooks.pauseMenu = on => { const m = $('modal'); if (m) m.remove(); if (!on) return; modal('<h3 style="text-align:center">Пауза</h3><div class="grid"><button class="btn g" data-a="resume">▶ Продолжить</button><button class="btn" data-a="restart"' + (Game.isOnline() ? ' disabled' : '') + '>🔄 Заново</button><button class="btn" data-a="go" data-v="settingsIn">⚙️ Настройки</button><button class="btn p" data-a="quit">🚪 Выйти</button></div>'); };
A.resume = () => { A.close(); Game.resume(); };
A.restart = () => { A.close(); const c = Object.assign({}, lastRace, { seed: (Math.random() * 1e6) | 0 }); launch(c); };
A.quit = () => { A.close(); const online = Game.isOnline(); Game.leaveRace(); if (online) net.send({ t: 'leave' }); backToMenu(); };
$('tPause').addEventListener('click', () => Game.togglePause());
Game.hooks.results = info => {
  $('hud').classList.add('hide'); $('touch').classList.add('hide'); lastInfo = info; const s = S(), online = info.kind === 'online' || info.kind === 'quick' || info.kind === 'duel';
  let h = '<div class="body"><div class="title" style="font-size:30px">' + (info.place === 1 ? '🏆 ПОБЕДА!' : info.place <= 3 ? 'Подиум!' : 'Финиш') + '</div><div class="card">';
  info.res.forEach(r => { h += '<div class="rk' + (r.local ? ' me' : '') + '"><div class="no">' + r.place + '</div><div class="sp">' + esc(r.name) + (r.human && !r.local ? ' 👤' : '') + '</div><div class="muted">' + Game.fmtTime(r.time) + '</div></div>'; });
  h += '</div><div class="card"><div class="row"><span class="pill">⏱ ' + Game.fmtTime(info.time) + (info.newBest ? ' 🏅 рекорд!' : '') + '</span><span class="pill">🪙 собрано ' + info.coins + '</span></div>';
  h += '<div style="margin-top:10px">Награда: <b>+' + info.reward.coins + ' 🪙</b>, <b>+' + info.reward.xp + ' опыта</b></div>';
  if (info.stars !== null && info.stars !== undefined) h += '<div style="margin-top:8px" class="star" >' + '★'.repeat(info.stars) + '<span class="star off">' + '★'.repeat(3 - info.stars) + '</span></div><div class="muted">' + info.goals.map((g, j) => (g ? '✅ ' : '▫️ ') + KC.stageConfig(info.stage.ch, info.stage.st).goals[j]).join('<br>') + '</div>';
  if (info.rpDelta) { const a = KC.rankOf(info.rpBefore), b = KC.rankOf(info.rpAfter); h += '<div style="margin-top:8px"><b style="color:' + (info.rpDelta > 0 ? '#7be495' : '#ff7a7a') + '">' + (info.rpDelta > 0 ? '+' : '') + info.rpDelta + ' RP</b> · ' + esc(b.name) + (a.name !== b.name ? (info.rpDelta > 0 ? ' ⬆️ новый ранг!' : ' ⬇️') : '') + '</div>'; }
  info.ups.forEach(u => { h += '<div style="margin-top:8px">🎉 Уровень <b>' + u.level + '</b>! +' + u.coins + ' 🪙' + (u.gift ? ' и предмет «' + esc(u.gift.n) + '»' : '') + '</div>'; });
  if (info.items && info.items.length) h += '<div style="margin-top:8px">🏆 Награда главы: ' + info.items.map(p => '<b>' + esc(p.n) + '</b>').join(', ') + '</div>';
  h += '</div><div class="grid g2">';
  if (info.kind === 'story' && info.stars > 0 && !(info.stage.ch === 7 && info.stage.st === 2)) h += '<button class="btn g" style="grid-column:1/3" data-a="nextStage">Дальше ▶</button>';
  if (!online) h += '<button class="btn p" data-a="restart2">Ещё раз</button>'; else h += '<button class="btn p" data-a="afterOnline">' + (net.room ? 'В лобби' : 'Далее') + '</button>';
  h += '<button class="btn" data-a="menuBack">Меню</button></div></div>';
  render('results', h);
  if (info.chapterDone !== undefined) { const ch = KC.STORY[info.chapterDone]; setTimeout(() => dialog(ch.outro), 400); }
  const _g = lastRace; if (_g && _g.kind === 'story' && info.stars > 0) {} 
};
A.restart2 = () => { launch(Object.assign({}, lastRace, { seed: (Math.random() * 1e6) | 0 })); };
A.menuBack = () => { Game.stopRace(); if (net.room && lastRace && (lastRace.kind === 'online' || lastRace.kind === 'quick' || lastRace.kind === 'duel')) net.send({ t: 'leave' }); stack = []; SC.menu(); };
A.afterOnline = () => { Game.stopRace(); stack = ['menu']; if (net.room) SC.lobby(); else SC.online(); };
A.nextStage = () => { const st = lastRace.stage; Game.stopRace(); let ch = st.ch, k = st.st + 1; if (k > 2) { ch++; k = 0; } stack = ['menu', 'story']; if (ch >= KC.STORY.length) return SC.story(); go('chapter', ch, true); };

/* ---------- онлайн ---------- */
SC.online = function () {
  render('online', topbar('Онлайн') + '<div class="body"><div class="card"><div id="onst" class="muted">Подключаюсь к серверу…</div></div>' +
    '<div class="menu"><button class="btn p wide" data-a="quick" data-v="4p"><b>👥</b>Быстрая игра до 4 игроков</button><button class="btn" data-a="quick" data-v="duel"><b>⚔️</b>Дуэль 1 на 1</button><button class="btn" data-a="create" data-v="4p"><b>🔑</b>Своя комната</button><button class="btn" data-a="create" data-v="duel"><b>🤝</b>Дуэль с другом</button><button class="btn wide" data-a="joinDlg"><b>🔢</b>Войти по коду</button></div><div class="muted" style="margin-top:12px">Быстрая игра и дуэль влияют на ранг. Свободные места заполняют боты. Игра с другом без ранга: создай комнату и скажи ему код.</div></div>');
  connectNet();
};
function connectNet() {
  net.onState = ok => { const e = $('onst'); if (e) e.innerHTML = ok ? '🟢 Подключено' + (net.online ? ' · онлайн: ' + net.online : '') : '🔴 Нет связи с сервером'; };
  net.onMsg = onNet; if (net.ok) { net.onState(true); return; }
  net.connect().catch(() => { const e = $('onst'); if (e) e.textContent = '🔴 Не удалось подключиться. Онлайн работает только когда игра открыта с сервера (по ссылке сайта).'; });
}
function need() { if (!net.ok) { note('Нет связи с сервером'); return false; } if (!S().name) { note('Сначала введи имя'); return false; } net.send({ t: 'look', look: Game.compactLook(), name: S().name }); return true; }
A.quick = v => { if (need()) net.send({ t: 'quick', mode: v }); };
A.create = v => { if (need()) net.send({ t: 'create', mode: v }); };
A.joinDlg = () => { modal('<h3>Код комнаты</h3><input type="text" id="jc" maxlength="5" placeholder="ABCDE" style="text-transform:uppercase;text-align:center;letter-spacing:6px"><div class="grid g2" style="margin-top:12px"><button class="btn" data-a="close">Отмена</button><button class="btn p" data-a="join">Войти</button></div>'); };
A.join = () => { const c = ($('jc').value || '').trim().toUpperCase(); if (c.length < 3) return; A.close(); if (need()) net.send({ t: 'join', code: c }); };
function onNet(m) {
  if (m.t === 'room') { if (screen === 'lobby' || screen === 'online') SC.lobby(); }
  else if (m.t === 'left_room') { if (screen === 'lobby') { stack = ['menu']; SC.online(); } }
  else if (m.t === 'err') note(m.m || 'Ошибка');
  else if (m.t === 'go') {
    const r = net.room || {}; const kind = r.pub ? (r.mode === 'duel' ? 'duel' : 'quick') : 'online';
    launch({ kind, track: m.track, laps: m.laps, bots: m.bots, max: m.max, seed: m.seed, players: m.players, you: net.you, isHost: r.host === net.you });
  }
  else Game.netRace(m);
}
SC.lobby = function () {
  const r = net.room; if (!r) return SC.online(); const host = r.host === net.you, me = r.players.find(p => p.slot === net.you) || {};
  let h = topbar(r.mode === 'duel' ? 'Дуэль' : 'Комната') + '<div class="body">';
  if (!r.pub) h += '<div class="card"><div class="muted" style="text-align:center">Код комнаты — скажи его друзьям</div><div class="code">' + esc(r.code) + '</div></div>'; else h += '<div class="card muted" style="text-align:center">Ищем соперников… Свободные места займут боты.</div>';
  h += '<div class="card"><b>Игроки ' + r.players.length + '/' + r.max + '</b><div style="margin-top:8px">' + r.players.map(p => '<div class="plr"><div style="font-size:26px">' + AV(p.look) + '</div><div class="sp"><b>' + esc(p.name) + '</b>' + (p.slot === r.host ? ' 👑' : '') + '</div><div>' + (p.ready ? '✅ готов' : '⏳') + '</div></div>').join('') + '</div></div>';
  if (host) h += '<div class="card"><div class="setrow"><label>Трасса</label><select id="lt">' + KC.TRACKS.map((t, i) => '<option value="' + i + '"' + (r.track === i ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></div><div class="setrow"><label>Круги</label><select id="ll">' + [1, 2, 3, 5].map(n => '<option' + (r.laps === n ? ' selected' : '') + '>' + n + '</option>').join('') + '</select></div><div class="setrow"><label>Боты на свободных местах</label><input type="checkbox" id="lb"' + (r.bots ? ' checked' : '') + ' style="width:24px;height:24px"></div></div>';
  else h += '<div class="card muted">Трасса: ' + esc(KC.TRACKS[r.track].name) + ' · кругов: ' + r.laps + '</div>';
  h += '<div class="grid g2"><button class="btn ' + (me.ready ? '' : 'g') + '" data-a="ready">' + (me.ready ? 'Не готов' : 'Готов') + '</button>' + (host ? '<button class="btn p" data-a="start">Старт</button>' : '<button class="btn" disabled>Ждём хоста</button>') + '</div></div>';
  render('lobby', h);
  if (host) { const send = () => net.send({ t: 'cfg', track: +$('lt').value, laps: +$('ll').value, bots: $('lb').checked }); ['lt', 'll', 'lb'].forEach(id => $(id).onchange = send); }
};
A.ready = () => { const r = net.room, me = r.players.find(p => p.slot === net.you); net.send({ t: 'ready', v: !(me && me.ready) }); };
A.start = () => net.send({ t: 'start' });

/* ---------- ранги ---------- */
SC.ranks = function () {
  const s = S(), r = KC.rankOf(s.rp);
  let h = topbar('Ранги') + '<div class="body"><div class="card" style="text-align:center">' + rankBadge(s.rp, 84) + '<div style="font-size:24px;font-weight:900;margin-top:6px;color:' + r.color + '">' + esc(r.name) + '</div><div class="muted">' + s.rp + ' RP' + (r.next ? ' · до «' + esc(r.next) + '» ' + (r.need - r.cur) + ' RP' : '') + '</div>' + (r.need ? '<div class="bar" style="margin:8px 0"><i style="width:' + r.cur / r.need * 100 + '%"></i></div>' : '') + '<div class="muted">Побед: ' + s.wins + ' · гонок: ' + s.races + '</div></div>';
  h += '<div class="card"><b>Лестница рангов</b>' + KC.TIERS.map((t, i) => '<div class="rk' + (i === r.tier ? ' me' : '') + '"><div class="rb" style="background:' + t.c + ';width:32px;height:32px;font-size:12px">' + (i + 1) + '</div><div class="sp"><b>' + t.n + '</b></div><div class="muted">' + (i < 7 ? i * 300 + '–' + (i * 300 + 299) : '2100+') + ' RP</div></div>').join('') + '<div class="muted" style="margin-top:8px">RP дают ранговые гонки с ботами, быстрая игра и дуэли онлайн. Чем выше ранг, тем сильнее боты.</div></div>';
  h += '<div class="card"><b>🌍 Лучшие игроки</b><div id="top" class="muted" style="margin-top:8px">Загрузка…</div></div></div>';
  render('ranks', h); Game.postRank();
  Game.getRank().then(d => { const e = $('top'); if (!e || screen !== 'ranks') return; e.className = ''; e.innerHTML = (d.rows.length ? d.rows.map((x, i) => '<div class="rk' + (x.me ? ' me' : '') + '"><div class="no">' + (i + 1) + '</div>' + rankBadge(x.rp, 34) + '<div class="sp"><b>' + esc(x.name) + '</b><div class="muted">ур. ' + x.level + ' · побед ' + x.wins + '</div></div><b>' + x.rp + '</b></div>').join('') : '<div class="muted">Пока пусто — стань первым!</div>') + '<div class="muted" style="margin-top:8px">Твоё место: ' + (d.myRank || '—') + ' из ' + d.total + '</div>'; }).catch(() => { const e = $('top'); if (e) e.textContent = 'Нет связи с сервером. Таблица доступна, когда игра открыта по ссылке сайта.'; });
};

/* ---------- награды ---------- */
SC.rewards = function () {
  const D = S().daily, can = Game.dailyAvailable(), next = can ? (D.streak % 7) : (D.streak - 1) % 7 + 1;
  let h = topbar('Награды') + '<div class="body"><div class="card"><b>🎁 Ежедневный бонус</b><div class="muted">Заходи каждый день — серия растёт. Пропустил день — серия начнётся заново.</div><div class="grid g4" style="margin:10px 0">' + KC.DAILY.map((d, i) => { const got = !can ? i < next : i < D.streak % 7 && D.streak % 7 !== 0 || (D.streak % 7 === 0 && D.streak > 0 && D.last !== ''); return '<div class="item' + (i === next - (can ? 0 : 1) && !can ? ' eq' : '') + '" style="' + (!can && i < next ? 'opacity:.55' : '') + '"><b>День ' + (i + 1) + '</b><span class="pr">🪙' + d.c + '</span>' + (d.gift ? '<span>🎁</span>' : '') + '</div>'; }).join('') + '</div><button class="btn y" style="width:100%" data-a="claim"' + (can ? '' : ' disabled') + '>' + (can ? 'Забрать' : 'Уже получено, приходи завтра') + '</button></div>';
  const L = S().level; h += '<div class="card"><b>⭐ Награды за уровень</b><div class="muted">Сейчас уровень ' + L + '</div>' + [1, 2, 3, 4, 5].map(i => { const l = L + i, r = KC.levelReward(l); return '<div class="rk"><div class="no">' + l + '</div><div class="sp">🪙 ' + r.coins + (r.item ? ' + 🎁 предмет' : '') + '</div></div>'; }).join('') + '</div>';
  h += '<div class="card"><b>🏆 Награды за историю</b><div class="muted">Каждая глава открывает эксклюзивные предметы, следы и подсветки в Гараже. Пройдено глав: ' + KC.STORY.filter((_, i) => Game.stageStars(i, 2) > 0).length + '/' + KC.STORY.length + '</div></div></div>';
  render('rewards', h);
};
A.claim = () => { const r = Game.claimDaily(); if (!r) return; Sfx.ui('buy'); SC.rewards(); modal('<h3>🎁 День ' + r.day + '</h3><div style="font-size:18px">+' + r.coins + ' 🪙' + (r.gift ? '<br>Подарок: <b>' + esc(r.gift.n) + '</b>' : '') + '</div><button class="btn p" style="width:100%;margin-top:12px" data-a="close">Класс!</button>'); };

/* ---------- гараж ---------- */
const CATS = [['hat', '🎩 Шапки'], ['face', '🕶 Лицо'], ['top', '👕 Верх'], ['bot', '👖 Низ'], ['acc', '🎒 Аксессуары'], ['av', '🐷 Облик'], ['body', '🚗 Кузов'], ['paint', '🎨 Краска'], ['wheel', '⚙️ Колёса'], ['spoil', '🪽 Спойлер'], ['trail', '💨 След'], ['glow', '💡 Подсветка'], ['horn', '📯 Гудок'], ['upg', '🔧 Тюнинг']];
const LIST = { hat: () => KC.SHOP.hat, face: () => KC.SHOP.face, top: () => KC.SHOP.top, bot: () => KC.SHOP.bot, acc: () => KC.SHOP.acc, body: () => KC.BODYSHOP, paint: () => [{ id: 'none', n: 'Цвет кузова', p: 0 }].concat(KC.PAINTS), wheel: () => KC.WHEELS, spoil: () => KC.SPOILERS, trail: () => KC.TRAILS, glow: () => KC.GLOWS, horn: () => KC.HORNS };
const KART = { body: 1, paint: 1, wheel: 1, spoil: 1, trail: 1, glow: 1, horn: 1 };
const equipped = (slot, id) => KART[slot] ? S().look.kart[slot] === id : S().look[slot] === id;
SC.garage = function () {
  let h = topbar('Гараж') + '<div class="garage"><div class="pv"><canvas id="prev"></canvas><div class="row" style="padding:4px 8px;justify-content:center"><button class="btn s" data-a="pvmode" data-v="kart">🚗</button><button class="btn s" data-a="pvmode" data-v="face">🙂</button><button class="btn s" data-a="rnd">🎲</button></div></div><div class="pn"><div class="tabs">' + CATS.map(([k, n]) => '<button class="tab' + (garTab === k ? ' on' : '') + '" data-a="gtab" data-v="' + k + '">' + n + '</button>').join('') + '</div><div class="body" id="gbody"></div></div></div>';
  render('garage', h); garBody(); startPreview(garTab === 'av' || ['hat', 'face', 'top', 'bot', 'acc'].includes(garTab) ? 'face' : 'kart');
};
function sw(key, label) { const L = KART[key] ? S().look.kart : S().look; return '<div class="muted">' + label + '</div><div class="sw">' + KC.PALETTE.map((c, i) => '<i style="background:' + c + '" class="' + (L[key] === i ? 'on' : '') + '" data-a="color" data-v="' + key + ':' + i + '"></i>').join('') + '</div>'; }
function garBody() {
  const el = $('gbody'); if (!el) return; const t = garTab, s = S(); let h = '';
  if (t === 'upg') {
    h += '<div class="muted" style="margin-bottom:8px">Прокачка влияет на скорость, разгон и повороты в гонках с ботами и онлайн.</div>' + KC.UPG.map(u => { const l = s.upg[u.id], cost = KC.upgCost(l); return '<div class="card"><div class="row"><div class="sp"><b>' + u.n + '</b> ур. ' + l + '/6<div class="muted">' + u.d + '</div><div class="bar" style="margin-top:6px"><i style="width:' + l / 6 * 100 + '%"></i></div></div><button class="btn y s" data-a="upg" data-v="' + u.id + '"' + (l >= 6 ? ' disabled' : '') + '>' + (l >= 6 ? 'МАКС' : '🪙 ' + cost) + '</button></div></div>'; }).join('');
  } else if (t === 'av') {
    h += '<div class="grid g2"><button class="item' + (s.look.av === 'pig' ? ' eq' : '') + '" data-a="av" data-v="pig"><span style="font-size:34px">🐷</span><b>Свинья</b></button><button class="item' + (s.look.av === 'human' ? ' eq' : '') + '" data-a="av" data-v="human"><span style="font-size:34px">🧑</span><b>Человек</b></button></div><div class="muted" style="margin-top:12px">Цвет кожи</div><div class="sw">' + (s.look.av === 'pig' ? KC.SKINS_P : KC.SKINS_H).map((c, i) => '<i style="background:' + c + '" class="' + (s.look.skin === i ? 'on' : '') + '" data-a="skin" data-v="' + i + '"></i>').join('') + '</div><div class="muted">Одежда и аксессуары подходят обоим обликам.</div>';
  } else {
    if (t === 'top') h += sw('topC', 'Цвет'); if (t === 'bot') h += sw('botC', 'Цвет'); if (t === 'hat' || t === 'face' || t === 'acc') h += sw('accC', 'Цвет акцента'); if (t === 'body') h += sw('c', 'Основной цвет') + sw('c2', 'Второй цвет'); if (t === 'paint') h += sw('c', 'Основной цвет');
    h += '<div class="grid g3">' + LIST[t]().map(it => { const key = t + ':' + it.id, own = Game.owns(key), eq = equipped(t, it.id), rw = it.rw !== undefined; return '<button class="item' + (eq ? ' eq' : '') + (own ? '' : ' lock') + '" data-a="item" data-v="' + t + ':' + it.id + '">' + (eq ? '<span class="tag">✅</span>' : '') + '<b>' + esc(it.n) + '</b>' + (own ? '<span class="muted">' + (eq ? 'надето' : 'есть') + '</span>' : rw ? '<span class="pr">🏆 глава ' + (it.rw + 1) + '</span>' : '<span class="pr">🪙 ' + it.p + '</span>') + '</button>'; }).join('') + '</div>';
  }
  el.innerHTML = h;
}
A.gtab = v => { garTab = v; document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.v === v)); garBody(); if (pv) pv.set(S().look, ['hat', 'face', 'top', 'bot', 'acc', 'av'].includes(v) ? 'face' : 'kart'); };
A.pvmode = v => { if (pv) pv.set(S().look, v); };
A.rnd = () => { const L = KC.randLook(Math.random, S().look.av), o = S().owned; const mine = (slot, id) => Game.owns(slot + ':' + id) ? id : null; const k = S().look.kart;
  for (const sl of ['hat', 'face', 'top', 'bot', 'acc']) { const c = L[sl]; if (mine(sl, c)) S().look[sl] = c; } S().look.topC = L.topC; S().look.botC = L.botC; S().look.accC = L.accC; k.c = L.kart.c; k.c2 = L.kart.c2; Game.save(); garBody(); if (pv) pv.set(S().look); };
A.av = v => { S().look.av = v; S().look.skin = 0; Game.save(); garBody(); if (pv) pv.set(S().look, 'face'); };
A.skin = v => { S().look.skin = +v; Game.save(); garBody(); if (pv) pv.set(S().look, 'face'); };
A.color = v => { const [k, i] = v.split(':'); (KART[k] ? S().look.kart : S().look)[k] = +i; Game.save(); garBody(); if (pv) pv.set(S().look); };
A.item = v => { const [slot, id] = v.split(':'), key = slot + ':' + id; if (!Game.owns(key)) { const pr = KC.allProducts().find(p => p.key === key); if (pr && pr.rw !== undefined) { note('Эту награду дают за главу ' + (pr.rw + 1) + ' истории'); return; } if (!Game.buy(key)) { Sfx.ui('err'); note('Не хватает монет'); return; } toast('Куплено!', 800); }
  if (KART[slot]) S().look.kart[slot] = id; else S().look[slot] = id; Game.save(); garBody(); if (pv) pv.set(S().look, ['hat', 'face', 'top', 'bot', 'acc'].includes(slot) ? 'face' : 'kart'); $('hud'); const tb = document.querySelector('.top .pill'); if (tb) tb.textContent = '🪙 ' + S().coins; };
A.upg = v => { const l = S().upg[v], c = KC.upgCost(l); if (l >= 6) return; if (S().coins < c) { Sfx.ui('err'); note('Не хватает монет'); return; } S().coins -= c; S().upg[v]++; Game.save(); Sfx.ui('buy'); garBody(); const tb = document.querySelector('.top .pill'); if (tb) tb.textContent = '🪙 ' + S().coins; };
function startPreview(mode) {
  const cv = $('prev'); if (!cv) return; try { pv = G.makePreview(cv); pv.set(S().look, mode); } catch (e) { console.error(e); pv = null; return; }
  let last = performance.now(); const loop = n => { pvRaf = requestAnimationFrame(loop); const dt = Math.min(.05, (n - last) / 1000); last = n; pv.size(); pv.draw(dt); }; pvRaf = requestAnimationFrame(loop);
  let drag = null; cv.onpointerdown = e => { drag = e.clientX; pv.drag = true; try { cv.setPointerCapture(e.pointerId); } catch (_) {} }; cv.onpointermove = e => { if (drag !== null) { pv.yaw += (e.clientX - drag) * .012; drag = e.clientX; } }; cv.onpointerup = cv.onpointercancel = () => { drag = null; pv.drag = false; };
}
function stopPreview() { if (pvRaf) { cancelAnimationFrame(pvRaf); pvRaf = 0; } if (pv) { try { pv.dispose(); } catch (e) {} pv = null; } }

/* ---------- настройки ---------- */
function row(label, ctrl) { return '<div class="setrow"><label>' + label + '</label>' + ctrl + '</div>'; }
function slider(key, label, min, max, step, fmt) { const v = S().set[key]; return row(label, '<input type="range" min="' + min + '" max="' + max + '" step="' + step + '" value="' + v + '" data-s="' + key + '" style="width:45%"><span class="v" id="v_' + key + '">' + (fmt ? fmt(v) : v) + '</span>'); }
function toggle(key, label) { return row(label, '<input type="checkbox" data-t="' + key + '"' + (S().set[key] ? ' checked' : '') + ' style="width:26px;height:26px">'); }
const KEYN = { left: 'Влево', right: 'Вправо', gas: 'Газ', brake: 'Тормоз', drift: 'Дрифт', item: 'Предмет', cam: 'Камера', pause: 'Пауза' };
const kname = c => String(c).replace('Key', '').replace('Arrow', '↔↕'.slice(0, 0) + '').replace('Space', 'Пробел').replace('ShiftLeft', 'Shift').replace('Escape', 'Esc');
SC.settings = function (inRace) {
  const st = S().set; let h = topbar('Настройки') + '<div class="tabs">' + [['ctl', 'Управление'], ['gfx', 'Графика'], ['snd', 'Звук'], ['key', 'Клавиши']].map(([k, n]) => '<button class="tab' + (setTab === k ? ' on' : '') + '" data-a="stab" data-v="' + k + '">' + n + '</button>').join('') + '</div><div class="body">';
  if (setTab === 'ctl') {
    h += '<div class="card"><div class="muted" style="margin-bottom:6px">Схема управления</div><div class="sch">' + [['btn', 'Кнопки'], ['joy', 'Джойстик'], ['tilt', 'Наклон'], ['kb', 'Клавиатура']].map(([k, n]) => '<button class="btn' + (st.scheme === k ? ' on' : '') + '" data-a="scheme" data-v="' + k + '">' + n + '</button>').join('') + '</div>' +
      slider('sens', 'Чувствительность руля', .4, 1.8, .05, v => Math.round(v * 100) + '%') + slider('dead', 'Мёртвая зона', 0, .3, .01, v => Math.round(v * 100) + '%') + slider('size', 'Размер кнопок', .7, 1.4, .05, v => Math.round(v * 100) + '%') + toggle('auto', 'Автогаз') + toggle('left', 'Режим левши') + toggle('invert', 'Инвертировать наклон') + toggle('vib', 'Вибрация') +
      '<div class="row" style="margin-top:10px"><button class="btn s" data-a="calib">Откалибровать наклон</button><button class="btn s" data-a="tilton">Включить датчик</button></div><div class="muted" style="margin-top:8px">Наклон: держи телефон так, как удобно, и нажми «Откалибровать». На iPhone нужно разрешить датчики.</div></div>';
  } else if (setTab === 'gfx') {
    h += '<div class="card">' + row('Качество', '<select id="q">' + [['auto', 'Авто'], ['low', 'Низкое'], ['med', 'Среднее'], ['high', 'Высокое']].map(([k, n]) => '<option value="' + k + '"' + (st.q === k ? ' selected' : '') + '>' + n + '</option>').join('') + '</select>') + slider('fov', 'Угол обзора', .85, 1.2, .01, v => Math.round(v * 100) + '%') + slider('camd', 'Дистанция камеры', .7, 1.4, .05, v => Math.round(v * 100) + '%') + slider('shake', 'Тряска камеры', 0, 1.5, .1, v => Math.round(v * 100) + '%') + toggle('minimap', 'Мини-карта') + '<div class="muted" style="margin-top:8px">Если игра тормозит — поставь «Низкое».</div></div>';
  } else if (setTab === 'snd') {
    h += '<div class="card">' + slider('mus', 'Музыка', 0, 1, .05, v => Math.round(v * 100) + '%') + slider('sfx', 'Звуки', 0, 1, .05, v => Math.round(v * 100) + '%') + '</div>';
  } else {
    h += '<div class="card"><div class="muted" style="margin-bottom:6px">Нажми на кнопку, затем на нужную клавишу. Также работают WASD и E.</div>' + Object.keys(KEYN).map(k => row(KEYN[k], '<button class="btn s" data-a="rebind" data-v="' + k + '" id="kb_' + k + '">' + esc(kname(st.keys[k])) + '</button>')).join('') + '<button class="btn s" style="margin-top:10px" data-a="keysReset">Сбросить клавиши</button></div>';
  }
  h += '<div class="card"><button class="btn" style="width:100%" data-a="resetAsk">Сбросить прогресс</button></div></div>';
  render('settings', h);
  ui.querySelectorAll('input[data-s]').forEach(i => i.oninput = () => { const k = i.dataset.s; S().set[k] = +i.value; const v = $('v_' + k); if (v) v.textContent = Math.round(+i.value * 100) + '%'; if (k === 'mus' || k === 'sfx') Sfx.vol(); Game.save(); });
  ui.querySelectorAll('input[data-t]').forEach(i => i.onchange = () => { S().set[i.dataset.t] = i.checked; if (i.dataset.t === 'left' || i.dataset.t === 'minimap') setupTouch(); Game.save(); });
  const q = $('q'); if (q) q.onchange = () => { S().set.q = q.value; G.setQuality(q.value); Game.save(); };
};
A.stab = v => { setTab = v; SC.settings(); }; A.scheme = v => { S().set.scheme = v; Game.isTouch = v !== 'kb'; Game.save(); if (v === 'tilt') Game.enableTilt().then(ok => { if (!ok) note('Датчик не разрешён'); }); SC.settings(); };
A.calib = () => { Game.calibrateTilt(); note('Откалибровано'); }; A.tilton = () => Game.enableTilt().then(ok => note(ok ? 'Датчик включён' : 'Доступ к датчику отклонён'));
A.rebind = (k, el) => { el.textContent = '…'; Game.rebind = code => { Game.rebind = null; S().set.keys[k] = code; Game.save(); el.textContent = kname(code); }; };
A.keysReset = () => { Object.assign(S().set.keys, KC.defaultSave().set.keys); Game.save(); SC.settings(); };
A.resetAsk = () => modal('<h3>Сбросить прогресс?</h3><div class="muted">Монеты, предметы, история и ранг будут удалены.</div><div class="grid g2" style="margin-top:12px"><button class="btn" data-a="close">Нет</button><button class="btn p" data-a="reset">Сбросить</button></div>');
A.reset = () => { Game.reset(); stack = []; Game.net.close(); SC.menu(); };
const _go = A.go; A.go = v => { if (v === 'settingsIn') { A.close(); const wasPaused = Game.paused; modal('<h3>Настройки</h3><div class="muted">Открой настройки из главного меню после гонки. Здесь можно быстро поменять чувствительность.</div><div class="setrow"><label>Чувствительность</label><input type="range" min=".4" max="1.8" step=".05" value="' + S().set.sens + '" id="qs"></div><button class="btn p" style="width:100%;margin-top:12px" data-a="qsDone">Готово</button>'); const r = $('qs'); r.oninput = () => { S().set.sens = +r.value; Game.save(); }; return; } _go(v); };
A.qsDone = () => { A.close(); Game.hooks.pauseMenu(true); };

/* ---------- тач-кнопки ---------- */
function setupTouch() {
  const st = S().set, t = $('touch'); Game.isTouch = st.scheme !== 'kb'; t.classList.toggle('hide', !Game.isTouch); $('tPause').classList.toggle('hide', false);
  if (!Game.isTouch) return; const z = 76 * st.size, g = 12, L = st.left, sc = st.scheme;
  const place = (id, side, x, y, sz) => { const e = $(id); e.style.width = e.style.height = sz + 'px'; e.style.fontSize = sz * .32 + 'px'; const s = (side === 'l') !== L ? 'left' : 'right'; e.style.left = e.style.right = 'auto'; e.style[s] = x + 'px'; e.style.bottom = y + 'px'; };
  const steerBtns = sc === 'btn' || sc === 'tilt';
  $('tLeft').classList.toggle('hide', sc !== 'btn'); $('tRight').classList.toggle('hide', sc !== 'btn'); $('joyZone').classList.toggle('hide', sc !== 'joy');
  place('tLeft', 'l', 14, 22, z * 1.15); place('tRight', 'l', 14 + z * 1.15 + g, 22, z * 1.15);
  place('tGas', 'r', 14, 26 + z * .9, z * 1.25); place('tBrk', 'r', 14 + z * 1.25 + g, 22, z * .8); place('tDrift', 'r', 14, 22, z * .8); place('tItem', 'r', 14 + z * 1.25 + g, 30 + z * .8 + g, z * .8);
  $('joyZone').style.left = L ? 'auto' : '0'; $('joyZone').style.right = L ? '0' : 'auto'; $('mini').style.top = '90px'; $('mini').style.bottom = 'auto'; $('mini').style.width = $('mini').style.height = '100px';
  $('tGas').classList.toggle('hide', !!st.auto && false);
}

/* ---------- запуск ---------- */
function boot() {
  Game.load(); const s = S(); Game.isTouch = G.IS_TOUCH; if (!s.schemeInit) { s.set.scheme = G.IS_TOUCH ? 'btn' : 'kb'; s.schemeInit = 1; Game.save(); } Game.isTouch = s.set.scheme !== 'kb';
  try { Game.initGfx($('gl')); G.setQuality(s.set.q); } catch (e) { console.error(e); ui.innerHTML = '<div class="scr"><div class="body" style="display:flex;align-items:center"><div class="card">Не удалось запустить 3D (WebGL). Попробуй обновить браузер или открыть игру в Safari/Chrome.<br><small>' + esc(e.message) + '</small></div></div></div>'; return; }
  Game.bindTouch(); setupTouch(); $('touch').classList.add('hide');
  document.addEventListener('visibilitychange', () => { if (document.hidden && Game.state === 'race' && !Game.isOnline() && !Game.paused) Game.togglePause(); });
  addEventListener('pointerdown', () => Sfx.init(), { once: true });
  addEventListener('contextmenu', e => e.preventDefault());
  if (!s.name) SC.name(); else SC.menu();
}
Game.ui = { SC, go, boot };
boot();
})(typeof window !== 'undefined' ? window : globalThis);
