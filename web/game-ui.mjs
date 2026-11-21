import { createGame, HIT_DELAY_TICKS, nearestLantern, STEP_MS, stepGame } from '../src/game.mjs';
import { createWorld } from './world.mjs';

const canvas = document.querySelector('#world');
const hud = document.querySelector('#hud');
const overlay = document.querySelector('#overlay');
const start = document.querySelector('#start');
const title = document.querySelector('#panel-title');
const body = document.querySelector('#panel-text');
const hint = document.querySelector('#hint');
const health = document.querySelector('#health');
const fireflies = document.querySelector('#fireflies');
const lanterns = document.querySelector('#lanterns');
const sound = document.querySelector('#mute');
const announcement = document.querySelector('#announcement');
const touchControls = document.querySelector('#touch-controls');
const keys = new Map([
  ['KeyW', 'up'], ['ArrowUp', 'up'], ['KeyS', 'down'], ['ArrowDown', 'down'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
]);

let world;
try {
  world = createWorld(canvas);
} catch (error) {
  start.disabled = true;
  body.textContent = 'Trình duyệt chưa tạo được cảnh 3D. Hãy bật WebGL hoặc thử trình duyệt khác.';
  console.error(error);
}

let game = createGame();
let playing = false;
let held = new Set();
let light = false;
let lastFrame = 0;
let carry = 0;
let eventCount = 0;
let audio;
let soundOn = false;

const tunes = {
  collect: [659, 880],
  light: [523, 659, 784, 1047],
  hit: [165, 110],
  won: [659, 784, 880, 1047, 1319],
};

function playSound(kind) {
  if (!audio || !soundOn || !tunes[kind]) return;
  tunes[kind].forEach((pitch, index) => {
    const time = audio.currentTime + index * 0.095;
    const oscillator = audio.createOscillator();
    const volume = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = pitch;
    volume.gain.setValueAtTime(0.001, time);
    volume.gain.exponentialRampToValueAtTime(0.085, time + 0.025);
    volume.gain.exponentialRampToValueAtTime(0.001, time + 0.24);
    oscillator.connect(volume).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + 0.25);
  });
}

sound.addEventListener('click', async () => {
  soundOn = !soundOn;
  sound.textContent = `Âm thanh: ${soundOn ? 'Bật' : 'Tắt'}`;
  sound.setAttribute('aria-pressed', soundOn);
  if (soundOn) {
    audio ??= new AudioContext();
    await audio.resume();
    if (soundOn) playSound('collect');
  }
});

function begin() {
  game = createGame();
  eventCount = 0;
  carry = 0;
  light = false;
  held = new Set();
  announcement.textContent = '';
  playing = true;
  overlay.hidden = true;
  hud.hidden = false;
  hint.hidden = false;
  touchControls.hidden = false;
  start.blur();
  syncHud();
}
start.addEventListener('click', begin);

function endRound() {
  playing = false;
  hint.hidden = true;
  touchControls.hidden = true;
  title.textContent = game.mode === 'won' ? 'Đảo đã sáng!' : 'Sương phủ kín';
  body.textContent = game.mode === 'won'
    ? 'Mây đã thắp hết Đèn Lồng Lớn và đưa ánh sáng trở về.'
    : 'Mây đã hết tim. Hãy đi vòng qua Bóng Mực ở lượt sau.';
  start.textContent = 'Chơi lại →';
  overlay.hidden = false;
  start.focus();
}

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'KeyR' && world && !event.repeat) begin();
  if (!playing) return;
  if (keys.has(event.code)) {
    event.preventDefault();
    held.add(event.code);
  }
  if (event.code === 'KeyE' && !event.repeat) light = true;
});
document.addEventListener('keyup', event => held.delete(event.code));
window.addEventListener('blur', () => held.clear());
document.querySelector('#touch-light').addEventListener('click', () => { light = true; });

for (const button of document.querySelectorAll('[data-move]')) {
  const control = button.dataset.move;
  button.addEventListener('pointerdown', event => {
    button.setPointerCapture(event.pointerId);
    held.add(control);
  });
  button.addEventListener('lostpointercapture', () => held.delete(control));
  button.addEventListener('pointerup', () => held.delete(control));
}

function setText(element, value) {
  if (element.textContent !== value) element.textContent = value;
}

function setAttribute(element, key, value) {
  if (element.getAttribute(key) !== value) element.setAttribute(key, value);
}

function syncHud() {
  setAttribute(canvas, 'data-tick', String(game.tick));
  const model = game.player;
  const heartLabel = `${model.health} trên ${game.maxHealth} tim`;
  if (health.getAttribute('aria-label') !== heartLabel) {
    health.setAttribute('aria-label', heartLabel);
    health.replaceChildren(...Array.from({ length: game.maxHealth }, (_, index) => {
      const heart = document.createElement('span');
      heart.classList.toggle('empty', index >= model.health);
      heart.setAttribute('aria-hidden', 'true');
      heart.textContent = '♥';
      return heart;
    }));
  }
  const lit = game.lanterns.filter(lantern => lantern.lit).length;
  setText(fireflies, String(model.fireflies));
  setText(lanterns, `${lit} / ${game.lanterns.length}`);
  const near = nearestLantern(game);
  const recentHit = game.tick - game.lastHit < HIT_DELAY_TICKS / 2;
  if (recentHit) setText(hint, 'Bóng Mực chạm Mây. Hãy tránh xa!');
  else if (near && model.fireflies >= near.cost) setText(hint, 'Nhấn E hoặc nút Thắp đèn.');
  else if (near) setText(hint, `Cần thêm ${near.cost - model.fireflies} đom đóm để thắp đèn này.`);
  else setText(hint, lit ? 'Theo ánh đom đóm đến chiếc đèn tiếp theo.' : 'Gom đom đóm dọc đường đến chiếc đèn đầu tiên.');

  for (const event of game.events.slice(eventCount)) {
    playSound(event.kind);
    if (event.kind === 'hit') announcement.textContent = `Bóng Mực chạm Mây. Còn ${model.health} tim.`;
    if (event.kind === 'light') announcement.textContent = `Đã thắp ${lit} trên ${game.lanterns.length} đèn.`;
  }
  eventCount = game.events.length;
}

function frame(now) {
  if (playing) {
    carry += Math.min(now - lastFrame, 100);
    while (carry >= STEP_MS && game.mode === 'playing') {
      const controls = [...held].map(key => keys.get(key) ?? key);
      const input = Object.fromEntries(controls.map(key => [key, true]));
      stepGame(game, { ...input, light });
      light = false;
      carry -= STEP_MS;
    }
    syncHud();
    if (game.mode !== 'playing') endRound();
  }
  lastFrame = now;
  world.render(game, now);
  requestAnimationFrame(frame);
}

if (world) requestAnimationFrame(frame);
