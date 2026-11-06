import { createFrame, clearFrame, createFx, composite } from '../vendor/pixelfx/src/core/index.js';
import * as slash from '../vendor/pixelfx/src/fx/melee/sword-slash.js';
import * as fireball from '../vendor/pixelfx/src/fx/fire/fireball.js';
import * as blast from '../vendor/pixelfx/src/fx/explosions/small-explosion.js';
import * as frost from '../vendor/pixelfx/src/fx/ice/frost-nova.js';
import * as heal from '../vendor/pixelfx/src/fx/holy/heal.js';
import * as shield from '../vendor/pixelfx/src/fx/holy/divine-shield.js';
import { displayPositions } from './match-rules.mjs';
import { sequences, frameAt, renderBounds } from './sequence-art.mjs';

const get = id => document.getElementById(id);
const vertical = document.body.dataset.orientation === 'vertical';
const canvas = get('stage');
const context = canvas.getContext('2d');
const effectsCanvas = document.createElement('canvas');
const effectsContext = effectsCanvas.getContext('2d');
const presets = [
  {id:'slash', name:'剑刃斩击', icon:'⚔', sub:'刀光与受击', duration:2.5, hit:.66,
    desc: vertical ? '原地挥击，刀光在对手身上出现，对手向上后退再归位。' : '沿中央战线向右出击，对手受击后退，双方随后归位。'},
  {id:'fireball', name:'火球冲击', icon:'✹', sub:'飞行 · 命中与烟尘', duration:6.8, hit:1.2,
    desc:'火球从我方前排飞向对位目标，命中后爆炸，随后烟尘消散。'},
  {id:'frost', name:'冰霜新星', icon:'❄', sub:'范围 · 冰晶与光环', duration:4.4, hit:.92,
    desc:'冰环在对手格位展开，目标受击后退，冰晶随后融化。'},
  {id:'heal', name:'治愈之光', icon:'✦', sub:'恢复 · 贴身光效', duration:2.9, hit:.9,
    desc:'治疗光环在我方前排原位扫过，光点沿角色轮廓消散。'},
  {id:'shield', name:'圣光护盾', icon:'◇', sub:'防护 · 环绕与淡出', duration:4, hit:.6,
    desc:'护盾在我方前排原位亮起，光弧环绕角色后淡出。'}
];
const palettes = {
  ice:['#172449','#284e92','#418cd4','#8bd8f4','#d7f8ff','#ffffff'],
  gold:['#3b202a','#8b4530','#d48438','#ffd071','#fff0bc','#ffffff'],
  green:['#102e2a','#286544','#62a953','#afe58b','#e8ffd4','#ffffff']
};
const source = { attack:1, hp:6, maxHp:6 };
const target = { rig:'temple_swordsman', attack:0, hp:7, maxHp:7 };
const reserve = { rig:'temple_knight', attack:0, hp:10, maxHp:10 };
const images = {};
let selected = presets[0], rig = get('character').value;
let time = 0, playing = false, last = 0, ready = false;
let anchors, frame, rgba, pixelsPerUnit, instances = [];
const clamp = (value, max = 1) => Math.min(max, Math.max(0, value));

function append(parent, className, label) {
  const node = document.createElement('div');
  node.className = className;
  if (label) node.textContent = label;
  parent.append(node);
  return node;
}

function buildRow(id, side, offset, unit) {
  const row = get(id);
  for (const lane of displayPositions(side)) {
    const occupied = lane === 2 && unit;
    const card = append(row, ['card', side, side === 'ai' ? 'enemy' : '', occupied ? '' : 'empty'].join(' '));
    card.dataset.side = side;
    card.dataset.slot = lane + offset;
    append(append(card, 'card-top'), 'pos', offset ? lane + '后' : String(lane));
    if (!occupied) {
      append(card, 'empty-mark', '＋').setAttribute('aria-hidden', 'true');
      card.setAttribute('aria-label', `${lane} 号格，空位`);
      continue;
    }
    occupied.anchor = append(card, 'unit-sprite');
    occupied.anchor.setAttribute('aria-hidden', 'true');
    const stats = append(card, 'stats');
    append(stats, 'attack', '⚔ ' + unit.attack);
    append(stats, 'health', `♥ ${unit.hp} / ${unit.maxHp}`);
    const fill = append(append(card, 'hp-track'), 'hp-fill');
    fill.style.width = `${unit.hp / unit.maxHp * 100}%`;
  }
}

buildRow('enemy-bench', 'ai', 3);
buildRow('enemy-field', 'ai', 0, target);
buildRow('player-field', 'player', 0, source);
buildRow('player-bench', 'player', 3, reserve);

