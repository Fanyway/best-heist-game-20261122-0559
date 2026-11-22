// MIDNIGHT VAULT — guard AI: patrols, vision cones, suspicion, chase, search,
// and investigating thrown coins. A guard never sees through walls or cases.

import { tileCentre } from './levels.js';

export const GUARD_RANGE = 250;
export const GUARD_HALF_ANGLE = 0.61; // ~35 degrees
export const PATROL_SPEED = 68;
export const CHASE_SPEED = 138;
export const CATCH_DIST = 26;

// Smallest absolute difference between two angles, in radians.
export function angleDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return Math.abs(d);
}

// True when the segment between two points crosses any solid pixel rect.
export function segmentBlocked(x1, y1, x2, y2, solids) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / 12));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const px = x1 + dx * t;
    const py = y1 + dy * t;
    for (const r of solids) {
      if (px >= r.x && px < r.x + r.w && py >= r.y && py < r.y + r.h) return true;
    }
  }
  return false;
}

// Move a circle (x, y, radius) by (dx, dy), sliding along solid rects.
export function moveCircle(pos, dx, dy, radius, solids) {
  let nx = pos.x + dx;
  for (const r of solids) {
    if (nx + radius > r.x && nx - radius < r.x + r.w &&
        pos.y + radius > r.y && pos.y - radius < r.y + r.h) {
      nx = dx > 0 ? r.x - radius : r.x + r.w + radius;
    }
  }
  let ny = pos.y + dy;
  for (const r of solids) {
    if (nx + radius > r.x && nx - radius < r.x + r.w &&
        ny + radius > r.y && ny - radius < r.y + r.h) {
      ny = dy > 0 ? r.y - radius : r.y + r.h + radius;
    }
  }
  pos.x = nx;
  pos.y = ny;
}

export function makeGuard(def, index) {
  const start = tileCentre(def.x, def.y);
  return {
    id: index,
    x: start.x,
    y: start.y,
    radius: 13,
    facing: 0,
    state: 'patrol', // patrol | suspicious | chase | investigate | search | return
    suspicion: 0,
    waypoint: 1,
    wait: 0,
    path: def.path.map((p) => tileCentre(p.x, p.y)),
    lastSeen: null,
    loseTimer: 0,
    searchTimer: 0,
    investigateTimer: 0,
    coinTarget: null,
  };
}

// How clearly this guard sees the thief right now: 0 = not seen, 1 = fully seen.
// world: { solids, thiefHidden } where thiefHidden means the thief stands in shadow.
export function guardSees(g, thief, solids, thiefHidden) {
  const dx = thief.x - g.x;
  const dy = thief.y - g.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_RANGE) return 0;
  const ang = Math.atan2(dy, dx);
  if (angleDiff(ang, g.facing) > GUARD_HALF_ANGLE) return 0;
  if (segmentBlocked(g.x, g.y, thief.x, thief.y, solids)) return 0;
  if (thiefHidden && dist > 95) return 0;
  let factor = 1 - (dist / GUARD_RANGE) * 0.6;
  if (thiefHidden) factor *= 0.35;
  return Math.max(0.15, factor);
}

// Advance one guard. world: { thief, solids, coins, dt }.
// thief: { x, y, sneaking, running }. coins: [{ x, y, t }] active thrown coins.
// Returns { caught, alarmPush, seeing } for the alarm meter and game-over check.
export function updateGuard(g, dt, world) {
  const { thief, solids, coins } = world;
  const events = { caught: false, alarmPush: 0, seeing: 0 };
  const hidden = world.thiefHidden;

  // A nearby thrown coin pulls the guard away from its patrol.
  if (g.state !== 'chase') {
    for (const coin of coins) {
      if (Math.hypot(coin.x - g.x, coin.y - g.y) < 280) {
        g.state = 'investigate';
        g.coinTarget = { x: coin.x, y: coin.y };
        g.investigateTimer = 3.5;
        g.suspicion = Math.max(g.suspicion, 30);
        break;
      }
    }
  }

  const seen = guardSees(g, thief, solids, hidden);
  events.seeing = seen;
  if (seen > 0) {
    let rate = 60 * seen;
    if (thief.sneaking) rate *= 0.55;
    if (thief.running) rate *= 1.35;
    g.suspicion = Math.min(100, g.suspicion + rate * dt);
    g.lastSeen = { x: thief.x, y: thief.y };
    g.loseTimer = 0;
    if (g.suspicion >= 100 && g.state !== 'chase') {
      g.state = 'chase';
      events.alarmPush += 25;
    } else if (g.state === 'patrol' || g.state === 'return') {
      g.state = 'suspicious';
    }
  } else {
    g.suspicion = Math.max(0, g.suspicion - 22 * dt);
    if (g.state === 'suspicious' && g.suspicion < 25) g.state = 'return';
  }

  const stepToward = (tx, ty, speed) => {
    const dx = tx - g.x;
    const dy = ty - g.y;
    const d = Math.hypot(dx, dy);
    if (d < 4) return true;
    const s = Math.min(speed * dt, d);
    g.facing = Math.atan2(dy, dx);
    moveCircle(g, (dx / d) * s, (dy / d) * s, g.radius, solids);
    return false;
  };

  if (g.state === 'patrol') {
    const target = g.path[g.waypoint];
    if (g.wait > 0) {
      g.wait -= dt;
      g.facing += dt * 0.6; // look around while waiting
    } else if (stepToward(target.x, target.y, PATROL_SPEED)) {
      g.waypoint = (g.waypoint + 1) % g.path.length;
      g.wait = 0.8;
    }
  } else if (g.state === 'suspicious') {
    if (g.lastSeen) {
      stepToward(g.lastSeen.x, g.lastSeen.y, PATROL_SPEED * 1.15);
      g.facing = Math.atan2(g.lastSeen.y - g.y, g.lastSeen.x - g.x);
    }
  } else if (g.state === 'chase') {
    if (seen > 0) {
      g.lastSeen = { x: thief.x, y: thief.y };
      g.loseTimer = 0;
    } else {
      g.loseTimer += dt;
      if (g.loseTimer > 2.5) {
        g.state = 'search';
        g.searchTimer = 3;
      }
    }
    if (g.lastSeen) stepToward(g.lastSeen.x, g.lastSeen.y, CHASE_SPEED);
    if (Math.hypot(thief.x - g.x, thief.y - g.y) < CATCH_DIST) events.caught = true;
  } else if (g.state === 'investigate') {
    g.investigateTimer -= dt;
    if (g.coinTarget) {
      const arrived = stepToward(g.coinTarget.x, g.coinTarget.y, PATROL_SPEED * 1.2);
      if (arrived || g.investigateTimer <= 0) {
        g.state = 'return';
        g.coinTarget = null;
      }
    }
  } else if (g.state === 'search') {
    g.searchTimer -= dt;
    g.facing += dt * 1.8;
    if (g.searchTimer <= 0) g.state = 'return';
  } else if (g.state === 'return') {
    // Walk back to the nearest patrol waypoint, then resume the route.
    let best = 0;
    let bestD = Infinity;
    g.path.forEach((p, i) => {
      const d = Math.hypot(p.x - g.x, p.y - g.y);
      if (d < bestD) { bestD = d; best = i; }
    });
    if (stepToward(g.path[best].x, g.path[best].y, PATROL_SPEED)) {
      g.waypoint = (best + 1) % g.path.length;
      g.state = 'patrol';
    }
  }
  return events;
}
