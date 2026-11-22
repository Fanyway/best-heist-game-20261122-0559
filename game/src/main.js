// MIDNIGHT VAULT — game loop, input, alarm meter, tools, loot and getaway.
// The thief crosses each room, lifts the loot and reaches the exit unseen.
// One frame must show it all: room, guards and cones, cameras, loot, alarm.

import {
  LEVELS, TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H,
  LOOT_KINDS, tileCentre, tileRect, pointInTileRects, validateLevel,
} from './levels.js';
import { makeGuard, updateGuard, moveCircle } from './guards.js';
import { makeCamera, updateCamera, cameraSees, disableCameras } from './cameras.js';
import { drawWorld, drawHUD } from './render.js';
import { SoundBank } from './audio.js';
import {
  starsFor, drawMenu, drawIntro, drawPaused, drawCaught,
  drawLevelClear, drawGameClear,
} from './ui.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const sounds = new SoundBank();

const WALK_SPEED = 175;
const SNEAK_SPEED = 95;
const COIN_RANGE = 240;
const EMP_RANGE = 320;
const EMP_SECONDS = 6;

const s = {
  phase: 'menu', // menu | intro | playing | paused | caught | levelclear | gameclear
  levelIndex: 0,
  def: LEVELS[0],
  time: 0,
  score: 0,
  totalScore: 0,
  starsEarned: [],
  peakAlarm: 0,
  alarm: 0,
  alarmActive: false,
  alarmTimer: 0,
  alarmBeepAt: 0,
  thief: { x: 0, y: 0, face: 0, sneaking: false, running: false },
  guards: [],
  cameras: [],
  loot: [],
  keycard: null,
  hasKeycard: false,
  vaultOpen: false,
  vaultDoorPos: null,
  exitPos: { x: 0, y: 0 },
  exitOpen: false,
  coinsLeft: 0,
  empsLeft: 0,
  coins: [],
  empPulses: [],
  wallRects: [],
  caseRects: [],
  shadowRects: [],
  borderRects: [],
  toast: null,
  lastStats: null,
};

function solids() {
  const list = [...s.borderRects, ...s.wallRects, ...s.caseRects];
  if (s.vaultDoorPos && !s.vaultOpen) list.push(s.vaultDoorPos);
  return list;
}

function loadLevel(index) {
  const def = LEVELS[index];
  s.levelIndex = index;
  s.def = def;
  s.time = 0;
  s.score = 0;
  s.peakAlarm = 0;
  s.alarm = 0;
  s.alarmActive = false;
  s.alarmTimer = 0;
  s.coins = [];
  s.empPulses = [];
  s.toast = null;
  s.coinsLeft = def.coins;
  s.empsLeft = def.emps;
  s.hasKeycard = false;
  s.vaultOpen = false;
  s.borderRects = [
    { x: 0, y: HUD_H, w: VIEW_W, h: TILE },
    { x: 0, y: VIEW_H - TILE, w: VIEW_W, h: TILE },
    { x: 0, y: HUD_H, w: TILE, h: VIEW_H - HUD_H },
    { x: VIEW_W - TILE, y: HUD_H, w: TILE, h: VIEW_H - HUD_H },
  ];
  s.wallRects = def.walls.map(tileRect);
  s.caseRects = def.cases.map(tileRect);
  s.shadowRects = def.shadows.map(tileRect);
  s.vaultDoorPos = def.vaultDoor ? tileRect(def.vaultDoor) : null;
  s.guards = def.guards.map((g, i) => makeGuard(g, i));
  s.cameras = def.cameras.map((c, i) => makeCamera(c, i));
  s.loot = def.loot.map((l) => ({ ...tileCentre(l.x, l.y), kind: l.kind, taken: false }));
  s.keycard = def.keycard ? { ...tileCentre(def.keycard.x, def.keycard.y), taken: false } : null;
  s.exitPos = tileCentre(def.exit.x, def.exit.y);
  s.exitOpen = false;
  const start = tileCentre(def.thief.x, def.thief.y);
  s.thief = { x: start.x, y: start.y, face: 0, sneaking: false, running: false };
}