for (const preset of presets) {
  const button = document.createElement('button');
  button.type = 'button';
  button.dataset.preset = preset.id;
  button.innerHTML = `<span class="icon">${preset.icon}</span><b>${preset.name}</b><small>${preset.sub}</small>`;
  button.onclick = () => { selected = preset; restart(); };
  get('effects').append(button);
}

function sprite(ctx, key, motion, t, x, y, size, flip = false) {
  const bounds = renderBounds[key];
  const image = images[key][motion];
  const index = frameAt(motion, Math.max(0, t) * 1000, key);
  const scale = size / Math.max(bounds.width, bounds.height);
  const width = bounds.width * scale, height = bounds.height * scale;
  ctx.save();
  ctx.translate(x, y);
  if (flip) ctx.scale(-1, 1);
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(image, index * 192 + bounds.x, bounds.y, bounds.width, bounds.height,
    -width / 2, -height / 2, width, height);
  ctx.restore();
}

// Anchor to the same centered sprite boxes as the battle UI, even after a resize.
function measure() {
  const board = canvas.getBoundingClientRect();
  if (!board.width || !board.height) return;
  anchors = [source, target, reserve].map(unit => {
    const rect = unit.anchor.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 - board.left,
      y: rect.top + rect.height / 2 - board.top,
      size: rect.width
    };
  });
  canvas.width = Math.round(board.width);
  canvas.height = Math.round(board.height);
  pixelsPerUnit = Math.max(1, anchors[0].size / 50);
  effectsCanvas.width = Math.ceil(canvas.width / pixelsPerUnit);
  effectsCanvas.height = Math.ceil(canvas.height / pixelsPerUnit);
  frame = createFrame(effectsCanvas.width, effectsCanvas.height);
  rgba = effectsContext.createImageData(frame.w, frame.h);
  resetEffects();
  draw();
}

function actorMask() {
  const maskCanvas = document.createElement('canvas');
  const size = Math.round(anchors[0].size / pixelsPerUnit);
  const span = size + 4;
  maskCanvas.width = maskCanvas.height = span;
  const ctx = maskCanvas.getContext('2d');
  sprite(ctx, rig, 'idle', 0, span / 2, span / 2, size, get('mirror').checked);
  const {data} = ctx.getImageData(0, 0, span, span);
  const mask = new Uint8Array(span * span), pixels = new Uint32Array(mask.length);
  for (let i = 0; i < mask.length; i++) {
    const p = i * 4;
    if (data[p + 3] <= 80) continue;
    mask[i] = 1;
    pixels[i] = (255 << 24) | (data[p + 2] << 16) | (data[p + 1] << 8) | data[p];
  }
  return {mask:{w:span,h:span,data:mask}, pixels, x:-span/2, y:-span/2-size/2, w:span, h:span,
    head:{x:0,y:-size*.9}, chest:{x:0,y:-size*.55}};
}

function resetEffects() {
  if (!ready || !anchors) return;
  const [from, to] = anchors;
  const palette = palettes[get('palette').value];
  const add = (mod, start, x, y, options = {}, end = start + mod.meta.duration) => ({
    fx: createFx(mod, {seed:12, x:x/pixelsPerUnit, y:y/pixelsPerUnit, ...(palette && {palette}), ...options}),
    mod, start, end
  });
  switch (selected.id) {
    case 'slash':
      instances = [add(slash, .6, to.x, to.y)];
      break;
    case 'fireball':
      instances = [
        add(fireball, .55, from.x, from.y, {angle:vertical ? -Math.PI/2 : 0}, selected.hit),
        add(blast, selected.hit, to.x, to.y, {size:.55})
      ];
      break;
    case 'frost':
      instances = [add(frost, .5, to.x, to.y + to.size/2, {reach:72})];
      break;
    case 'heal':
      instances = [add(heal, .5, from.x, from.y + from.size/2, {actor:actorMask()})];
      break;
    case 'shield':
      instances = [add(shield, .5, from.x, from.y + from.size/2, {actor:actorMask()}, 3.5)];
      break;
  }
}

function syncEffects() {
  const [from, to] = anchors;
  for (const instance of instances) {
    const {fx, mod, start, end} = instance;
    const elapsed = clamp(time - start, end - start);
    while (elapsed - fx.t > 1e-7) fx.update(Math.min(1/120, elapsed - fx.t));
    if (mod === fireball) {
      const progress = elapsed / (end - start);
      fx.options.x = (from.x + (to.x - from.x) * progress) / pixelsPerUnit;
      fx.options.y = (from.y + (to.y - from.y) * progress) / pixelsPerUnit;
    }
  }
}

