// MIDNIGHT VAULT — full-screen states (menu, intro, pause, caught, victory)
// and the star rule. All text is drawn on the canvas so the screenshots carry it.

import { VIEW_W, VIEW_H } from './levels.js';

const GOLD = '#d8c98a';

// Stars: 3 for a fast, quiet job; 2 for a decent one; 1 for getting out at all.
export function starsFor(time, par, peakAlarm) {
  if (time <= par && peakAlarm < 45) return 3;
  if (time <= par * 1.5 && peakAlarm < 80) return 2;
  return 1;
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.92)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = GOLD;
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 1;
}

function centred(ctx, text, y, font, color) {
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.fillText(text, VIEW_W / 2, y);
}

function starRow(ctx, stars, y, size = 40) {
  ctx.font = `${size}px Georgia`;
  ctx.textAlign = 'center';
  let row = '';
  for (let i = 0; i < 3; i++) row += i < stars ? '★' : '☆';
  ctx.fillStyle = GOLD;
  ctx.fillText(row, VIEW_W / 2, y);
}

export function drawMenu(ctx, t) {
  ctx.fillStyle = '#070a14';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  // A faint vault door behind the title.
  ctx.strokeStyle = 'rgba(216, 201, 138, 0.25)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.arc(VIEW_W / 2, 300, 150, 0, Math.PI * 2); ctx.stroke();
  ctx.beginPath(); ctx.arc(VIEW_W / 2, 300, 110, 0, Math.PI * 2); ctx.stroke();
  ctx.lineWidth = 1;
  centred(ctx, 'MIDNIGHT VAULT', 240, 'bold 64px Georgia', GOLD);
  centred(ctx, 'a quiet heist in three rooms', 280, 'italic 20px Georgia', '#8d8358');
  centred(ctx, 'Slip past the guards. Blind the cameras. Take the loot.', 360, '19px Georgia', '#e8e0c0');
  centred(ctx, 'Get out clean — the alarm is watching.', 390, '19px Georgia', '#e8e0c0');
  centred(ctx, 'WASD / arrows — move      Shift — sneak', 470, '16px Georgia', '#c9c9c9');
  centred(ctx, 'Click — throw a coin (guards come to look)', 500, '16px Georgia', '#c9c9c9');
  centred(ctx, 'E — EMP pulse (cameras off 6 s, but it makes noise)', 530, '16px Georgia', '#c9c9c9');
  centred(ctx, 'R — restart      P — pause      M — mute', 560, '16px Georgia', '#c9c9c9');
  if (Math.floor(t * 1.6) % 2 === 0) {
    centred(ctx, 'Press ENTER or click to begin', 650, 'bold 22px Georgia', '#ffd94d');
  }
  centred(ctx, '3 rooms · guards with vision cones · sweeping cameras · one getaway', 730, '14px Georgia', '#8d8358');
}

export function drawIntro(ctx, def, levelIndex) {
  panel(ctx, VIEW_W / 2 - 340, 240, 680, 300);
  centred(ctx, `ROOM ${levelIndex + 1} OF 3`, 290, 'bold 16px Georgia', '#8d8358');
  centred(ctx, def.name, 340, 'bold 40px Georgia', GOLD);
  centred(ctx, def.sub, 385, '16px Georgia', '#e8e0c0');
  centred(ctx, `${def.guards.length} guards · ${def.cameras.length} cameras · ${def.loot.length} loot · par ${def.par}s`, 430, '15px Georgia', '#c9c9c9');
  centred(ctx, `Tools: ${def.coins} coins · ${def.emps} EMP pulses`, 460, '15px Georgia', '#c9c9c9');
  centred(ctx, 'Press ENTER to begin', 510, 'bold 19px Georgia', '#ffd94d');
}

export function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 8, 18, 0.7)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  centred(ctx, 'PAUSED', 400, 'bold 48px Georgia', GOLD);
  centred(ctx, 'P — resume      R — restart the room', 460, '18px Georgia', '#e8e0c0');
}

export function drawCaught(ctx, stats) {
  panel(ctx, VIEW_W / 2 - 320, 260, 640, 260);
  centred(ctx, 'CAUGHT!', 330, 'bold 52px Georgia', '#ff5d5d');
  centred(ctx, 'A guard got hands on you. The vault keeps its secrets.', 380, '17px Georgia', '#e8e0c0');
  centred(ctx, `Loot taken ${stats.lootTaken}/${stats.lootTotal} · alarm peaked at ${Math.round(stats.peakAlarm)}`, 425, '15px Georgia', '#c9c9c9');
  centred(ctx, 'R — try the room again', 480, 'bold 19px Georgia', '#ffd94d');
}

export function drawLevelClear(ctx, stats) {
  panel(ctx, VIEW_W / 2 - 340, 230, 680, 340);
  centred(ctx, 'GETAWAY CLEAN', 300, 'bold 44px Georgia', '#3cdc78');
  starRow(ctx, stats.stars, 360, 44);
  centred(ctx, `Time ${stats.timeText}  (par ${stats.par}s)`, 415, '17px Georgia', '#e8e0c0');
  centred(ctx, `Loot $${stats.score.toLocaleString('en-US')} · alarm peaked at ${Math.round(stats.peakAlarm)}`, 450, '16px Georgia', '#c9c9c9');
  centred(ctx, stats.nextText, 520, 'bold 19px Georgia', '#ffd94d');
}

export function drawGameClear(ctx, totalStars, totalScore) {
  panel(ctx, VIEW_W / 2 - 360, 220, 720, 360);
  centred(ctx, 'THE VAULT IS YOURS', 300, 'bold 44px Georgia', GOLD);
  starRow(ctx, Math.round(totalStars / 3), 360, 44);
  centred(ctx, `${totalStars} of 9 stars across three rooms`, 415, '18px Georgia', '#e8e0c0');
  centred(ctx, `Total take: $${totalScore.toLocaleString('en-US')}`, 450, '18px Georgia', '#e8e0c0');
  centred(ctx, 'No alarms that mattered. No one saw your face.', 490, '16px Georgia', '#8d8358');
  centred(ctx, 'ENTER — run it all again', 540, 'bold 19px Georgia', '#ffd94d');
}