function thiefHidden() {
  return pointInTileRects(s.thief.x, s.thief.y, s.shadowRects);
}

function formatTime(t) {
  const m = Math.floor(t / 60);
  const sec = Math.floor(t % 60);
  return `${m}:${String(sec).padStart(2, '0')}`;
}

function showToast(text) {
  s.toast = { text, t: s.time };
}

function objectiveText() {
  const taken = s.loot.filter((l) => l.taken).length;
  if (s.keycard && !s.keycard.taken && taken === 0) return 'Lift the loot — and find the keycard';
  if (s.loot.some((l) => !l.taken)) return `Loot ${taken}/${s.loot.length} — stay out of the cones`;
  return 'All loot taken — reach the EXIT';
}

function subObjectiveText() {
  if (s.keycard && !s.keycard.taken) return 'The vault only opens with the keycard.';
  if (s.loot.some((l) => !l.taken)) return 'Shadow hides you. Coins distract. EMP blinds cameras.';
  return 'The getaway door is open. Go.';
}

function throwCoin(mx, my) {
  if (s.coinsLeft <= 0) {
    showToast('Out of coins — the guards keep their eyes open');
    return;
  }
  const dx = mx - s.thief.x;
  const dy = my - s.thief.y;
  const d = Math.hypot(dx, dy);
  const range = Math.min(d, COIN_RANGE);
  const tx = s.thief.x + (d > 0 ? (dx / d) * range : 0);
  const ty = s.thief.y + (d > 0 ? (dy / d) * range : 0);
  s.coinsLeft -= 1;
  s.coins.push({ x: tx, y: ty, t: s.time });
  sounds.coin();
}

function useEmp() {
  if (s.empsLeft <= 0) {
    showToast('No EMP pulses left');
    return;
  }
  const count = disableCameras(s.cameras, s.thief.x, s.thief.y, EMP_RANGE, EMP_SECONDS, s.time);
  if (count === 0) {
    showToast('No camera in range of the pulse');
    return;
  }
  s.empsLeft -= 1;
  s.alarm = Math.min(100, s.alarm + 8);
  s.empPulses.push({ x: s.thief.x, y: s.thief.y, t: s.time });
  sounds.emp();
  showToast(`${count} camera${count > 1 ? 's' : ''} offline for ${EMP_SECONDS}s — but the pulse made noise`);
}

function levelClear() {
  const stars = starsFor(s.time, s.def.par, s.peakAlarm);
  s.starsEarned.push(stars);
  s.totalScore += s.score;
  sounds.win();
  const last = s.levelIndex === LEVELS.length - 1;
  s.lastStats = {
    stars,
    timeText: formatTime(s.time),
    par: s.def.par,
    score: s.score,
    peakAlarm: s.peakAlarm,
    nextText: last ? 'ENTER — see the final take' : 'ENTER — next room',
  };
  s.phase = 'levelclear';
}

function gameClear() {
  s.phase = 'gameclear';
}

function caught() {
  sounds.caught();
  s.phase = 'caught';
}

const keys = new Set();
let mouse = { x: VIEW_W / 2, y: VIEW_H / 2 };