function drawLayer(layer) {
  if (!get('show-fx').checked || !instances.some(({start,end}) => time >= start && time < end)) return;
  clearFrame(frame);
  for (const {fx,start,end} of instances) {
    if (time >= start && time < end) fx.draw(frame, layer);
  }
  composite(frame, rgba.data);
  effectsContext.putImageData(rgba, 0, 0);
  context.save();
  if (selected.id === 'shield') context.globalAlpha = clamp((time-.5)/.2) * clamp((3.5-time)/.35);
  context.imageSmoothingEnabled = false;
  context.drawImage(effectsCanvas, 0, 0, effectsCanvas.width * pixelsPerUnit, effectsCanvas.height * pixelsPerUnit);
  context.restore();
}

function draw() {
  if (!ready || !anchors) return;
  syncEffects();
  context.clearRect(0, 0, canvas.width, canvas.height);
  const [from, to, rear] = anchors;
  const support = selected.id === 'heal' || selected.id === 'shield';
  const hit = time - selected.hit;
  const recoil = support ? 0 : 14 * Math.sin(clamp(hit/.4) * Math.PI);
  const mirror = get('mirror').checked;
  const attack = !support && time < 1.35;
  const attackDuration = sequences[rig].timings.attack.reduce((a,b) => a+b, 0) / 1000;
  const lunge = !vertical && selected.id === 'slash'
    ? (to.x-from.x)*.68*(clamp((time-.28)/.3)-clamp((time-1.15)/.5)) : 0;
  drawLayer('back');
  sprite(context, reserve.rig, 'idle', time, rear.x, rear.y, rear.size, mirror);
  sprite(context, rig, attack ? 'attack' : 'idle', attack ? time*attackDuration/1.35 : support ? 0 : time,
    from.x + lunge, from.y, from.size, mirror);
  context.save();
  if (!support && hit >= 0 && hit < .14) context.filter = 'brightness(2)';
  sprite(context, target.rig, 'idle', time, to.x + (vertical ? 0 : recoil),
    to.y - (vertical ? recoil : 0), to.size, !mirror);
  context.restore();
  drawLayer('front');
  get('timeline').value = time;
  get('clock').textContent = time.toFixed(2) + ' s';
  get('phase').textContent = time >= selected.duration ? '播放结束' : time < .5 ? '准备'
    : time < selected.hit ? '释放' : hit < .22 ? (support ? '生效' : '命中') : '收尾';
}

function restart() {
  time = 0;
  last = 0;
  playing = ready;
  resetEffects();
  get('effect-title').textContent = selected.name;
  get('description').textContent = selected.desc;
  get('timeline').max = selected.duration;
  for (const button of get('effects').children) {
    button.setAttribute('aria-pressed', String(button.dataset.preset === selected.id));
  }
  get('pause').textContent = '暂停';
  draw();
}

function pause() {
  playing = false;
  get('pause').textContent = '播放';
}

function seek(value) {
  pause();
  time = clamp(value, selected.duration);
  resetEffects();
  draw();
}

get('replay').onclick = restart;
get('pause').onclick = () => {
  if (time >= selected.duration) return restart();
  playing = !playing;
  last = 0;
  get('pause').textContent = playing ? '暂停' : '播放';
};
get('step').onclick = () => seek(time + 1/30);
get('timeline').oninput = () => seek(Number(get('timeline').value));
get('character').onchange = () => { rig = get('character').value; restart(); };
get('palette').onchange = restart;
get('mirror').onchange = () => { resetEffects(); draw(); };
get('show-fx').onchange = draw;
get('background').onchange = () => {
  document.querySelector('#battle-screen .leather-surface').dataset.background = get('background').value;
};
document.addEventListener('visibilitychange', () => { last = 0; });

function tick(now) {
  if (!document.hidden && playing && last) {
    time = Math.min(selected.duration, time + Math.min((now-last)/1000,.1)*Number(get('speed').value));
    if (time >= selected.duration) {
      if (get('loop').checked) restart();
      else pause();
    }
    draw();
  }
  last = now;
  requestAnimationFrame(tick);
}

async function init() {
  try {
    await Promise.all(Object.entries(sequences).map(async ([key, sequence]) => {
      images[key] = {};
      await Promise.all(['idle','attack'].map(async motion => {
        const image = new Image();
        image.src = new URL(`../assets/characters/${sequence.folder}/${motion}-sheet.png`, import.meta.url);
        await image.decode();
        images[key][motion] = image;
      }));
    }));
    ready = true;
    for (const id of ['replay','pause','step','timeline']) get(id).disabled = false;
    restart();
    measure();
    new ResizeObserver(measure).observe(get('fx-board'));
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) pause();
    requestAnimationFrame(tick);
  } catch (error) {
    get('error').hidden = false;
    get('error').textContent = '素材载入失败，请刷新页面重试。';
    get('phase').textContent = '未能载入';
    console.error(error);
  }
}

init();

