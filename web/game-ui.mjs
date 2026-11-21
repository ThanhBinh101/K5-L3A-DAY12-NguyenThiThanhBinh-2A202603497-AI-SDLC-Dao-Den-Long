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
const retry = get('retry');
const home = get('home');
const settingsButton = get('settings');
const settingsFields = get('settings-fields');
const volume = get('volume');
const sensitivity = get('sensitivity');
const objectiveArrow = get('objective-arrow');
const dashCooldown = get('dash-cooldown');
const pulseCooldown = get('pulse-cooldown');
const movement = new Map([
  ['KeyW', 'up'], ['ArrowUp', 'up'], ['KeyS', 'down'], ['ArrowDown', 'down'],
  ['KeyA', 'left'], ['ArrowLeft', 'left'], ['KeyD', 'right'], ['ArrowRight', 'right'],
]);
const actions = new Map([['KeyE','light'], ['Space','jump'], ['KeyQ','pulse'], ['ShiftLeft','dash'], ['ShiftRight','dash']]);
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

let night = 1;
let game = createGame({night});
let screen = 'menu';
let previousScreen = 'menu';
let settings = {volume:55, sensitivity:32};
try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem('dao-den-long-settings') ?? '{}') };
} catch {
  // Use defaults when storage is unavailable in private windows.
}
volume.value = settings.volume;
sensitivity.value = settings.sensitivity;
let camYaw = 0;
let lastMouseX = null;
let finalBeep = Infinity;
let wasGrounded = true;
let lastFrame = 0;
let carry = 0;
let eventCount = 0;
let audio;
let soundOn = true;
let musicBar = -1;
const nightTunes = [[196,293.66,392,293.66], [220,329.63,440,329.63], [174.61,261.63,349.23,261.63]];
const nightNames = ['Lời gọi đom đóm', 'Cầu Gió', 'Tháp Sương'];
const nightIntroductions = [
  'Ông Đăng: Mây ơi, đi theo đom đóm và mang ánh sáng trở lại từng chiếc đèn.',
  'Ông Đăng: Qua cầu, cẩn thận luồng gió và dùng bệ phóng để vượt khoảng trống.',
  'Ông Đăng: Dùng các dốc và bệ phóng để đến Tháp Sương. Hãy giữ lấy ánh sáng!',
];

const tunes = {
  mote_picked: [659, 880], collect: [659, 880], light: [523, 659, 784, 1047], deposit: [659],
  pulse: [392, 784], jump: [493, 659], hit: [165, 110],
  won: [659, 784, 880, 1047, 1319], lost: [440, 294, 196],
  dash: [294,440,659], shade_spawned: [165,233], timer: [660],
  mote_collected: [659,880], lantern_lit: [523,659,784,1047], player_hit: [165,110],
};

function playSound(kind) {
  const notes = kind === 'music' ? nightTunes[night-1] : tunes[kind];
  if (!audio || !soundOn || !notes || !settings.volume) return;
  notes.forEach((pitch, index) => {
    const time = audio.currentTime + index * (kind === 'music' ? .52 : .095);
    const oscillator = audio.createOscillator();
    const gain = audio.createGain();
    oscillator.type = 'sine';
    oscillator.frequency.value = pitch;
    gain.gain.setValueAtTime(0.001, time);
    const hold = kind === 'music' ? .48 : .24;
    gain.gain.exponentialRampToValueAtTime(Math.max(.002, (kind === 'music' ? .020 : .085)*settings.volume/100), time + 0.025);
    gain.gain.exponentialRampToValueAtTime(0.001, time + hold);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(time);
    oscillator.stop(time + hold + .01);
  });
}

function unlockAudio() {
  const Context = window.AudioContext ?? window.webkitAudioContext;
  if (!Context || !soundOn) return;
  audio ??= new Context();
  void audio.resume();
}

sound.setAttribute('aria-pressed', soundOn);
sound.textContent = 'Âm thanh: Bật';
sound.addEventListener('click', () => {
  soundOn = !soundOn;
  sound.textContent = `Âm thanh: ${soundOn ? 'Bật' : 'Tắt'}`;
  sound.setAttribute('aria-pressed', soundOn);
  unlockAudio();
});
for (const input of [volume,sensitivity]) {
  input.addEventListener('input', () => {
    settings[input.id] = Number(input.value);
    try { localStorage.setItem('dao-den-long-settings',JSON.stringify(settings)); } catch { /* private storage */ }
  });
}

