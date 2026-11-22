// MIDNIGHT VAULT — all canvas drawing: the room, vision cones, entities, HUD.
// Nothing here changes game state; it only paints what main.js hands it.

import { TILE, COLS, ROWS, HUD_H, VIEW_W, VIEW_H, LOOT_KINDS, tileRect } from './levels.js';
import { GUARD_RANGE, GUARD_HALF_ANGLE } from './guards.js';
import { CAMERA_HALF_ANGLE, cameraMount } from './cameras.js';

const GOLD = '#d8c98a';
const WALL_FILL = '#1b2340';
const WALL_TOP = '#2c3a68';
const FLOOR_A = '#11162a';
const FLOOR_B = '#0d1224';

// Deterministic speckle for the marble floor (no Math.random in render).
function speckle(x, y) {
  const h = (x * 374761393 + y * 668265263) ^ 0x5bf03635;
  return ((h >>> 0) % 1000) / 1000;
}

function conePath(ctx, x, y, angle, halfAngle, range) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.arc(x, y, range, angle - halfAngle, angle + halfAngle);
  ctx.closePath();
}

function drawFloor(ctx) {
  for (let ty = 0; ty < ROWS; ty++) {
    for (let tx = 0; tx < COLS; tx++) {
      ctx.fillStyle = (tx + ty) % 2 === 0 ? FLOOR_A : FLOOR_B;
      ctx.fillRect(tx * TILE, HUD_H + ty * TILE, TILE, TILE);
      if (speckle(tx, ty) > 0.86) {
        ctx.fillStyle = 'rgba(216, 201, 138, 0.05)';
        ctx.fillRect(tx * TILE + 8, HUD_H + ty * TILE + 8, 6, 6);
      }
    }
  }
  // Room border walls.
  ctx.fillStyle = WALL_FILL;
  ctx.fillRect(0, HUD_H, VIEW_W, TILE);
  ctx.fillRect(0, VIEW_H - TILE, VIEW_W, TILE);
  ctx.fillRect(0, HUD_H, TILE, VIEW_H - HUD_H);
  ctx.fillRect(VIEW_W - TILE, HUD_H, TILE, VIEW_H - HUD_H);
  ctx.fillStyle = WALL_TOP;
  ctx.fillRect(0, HUD_H + TILE - 6, VIEW_W, 6);
  ctx.fillRect(0, VIEW_H - TILE, VIEW_W, 6);
  ctx.fillRect(TILE - 6, HUD_H, 6, VIEW_H - HUD_H);
  ctx.fillRect(VIEW_W - TILE, HUD_H, 6, VIEW_H - HUD_H);
}

function drawShadows(ctx, shadows) {
  for (const r of shadows) {
    const q = tileRect(r);
    ctx.fillStyle = 'rgba(2, 4, 12, 0.55)';
    ctx.fillRect(q.x, q.y, q.w, q.h);
    ctx.strokeStyle = 'rgba(120, 140, 220, 0.18)';
    ctx.setLineDash([6, 6]);
    ctx.strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(150, 170, 255, 0.35)';
    ctx.font = '11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('SHADOW', q.x + q.w / 2, q.y + q.h / 2 + 4);
  }
}

function drawWalls(ctx, walls) {
  for (const r of walls) {
    const q = tileRect(r);
    ctx.fillStyle = WALL_FILL;
    ctx.fillRect(q.x, q.y, q.w, q.h);
    ctx.fillStyle = WALL_TOP;
    ctx.fillRect(q.x, q.y, q.w, 5);
    ctx.strokeStyle = 'rgba(216, 201, 138, 0.25)';
    ctx.strokeRect(q.x + 0.5, q.y + 0.5, q.w - 1, q.h - 1);
  }
}