function update(dt) {
  if (s.phase !== 'playing') return;
  s.time += dt;

  // Movement.
  let dx = 0;
  let dy = 0;
  if (keys.has('KeyA') || keys.has('ArrowLeft')) dx -= 1;
  if (keys.has('KeyD') || keys.has('ArrowRight')) dx += 1;
  if (keys.has('KeyW') || keys.has('ArrowUp')) dy -= 1;
  if (keys.has('KeyS') || keys.has('ArrowDown')) dy += 1;
  const moving = dx !== 0 || dy !== 0;
  s.thief.sneaking = keys.has('ShiftLeft') || keys.has('ShiftRight');
  s.thief.running = moving && !s.thief.sneaking;
  if (moving) {
    const len = Math.hypot(dx, dy);
    const speed = s.thief.sneaking ? SNEAK_SPEED : WALK_SPEED;
    s.thief.face = Math.atan2(dy / len, dx / len);
    moveCircle(s.thief, (dx / len) * speed * dt, (dy / len) * speed * dt, 13, solids());
    sounds.footstep();
  }

  const hidden = thiefHidden();
  const solidList = solids();

  // Guards.
  let anySeeing = false;
  let anyChase = false;
  for (const g of s.guards) {
    const ev = updateGuard(g, dt, {
      thief: s.thief, solids: solidList, coins: s.coins, thiefHidden: hidden,
    });
    if (ev.caught) { caught(); return; }
    if (ev.alarmPush) s.alarm = Math.min(100, s.alarm + ev.alarmPush);
    if (ev.seeing > 0) {
      anySeeing = true;
      s.alarm = Math.min(100, s.alarm + 10 * ev.seeing * dt);
    }
    if (g.state === 'chase') anyChase = true;
  }

  // Cameras.
  for (const cam of s.cameras) {
    updateCamera(cam, dt, s.time);
    const see = cameraSees(cam, s.thief, solidList, hidden, s.time);
    cam.lastSee = see;
    if (see > 0) {
      anySeeing = true;
      s.alarm = Math.min(100, s.alarm + 26 * see * dt);
    }
  }

  // Alarm meter: rises under eyes, decays in the dark.
  if (!anySeeing && !anyChase) {
    s.alarm = Math.max(0, s.alarm - (hidden ? 14 : 6) * dt);
  }
  if (anyChase) s.alarm = Math.min(100, s.alarm + 8 * dt);
  s.peakAlarm = Math.max(s.peakAlarm, s.alarm);

  if (s.alarm >= 100 && !s.alarmActive) {
    s.alarmActive = true;
    s.alarmTimer = 6;
    for (const g of s.guards) {
      g.state = 'chase';
      g.lastSeen = { x: s.thief.x, y: s.thief.y };
      g.suspicion = 100;
    }
    showToast('ALARM! Every guard is coming for you');
  }
  if (s.alarmActive) {
    s.alarmTimer -= dt;
    if (s.alarmTimer <= 0) {
      s.alarmActive = false;
      s.alarm = 70;
    }
  }
  if (s.alarm > 70 && s.time - s.alarmBeepAt > 0.7) {
    s.alarmBeepAt = s.time;
    sounds.alarmTick();
  }

  // Thrown coins fade out.
  s.coins = s.coins.filter((c) => s.time - c.t < 3.5);
  s.empPulses = s.empPulses.filter((p) => s.time - p.t < 1);

  // Pickups.
  for (const l of s.loot) {
    if (!l.taken && Math.hypot(l.x - s.thief.x, l.y - s.thief.y) < 28) {
      l.taken = true;
      const value = LOOT_KINDS[l.kind].value;
      s.score += value;
      sounds.pickup();
      showToast(`${LOOT_KINDS[l.kind].label} +$${value}`);
    }
  }
  if (s.keycard && !s.keycard.taken &&
      Math.hypot(s.keycard.x - s.thief.x, s.keycard.y - s.thief.y) < 28) {
    s.keycard.taken = true;
    s.hasKeycard = true;
    s.vaultOpen = true;
    sounds.keycard();
    showToast('Keycard — the vault door is open');
  }

  // Exit.
  s.exitOpen = s.loot.every((l) => l.taken);
  if (s.exitOpen && Math.hypot(s.exitPos.x - s.thief.x, s.exitPos.y - s.thief.y) < 28) {
    levelClear();
  }
}