function resetInputs() {
  held.clear();
  requested.clear();
  carry = 0;
}

function renderScreen() {
  const overlayActive = screen !== 'play';
  overlay.hidden = !overlayActive;
  hud.hidden = !['play','pause','result'].includes(screen);
  hint.hidden = screen !== 'play';
  touchControls.hidden = screen !== 'play';
  settingsFields.hidden = screen !== 'settings';
  retry.hidden = screen !== 'pause';
  settingsButton.hidden = !['menu','pause'].includes(screen);
  home.hidden = !['pause','result'].includes(screen);
  if (screen === 'menu') {
    title.textContent = 'Đảo Đèn Lồng';
    body.textContent = 'Cùng Mây gom đom đóm, né Bóng Mực và thắp sáng cả hòn đảo.';
    start.textContent = 'Bắt đầu chơi →';
  } else if (screen === 'intro') {
    title.textContent = `Đêm ${night} · ${nightNames[night-1]}`;
    body.textContent = nightIntroductions[night-1];
    start.textContent = 'Vào đảo →';
  } else if (screen === 'pause') {
    title.textContent = 'Tạm dừng';
    body.textContent = 'Ánh đèn chờ bạn quay lại.';
    start.textContent = 'Tiếp tục →';
  } else if (screen === 'settings') {
    title.textContent = 'Cài đặt';
    body.textContent = 'Thay đổi có hiệu lực ngay trên thiết bị này.';
    start.textContent = 'Quay lại';
  } else if (screen === 'result') {
    title.textContent = won() ? (night === 3 ? 'Đảo đã sáng!' : 'Đêm đã sáng!') : 'Sương phủ kín';
    body.textContent = won() ? `Mây mang về ${game.score ?? 0} điểm ở Đêm ${night}.` : 'Thử một đường khác để gom đom đóm và tránh Bóng Mực.';
    start.textContent = won() && night < 3 ? 'Đêm tiếp theo →' : 'Chơi lại →';
  }
  if (overlayActive) start.focus({preventScroll: true});
  else start.blur();
}

function enterNight(number) {
  night = number;
  game = createGame({night});
  eventCount = 0;
  wasGrounded = game.player.grounded;
  musicBar = -1;
  finalBeep = Infinity;
  camYaw = 0;
  announcement.textContent = '';
  resetInputs();
  screen = 'intro';
  syncHud();
  renderScreen();
}

function pause() {
  if (screen === 'play') {
    if (game.mode === 'playing') {
      stepGame(game,{pause:true});
      stepGame(game,{});
    }
    screen = 'pause';
  } else if (screen === 'pause') {
    if (game.mode === 'paused') stepGame(game,{pause:true});
    screen = 'play';
  }
  resetInputs();
  renderScreen();
}

const status = () => game.result ?? game.mode;
const won = () => status() === 'win' || status() === 'won';
const ended = () => ['win','won','lose','lost','game_over','gameover'].includes(status());

start.addEventListener('click', () => {
  unlockAudio();
  if (screen === 'menu') return enterNight(1);
  if (screen === 'intro') {
    screen = 'play';
    renderScreen();
  } else if (screen === 'pause') pause();
  else if (screen === 'result') enterNight(won() && night < 3 ? night+1 : night);
  else if (screen === 'settings') {
    screen = previousScreen;
    renderScreen();
  }
});

home.addEventListener('click', () => {
  screen = 'menu';
  game = createGame({night:1});
  night = 1;
  resetInputs();
  renderScreen();
});
retry.addEventListener('click', () => enterNight(night));
settingsButton.addEventListener('click', () => {
  previousScreen = screen;
  screen = 'settings';
  renderScreen();
});

function endRound() {
  screen = 'result';
  renderScreen();
  playSound(won() ? 'won' : 'lost');
}

canvas.addEventListener('pointerdown', (event) => {
  if (screen !== 'play' || event.pointerType !== 'mouse') return;
  lastMouseX = event.clientX;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  if (lastMouseX == null || screen !== 'play') return;
  camYaw = (camYaw+(event.clientX-lastMouseX)*settings.sensitivity/100+360)%360;
  lastMouseX = event.clientX;
});
for (const name of ['pointerup','lostpointercapture']) {
  canvas.addEventListener(name, () => { lastMouseX = null; });
}