function drawCases(ctx, cases) {
  for (const r of cases) {
    const q = tileRect(r);
    ctx.fillStyle = '#241d10';
    ctx.fillRect(q.x, q.y, q.w, q.h);
    ctx.fillStyle = 'rgba(140, 180, 255, 0.22)';
    ctx.fillRect(q.x + 4, q.y + 4, q.w - 8, q.h - 8);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 2;
    ctx.strokeRect(q.x + 1, q.y + 1, q.w - 2, q.h - 2);
    ctx.lineWidth = 1;
  }
}

function drawLootShape(ctx, kind, x, y, t) {
  const bob = Math.sin(t * 2.4 + x * 0.05) * 3;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.shadowBlur = 14;
  ctx.shadowColor = LOOT_KINDS[kind].color;
  ctx.fillStyle = LOOT_KINDS[kind].color;
  ctx.strokeStyle = LOOT_KINDS[kind].color;
  if (kind === 'mask') {
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#11162a';
    ctx.beginPath(); ctx.ellipse(-5, -1, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(5, -1, 3, 1.6, 0, 0, Math.PI * 2); ctx.fill();
  } else if (kind === 'vase') {
    ctx.beginPath();
    ctx.moveTo(-6, -10); ctx.quadraticCurveTo(-12, 0, -6, 10);
    ctx.lineTo(6, 10); ctx.quadraticCurveTo(12, 0, 6, -10);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'gold') {
    ctx.fillRect(-12, 2, 10, 6);
    ctx.fillRect(0, 2, 10, 6);
    ctx.fillRect(-6, -6, 10, 6);
  } else if (kind === 'cash') {
    ctx.fillRect(-11, -6, 22, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0d1224';
    ctx.font = 'bold 10px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('$', 0, 4);
  } else if (kind === 'diamonds' || kind === 'ruby') {
    ctx.beginPath();
    ctx.moveTo(0, -11); ctx.lineTo(9, 0); ctx.lineTo(0, 11); ctx.lineTo(-9, 0);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'crown') {
    ctx.beginPath();
    ctx.moveTo(-11, 8); ctx.lineTo(-11, -4); ctx.lineTo(-5, 3);
    ctx.lineTo(0, -9); ctx.lineTo(5, 3); ctx.lineTo(11, -4); ctx.lineTo(11, 8);
    ctx.closePath(); ctx.fill();
  } else if (kind === 'painting') {
    ctx.fillStyle = '#3a2a12';
    ctx.fillRect(-12, -9, 24, 18);
    ctx.fillStyle = LOOT_KINDS[kind].color;
    ctx.fillRect(-9, -6, 18, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(0, -1, 3, 0, Math.PI * 2); ctx.fill();
  } else {
    ctx.beginPath(); ctx.ellipse(0, 0, 11, 7, 0, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = '#8a6d2f';
    ctx.beginPath(); ctx.moveTo(-11, 0); ctx.lineTo(11, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawExit(ctx, s) {
  const { x, y } = s.exitPos;
  ctx.save();
  ctx.translate(x, y);
  const open = s.exitOpen;
  ctx.fillStyle = open ? 'rgba(60, 220, 120, 0.25)' : 'rgba(120, 120, 120, 0.18)';
  ctx.fillRect(-22, -26, 44, 52);
  ctx.strokeStyle = open ? '#3cdc78' : '#8a8a8a';
  ctx.lineWidth = 3;
  ctx.strokeRect(-22, -26, 44, 52);
  ctx.lineWidth = 1;
  if (open) {
    ctx.shadowBlur = 16;
    ctx.shadowColor = '#3cdc78';
    ctx.fillStyle = '#3cdc78';
    ctx.font = 'bold 13px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('EXIT', 0, -32);
    ctx.fillText('➤', 0, 8);
  } else {
    ctx.fillStyle = '#c9c9c9';
    ctx.font = 'bold 11px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('LOCKED', 0, -32);
    ctx.fillStyle = '#8a8a8a';
    ctx.fillRect(-4, -8, 8, 10);
    ctx.beginPath(); ctx.arc(0, -8, 5, Math.PI, 0); ctx.stroke();
  }
  ctx.restore();
}

function drawVaultDoor(ctx, s) {
  if (!s.vaultDoorPos) return;
  const { x, y, w, h } = s.vaultDoorPos;
  if (s.vaultOpen) {
    ctx.fillStyle = '#05070f';
    ctx.fillRect(x, y, w, h);
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.fillStyle = 'rgba(255, 207, 61, 0.25)';
    ctx.fillRect(x + 4, y + 4, w - 8, h - 8);
    return;
  }
  ctx.fillStyle = '#3d465e';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = '#c8b06a';
  ctx.lineWidth = 2;
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
  ctx.lineWidth = 1;
  ctx.fillStyle = '#c8b06a';
  ctx.beginPath(); ctx.arc(x + w / 2, y + h / 2, 6, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#1b2340';
  ctx.font = 'bold 9px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText('VAULT', x + w / 2, y - 6);
}

function drawCones(ctx, s) {
  for (const cam of s.cameras) {
    const disabled = s.time < cam.disabledUntil;
    const seeing = cam.lastSee > 0.2;
    ctx.save();
    conePath(ctx, cam.x, cam.y, cam.angle, CAMERA_HALF_ANGLE, cam.range);
    if (disabled) {
      ctx.fillStyle = 'rgba(140, 140, 140, 0.06)';
    } else if (seeing) {
      ctx.fillStyle = 'rgba(255, 60, 60, 0.22)';
    } else {
      ctx.fillStyle = 'rgba(255, 80, 80, 0.10)';
    }
    ctx.fill();
    ctx.strokeStyle = disabled ? 'rgba(160,160,160,0.25)' : 'rgba(255, 90, 90, 0.35)';
    ctx.stroke();
    ctx.restore();
  }
  for (const g of s.guards) {
    const chasing = g.state === 'chase';
    const suspicious = g.state === 'suspicious' || g.suspicion > 25;
    ctx.save();
    conePath(ctx, g.x, g.y, g.facing, GUARD_HALF_ANGLE, GUARD_RANGE);
    ctx.fillStyle = chasing
      ? 'rgba(255, 50, 50, 0.22)'
      : suspicious
        ? 'rgba(255, 180, 60, 0.16)'
        : 'rgba(255, 210, 90, 0.10)';
    ctx.fill();
    ctx.strokeStyle = chasing ? 'rgba(255, 70, 70, 0.4)' : 'rgba(255, 210, 90, 0.28)';
    ctx.stroke();
    ctx.restore();
  }
}

function drawGuard(ctx, g, t) {
  ctx.save();
  ctx.translate(g.x, g.y);
  if (g.state === 'chase') {
    ctx.strokeStyle = `rgba(255, 60, 60, ${0.5 + 0.4 * Math.sin(t * 8)})`;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1;
  }
  ctx.fillStyle = '#232c4a';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a5a8a';
  ctx.stroke();
  // Cap and face direction.
  ctx.fillStyle = '#a33327';
  ctx.beginPath(); ctx.arc(0, -3, 7, Math.PI, 0); ctx.fill();
  ctx.fillRect(-7, -4, 14, 3);
  ctx.fillStyle = '#e8c9a0';
  ctx.beginPath(); ctx.arc(Math.cos(g.facing) * 5, Math.sin(g.facing) * 5 - 2, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
  // Suspicion mark.
  if (g.state === 'chase') {
    ctx.fillStyle = '#ff4040';
    ctx.font = 'bold 20px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('!', g.x, g.y - 24);
  } else if (g.suspicion > 25 || g.state === 'suspicious') {
    ctx.fillStyle = '#ffcf3d';
    ctx.font = 'bold 18px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('?', g.x, g.y - 24);
  }
}

function drawThief(ctx, s) {
  const th = s.thief;
  ctx.save();
  ctx.translate(th.x, th.y);
  if (th.sneaking) {
    ctx.strokeStyle = 'rgba(120, 220, 255, 0.5)';
    ctx.setLineDash([4, 4]);
    ctx.beginPath(); ctx.arc(0, 0, 18, 0, Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.fillStyle = '#0e3a3a';
  ctx.beginPath(); ctx.arc(0, 0, 13, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#5ee6d0';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.lineWidth = 1;
  // Hood and glowing eyes, looking toward movement.
  ctx.fillStyle = '#0e3a3a';
  ctx.beginPath(); ctx.arc(0, -2, 8, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#aef7ff';
  const ex = Math.cos(th.face) * 3;
  const ey = Math.sin(th.face) * 3;
  ctx.beginPath(); ctx.arc(ex - 3, ey - 3, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.arc(ex + 3, ey - 3, 1.8, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawCameras(ctx, s) {
  for (const cam of s.cameras) {
    const disabled = s.time < cam.disabledUntil;
    const seeing = cam.lastSee > 0.2;
    ctx.save();
    ctx.translate(cam.x, cam.y);
    const mount = cameraMount(cam);
    ctx.rotate(mount === 'right' ? Math.PI : mount === 'left' ? 0 : Math.PI / 2);
    ctx.fillStyle = '#2a2f45';
    ctx.fillRect(-9, -4, 18, 8);
    ctx.strokeStyle = disabled ? '#777' : seeing ? '#ff4040' : '#c8b06a';
    ctx.lineWidth = 2;
    ctx.strokeRect(-9, -4, 18, 8);
    ctx.lineWidth = 1;
    ctx.fillStyle = disabled ? '#555' : seeing ? '#ff4040' : '#ff5d5d';
    ctx.beginPath(); ctx.arc(0, 0, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    if (disabled) {
      ctx.fillStyle = '#bbb';
      ctx.font = 'bold 10px Georgia';
      ctx.textAlign = 'center';
      ctx.fillText('OFFLINE', cam.x, cam.y + 22);
    }
  }
}

function drawCoins(ctx, s) {
  for (const coin of s.coins) {
    const age = s.time - coin.t;
    const alpha = Math.max(0, 1 - age / 3);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 6, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = '#8a6d2f';
    ctx.beginPath(); ctx.arc(coin.x, coin.y, 10, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
  for (const pulse of s.empPulses) {
    const age = s.time - pulse.t;
    const r = 40 + age * 260;
    ctx.save();
    ctx.globalAlpha = Math.max(0, 0.7 - age * 0.9);
    ctx.strokeStyle = '#7fd4ff';
    ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(pulse.x, pulse.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
  }
}

export function drawWorld(ctx, s) {
  drawFloor(ctx);
  drawShadows(ctx, s.shadowRects);
  drawCones(ctx, s);
  drawWalls(ctx, s.wallRects);
  drawCases(ctx, s.caseRects);
  drawVaultDoor(ctx, s);
  drawExit(ctx, s);
  if (s.keycard && !s.keycard.taken) {
    ctx.save();
    ctx.translate(s.keycard.x, s.keycard.y);
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#7fd4ff';
    ctx.fillStyle = '#7fd4ff';
    ctx.fillRect(-10, -6, 20, 12);
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#0b1020';
    ctx.font = 'bold 8px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText('KEY', 0, 3);
    ctx.restore();
  }
  for (const l of s.loot) {
    if (l.taken) continue;
    drawLootShape(ctx, l.kind, l.x, l.y, s.time);
    ctx.fillStyle = GOLD;
    ctx.font = '9px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(LOOT_KINDS[l.kind].label.toUpperCase(), l.x, l.y + 24);
  }
  drawCoins(ctx, s);
  for (const g of s.guards) drawGuard(ctx, g, s.time);
  drawCameras(ctx, s);
  drawThief(ctx, s);
  if (s.toast && s.time - s.toast.t < 2.4) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, 1 - (s.time - s.toast.t - 1.6) / 0.8);
    ctx.fillStyle = 'rgba(5, 8, 18, 0.85)';
    ctx.fillRect(VIEW_W / 2 - 220, HUD_H + 14, 440, 30);
    ctx.strokeStyle = GOLD;
    ctx.strokeRect(VIEW_W / 2 - 220, HUD_H + 14, 440, 30);
    ctx.fillStyle = GOLD;
    ctx.font = '14px Georgia';
    ctx.textAlign = 'center';
    ctx.fillText(s.toast.text, VIEW_W / 2, HUD_H + 34);
    ctx.restore();
  }
}

export function drawHUD(ctx, s) {
  // Top bar.
  ctx.fillStyle = '#0a0e1e';
  ctx.fillRect(0, 0, VIEW_W, HUD_H);
  ctx.fillStyle = GOLD;
  ctx.fillRect(0, HUD_H - 2, VIEW_W, 2);
  // Alarm strip along the very top edge.
  const a = s.alarm / 100;
  ctx.fillStyle = a < 0.45 ? '#3fae5a' : a < 0.75 ? '#e0a83c' : '#e04040';
  ctx.fillRect(0, 0, VIEW_W * a, 5);
  ctx.textAlign = 'left';
  ctx.fillStyle = GOLD;
  ctx.font = 'bold 17px Georgia';
  ctx.fillText('MIDNIGHT VAULT', 14, 24);
  ctx.fillStyle = '#8d8358';
  ctx.font = '13px Georgia';
  ctx.fillText(`${s.levelIndex + 1} · ${s.def.name}`, 14, 44);
  // Objective.
  ctx.textAlign = 'center';
  ctx.fillStyle = '#e8e0c0';
  ctx.font = '14px Georgia';
  ctx.fillText(s.objective, VIEW_W / 2, 26);
  ctx.fillStyle = '#8d8358';
  ctx.font = '12px Georgia';
  ctx.fillText(s.subObjective, VIEW_W / 2, 44);
  // Timer + score (column A), loot + tools (column B), alarm meter (far right).
  const mins = Math.floor(s.time / 60);
  const secs = Math.floor(s.time % 60);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#e8e0c0';
  ctx.font = 'bold 16px monospace';
  ctx.fillText(`${mins}:${String(secs).padStart(2, '0')}`, VIEW_W - 330, 24);
  ctx.font = '13px Georgia';
  ctx.fillStyle = GOLD;
  ctx.fillText(`$${s.score.toLocaleString('en-US')}`, VIEW_W - 330, 44);
  const taken = s.loot.filter((l) => l.taken).length;
  ctx.fillStyle = '#e8e0c0';
  ctx.font = '14px Georgia';
  ctx.fillText(`Loot ${taken}/${s.loot.length}`, VIEW_W - 165, 24);
  const tools = s.hasKeycard
    ? `Coins ${s.coinsLeft} · EMP ${s.empsLeft} · KEY ✓`
    : `Coins ${s.coinsLeft} · EMP ${s.empsLeft}`;
  ctx.fillText(tools, VIEW_W - 165, 44);
  // Alarm meter, top right — wide, labelled, impossible to miss.
  const bx = VIEW_W - 148;
  const by = 8;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#e8e0c0';
  ctx.font = 'bold 12px Georgia';
  ctx.fillText('ALARM', bx, by + 11);
  ctx.fillStyle = '#222a44';
  ctx.fillRect(bx + 52, by, 82, 14);
  ctx.fillStyle = a < 0.45 ? '#3fae5a' : a < 0.75 ? '#e0a83c' : '#e04040';
  ctx.fillRect(bx + 52, by, 82 * a, 14);
  ctx.strokeStyle = GOLD;
  ctx.strokeRect(bx + 52, by, 82, 14);
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 10px Georgia';
  ctx.textAlign = 'center';
  ctx.fillText(`${Math.round(s.alarm)}`, bx + 52 + 41, by + 11);
  if (s.alarm >= 100) {
    ctx.fillStyle = `rgba(224, 64, 64, ${0.5 + 0.4 * Math.sin(s.time * 8)})`;
    ctx.font = 'bold 13px Georgia';
    ctx.textAlign = 'left';
    ctx.fillText('ALARM!', bx, by + 42);
  }
}