function render() {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  if (s.phase === 'menu') {
    drawMenu(ctx, s.time);
    return;
  }
  drawWorld(ctx, {
    ...s,
    objective: objectiveText(),
    subObjective: subObjectiveText(),
  });
  drawHUD(ctx, {
    ...s,
    objective: objectiveText(),
    subObjective: subObjectiveText(),
  });
  if (s.phase === 'intro') drawIntro(ctx, s.def, s.levelIndex);
  if (s.phase === 'paused') drawPaused(ctx);
  if (s.phase === 'caught') {
    drawCaught(ctx, {
      lootTaken: s.loot.filter((l) => l.taken).length,
      lootTotal: s.loot.length,
      peakAlarm: s.peakAlarm,
    });
  }
  if (s.phase === 'levelclear' && s.lastStats) drawLevelClear(ctx, s.lastStats);
  if (s.phase === 'gameclear') {
    drawGameClear(ctx, s.starsEarned.reduce((a, b) => a + b, 0), s.totalScore);
  }
}

let last = performance.now();
let frames = 0;
function loop(now) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  update(dt);
  render();
  frames += 1;
  if (frames === 2) window.__gameReady = true;
  requestAnimationFrame(loop);
}

// ---- Input ----

window.addEventListener('keydown', (e) => {
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) {
    e.preventDefault();
  }
  sounds.ensure();
  if (e.code === 'KeyM') {
    const muted = sounds.toggleMute();
    showToast(muted ? 'Sound off' : 'Sound on');
    return;
  }
  if (e.code === 'KeyP' && (s.phase === 'playing' || s.phase === 'paused')) {
    s.phase = s.phase === 'playing' ? 'paused' : 'playing';
    sounds.click();
    return;
  }
  if (e.code === 'KeyR' && s.phase !== 'menu') {
    loadLevel(s.levelIndex);
    s.phase = 'playing';
    sounds.click();
    return;
  }
  if (e.code === 'KeyE' && s.phase === 'playing') {
    useEmp();
    return;
  }
  if (e.code === 'Enter') {
    if (s.phase === 'menu') {
      loadLevel(0);
      s.phase = 'intro';
      sounds.click();
    } else if (s.phase === 'intro') {
      s.phase = 'playing';
      sounds.click();
    } else if (s.phase === 'levelclear') {
      if (s.levelIndex === LEVELS.length - 1) {
        gameClear();
      } else {
        loadLevel(s.levelIndex + 1);
        s.phase = 'intro';
      }
      sounds.click();
    } else if (s.phase === 'gameclear') {
      s.totalScore = 0;
      s.starsEarned = [];
      loadLevel(0);
      s.phase = 'intro';
      sounds.click();
    }
    return;
  }
  keys.add(e.code);
});

window.addEventListener('keyup', (e) => keys.delete(e.code));

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  mouse = {
    x: (e.clientX - rect.left) * (VIEW_W / rect.width),
    y: (e.clientY - rect.top) * (VIEW_H / rect.height),
  };
});

canvas.addEventListener('mousedown', (e) => {
  sounds.ensure();
  if (e.button === 2) {
    if (s.phase === 'playing') useEmp();
    return;
  }
  if (s.phase === 'menu') {
    loadLevel(0);
    s.phase = 'intro';
    sounds.click();
    return;
  }
  if (s.phase === 'intro') {
    s.phase = 'playing';
    sounds.click();
    return;
  }
  if (s.phase === 'playing') throwCoin(mouse.x, mouse.y);
});

canvas.addEventListener('contextmenu', (e) => e.preventDefault());

// ---- Deterministic screenshot staging (?shot=cover|alarm|win) ----

