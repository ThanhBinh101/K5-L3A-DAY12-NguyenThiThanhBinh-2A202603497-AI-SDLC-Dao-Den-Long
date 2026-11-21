import { capacity, createGame, nearestLantern, STEP_MS, stepGame } from '../src/game.mjs';
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
const fuelHud = get('lamp-fuel-bars');
const colorblind = get('colorblind');
const dashCooldown = get('dash-cooldown');
const pulseCooldown = get('pulse-cooldown');
const keyLabels = {
  up:'Đi tới', down:'Đi lùi', left:'Đi trái', right:'Đi phải', jump:'Nhảy',
  dash:'Lướt', pulse:'Xung sáng', light:'Nạp đèn', pause:'Tạm dừng', retry:'Chơi lại',
};
const defaults = {
  up:'KeyW', down:'KeyS', left:'KeyA', right:'KeyD', jump:'Space', dash:'ShiftLeft',
  pulse:'KeyQ', light:'KeyE', pause:'Escape', retry:'KeyR',
};
const alternates = {up:'ArrowUp',down:'ArrowDown',left:'ArrowLeft',right:'ArrowRight',dash:'ShiftRight',pause:'KeyP'};
const directional = ['up','down','left','right'];
const checkboxIds = ['colorblind','reduced','largeText','captions'];
const bindingFeedback = get('binding-feedback');
const bindingRows = get('bindings');
const scoreForm = get('score-form');
const playerName = get('player-name');
const scoreFeedback = get('score-feedback');
const leaderboard = get('leaderboard');
const rankings = get('rankings');
const gameCaptions = get('game-captions');
const spawnArrow = get('spawn-arrow');
const seed = 42;
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
let game = createGame({night,seed});
let runScore = 0;
let nightsWon = 0;
let scoreSaved = false;
let enemyAnnouncement = null;
let rebinding = null;
let screen = 'menu';
let previousScreen = 'menu';
let settings = {
  volume:55, sensitivity:32, colorblind:false, reduced:false, largeText:false,
  captions:true, bindings:{...defaults},
};
try {
  settings = { ...settings, ...JSON.parse(localStorage.getItem('dao-den-long-settings') ?? '{}') };
} catch {
  // Use defaults when storage is unavailable in private windows.
}
settings.bindings = { ...defaults, ...settings.bindings };
volume.value = settings.volume;
sensitivity.value = settings.sensitivity;
for (const id of checkboxIds) get(id).checked = settings[id];
for (const id of ['colorblind','reduced','largeText']) document.body.classList.toggle(id, settings[id]);
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
  'Ông Đăng: Mây ơi, gom đom đóm rồi giữ ít nhất 60% đèn sáng tới bình minh.',
  'Ông Đăng: Qua cầu và dùng bệ phóng để vượt khoảng trống. Hãy để dành đom đóm tiếp nhiên liệu.',
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
function saveSettings() {
  try { localStorage.setItem('dao-den-long-settings',JSON.stringify(settings)); } catch { /* private storage */ }
}

for (const input of [volume,sensitivity,...checkboxIds.map(get)]) {
  input.addEventListener('input', () => {
    settings[input.id] = input.type === 'checkbox' ? input.checked : Number(input.value);
    document.body.classList.toggle(input.id, settings[input.id] === true);
    saveSettings();
  });
}

function keyName(code) {
  const special = {Escape:'Esc',Space:'Space',ShiftLeft:'Shift trái',ShiftRight:'Shift phải',
    ArrowUp:'↑',ArrowDown:'↓',ArrowLeft:'←',ArrowRight:'→'};
  return special[code] ?? code.replace(/^(Key|Digit)/,'');
}

function commandFor(code, excluded = null) {
  return Object.keys(keyLabels).find(command => command !== excluded && (settings.bindings[command] === code ||
    (settings.bindings[command] === defaults[command] && alternates[command] === code)));
}

function showKeys() {
  for (const label of document.querySelectorAll('[data-key]')) setText(label,keyName(settings.bindings[label.dataset.key]));
  for (const button of bindingRows.querySelectorAll('button')) {
    setText(button, keyName(settings.bindings[button.dataset.bind]));
  }
}

for (const [command,label] of Object.entries(keyLabels)) {
  const row = document.createElement('div');
  row.className = 'binding';
  const text = document.createElement('span');
  text.textContent = label;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'secondary';
  button.dataset.bind = command;
  button.setAttribute('aria-label', `Đổi phím ${label.toLowerCase()}`);
  button.addEventListener('click', () => {
    rebinding = command;
    setText(bindingFeedback,`Nhấn phím mới cho “${label}”.`);
  });
  row.append(text,button);
  bindingRows.append(row);
}
get('reset-keys').addEventListener('click', () => {
  rebinding = null;
  settings.bindings = {...defaults};
  saveSettings();
  showKeys();
  setText(bindingFeedback,'Đã khôi phục phím mặc định.');
});
showKeys();

function resetInputs() {
  held.clear();
  requested.clear();
  carry = 0;
}

