// Lantern Thief — level parsing, tiles, collision and line of sight.
// The level is a grid of characters (see config.js). Walls and hedges block
// sight; hedges also hide the player when they stand inside one.

import { TILE } from './config.js';

export function parseLevel(def) {
  const rows = def.map.length;
  const cols = def.map[0].length;
  const tiles = [];
  const lanterns = [];
  let playerStart = { x: TILE * 1.5, y: TILE * 1.5 };
  let exit = { x: TILE * 17.5, y: TILE * 12.5 };
  for (let y = 0; y < rows; y++) {
    tiles[y] = [];
    for (let x = 0; x < cols; x++) {
      const c = def.map[y][x] ?? '#';
      tiles[y][x] = c;
      const cx = (x + 0.5) * TILE;
      const cy = (y + 0.5) * TILE;
      if (c === 'P') playerStart = { x: cx, y: cy };
      if (c === 'E') exit = { x: cx, y: cy };
      if (c === 'L') lanterns.push({ x: cx, y: cy, taken: false });
    }
  }
  return { tiles, rows, cols, lanterns, playerStart, exit, name: def.name, brief: def.brief };
}

export function tileAt(level, px, py) {
  const tx = Math.floor(px / TILE);
  const ty = Math.floor(py / TILE);
  if (tx < 0 || ty < 0 || tx >= level.cols || ty >= level.rows) return '#';
  return level.tiles[ty][tx];
}

export function isSolid(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'H';
}

export function blocksSight(level, px, py) {
  const t = tileAt(level, px, py);
  return t === '#' || t === 'H';
}

export function isShade(level, px, py) {
  return tileAt(level, px, py) === ',';
}

export function isMoonlit(level, px, py) {
  return tileAt(level, px, py) === '*';
}

export function inHedge(level, px, py) {
  return tileAt(level, px, py) === 'H';
}

// Circle-vs-tiles collision: slide along walls. Returns corrected position.
export function collide(level, x, y, r) {
  let nx = x;
  let ny = y;
  const probe = (px, py) =>
    isSolid(level, px - r, py - r) || isSolid(level, px + r, py - r) ||
    isSolid(level, px - r, py + r) || isSolid(level, px + r, py + r);
  if (!probe(nx, y)) x = nx;
  else {
    // try sliding on x alone in small steps
    const step = Math.sign(nx - x) * 2;
    let tx = x;
    while (Math.abs(tx - nx) > 0.5 && !probe(tx + step, y)) tx += step;
    x = tx;
  }
  if (!probe(x, ny)) y = ny;
  else {
    const step = Math.sign(ny - y) * 2;
    let ty = y;
    while (Math.abs(ty - ny) > 0.5 && !probe(x, ty + step)) ty += step;
    y = ty;
  }
  return { x, y };
}

// Line of sight: sample along the segment; blocked by walls and hedges.
export function hasLineOfSight(level, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (TILE / 3)));
  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    if (blocksSight(level, ax + dx * t, ay + dy * t)) return false;
  }
  return true;
}

// Distance from a point to the nearest wall along a ray (for vision cones).
export function raycast(level, ax, ay, angle, maxDist) {
  const step = 6;
  const dx = Math.cos(angle) * step;
  const dy = Math.sin(angle) * step;
  let x = ax;
  let y = ay;
  let d = 0;
  while (d < maxDist) {
    x += dx;
    y += dy;
    d += step;
    if (blocksSight(level, x, y)) return d;
  }
  return maxDist;
}
