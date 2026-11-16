/* Хрю-карт: данные. Косметика, сюжет, ранги, награды. */
(function (root) {
'use strict';
const KC = root.KC;
KC.PALETTE = ['#ff5a36', '#ffc83d', '#7be495', '#3fb6ff', '#7b5cff', '#ff4fa3', '#ffffff', '#2b2b33', '#8a5a2b', '#b9a6d6', '#00d4c4', '#ff8f1f', '#a3e635', '#5b6dff', '#e11d48', '#94a3b8'];
KC.SKINS_H = ['#f1c9a5', '#e8b48a', '#c98f66', '#a56a45', '#7a4a2e', '#f7dcc0'];
KC.SKINS_P = ['#ff9db1', '#ffb8c6', '#f08aa0', '#e6b7a0', '#d9a0c4', '#c0c0cc'];

/* Детали предмета: [форма, a, b, c, x, y, z, цвет]. Форма: b коробка (a,b,c размеры), c цилиндр (радиус a, высота b), s сфера (радиус a), k конус (радиус a, высота b).
   Цвет: hex-строка или $a акцент, $t цвет верха, $b цвет низа. Якоря: head, torso, legs, back, neck. */
const sym = (f) => [f(-1), f(1)];
const legs = (zLen, zOff, col) => sym(s => ['b', .46, .46, zLen, s * .3, 0, zOff, col]);
const crown = [['c', .45, .3, 0, 0, .65, 0, '#ffc83d']]; for (let i = 0; i < 5; i++) { const a = i / 5 * Math.PI * 2; crown.push(['k', .1, .32, 0, Math.cos(a) * .4, .95, Math.sin(a) * .4, '#ffd966']); }
const flame = (x) => ['k', .16, .5, 0, x, -.7, -.35, '#ff8f1f'];

KC.SHOP = {
  hat: [
    { id: 'cap', n: 'Кепка', p: 60, a: 'head', parts: [['b', 1.0, .18, 1.0, 0, .5, 0, '$a'], ['b', 1.0, .07, .5, 0, .45, .65, '$a']] },
    { id: 'beanie', n: 'Шапка', p: 80, a: 'head', parts: [['b', 1.0, .4, 1.0, 0, .6, 0, '$a'], ['s', .15, 0, 0, 0, .86, 0, '#ffffff']] },
    { id: 'tophat', n: 'Цилиндр', p: 200, a: 'head', parts: [['c', .4, .8, 0, 0, .95, 0, '#222222'], ['c', .7, .08, 0, 0, .52, 0, '#222222'], ['b', .82, .12, .82, 0, .62, 0, '$a']] },
    { id: 'crown', n: 'Корона', p: 600, a: 'head', parts: crown, r: 3 },
    { id: 'helmet', n: 'Шлем', p: 120, a: 'head', parts: [['s', .62, 0, 0, 0, .2, 0, '$a'], ['b', .8, .22, .2, 0, .08, .5, '#222222']] },
    { id: 'cowboy', n: 'Ковбойская шляпа', p: 220, a: 'head', parts: [['c', .5, .3, 0, 0, .68, 0, '#8a5a2b'], ['c', .95, .06, 0, 0, .52, 0, '#8a5a2b']] },
    { id: 'chef', n: 'Колпак повара', p: 150, a: 'head', parts: [['c', .5, .6, 0, 0, .8, 0, '#ffffff'], ['s', .55, 0, 0, 0, 1.15, 0, '#ffffff']] },
    { id: 'party', n: 'Праздничный колпак', p: 90, a: 'head', parts: [['k', .4, .9, 0, 0, .95, 0, '$a'], ['s', .1, 0, 0, 0, 1.42, 0, '#ffffff']] },
    { id: 'phones', n: 'Наушники', p: 180, a: 'head', parts: [['b', .2, .38, .38, -.58, 0, 0, '#222222'], ['b', .2, .38, .38, .58, 0, 0, '#222222'], ['b', 1.1, .1, .12, 0, .55, 0, '#222222']] },
    { id: 'halo', n: 'Нимб', p: 400, a: 'head', parts: [['c', .5, .06, 0, 0, .98, 0, '#ffe27a']], r: 2 },
    { id: 'horns', n: 'Рожки', p: 250, a: 'head', parts: sym(s => ['k', .13, .5, 0, s * .32, .72, 0, '#c0392b']) },
    { id: 'prop', n: 'Пропеллер', p: 140, a: 'head', parts: [['c', .06, .3, 0, 0, .65, 0, '#444444'], ['b', 1.1, .04, .15, 0, .82, 0, '$a'], ['b', .15, .04, 1.1, 0, .82, 0, '$a']] },
    { id: 'farmer', n: 'Соломенная шляпа', p: 0, rw: 0, a: 'head', parts: [['c', .45, .3, 0, 0, .66, 0, '#e8c66a'], ['c', 1.0, .05, 0, 0, .52, 0, '#e8c66a'], ['b', .95, .08, .95, 0, .6, 0, '#c0392b']] },
    { id: 'icecrown', n: 'Ледяная корона', p: 0, rw: 6, a: 'head', parts: (() => { const o = [['c', .45, .3, 0, 0, .65, 0, '#bfe9ff']]; for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; o.push(['k', .1, .5 + (i % 2) * .25, 0, Math.cos(a) * .4, .98, Math.sin(a) * .4, '#e8f8ff']); } return o; })() }
  ],
  face: [
    { id: 'shades', n: 'Тёмные очки', p: 90, a: 'head', parts: [['b', .4, .2, .1, -.25, .1, .52, '#111111'], ['b', .4, .2, .1, .25, .1, .52, '#111111'], ['b', .2, .06, .1, 0, .12, .52, '#111111']] },
    { id: 'round', n: 'Круглые очки', p: 80, a: 'head', parts: [['b', .32, .32, .08, -.25, .1, .52, '#7ad0ff'], ['b', .32, .32, .08, .25, .1, .52, '#7ad0ff'], ['b', .2, .05, .08, 0, .12, .52, '#333333']] },
    { id: 'goggles', n: 'Гоглы', p: 130, a: 'head', parts: [['b', 1.05, .3, .12, 0, .12, .5, '$a'], ['b', .36, .22, .14, -.25, .12, .53, '#99eeff'], ['b', .36, .22, .14, .25, .12, .53, '#99eeff']] },
    { id: 'mask', n: 'Маска героя', p: 160, a: 'head', parts: [['b', 1.0, .3, .1, 0, .1, .5, '$a'], ['b', .2, .12, .12, -.25, .12, .52, '#ffffff'], ['b', .2, .12, .12, .25, .12, .52, '#ffffff']] },
    { id: 'stache', n: 'Усы', p: 110, a: 'head', parts: [['b', .5, .12, .1, 0, -.2, .52, '#3a2a1a'], ['b', .14, .12, .1, -.3, -.25, .5, '#3a2a1a'], ['b', .14, .12, .1, .3, -.25, .5, '#3a2a1a']] },
    { id: 'nose', n: 'Красный нос', p: 70, a: 'head', parts: [['s', .17, 0, 0, 0, -.05, .6, '#e11d48']] },
    { id: 'patch', n: 'Пиратская повязка', p: 100, a: 'head', parts: [['b', .3, .3, .1, -.25, .1, .52, '#111111'], ['b', 1.0, .05, .1, 0, .3, .5, '#111111']] },
    { id: 'visor', n: 'Визор', p: 220, a: 'head', parts: [['b', 1.0, .25, .14, 0, .12, .53, '#40e0ff']], r: 2 },
    { id: 'beard', n: 'Борода', p: 130, a: 'head', parts: [['b', .7, .38, .15, 0, -.34, .48, '#5a3a1a']] },
    { id: 'labvisor', n: 'Лабораторные очки', p: 0, rw: 3, a: 'head', parts: [['b', 1.05, .3, .12, 0, .12, .5, '#7be495'], ['b', .4, .24, .14, -.25, .12, .53, '#e8fff0'], ['b', .4, .24, .14, .25, .12, .53, '#e8fff0']] }
  ],
  top: [
    { id: 'tee', n: 'Футболка', p: 50, a: 'torso', parts: [['b', 1.16, .9, .76, 0, -.1, 0, '$t'], ['b', .3, .3, .3, -.72, .35, 0, '$t'], ['b', .3, .3, .3, .72, .35, 0, '$t']] },
    { id: 'hoodie', n: 'Худи', p: 120, a: 'torso', parts: [['b', 1.2, 1.25, .8, 0, 0, 0, '$t'], ['b', 1.0, .45, .3, 0, .55, -.4, '$t'], ['b', .7, .25, .05, 0, -.2, .41, '$a']] },
    { id: 'jacket', n: 'Куртка', p: 180, a: 'torso', parts: [['b', 1.2, 1.25, .8, 0, 0, 0, '$t'], ['b', .12, 1.25, .82, 0, 0, 0, '$a'], ['b', .3, .3, .3, -.74, .4, 0, '$t'], ['b', .3, .3, .3, .74, .4, 0, '$t']] },
    { id: 'suit', n: 'Гоночный комбез', p: 260, a: 'torso', parts: [['b', 1.2, 1.25, .8, 0, 0, 0, '$t'], ['b', .2, 1.26, .82, -.4, 0, 0, '$a'], ['b', .2, 1.26, .82, .4, 0, 0, '$a'], ['b', .35, .35, .05, 0, .2, .41, '#ffffff']] },
    { id: 'jersey', n: 'Майка', p: 90, a: 'torso', parts: [['b', 1.16, 1.0, .76, 0, -.1, 0, '$t'], ['b', .5, .3, .78, 0, .15, 0, '$a']] },
    { id: 'armor', n: 'Броня', p: 380, a: 'torso', parts: [['b', 1.25, 1.0, .85, 0, 0, 0, '#9aa3b0'], ['b', .4, .3, .4, -.75, .5, 0, '#b8c0cc'], ['b', .4, .3, .4, .75, .5, 0, '#b8c0cc']], r: 2 },
    { id: 'tux', n: 'Фрак', p: 300, a: 'torso', parts: [['b', 1.18, 1.25, .78, 0, 0, 0, '#222222'], ['b', .3, .8, .05, 0, .1, .41, '#ffffff']], r: 2 },
    { id: 'sweater', n: 'Свитер', p: 110, a: 'torso', parts: [['b', 1.2, 1.2, .8, 0, 0, 0, '$t'], ['b', 1.22, .2, .82, 0, .1, 0, '$a']] },
    { id: 'vest', n: 'Жилет', p: 130, a: 'torso', parts: [['b', 1.2, 1.15, .8, 0, 0, 0, '$t'], ['b', .2, 1.15, .82, 0, 0, 0, '#222222']] },
    { id: 'rain', n: 'Дождевик', p: 160, a: 'torso', parts: [['b', 1.25, 1.3, .85, 0, 0, 0, '#ffd23f'], ['b', .9, .4, .3, 0, .6, -.4, '#ffd23f']] },
    { id: 'metrovest', n: 'Жилет путейца', p: 0, rw: 1, a: 'torso', parts: [['b', 1.2, 1.15, .8, 0, 0, 0, '#ff8f1f'], ['b', 1.22, .12, .82, 0, .2, 0, '#e8f0ff'], ['b', 1.22, .12, .82, 0, -.2, 0, '#e8f0ff']] }
  ],
  bot: [
    { id: 'jeans', n: 'Джинсы', p: 50, a: 'legs', parts: legs(1.16, 0, '$b') },
    { id: 'shorts', n: 'Шорты', p: 40, a: 'legs', parts: legs(.6, -.25, '$b') },
    { id: 'cargo', n: 'Карго', p: 120, a: 'legs', parts: [...legs(1.16, 0, '$b'), ...sym(s => ['b', .1, .2, .22, s * .56, 0, 0, '$a'])] },
    { id: 'racep', n: 'Гоночные штаны', p: 200, a: 'legs', parts: [...legs(1.16, 0, '$b'), ...sym(s => ['b', .1, .48, 1.18, s * .55, 0, 0, '$a'])] },
    { id: 'kilt', n: 'Килт', p: 110, a: 'legs', parts: [['b', 1.0, .5, .9, 0, .12, -.2, '$b'], ['b', 1.02, .1, .92, 0, .12, -.2, '$a']] },
    { id: 'track', n: 'Спортивки', p: 100, a: 'legs', parts: [...legs(1.16, 0, '$b'), ...sym(s => ['b', .08, .48, 1.18, s * .5, 0, 0, '$a'])] },
    { id: 'overall', n: 'Комбинезон', p: 150, a: 'legs', parts: [...legs(1.2, 0, '$b'), ['b', .7, .16, .5, 0, .1, -.35, '$b']] },
    { id: 'greaves', n: 'Стальные поножи', p: 260, a: 'legs', parts: [...legs(1.18, 0, '#9aa3b0'), ...sym(s => ['b', .5, .5, .3, s * .3, 0, .45, '#cfd6df'])], r: 2 }
  ],
  acc: [
    { id: 'scarf', n: 'Шарф', p: 100, a: 'neck', parts: [['b', 1.2, .25, .8, 0, 0, 0, '$a'], ['b', .25, .8, .1, .45, -.45, .42, '$a']] },
    { id: 'cape', n: 'Плащ', p: 300, a: 'back', parts: [['b', 1.1, 1.3, .08, 0, -.1, -.42, '$a'], ['b', 1.2, .12, .3, 0, .5, -.3, '$a']], r: 2 },
    { id: 'pack', n: 'Рюкзак', p: 140, a: 'back', parts: [['b', .8, .9, .4, 0, 0, -.3, '$a'], ['b', .84, .2, .1, 0, .2, -.1, '#222222']] },
    { id: 'bow', n: 'Бабочка', p: 80, a: 'neck', parts: [['b', .5, .18, .1, 0, -.1, .42, '$a'], ['b', .1, .2, .12, 0, -.1, .44, '#222222']] },
    { id: 'wings', n: 'Крылья', p: 450, a: 'back', parts: [['b', .1, .9, 1.4, -.75, .4, -.5, '#ffffff'], ['b', .1, .9, 1.4, .75, .4, -.5, '#ffffff']], r: 3 },
    { id: 'medal', n: 'Медаль', p: 120, a: 'neck', parts: [['b', .3, .3, .06, 0, -.35, .42, '#ffc83d'], ['b', .1, .35, .04, 0, -.1, .41, '#e11d48']] },
    { id: 'jet', n: 'Реактивный ранец', p: 380, a: 'back', parts: [['c', .22, .9, 0, -.28, 0, -.4, '#9aa3b0'], ['c', .22, .9, 0, .28, 0, -.4, '#9aa3b0'], flame(-.28), flame(.28)], r: 3 },
    { id: 'tail', n: 'Хвостик', p: 60, a: 'back', parts: [['b', .12, .12, .3, 0, -.4, -.45, '#ff9db1'], ['b', .12, .12, .12, .1, -.4, -.65, '#ff9db1']] },
    { id: 'chain', n: 'Золотая цепь', p: 200, a: 'neck', parts: [['b', .7, .08, .08, 0, -.18, .42, '#ffd23f'], ['b', .12, .3, .08, -.32, -.34, .42, '#ffd23f'], ['b', .12, .3, .08, .32, -.34, .42, '#ffd23f'], ['b', .22, .22, .08, 0, -.4, .44, '#ffd23f']], r: 2 },
    { id: 'portpack', n: 'Телепорт-ранец', p: 0, rw: 4, a: 'back', parts: [['b', .8, .9, .4, 0, 0, -.3, '#f1f3f6'], ['b', .5, .5, .1, 0, 0, -.52, '#34c4ff'], ['b', .4, .4, .12, 0, 0, -.53, '#ff8f1f']] },
    { id: 'champ', n: 'Мантия чемпиона', p: 0, rw: 7, a: 'back', parts: [['b', 1.15, 1.35, .08, 0, -.1, -.42, '#ffc83d'], ['b', 1.25, .15, .3, 0, .52, -.3, '#ffffff']] }
  ]
};
KC.WHEELS = [{ id: 'std', n: 'Обычные', p: 0 }, { id: 'off', n: 'Внедорожные', p: 150 }, { id: 'rim', n: 'Цветные диски', p: 200 }, { id: 'gold', n: 'Золотые', p: 500, r: 3 }];
KC.SPOILERS = [{ id: 'none', n: 'Без спойлера', p: 0 }, { id: 'wing', n: 'Крыло', p: 120 }, { id: 'twin', n: 'Двойное крыло', p: 220 }, { id: 'fin', n: 'Плавник', p: 180 }];
KC.BODYSHOP = [{ id: 'classic', n: 'Классик', p: 0 }, { id: 'rocket', n: 'Ракета', p: 800 }, { id: 'pickup', n: 'Пикап', p: 600 }, { id: 'bug', n: 'Жук', p: 500 }];
KC.PAINTS = [{ id: 'gold', n: 'Золотой металл', p: 500, c: '#e6b422' }, { id: 'chrome', n: 'Хром', p: 400, c: '#c9d3dc' }, { id: 'mint', n: 'Мятный', p: 0, c: '#7be495' }];
/* Следы: цвета частиц, размер, время жизни, разброс, плотность. */
KC.TRAILS = [
  { id: 'none', n: 'Без следа', p: 0 },
  { id: 'smoke', n: 'Дымок', p: 0, c0: 0xdddddd, c1: 0x777777, s0: .5, s1: 1.6, life: .9, rate: 30, g: 0 },
  { id: 'sparks', n: 'Искры', p: 120, c0: 0xffe27a, c1: 0xff5a1a, s0: .3, s1: .05, life: .5, rate: 45, g: 8 },
  { id: 'flame', n: 'Огонь', p: 220, c0: 0xffd34a, c1: 0xff3a1a, s0: .7, s1: .1, life: .45, rate: 50, g: -2 },
  { id: 'rainbow', n: 'Радуга', p: 400, rainbow: 1, s0: .6, s1: .3, life: .9, rate: 60, g: 0, r: 2 },
  { id: 'bubbles', n: 'Пузыри', p: 160, c0: 0xbfe9ff, c1: 0x7ad0ff, s0: .3, s1: .9, life: 1.1, rate: 25, g: -3 },
  { id: 'hearts', n: 'Сердечки', p: 200, c0: 0xff4fa3, c1: 0xff9db1, s0: .5, s1: .8, life: 1.1, rate: 20, g: -2 },
  { id: 'stars', n: 'Звёзды', p: 260, c0: 0xfff6a8, c1: 0xffc83d, s0: .5, s1: .1, life: .9, rate: 30, g: 0, r: 2 },
  { id: 'leaves', n: 'Листья', p: 130, c0: 0x6fc24a, c1: 0xc8a43a, s0: .45, s1: .3, life: 1.2, rate: 22, g: 1 },
  { id: 'pixels', n: 'Пиксели', p: 300, c0: 0x40ff90, c1: 0x2040ff, s0: .4, s1: .4, life: .8, rate: 35, g: 0, r: 2 },
  { id: 'neon', n: 'Неоновый след', p: 0, rw: 5, c0: 0xff2bd6, c1: 0x34c4ff, s0: .6, s1: .1, life: .8, rate: 55, g: 0 }
];
KC.GLOWS = [
  { id: 'none', n: 'Без подсветки', p: 0 }, { id: 'cyan', n: 'Голубая', p: 100, c: 0x34e0ff }, { id: 'pink', n: 'Розовая', p: 100, c: 0xff4fa3 },
  { id: 'green', n: 'Зелёная', p: 100, c: 0x7bff7b }, { id: 'gold', n: 'Золотая', p: 160, c: 0xffc83d }, { id: 'red', n: 'Красная', p: 100, c: 0xff3b30 },
  { id: 'white', n: 'Белая', p: 80, c: 0xffffff }, { id: 'rgb', n: 'Переливающаяся', p: 350, c: 0xffffff, anim: 1, r: 3 }, { id: 'nrb', n: 'Неон-радуга', p: 0, c: 0xffffff, anim: 1, rw: 5, r: 3 }
];
KC.HORNS = [{ id: 'beep', n: 'Гудок', p: 0 }, { id: 'oink', n: 'Хрюк', p: 80 }, { id: 'trumpet', n: 'Труба', p: 140 }, { id: 'duck', n: 'Кряк', p: 100 }];

KC.slotList = function (slot) { return KC.SHOP[slot] || []; };
KC.findItem = function (slot, id) { if (!id || id === 'none') return null; return (KC.SHOP[slot] || []).find(x => x.id === id) || null; };
/* всё, что можно купить, в едином списке: ключ "тип:id" */
KC.allProducts = function () {
  const o = [];
  for (const sl of ['hat', 'face', 'top', 'bot', 'acc']) for (const it of KC.SHOP[sl]) o.push({ key: sl + ':' + it.id, slot: sl, n: it.n, p: it.p, rw: it.rw, r: it.r || 1 });
  for (const w of KC.WHEELS) o.push({ key: 'wheel:' + w.id, slot: 'wheel', n: w.n, p: w.p });
  for (const w of KC.SPOILERS) o.push({ key: 'spoil:' + w.id, slot: 'spoil', n: w.n, p: w.p });
  for (const w of KC.BODYSHOP) o.push({ key: 'body:' + w.id, slot: 'body', n: w.n, p: w.p });
  for (const w of KC.PAINTS) o.push({ key: 'paint:' + w.id, slot: 'paint', n: w.n, p: w.p });
  for (const w of KC.TRAILS) o.push({ key: 'trail:' + w.id, slot: 'trail', n: w.n, p: w.p, rw: w.rw });
  for (const w of KC.GLOWS) o.push({ key: 'glow:' + w.id, slot: 'glow', n: w.n, p: w.p, rw: w.rw });
  for (const w of KC.HORNS) o.push({ key: 'horn:' + w.id, slot: 'horn', n: w.n, p: w.p });
  return o;
};

KC.defaultLook = function () { return { av: 'pig', skin: 0, hat: 'none', face: 'none', top: 'tee', bot: 'jeans', acc: 'none', topC: 3, botC: 7, accC: 1, kart: { body: 'classic', c: 0, c2: 7, paint: 'none', wheel: 'std', spoil: 'none', trail: 'smoke', glow: 'none', horn: 'beep' } }; };

/* ---------- ранги ---------- */
KC.TIERS = [{ n: 'Бронза', c: '#cd7f32' }, { n: 'Серебро', c: '#c0c8d0' }, { n: 'Золото', c: '#ffc83d' }, { n: 'Платина', c: '#7be4e8' }, { n: 'Алмаз', c: '#6fb7ff' }, { n: 'Мастер', c: '#b07bff' }, { n: 'Элита', c: '#ff6b6b' }, { n: 'Легенда', c: '#ffdf5e' }];
KC.rankOf = function (rp) {
  rp = Math.max(0, rp | 0); const t = Math.min(7, Math.floor(rp / 300)), inT = rp - t * 300;
  if (t === 7) return { tier: 7, div: 0, name: 'Легенда', color: KC.TIERS[7].c, cur: rp - 2100, need: 0, label: 'Легенда', next: null };
  const div = Math.floor(inT / 100);
  return { tier: t, div, name: KC.TIERS[t].n + ' ' + ['III', 'II', 'I'][div], color: KC.TIERS[t].c, cur: inT - div * 100, need: 100, label: KC.TIERS[t].n, next: div === 2 ? KC.TIERS[t + 1].n : KC.TIERS[t].n + ' ' + ['II', 'I'][div] };
};
KC.rpDelta = function (kind, place, n) {
  if (kind === 'duel') return place === 1 ? 25 : -22;
  if (kind === 'online') return [30, 10, -10, -25][place - 1] || -25;
  return [28, 18, 9, 0, -8, -15][place - 1] !== undefined ? [28, 18, 9, 0, -8, -15][place - 1] : -15;
};
KC.botSkillForRank = rp => 0.76 + 0.025 * Math.min(7, Math.floor(rp / 300)) + Math.random() * .03;

/* ---------- уровень и награды ---------- */
KC.xpNeed = l => 80 + 45 * l;
KC.levelReward = l => ({ coins: 60 + 15 * l, item: l % 5 === 0 });
KC.DAILY = [{ c: 50 }, { c: 80 }, { c: 120 }, { c: 150, gift: 1 }, { c: 200 }, { c: 260 }, { c: 500, gift: 1 }];
KC.raceReward = function (place, n, coins, kind) { const base = [120, 85, 60, 40, 30, 20][place - 1] || 20; return { coins: Math.round(base + coins * 2), xp: Math.round(40 + (n - place) * 12 + coins) }; };
KC.UPG = [{ id: 'top', n: 'Двигатель', d: 'Выше максимальная скорость' }, { id: 'acc', n: 'Турбина', d: 'Быстрее разгон' }, { id: 'turn', n: 'Рулевое', d: 'Круче повороты' }];
KC.upgCost = l => Math.round(150 * Math.pow(l + 1, 1.6));

/* ---------- имена и боты ---------- */
KC.BOT_NAMES = ['Рыло', 'Пятачок', 'Бекончик', 'Кабанчик', 'Хавроша', 'Свин-Дизель', 'Турбохряк', 'Нюхля', 'Хрюша', 'Грязнуля', 'Копытце', 'Поросёнок Ф.', 'Бурый', 'Кнопка', 'Клык', 'Сальник'];
KC.randLook = function (rnd, avatar) {
  const L = KC.defaultLook(), pick = a => a[Math.floor(rnd() * a.length)];
  L.av = avatar || (rnd() < .5 ? 'pig' : 'human'); L.skin = Math.floor(rnd() * 6);
  L.hat = rnd() < .6 ? pick(KC.SHOP.hat).id : 'none'; L.face = rnd() < .5 ? pick(KC.SHOP.face).id : 'none'; L.top = pick(KC.SHOP.top).id; L.bot = pick(KC.SHOP.bot).id; L.acc = rnd() < .4 ? pick(KC.SHOP.acc).id : 'none';
  L.topC = Math.floor(rnd() * 16); L.botC = Math.floor(rnd() * 16); L.accC = Math.floor(rnd() * 16);
  L.kart.body = pick(KC.BODYSHOP).id; L.kart.c = Math.floor(rnd() * 16); L.kart.c2 = Math.floor(rnd() * 16); L.kart.trail = pick(KC.TRAILS.filter(t => !t.rw)).id; L.kart.glow = rnd() < .3 ? pick(KC.GLOWS.filter(t => !t.rw)).id : 'none';
  return L;
};

/* ---------- сюжет: 8 глав по 3 этапа ---------- */
const HR = 'Хрюндель', AU = 'Тётя Гайка', BB = 'Барон Бекон';
KC.PORTRAITS = { [HR]: '🐷', [AU]: '👩‍🔧', [BB]: '🥓', 'Петя-Петух': '🐓', 'Машинист Гудок': '🚇', 'Лорд Угольков': '🔥', 'Доктор Колба': '🧪', 'Тестер-9': '🤖', 'Неонка': '💜', 'Снежок': '❄️' };
KC.STORY = [
  { title: 'Ферма на рассвете', place: 'Ферма Хрюшки', rival: 'Петя-Петух',
    intro: [[AU, 'Хрюндель, вставай! Барон Бекон разбил Золотое Корыто на восемь осколков.'], [HR, 'Осколков? И где мне их искать?'], [AU, 'В разных мирах. Разломы открываются только для настоящих гонщиков.'], [HR, 'Тогда заводим мотор!']],
    stages: [{ type: 'race', name: 'Утренняя разминка', say: [[AU, 'Для начала просто доедь до финиша в тройке лучших.']] }, { type: 'coins', name: 'Сбор урожая', say: [[AU, 'Монеты в корыто сами не прыгнут. Собери побольше.']] }, { type: 'duel', name: 'Дуэль: Петя-Петух', say: [['Петя-Петух', 'Кукареку! Первый осколок мой, свин!']] }],
    outro: [['Петя-Петух', 'Ладно, забирай. Но Барон тебя дальше не пропустит.'], [AU, 'Осколок у тебя. Следующий разлом ведёт в подземку.']] },
  { title: 'Последний поезд', place: 'Подземка', rival: 'Машинист Гудок',
    intro: [[AU, 'В метро трасса пересекает рельсы. Поезда не тормозят.'], [HR, 'Я уже слышу гудок...']],
    stages: [{ type: 'race', name: 'Час пик', say: [[AU, 'Следи за огнями. Когда поезд проехал, путь свободен.']] }, { type: 'coins', name: 'Потерянный багаж', say: [[AU, 'Пассажиры растеряли монеты. Подбери их.']] }, { type: 'duel', name: 'Дуэль: Машинист Гудок', say: [['Машинист Гудок', 'Мой маршрут, мои правила!']] }],
    outro: [['Машинист Гудок', 'Ты быстр. Осколок лежит на третьей платформе.'], [HR, 'Спасибо. Мы ещё прокатимся.']] },
  { title: 'Пекло', place: 'Адская цитадель', rival: 'Лорд Угольков',
    intro: [[AU, 'Тут жарко. Лава плавит колёса, не заезжай в неё.'], [HR, 'Я и не собирался. Почти.']],
    stages: [{ type: 'race', name: 'Раскалённый круг', say: [[AU, 'Объезжай огненные озёра. Прямая не всегда быстрее.']] }, { type: 'coins', name: 'Угольные россыпи', say: [[AU, 'Золото тут лежит прямо на дороге.']] }, { type: 'duel', name: 'Дуэль: Лорд Угольков', say: [['Лорд Угольков', 'Добро пожаловать в мой дом. Выход после финиша.']] }],
    outro: [['Лорд Угольков', 'Барон говорил, что ты слабак. Он ошибался.'], [AU, 'Четыре осколка позади. Едем дальше.']] },
  { title: 'Эксперимент «Каскад»', place: 'Лаборатория «Каскад»', rival: 'Доктор Колба',
    intro: [[AU, 'Лазеры включаются по таймеру. Считай секунды.'], [HR, 'Раз, два... ой.']],
    stages: [{ type: 'race', name: 'Проверка на прочность', say: [[AU, 'Конвейер может помочь, а может мешать. Следи за стрелками.']] }, { type: 'coins', name: 'Образцы', say: [[AU, 'Собери все образцы, пока лазеры не включились.']] }, { type: 'duel', name: 'Дуэль: Доктор Колба', say: [['Доктор Колба', 'Эксперимент 404: свинья против времени!']] }],
    outro: [['Доктор Колба', 'Невероятно. Мои расчёты были верны, кроме тебя.'], [HR, 'Это комплимент?']] },
  { title: 'Тестовая камера', place: 'Полигон порталов', rival: 'Тестер-9',
    intro: [[AU, 'Здесь можно срезать через телепорты. Но полигон не прощает ошибок.'], [HR, 'Я люблю срезать.']],
    stages: [{ type: 'race', name: 'Тест маршрута', say: [[AU, 'Найди оба портала. Они экономят секунды.']] }, { type: 'coins', name: 'Калибровка', say: [[AU, 'Монеты тут стоят точно в ряд, но не все на виду.']] }, { type: 'duel', name: 'Дуэль: Тестер-9', say: [['Тестер-9', 'Начинаю тест. Вероятность вашей победы: 12 процентов.']] }],
    outro: [['Тестер-9', 'Вероятность пересчитана. Поздравляю.'], [AU, 'Ещё три осколка, Хрюндель.']] },
  { title: 'Неоновая ночь', place: 'Неон-город', rival: 'Неонка',
    intro: [[AU, 'Ночные гонки. Ускорителей полно, главное не врезаться в столбы.'], [HR, 'Свет выключили. Ощущения интересные.']],
    stages: [{ type: 'race', name: 'Огни города', say: [[AU, 'Пролетай по стрелкам и копи скорость.']] }, { type: 'coins', name: 'Неоновые монеты', say: [[AU, 'Светятся они не просто так. Подбери все.']] }, { type: 'duel', name: 'Дуэль: Неонка', say: [['Неонка', 'Покажи, на что способна твоя свинья!']] }],
    outro: [['Неонка', 'Круто! Передай привет Барону... нет, не передавай.'], [HR, 'Два осколка осталось.']] },
  { title: 'Ледяной дворец', place: 'Ледяные пики', rival: 'Снежок',
    intro: [[AU, 'Лёд не прощает резких поворотов. Плавнее, Хрюндель.'], [HR, 'Плавнее? Я сейчас в сугроб.']],
    stages: [{ type: 'race', name: 'Скользкий путь', say: [[AU, 'Тормози заранее и держи дрифт на льду.']] }, { type: 'coins', name: 'Снежные клады', say: [[AU, 'Монеты лежат ближе к краям. Не улети в стену.']] }, { type: 'duel', name: 'Дуэль: Снежок', say: [['Снежок', 'Брр. Скользко? Для меня нет.']] }],
    outro: [['Снежок', 'Осколок твой. Барон ждёт тебя на Свинодроме.'], [AU, 'Он собрал всё лучшее и опасное. Осторожнее.']] },
  { title: 'Свинодром', place: 'Свинодром', rival: BB,
    intro: [[BB, 'Значит, дошёл. Корыто будет моим!'], [HR, 'Зачем оно тебе?'], [BB, 'Меня никогда не брали в гонки. Ни разу.'], [AU, 'Тогда победи его на трассе, Хрюндель, а не словами.']],
    stages: [{ type: 'race', name: 'Квалификация', say: [[AU, 'Тут есть всё сразу: лава, лазеры, поезда и порталы.']] }, { type: 'coins', name: 'Золотая лихорадка', say: [[AU, 'Последний сбор. Дальше только финал.']] }, { type: 'duel', name: 'Финал: Барон Бекон', say: [[BB, 'Покажи, чего ты стоишь!']] }],
    outro: [[BB, 'Я проиграл. Но так весело я не гонялся никогда.'], [HR, 'Давай вернём Корыто и устроим гонку для всех!'], [AU, 'Корыто снова целое. Добро пожаловать в Кубок легенд. Он без конца.']] }
];
/* параметры этапа и оценка звёзд */
KC.stageConfig = function (ch, st) {
  const S = KC.STORY[ch], T = S.stages[st], type = T.type, skill = .78 + ch * .02 + (type === 'duel' ? .05 : 0) + st * .005;
  const goals = type === 'race' ? ['Финиш в тройке', 'Победа', 'Победа и 15 монет'] : type === 'coins' ? ['20 монет', '32 монеты', '42 монеты и призовое место'] : ['Победа', 'Победа без попаданий в тебя', 'Победа с отрывом 4 секунды'];
  return { track: ch, laps: type === 'coins' ? 2 : 3, bots: type === 'duel' ? 1 : 3, skill, type, name: T.name, goals, reward: 70 + ch * 25 + st * 15 };
};
KC.evalStage = function (type, r) {
  if (type === 'race') return [r.place <= 3, r.place === 1, r.place === 1 && r.coins >= 15];
  if (type === 'coins') return [r.coins >= 20, r.coins >= 32, r.coins >= 42 && r.place <= 2];
  return [r.place === 1, r.place === 1 && r.hits === 0, r.place === 1 && r.lead >= 4];
};
KC.defaultSave = function () {
  return { v: 1, pid: '', name: '', coins: 300, xp: 0, level: 1, rp: 0, wins: 0, races: 0, look: KC.defaultLook(), owned: { 'hat:none': 1, 'face:none': 1, 'top:tee': 1, 'bot:jeans': 1, 'acc:none': 1, 'wheel:std': 1, 'spoil:none': 1, 'body:classic': 1, 'trail:none': 1, 'trail:smoke': 1, 'glow:none': 1, 'horn:beep': 1, 'paint:none': 1 },
    upg: { top: 0, acc: 0, turn: 0 }, story: { stars: {}, seen: {} }, daily: { last: '', streak: 0 }, bestTimes: {}, intro: 0,
    set: { scheme: 'btn', sens: 1, auto: true, size: 1, left: false, dead: .08, tilt: 0, invert: false, vib: true, keys: { left: 'ArrowLeft', right: 'ArrowRight', gas: 'ArrowUp', brake: 'ArrowDown', drift: 'Space', item: 'ShiftLeft', cam: 'KeyC', pause: 'Escape' }, q: 'auto', fov: 1, camd: 1, shake: 1, mus: .5, sfx: .8, minimap: true } };
};
})(typeof window !== 'undefined' ? window : globalThis);