function renderScreen() {
  const overlayActive = screen !== 'play';
  overlay.hidden = !overlayActive;
  hud.hidden = !['play','pause','result'].includes(screen);
  leaderboard.hidden = screen !== 'menu';
  rankings.hidden = screen !== 'leaderboard';
  scoreForm.hidden = screen !== 'result' || (won() && night < 3);
  playerName.disabled = scoreSaved;
  scoreForm.querySelector('button').disabled = scoreSaved;
  if (screen !== 'settings') rebinding = null;
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
  } else if (screen === 'leaderboard') {
    title.textContent = 'Bảng điểm';
    body.textContent = 'Mười lượt chơi có tổng điểm cao nhất.';
    start.textContent = 'Quay lại';
  } else if (screen === 'settings') {
    title.textContent = 'Cài đặt';
    body.textContent = 'Thay đổi có hiệu lực ngay trên thiết bị này.';
    start.textContent = 'Quay lại';
  } else if (screen === 'result') {
    title.textContent = won() ? 'Đón bình minh!' : 'Sương phủ kín';
    const litCount = game.lanterns.filter(lamp => lamp.lit).length;
    body.textContent = `Đêm ${night}: ${litCount}/${game.lanterns.length} đèn còn sáng · ${game.score ?? 0} điểm.`;
    start.textContent = won() && night < 3 ? 'Đêm tiếp theo →' : 'Chơi lượt mới →';
  }
  if (overlayActive) start.focus({preventScroll: true});
  else start.blur();
}

function enterNight(number) {
  night = number;
  game = createGame({night,seed});
  scoreSaved = false;
  enemyAnnouncement = null;
  eventCount = 0;
  wasGrounded = game.player.grounded;
  musicBar = -1;
  finalBeep = Infinity;
  camYaw = 0;
  fuelHud.replaceChildren();
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
  if (screen === 'menu') {
    runScore = 0;
    nightsWon = 0;
    return enterNight(1);
  }
  if (screen === 'intro') {
    screen = 'play';
    renderScreen();
  } else if (screen === 'pause') pause();
  else if (screen === 'result') {
    if (won() && night < 3) return enterNight(night+1);
    runScore = 0;
    nightsWon = 0;
    return enterNight(1);
  } else if (screen === 'leaderboard') {
    screen = 'menu';
    renderScreen();
  }
  else if (screen === 'settings') {
    screen = previousScreen;
    renderScreen();
  }
});

home.addEventListener('click', () => {
  screen = 'menu';
  game = createGame({night:1,seed});
  runScore = 0;
  nightsWon = 0;
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

async function refreshLeaderboard() {
  rankings.replaceChildren();
  try {
    const response = await fetch('/api/leaderboard');
    if (!response.ok) throw new Error('unavailable');
    const entries = await response.json();
    if (!entries.length) body.textContent = 'Chưa có lượt chơi đã lưu.';
    for (const row of entries) {
      const item = document.createElement('li');
      item.textContent = `${row.name} · ${row.score} điểm · ${row.nights_won}/3 đêm`;
      rankings.append(item);
    }
  } catch {
    body.textContent = 'Bảng điểm cần chạy qua máy chủ Node của trò chơi.';
  }
}

leaderboard.addEventListener('click', () => {
  screen = 'leaderboard';
  renderScreen();
  void refreshLeaderboard();
});

scoreForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const name = playerName.value;
  if (scoreSaved || !/^[A-Za-z0-9_]{3,12}$/.test(name)) return;
  const button = scoreForm.querySelector('button');
  button.disabled = true;
  setText(scoreFeedback,'Đang lưu điểm…');
  try {
    const response = await fetch('/api/leaderboard', {
      method:'POST', headers:{'Content-Type':'application/json'},
      body:JSON.stringify({name,score:runScore,nights_won:nightsWon,seed}),
    });
    if (!response.ok) throw new Error('save failed');
    scoreSaved = true;
    playerName.disabled = true;
    setText(scoreFeedback,`Đã lưu ${runScore} điểm sau ${nightsWon}/3 đêm.`);
  } catch {
    setText(scoreFeedback,'Chưa lưu được. Bạn có thể thử lại khi trò chơi kết nối máy chủ.');
    button.disabled = false;
  }
});