document.addEventListener('keydown', event => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;
  if (!event.repeat && ['Escape','KeyP'].includes(event.code) && ['play','pause'].includes(screen)) {
    event.preventDefault();
    pause();
    return;
  }
  if (event.code === 'KeyR' && world && !event.repeat && screen === 'play') return enterNight(night);
  if (screen !== 'play') return;
  const direction = movement.get(event.code);
  const action = actions.get(event.code);
  if (direction || action) event.preventDefault();
  if (direction) held.add(direction);
  if (action && !event.repeat) requested.add(action);
});
document.addEventListener('keyup', event => held.delete(movement.get(event.code)));
window.addEventListener('blur', () => held.clear());
for (const action of ['light','jump','pulse','dash']) {
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
  if (screen === 'play' && wasGrounded && !model.grounded && model.vy > 0) playSound('jump');
  wasGrounded = model.grounded;
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
  clock.parentElement.classList.toggle('urgent', seconds <= 30);
  if (screen === 'play' && seconds <= 10 && seconds > 0 && seconds !== finalBeep) playSound('timer');
  finalBeep = seconds;
  const cooldownText = (ticks) => ticks > 0 ? `${(ticks/60).toFixed(1)}s` : 'Sẵn sàng';
  setText(dashCooldown,cooldownText(model.dashCd ?? model.dash_cooldown ?? model.dashCooldown ?? 0));
  setText(pulseCooldown,cooldownText(model.pulseCd ?? model.pulse_cooldown ?? model.pulseCooldown ?? 0));
  const near = nearestLantern(game);
  const required = near?.required ?? near?.cost ?? near?.need ?? 0;
  const deposited = near?.deposited ?? near?.motes ?? 0;
  if (near && carried) setText(hint, `E · Nạp đèn (${deposited}/${required})`);
  else if (near) setText(hint, `Đèn đã nhận ${deposited}/${required} đom đóm. Hãy nhặt thêm.`);
  else setText(hint, 'Gom đom đóm rồi mang đến Đèn Lồng Lớn.');

  for (const event of game.events.slice(eventCount)) {
    const name = event.name ?? event.kind;
    playSound(name);
    if (name === 'hit' || name === 'player_hit') announcement.textContent = `Bóng Mực chạm Mây. Còn ${flames} Lửa Tim.`;
    if (name === 'light' || name === 'lantern_lit') announcement.textContent = `Đã thắp ${lit} trên ${game.lanterns.length} đèn.`;
  }
  eventCount = game.events.length;
}

function syncObjective() {
  if (screen !== 'play') return;
  const nearest = game.lanterns.filter(item => !item.lit).sort((a,b) =>
    Math.hypot(a.x-game.player.x,a.z-game.player.z)-Math.hypot(b.x-game.player.x,b.z-game.player.z))[0];
  const bounds = nearest && world.project(nearest.x, (nearest.y ?? 0)+1.8, nearest.z);
  objectiveArrow.hidden = !bounds || bounds.visible;
  if (!bounds || bounds.visible) return;
  const x = bounds.x || 0;
  const y = bounds.behind ? Math.max(1,Math.abs(bounds.y)) : bounds.y || 0;
  objectiveArrow.style.left = `${50+Math.max(-43,Math.min(43,x*48))}%`;
  objectiveArrow.style.top = `${50+Math.max(-40,Math.min(36,y*48))}%`;
  objectiveArrow.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(y,x)}rad)`;
}

function frame(now) {
  if (screen === 'play') {
    carry += Math.min(now - lastFrame, 100);
    while (carry >= STEP_MS && !ended()) {
      const input = Object.fromEntries([...held, ...requested].map(command => [command, true]));
      stepGame(game, { ...input, cam_yaw_deg:camYaw });
      requested.clear();
      carry -= STEP_MS;
    }
    const bar = Math.floor(game.tick/144);
    if (musicBar !== bar) {
      playSound('music');
      musicBar = bar;
    }
    syncHud();
    if (ended()) endRound();
  }
  lastFrame = now;
  world.render({ ...game, cam_yaw_deg:camYaw }, now);
  syncObjective();
  requestAnimationFrame(frame);
}

if (world) requestAnimationFrame(frame);
