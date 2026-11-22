// MIDNIGHT VAULT — level data: rooms, walls, cover, loot, patrols, cameras.
// All positions are in tiles (1 tile = 40 px). The playfield is 32 x 20 tiles;
// the canvas HUD occupies the top 60 px, so tile (tx, ty) centres at
// (tx * 40 + 20, 60 + ty * 40 + 20). The outer border is always a wall.
// Rects: { x, y, w, h } in tiles. Guards walk their waypoint list in order.
// Cameras sit on a wall and sweep: angle is in radians, 0 = east, PI/2 = south.

export const TILE = 40;
export const COLS = 32;
export const ROWS = 20;
export const HUD_H = 60;
export const VIEW_W = 1280;
export const VIEW_H = 860;

export const LOOT_KINDS = {
  mask: { label: 'Golden Mask', value: 500, color: '#ffd94d' },
  vase: { label: 'Jade Vase', value: 300, color: '#5ee6a0' },
  gold: { label: 'Gold Bars', value: 800, color: '#ffcf3d' },
  cash: { label: 'Cash Stack', value: 400, color: '#9be26a' },
  diamonds: { label: 'Diamonds', value: 600, color: '#7fd4ff' },
  crown: { label: 'Midnight Crown', value: 900, color: '#ffb347' },
  painting: { label: 'Starlit Painting', value: 500, color: '#e58cff' },
  ruby: { label: 'Ruby Idol', value: 600, color: '#ff5d73' },
  scroll: { label: 'Ancient Scroll', value: 350, color: '#e8d9a0' },
};