function stageShot(kind) {
  if (kind === 'cover') {
    loadLevel(0);
    s.phase = 'playing';
    s.time = 23.4;
    const th = tileCentre(16, 11);
    s.thief.x = th.x; s.thief.y = th.y; s.thief.face = -Math.PI / 2; s.thief.sneaking = true;
    const g0 = s.guards[0];
    const p0 = tileCentre(22, 3);
    g0.x = p0.x; g0.y = p0.y; g0.facing = Math.atan2(s.thief.y - p0.y, s.thief.x - p0.x);
    g0.suspicion = 55; g0.state = 'suspicious'; g0.lastSeen = { x: s.thief.x, y: s.thief.y };
    const g1 = s.guards[1];
    const p1 = tileCentre(10, 14);
    g1.x = p1.x; g1.y = p1.y; g1.facing = Math.PI / 2;
    const cam = s.cameras[0];
    cam.angle = Math.atan2(s.thief.y - cam.y, s.thief.x - cam.x);
    cam.lastSee = 0;
    s.alarm = 32;
    s.peakAlarm = 32;
    s.score = 0;
  } else if (kind === 'alarm') {
    loadLevel(1);
    s.phase = 'playing';
    s.time = 41.2;
    const th = tileCentre(15, 3);
    s.thief.x = th.x; s.thief.y = th.y; s.thief.face = Math.PI / 2;
    const cam = s.cameras[0];
    cam.angle = Math.PI / 2;
    cam.lastSee = 0.9;
    const g0 = s.guards[0];
    const p0 = tileCentre(18, 5);
    g0.x = p0.x; g0.y = p0.y; g0.state = 'chase'; g0.suspicion = 100;
    g0.facing = Math.atan2(s.thief.y - p0.y, s.thief.x - p0.x);
    g0.lastSeen = { x: s.thief.x, y: s.thief.y };
    const g1 = s.guards[1];
    g1.state = 'suspicious'; g1.suspicion = 60;
    g1.lastSeen = { x: s.thief.x, y: s.thief.y };
    s.loot[1].taken = true;
    s.score = LOOT_KINDS[s.loot[1].kind].value;
    s.alarm = 76;
    s.peakAlarm = 76;
    s.coinsLeft = 1;
    s.empsLeft = 1;
  } else if (kind === 'win') {
    loadLevel(2);
    s.phase = 'gameclear';
    s.time = 0;
    for (const l of s.loot) l.taken = true;
    s.hasKeycard = true;
    if (s.keycard) s.keycard.taken = true;
    s.vaultOpen = true;
    s.exitOpen = true;
    s.starsEarned = [3, 3, 2];
    s.totalScore = 4750;
    s.score = 2350;
    s.alarm = 0;
    s.peakAlarm = 31;
    const th = tileCentre(29, 17);
    s.thief.x = th.x; s.thief.y = th.y;
  }
}

// ---- Boot ----

for (const [i, def] of LEVELS.entries()) {
  const errs = validateLevel(def);
  if (errs.length) console.error(`level ${i + 1} invalid:`, errs);
}
loadLevel(0);
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
if (shot === 'cover' || shot === 'alarm' || shot === 'win') {
  stageShot(shot);
}

// Debug hook for automated play-testing (read-only state + helpers).
window.MIDNIGHT_VAULT = {
  state() {
    return {
      phase: s.phase,
      levelIndex: s.levelIndex,
      levelName: s.def.name,
      time: s.time,
      score: s.score,
      totalScore: s.totalScore,
      alarm: s.alarm,
      peakAlarm: s.peakAlarm,
      thief: { x: s.thief.x, y: s.thief.y, sneaking: s.thief.sneaking },
      guards: s.guards.map((g) => ({ x: g.x, y: g.y, state: g.state, suspicion: Math.round(g.suspicion) })),
      cameras: s.cameras.map((c) => ({ angle: c.angle, disabledUntil: c.disabledUntil, lastSee: c.lastSee || 0 })),
      lootTaken: s.loot.filter((l) => l.taken).length,
      lootTotal: s.loot.length,
      hasKeycard: s.hasKeycard,
      vaultOpen: s.vaultOpen,
      exitOpen: s.exitOpen,
      coinsLeft: s.coinsLeft,
      empsLeft: s.empsLeft,
      starsEarned: [...s.starsEarned],
    };
  },
  loadLevel(i) { loadLevel(i); s.phase = 'playing'; },
  teleport(x, y) { s.thief.x = x; s.thief.y = y; },
  setAlarm(v) { s.alarm = v; },
  press(code) {
    window.dispatchEvent(new KeyboardEvent('keydown', { code }));
    window.dispatchEvent(new KeyboardEvent('keyup', { code }));
  },
  hold(code, on) {
    if (on) keys.add(code);
    else keys.delete(code);
  },
};

requestAnimationFrame(loop);
