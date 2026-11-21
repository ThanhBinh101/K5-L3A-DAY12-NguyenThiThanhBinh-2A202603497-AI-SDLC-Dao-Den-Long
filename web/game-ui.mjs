import { createGame, nearestLantern, STEP_MS, stepGame } from '../src/game.mjs';
import { createWorld } from './world.mjs';

const get = (id) => document.getElementById(id);
const canvas = get('world');
const hud = get('hud');
const overlay = get('overlay');
const start = get('start');
const title = get('panel-title');
const body = get('panel-text');
const hint = get('hint');
const health = get('health');
const fireflies = get('fireflies');
const slots = get('mote-slots');
const lanterns = get('lanterns');
const clock = get('clock');
const score = get('score');
const sound = get('mute');
const announcement = get('announcement');
const touchControls = get('touch-controls');
const movement = new Map([
  ['KeyW', 'up'], ['ArrowUp', 'up'], ['KeyS', 'down'], ['ArrowDown', 'down'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
]);
const actions = new Map([['KeyE','light'], ['Space','jump'], ['KeyQ','pulse']]);
const held = new Set();
const requested = new Set();

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
let lastFrame = 0;
let carry = 0;
let eventCount = 0;
let audio;
let soundOn = false;

const tunes = {
  collect: [659, 880], light: [523, 659, 784, 1047], deposit: [659],
  pulse: [392, 784], jump: [493, 659], hit: [165, 110],
  won: [659, 784, 880, 1047, 1319], lost: [440, 294, 196],
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
  requested.clear();
  held.clear();
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

const status = () => game.result ?? game.mode;
const won = () => status() === 'win' || status() === 'won';
const ended = () => ['win','won','lose','lost','game_over','gameover'].includes(status());

function endRound() {
  playing = false;
  hint.hidden = true;
  touchControls.hidden = true;
  title.textContent = won() ? 'Đảo đã sáng!' : 'Sương phủ kín';
  body.textContent = won()
    ? `Mây thắp đủ Đèn Lồng Lớn và mang về ${game.score ?? 0} điểm.`
    : 'Mây có thể thử một con đường khác để gom đom đóm và tránh Bóng Mực.';
  start.textContent = 'Chơi lại →';
  overlay.hidden = false;
  start.focus();
  playSound(won() ? 'won' : 'lost');
}

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (event.code === 'KeyR' && world && !event.repeat) begin();
  if (!playing) return;
  const direction = movement.get(event.code);
  const action = actions.get(event.code);
  if (direction || action) event.preventDefault();
  if (direction) held.add(direction);
  if (action && !event.repeat) requested.add(action);
});
document.addEventListener('keyup', event => held.delete(movement.get(event.code)));
window.addEventListener('blur', () => held.clear());
for (const action of ['light','jump','pulse']) {
  get(`touch-${action}`).addEventListener('click', () => requested.add(action));
}

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

function syncHud() {
  canvas.dataset.tick = game.tick;
  const model = game.player;
  const flames = model.flames ?? model.health ?? 0;
  const maxFlames = game.maxFlames ?? game.maxHealth ?? 3;
  const carried = model.carried ?? model.fireflies ?? 0;
  const capacity = model.capacity ?? game.capacity ?? 10;
  const heartLabel = `${flames} trên ${maxFlames} Lửa Tim`;
  if (health.getAttribute('aria-label') !== heartLabel) {
    health.setAttribute('aria-label', heartLabel);
    health.replaceChildren(...Array.from({ length: maxFlames }, (_, index) => {
      const flame = document.createElement('span');
      flame.classList.toggle('empty', index >= flames);
      flame.setAttribute('aria-hidden', 'true');
      flame.textContent = '♦';
      return flame;
    }));
  }
  const inventoryLabel = `${carried} / ${capacity}`;
  if (fireflies.textContent !== inventoryLabel || !slots.children.length) {
    setText(fireflies, inventoryLabel);
    slots.replaceChildren(...Array.from({ length: capacity }, (_, index) => {
      const slot = document.createElement('span');
      slot.className = index < carried ? 'mote full' : 'mote';
      return slot;
    }));
  }

  const lit = game.lanterns.filter(lantern => lantern.lit).length;
  setText(lanterns, `${lit} / ${game.lanterns.length}`);
  setText(score, String(game.score ?? 0));
  const seconds = Math.max(0, Math.ceil(game.timeLeft ?? (game.remainingMs ?? (240000-game.tick*STEP_MS))/1000));
  setText(clock, [Math.floor(seconds/60),seconds%60].map(value => String(value).padStart(2,'0')).join(':'));
  const near = nearestLantern(game);
  const required = near?.required ?? near?.cost ?? near?.need ?? 0;
  const deposited = near?.deposited ?? near?.motes ?? 0;
  if (near && carried) setText(hint, `E · Nạp đèn (${deposited}/${required})`);
  else if (near) setText(hint, `Đèn đã nhận ${deposited}/${required} đom đóm. Hãy nhặt thêm.`);
  else setText(hint, 'Gom đom đóm rồi mang đến Đèn Lồng Lớn.');

  for (const event of game.events.slice(eventCount)) {
    const name = event.name ?? event.kind;
    playSound(name);
    if (name === 'hit') announcement.textContent = `Bóng Mực chạm Mây. Còn ${flames} Lửa Tim.`;
    if (name === 'light' || name === 'lantern_lit') announcement.textContent = `Đã thắp ${lit} trên ${game.lanterns.length} đèn.`;
  }
  eventCount = game.events.length;
}

function frame(now) {
  if (playing) {
    carry += Math.min(now - lastFrame, 100);
    while (carry >= STEP_MS && !ended()) {
      const input = Object.fromEntries([...held, ...requested].map(command => [command, true]));
      stepGame(game, input);
      requested.clear();
      carry -= STEP_MS;
    }
    syncHud();
    if (ended()) endRound();
  }
  lastFrame = now;
  world.render(game, now);
  requestAnimationFrame(frame);
}

if (world) requestAnimationFrame(frame);