export const LEVELS = [
  {
    name: 'Gallery After Dark',
    sub: 'Two guards, one camera — lift the mask and the vase, then slip out.',
    par: 75,
    coins: 2,
    emps: 1,
    thief: { x: 2, y: 17 },
    exit: { x: 30, y: 17 },
    keycard: null,
    vaultDoor: null,
    walls: [
      { x: 12, y: 3, w: 8, h: 1 },
      { x: 12, y: 9, w: 8, h: 1 },
      { x: 5, y: 13, w: 1, h: 5 },
    ],
    cases: [
      { x: 7, y: 5, w: 2, h: 1 },
      { x: 23, y: 5, w: 2, h: 1 },
      { x: 7, y: 15, w: 2, h: 1 },
      { x: 23, y: 15, w: 2, h: 1 },
      { x: 15, y: 15, w: 2, h: 1 },
    ],
    shadows: [
      { x: 1, y: 1, w: 3, h: 2 },
      { x: 27, y: 7, w: 3, h: 2 },
      { x: 1, y: 15, w: 3, h: 2 },
      { x: 17, y: 1, w: 2, h: 2 },
    ],
    loot: [
      { x: 28, y: 2, kind: 'mask' },
      { x: 25, y: 14, kind: 'vase' },
    ],
    guards: [
      { x: 16, y: 1, path: [{ x: 16, y: 1 }, { x: 27, y: 1 }, { x: 27, y: 6 }, { x: 16, y: 6 }] },
      { x: 8, y: 16, path: [{ x: 8, y: 16 }, { x: 8, y: 11 }, { x: 20, y: 11 }, { x: 20, y: 16 }] },
    ],
    cameras: [
      { x: 16, y: 0, angle: Math.PI / 2, sweep: 0.96, range: 280, speed: 0.5 },
    ],
  },
  {
    name: 'The Bank Vault',
    sub: 'Three guards, two cameras — the keycard opens the vault. Gold is inside.',
    par: 100,
    coins: 2,
    emps: 2,
    thief: { x: 2, y: 17 },
    exit: { x: 30, y: 17 },
    keycard: { x: 3, y: 2 },
    vaultDoor: { x: 24, y: 4, w: 1, h: 1 },
    walls: [
      { x: 10, y: 4, w: 10, h: 1 },
      { x: 10, y: 10, w: 10, h: 1 },
      { x: 4, y: 13, w: 1, h: 5 },
      { x: 24, y: 1, w: 1, h: 3 },
      { x: 24, y: 5, w: 1, h: 2 },
      { x: 24, y: 7, w: 7, h: 1 },
    ],
    cases: [
      { x: 6, y: 6, w: 2, h: 1 },
      { x: 20, y: 6, w: 2, h: 1 },
      { x: 6, y: 15, w: 2, h: 1 },
      { x: 20, y: 15, w: 2, h: 1 },
      { x: 14, y: 16, w: 2, h: 1 },
    ],
    shadows: [
      { x: 1, y: 1, w: 3, h: 2 },
      { x: 28, y: 8, w: 2, h: 2 },
      { x: 1, y: 16, w: 3, h: 2 },
      { x: 16, y: 1, w: 2, h: 2 },
    ],
    loot: [
      { x: 28, y: 3, kind: 'gold' },
      { x: 15, y: 12, kind: 'cash' },
      { x: 6, y: 17, kind: 'diamonds' },
    ],
    guards: [
      { x: 15, y: 2, path: [{ x: 15, y: 2 }, { x: 22, y: 2 }, { x: 22, y: 7 }, { x: 15, y: 7 }] },
      { x: 8, y: 15, path: [{ x: 8, y: 15 }, { x: 8, y: 11 }, { x: 18, y: 11 }, { x: 18, y: 15 }] },
      { x: 26, y: 12, path: [{ x: 26, y: 12 }, { x: 26, y: 16 }, { x: 29, y: 16 }] },
    ],
    cameras: [
      { x: 15, y: 0, angle: Math.PI / 2, sweep: 0.87, range: 280, speed: 0.55 },
      { x: 31, y: 10, angle: Math.PI, sweep: 0.79, range: 260, speed: 0.45 },
    ],
  },
  {
    name: 'The Museum of Midnight',
    sub: 'Four guards, three cameras — the crown waits behind the vault door.',
    par: 120,
    coins: 3,
    emps: 2,
    thief: { x: 2, y: 17 },
    exit: { x: 30, y: 17 },
    keycard: { x: 3, y: 2 },
    vaultDoor: { x: 24, y: 4, w: 1, h: 1 },
    walls: [
      { x: 8, y: 3, w: 7, h: 1 },
      { x: 18, y: 3, w: 7, h: 1 },
      { x: 8, y: 9, w: 7, h: 1 },
      { x: 18, y: 9, w: 7, h: 1 },
      { x: 15, y: 13, w: 1, h: 5 },
      { x: 24, y: 1, w: 1, h: 3 },
      { x: 24, y: 5, w: 1, h: 2 },
      { x: 24, y: 7, w: 7, h: 1 },
    ],
    cases: [
      { x: 5, y: 5, w: 2, h: 1 },
      { x: 20, y: 5, w: 2, h: 1 },
      { x: 5, y: 15, w: 2, h: 1 },
      { x: 20, y: 15, w: 2, h: 1 },
      { x: 11, y: 16, w: 2, h: 1 },
      { x: 27, y: 10, w: 2, h: 1 },
    ],
    shadows: [
      { x: 1, y: 1, w: 3, h: 2 },
      { x: 28, y: 8, w: 2, h: 2 },
      { x: 1, y: 16, w: 3, h: 2 },
      { x: 17, y: 1, w: 2, h: 2 },
      { x: 10, y: 11, w: 2, h: 1 },
    ],
    loot: [
      { x: 28, y: 3, kind: 'crown' },
      { x: 15, y: 6, kind: 'painting' },
      { x: 6, y: 17, kind: 'ruby' },
      { x: 22, y: 17, kind: 'scroll' },
    ],
    guards: [
      { x: 14, y: 1, path: [{ x: 14, y: 1 }, { x: 22, y: 1 }, { x: 22, y: 6 }, { x: 14, y: 6 }] },
      { x: 7, y: 14, path: [{ x: 7, y: 14 }, { x: 7, y: 10 }, { x: 16, y: 10 }, { x: 16, y: 14 }] },
      { x: 26, y: 12, path: [{ x: 26, y: 12 }, { x: 26, y: 16 }, { x: 29, y: 16 }] },
      { x: 10, y: 18, path: [{ x: 10, y: 18 }, { x: 20, y: 18 }] },
    ],
    cameras: [
      { x: 15, y: 0, angle: Math.PI / 2, sweep: 0.96, range: 280, speed: 0.6 },
      { x: 31, y: 8, angle: Math.PI, sweep: 0.7, range: 260, speed: 0.5 },
      { x: 0, y: 12, angle: 0, sweep: 0.7, range: 260, speed: 0.4 },
    ],
  },
];

