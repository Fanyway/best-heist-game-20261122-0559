// MIDNIGHT VAULT — security cameras: wall-mounted, sweeping detection cones.
// A camera never catches the thief itself; it feeds the alarm meter. An EMP
// pulse knocks nearby cameras offline for a few seconds — at a cost in alarm.

import { tileCentre, HUD_H } from './levels.js';
import { angleDiff, segmentBlocked } from './guards.js';

export const CAMERA_HALF_ANGLE = 0.47; // ~27 degrees

export function makeCamera(def, index) {
  const pos = tileCentre(def.x, def.y);
  return {
    id: index,
    x: pos.x,
    y: pos.y,
    baseAngle: def.angle,
    angle: def.angle,
    sweep: def.sweep,
    range: def.range,
    speed: def.speed,
    phase: index * 1.7,
    disabledUntil: 0,
  };
}

// Sweep the camera head. t is seconds since the level started.
export function updateCamera(cam, dt, t) {
  cam.angle = cam.baseAngle + Math.sin(t * cam.speed + cam.phase) * cam.sweep;
}

// How clearly this camera sees the thief: 0 = not seen, 1 = fully seen.
// now is the level clock; a disabled camera sees nothing.
export function cameraSees(cam, thief, solids, thiefHidden, now) {
  if (now < cam.disabledUntil) return 0;
  const dx = thief.x - cam.x;
  const dy = thief.y - cam.y;
  const dist = Math.hypot(dx, dy);
  if (dist > cam.range) return 0;
  const ang = Math.atan2(dy, dx);
  if (angleDiff(ang, cam.angle) > CAMERA_HALF_ANGLE) return 0;
  if (segmentBlocked(cam.x, cam.y, thief.x, thief.y, solids)) return 0;
  if (thiefHidden && dist > 140) return 0;
  let factor = 1 - (dist / cam.range) * 0.5;
  if (thiefHidden) factor *= 0.5;
  return Math.max(0.2, factor);
}

// Knock out every camera within radius of (x, y) for `seconds`.
// Returns how many cameras went offline.
export function disableCameras(cameras, x, y, radius, seconds, now) {
  let count = 0;
  for (const cam of cameras) {
    if (Math.hypot(cam.x - x, cam.y - y) <= radius) {
      cam.disabledUntil = now + seconds;
      count += 1;
    }
  }
  return count;
}

// A camera is drawn on the wall edge it mounts to: pick the nearest room edge.
export function cameraMount(cam) {
  if (cam.y <= HUD_H + 30) return 'top';
  if (cam.x >= 1250) return 'right';
  if (cam.x <= 30) return 'left';
  return 'top';
}