function endRound() {
  if (won()) {
    runScore += game.score;
    nightsWon += 1;
  }
  playerName.value = '';
  setText(scoreFeedback,'3–12 ký tự, gồm chữ không dấu, số hoặc dấu gạch dưới.');
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
  if (screen === 'settings' && rebinding && !event.repeat) {
    if (event.code === 'Tab') {
      rebinding = null;
      setText(bindingFeedback,'Đã hủy đổi phím.');
      return;
    }
    event.preventDefault();
    if (commandFor(event.code,rebinding)) {
      setText(bindingFeedback,'Phím này đã được dùng. Chọn phím khác.');
      return;
    }
    settings.bindings[rebinding] = event.code;
    setText(bindingFeedback,`Đã đổi “${keyLabels[rebinding]}” sang ${keyName(event.code)}.`);
    rebinding = null;
    saveSettings();
    showKeys();
    return;
  }
  const command = commandFor(event.code);
  if (command === 'pause' && !event.repeat && ['play','pause'].includes(screen)) {
    event.preventDefault();
    pause();
    return;
  }
  if (screen !== 'play') return;
  if (command) event.preventDefault();
  if (command === 'retry' && !event.repeat) return enterNight(night);
  if (directional.includes(command)) held.add(command);
  else if (command && !event.repeat) requested.add(command);
});
document.addEventListener('keyup', event => held.delete(commandFor(event.code)));
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
  const limit = capacity(game);
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
  const inventoryLabel = `${carried} / ${limit}`;
  if (fireflies.textContent !== inventoryLabel || !slots.children.length) {
    setText(fireflies, inventoryLabel);
    slots.replaceChildren(...Array.from({ length: limit }, (_, index) => {
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
  if (near?.lit && carried) setText(hint, `${keyName(settings.bindings.light)} · Tiếp nhiên liệu (${Math.floor(near.fuel)}/100)`);
  else if (near?.lit) setText(hint, `Đèn còn ${Math.floor(near.fuel)}/100 nhiên liệu. Hãy nhặt thêm đom đóm.`);
  else if (near && carried) setText(hint, `${keyName(settings.bindings.light)} · ${near.ever_lit ? 'Thắp lại' : 'Nạp đèn'} (${deposited}/${required})`);
  else if (near) setText(hint, `Đèn đã nhận ${deposited}/${required} đom đóm. Hãy nhặt thêm.`);
  else setText(hint, `Giữ ${Math.ceil(game.lanterns.length*.6)} đèn trở lên sáng tới bình minh.`);

  for (const event of game.events.slice(eventCount)) {
    const name = event.name ?? event.kind;
    playSound(name);
    if (name === 'shade_spawned') enemyAnnouncement = { id:event.data?.id, tick:game.tick };
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

function syncFuel() {
  fuelHud.hidden = screen !== 'play';
  if (fuelHud.hidden) return;
  for (const lamp of game.lanterns) {
    let marker = fuelHud.querySelector(`[data-lamp="${lamp.id}"]`);
    if (!marker) {
      marker = document.createElement('div');
      marker.className = 'fuel-meter';
      marker.dataset.lamp = lamp.id;
      marker.setAttribute('role','meter');
      marker.setAttribute('aria-valuemin','0');
      marker.setAttribute('aria-valuemax','100');
      marker.setAttribute('aria-label', `Nhiên liệu đèn ${lamp.id}`);
      fuelHud.append(marker);
    }
    const position = world.project(lamp.x,lamp.y+2.35,lamp.z);
    marker.hidden = !lamp.lit || !position?.visible;
    if (marker.hidden) continue;
    marker.style.left = `${50+position.x*50}%`;
    marker.style.top = `${50+position.y*50}%`;
    marker.style.setProperty('--fuel', `${lamp.fuel}%`);
    marker.classList.toggle('fuel-low', lamp.fuel < 30);
    marker.setAttribute('aria-valuenow', String(Math.floor(lamp.fuel)));
  }
}

function updateCaptions() {
  spawnArrow.hidden = true;
  if (!settings.captions || screen !== 'play') {
    gameCaptions.hidden = true;
    return;
  }
  const captions = [];
  const remaining = Math.ceil(game.timeLeft);
  if (game.wind?.warning) captions.push('⚠ Gió lớn sắp tới');
  if (remaining > 0 && remaining <= 10) captions.push(`⚠ Còn ${remaining} giây`);
  if (game.lanterns.some(item => item.lit && item.fuel < 30)) captions.push('⚠ Đèn sắp cạn nhiên liệu');
  if (enemyAnnouncement && game.tick-enemyAnnouncement.tick <= 220) {
    captions.push('Bóng Mực xuất hiện');
    const enemy = game.enemies.find(item => item.id === enemyAnnouncement.id);
    const location = enemy && world.project(enemy.x,enemy.y+.9,enemy.z);
    if (location && !location.visible) {
      const x = location.x;
      const y = location.behind ? Math.max(1,Math.abs(location.y)) : location.y;
      spawnArrow.hidden = false;
      spawnArrow.style.left = `${50+Math.max(-43,Math.min(43,x*49))}%`;
      spawnArrow.style.top = `${50+Math.max(-30,Math.min(37,y*49))}%`;
      spawnArrow.style.transform = `translate(-50%,-50%) rotate(${Math.atan2(y,x)}rad)`;
    }
  }
  gameCaptions.hidden = !captions.length;
  setText(gameCaptions,captions.join(' · '));
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
  world.render({ ...game, cam_yaw_deg:camYaw }, now, { colorblind:settings.colorblind, reducedMotion:settings.reduced });
  syncObjective();
  syncFuel();
  updateCaptions();
  requestAnimationFrame(frame);
}

if (world) requestAnimationFrame(frame);