// Tile centre in canvas pixels.
export function tileCentre(tx, ty) {
  return { x: tx * TILE + TILE / 2, y: HUD_H + ty * TILE + TILE / 2 };
}

// Pixel rect of a tile rect.
export function tileRect(r) {
  return { x: r.x * TILE, y: HUD_H + r.y * TILE, w: r.w * TILE, h: r.h * TILE };
}

// True when a point in canvas pixels lies inside any of the given tile rects.
export function pointInTileRects(px, py, rects) {
  for (const r of rects) {
    const q = tileRect(r);
    if (px >= q.x && px < q.x + q.w && py >= q.y && py < q.y + q.h) return true;
  }
  return false;
}

// Validate a level definition: rects inside the room, entities on open tiles,
// and every loot/keycard/exit reachable from the thief start by flood fill.
export function validateLevel(def) {
  const errors = [];
  const solid = [...def.walls, ...def.cases];
  if (def.vaultDoor) solid.push(def.vaultDoor);
  const tileSolid = (tx, ty) => {
    if (tx < 0 || ty < 0 || tx >= COLS || ty >= ROWS) return true;
    for (const r of solid) {
      if (tx >= r.x && tx < r.x + r.w && ty >= r.y && ty < r.y + r.h) return true;
    }
    return false;
  };
  const checkTile = (tx, ty, what) => {
    if (tileSolid(tx, ty)) errors.push(`${what} at (${tx},${ty}) sits inside a wall or case`);
  };
  for (const r of [...def.walls, ...def.cases, ...def.shadows]) {
    if (r.x < 0 || r.y < 0 || r.x + r.w > COLS || r.y + r.h > ROWS) {
      errors.push(`rect ${JSON.stringify(r)} leaves the room`);
    }
  }
  checkTile(def.thief.x, def.thief.y, 'thief start');
  checkTile(def.exit.x, def.exit.y, 'exit');
  for (const l of def.loot) checkTile(l.x, l.y, `loot ${l.kind}`);
  if (def.keycard) checkTile(def.keycard.x, def.keycard.y, 'keycard');
  for (const g of def.guards) {
    checkTile(g.x, g.y, 'guard start');
    for (const p of g.path) checkTile(p.x, p.y, 'guard waypoint');
  }
  // Flood fill from the thief start over open tiles.
  const seen = new Set([`${def.thief.x},${def.thief.y}`]);
  const queue = [[def.thief.x, def.thief.y]];
  while (queue.length) {
    const [cx, cy] = queue.pop();
    for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
      if (tileSolid(nx, ny) || seen.has(`${nx},${ny}`)) continue;
      seen.add(`${nx},${ny}`);
      queue.push([nx, ny]);
    }
  }
  const reachable = (tx, ty) => seen.has(`${tx},${ty}`);
  for (const l of def.loot) {
    if (!reachable(l.x, l.y)) errors.push(`loot ${l.kind} at (${l.x},${l.y}) is unreachable`);
  }
  if (def.keycard && !reachable(def.keycard.x, def.keycard.y)) errors.push('keycard is unreachable');
  if (!reachable(def.exit.x, def.exit.y)) errors.push('exit is unreachable');
  if (def.vaultDoor) {
    // The vault loot must be reachable once the door opens: pretend the door is open.
    const doorKey = `${def.vaultDoor.x},${def.vaultDoor.y}`;
    const seen2 = new Set(seen);
    seen2.add(doorKey);
    const q2 = [[def.vaultDoor.x, def.vaultDoor.y]];
    while (q2.length) {
      const [cx, cy] = q2.pop();
      for (const [nx, ny] of [[cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]]) {
        if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) continue;
        if (tileSolid(nx, ny) && !(nx === def.vaultDoor.x && ny === def.vaultDoor.y)) continue;
        if (seen2.has(`${nx},${ny}`)) continue;
        seen2.add(`${nx},${ny}`);
        q2.push([nx, ny]);
      }
    }
    for (const l of def.loot) {
      if (!seen2.has(`${l.x},${l.y}`)) errors.push(`loot ${l.kind} is unreachable even with the vault open`);
    }
  }
  return errors;
}
