// Lantern Thief — the night watchmen.
// A guard walks a patrol route, watches a cone of sight in front of them,
// and reacts to what they see or hear:
//   patrol     — walks waypoints, slow, calm cone (pale yellow)
//   suspicious — saw a glimpse or heard a sound: walks over to look, cone narrows
//   chase      — clearly sees the thief: runs at them, red cone, alarm sounds
//   search     — lost the thief: prowls the last-seen spot, then gives up
//   return     — walks back to the patrol route
// Detection fills a suspicion meter (0..1). Sneaking, darkness and hedges
// slow it down; moonlight and running speed it up. A guard only ever chases
// what they can actually see, and they lose the thief behind walls.

import {
  TILE, GUARD_PATROL_SPEED, GUARD_CHASE_SPEED, GUARD_SUSPICIOUS_SPEED,
  GUARD_SIGHT, GUARD_CONE_HALF, GUARD_HEARING,
  SUSPICION_RATE, SUSPICION_DECAY, CHASE_MEMORY, SEARCH_TIME,
} from './config.js';
import { collide, hasLineOfSight, isMoonlit, isShade, inHedge } from './level.js';

function angDiff(a, b) {
  let d = a - b;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

export function createGuard(def, level) {
  const [sx, sy] = def.spawn;
  const route = def.route.map(([tx, ty]) => ({ x: (tx + 0.5) * TILE, y: (ty + 0.5) * TILE }));
  return {
    x: (sx + 0.5) * TILE,
    y: (sy + 0.5) * TILE,
    dir: 0,
    route,
    wp: 1 % route.length,
    state: 'patrol',
    suspicion: 0,
    chaseTimer: 0,
    searchTimer: 0,
    lastSeen: null,
    investigate: null,
    pauseTimer: 0,
    seesPlayer: false,
    r: 13,
  };
}

// How visible the player is to this guard right now (0 = invisible).
export function visibility(guard, player, level) {
  const dx = player.x - guard.x;
  const dy = player.y - guard.y;
  const dist = Math.hypot(dx, dy);
  if (dist > GUARD_SIGHT) return 0;
  const angle = Math.atan2(dy, dx);
  if (Math.abs(angDiff(angle, guard.dir)) > GUARD_CONE_HALF) return 0;
  if (!hasLineOfSight(level, guard.x, guard.y, player.x, player.y)) return 0;
  // Hidden inside a hedge unless the guard is almost on top of them.
  if (inHedge(level, player.x, player.y) && dist > 55) return 0;
  let v = 1 - dist / GUARD_SIGHT; // closer = easier to spot
  if (player.sneaking) v *= 0.45;
  if (isShade(level, player.x, player.y)) v *= 0.55;
  if (isMoonlit(level, player.x, player.y)) v *= 1.6;
  if (!player.sneaking && player.moving) v *= 1.25;
  return Math.min(1.4, Math.max(0, v));
}

function moveToward(guard, level, tx, ty, speed, dt) {
  const dx = tx - guard.x;
  const dy = ty - guard.y;
  const d = Math.hypot(dx, dy);
  if (d < 4) return true;
  const step = Math.min(d, speed * dt);
  const nx = guard.x + (dx / d) * step;
  const ny = guard.y + (dy / d) * step;
  const pos = collide(level, nx, ny, guard.r);
  guard.x = pos.x;
  guard.y = pos.y;
  guard.dir = Math.atan2(dy, dx);
  return d < 8;
}

export function updateGuard(guard, player, level, dt, events) {
  const vis = visibility(guard, player, level);
  guard.seesPlayer = vis > 0.12;

  if (guard.seesPlayer) {
    const before = guard.suspicion;
    guard.suspicion = Math.min(1, guard.suspicion + SUSPICION_RATE * vis * dt);
    guard.lastSeen = { x: player.x, y: player.y };
    if (before < 0.35 && guard.suspicion >= 0.35 && guard.state === 'patrol') {
      events.push({ type: 'suspicious', guard });
    }
    if (guard.suspicion >= 1 && guard.state !== 'chase') {
      guard.state = 'chase';
      guard.chaseTimer = CHASE_MEMORY;
      events.push({ type: 'alarm', guard });
    }
  } else {
    guard.suspicion = Math.max(0, guard.suspicion - SUSPICION_DECAY * dt);
  }

  switch (guard.state) {
    case 'patrol': {
      if (guard.suspicion >= 0.35 && guard.suspicion < 1) {
        guard.state = 'suspicious';
        guard.investigate = guard.lastSeen ? { ...guard.lastSeen } : null;
        break;
      }
      if (guard.pauseTimer > 0) {
        guard.pauseTimer -= dt;
        break;
      }
      const target = guard.route[guard.wp];
      if (moveToward(guard, level, target.x, target.y, GUARD_PATROL_SPEED, dt)) {
        guard.wp = (guard.wp + 1) % guard.route.length;
        guard.pauseTimer = 1.1; // glance around at each waypoint
      }
      break;
    }
    case 'suspicious': {
      if (guard.suspicion >= 1) break; // chase takes over above
      if (guard.suspicion < 0.2) {
        guard.state = 'return';
        guard.investigate = null;
        break;
      }
      const dest = guard.investigate ?? guard.lastSeen;
      if (dest) {
        if (moveToward(guard, level, dest.x, dest.y, GUARD_SUSPICIOUS_SPEED, dt)) {
          guard.pauseTimer = 1.4;
          guard.state = 'search';
          guard.searchTimer = SEARCH_TIME;
        }
      } else {
        guard.state = 'return';
      }
      break;
    }
    case 'chase': {
      if (guard.seesPlayer) {
        guard.chaseTimer = CHASE_MEMORY;
        guard.lastSeen = { x: player.x, y: player.y };
      } else {
        guard.chaseTimer -= dt;
      }
      const dest = guard.lastSeen ?? { x: player.x, y: player.y };
      moveToward(guard, level, dest.x, dest.y, GUARD_CHASE_SPEED, dt);
      if (guard.chaseTimer <= 0) {
        guard.state = 'search';
        guard.searchTimer = SEARCH_TIME;
      }
      break;
    }
    case 'search': {
      guard.searchTimer -= dt;
      if (guard.searchTimer <= 0 || guard.suspicion < 0.05) {
        guard.state = 'return';
        break;
      }
      // Prowl around the last-seen spot in a slow circle.
      const t = performance.now() / 1000;
      const cx = (guard.lastSeen?.x ?? guard.x) + Math.cos(t * 0.7) * 55;
      const cy = (guard.lastSeen?.y ?? guard.y) + Math.sin(t * 0.7) * 55;
      moveToward(guard, level, cx, cy, GUARD_SUSPICIOUS_SPEED * 0.7, dt);
      break;
    }
    case 'return': {
      // Walk back to the nearest waypoint, then resume the patrol.
      let best = 0;
      let bestD = Infinity;
      guard.route.forEach((wp, i) => {
        const d = Math.hypot(wp.x - guard.x, wp.y - guard.y);
        if (d < bestD) { bestD = d; best = i; }
      });
      if (moveToward(guard, level, guard.route[best].x, guard.route[best].y, GUARD_PATROL_SPEED, dt)) {
        guard.wp = (best + 1) % guard.route.length;
        guard.state = 'patrol';
      }
      break;
    }
  }

  // A running thief is heard nearby: the guard turns to investigate.
  if (player.moving && !player.sneaking) {
    const d = Math.hypot(player.x - guard.x, player.y - guard.y);
    if (d < GUARD_HEARING && guard.state === 'patrol' && !guard.seesPlayer) {
      guard.suspicion = Math.max(guard.suspicion, 0.35);
      guard.investigate = { x: player.x, y: player.y };
      guard.lastSeen = { x: player.x, y: player.y };
      guard.state = 'suspicious';
    }
  }
}

// A pebble landing pulls a guard's attention to the sound.
export function distractGuard(guard, x, y) {
  if (guard.state === 'chase') return;
  const d = Math.hypot(x - guard.x, y - guard.y);
  if (d < 320) {
    guard.investigate = { x, y };
    guard.lastSeen = { x, y };
    guard.suspicion = Math.max(guard.suspicion, 0.4);
    guard.state = 'suspicious';
  }
}
