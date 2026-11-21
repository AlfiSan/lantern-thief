// Lantern Thief — the player: Wren, the hooded lantern thief.
// Walks with WASD/arrows, sneaks with Shift (slower, quieter, harder to
// see), tosses pebbles with E or a mouse click to pull guards away.
// Picking up a moon-lantern lights it; the garden gate only opens once
// every lantern on the level is pocketed.

import { TILE, PLAYER_SPEED, PLAYER_SNEAK_SPEED, PEBBLES_START } from './config.js';
import { collide, inHedge } from './level.js';
import { moveVector, isSneaking } from './input.js';

export function createPlayer(start) {
  return {
    x: start.x,
    y: start.y,
    r: 12,
    facing: 0,
    moving: false,
    sneaking: false,
    hidden: false,
    pebbles: PEBBLES_START,
    pebbleCooldown: 0,
    stepPhase: 0,
  };
}

export function updatePlayer(player, input, level, dt, events) {
  const mv = moveVector(input);
  player.moving = mv.x !== 0 || mv.y !== 0;
  player.sneaking = isSneaking(input);
  if (player.moving) {
    player.facing = Math.atan2(mv.y, mv.x);
    const speed = player.sneaking ? PLAYER_SNEAK_SPEED : PLAYER_SPEED;
    const pos = collide(level, player.x + mv.x * speed * dt, player.y + mv.y * speed * dt, player.r);
    player.x = pos.x;
    player.y = pos.y;
    player.stepPhase += dt * (player.sneaking ? 5 : 9);
    events.push({ type: 'step', sneaking: player.sneaking });
  }
  player.hidden = inHedge(level, player.x, player.y);
  player.pebbleCooldown = Math.max(0, player.pebbleCooldown - dt);

  if (input.pebbleQueued) {
    input.pebbleQueued = false;
    if (player.pebbles > 0 && player.pebbleCooldown <= 0) {
      player.pebbles -= 1;
      player.pebbleCooldown = 0.45;
      let tx;
      let ty;
      if (input.pebbleTarget) {
        // Clicked a spot: the pebble flies there (clamped to a short throw).
        const dx = input.pebbleTarget.x - player.x;
        const dy = input.pebbleTarget.y - player.y;
        const d = Math.hypot(dx, dy);
        const maxThrow = 190;
        const s = d > maxThrow ? maxThrow / d : 1;
        tx = player.x + dx * s;
        ty = player.y + dy * s;
        input.pebbleTarget = null;
      } else {
        // E key: toss it ahead of the thief.
        tx = player.x + Math.cos(player.facing) * 170;
        ty = player.y + Math.sin(player.facing) * 170;
      }
      const landing = collide(level, tx, ty, 4);
      events.push({ type: 'pebble', x: landing.x, y: landing.y });
    }
  }
}

// Lantern pickup: returns the lantern taken, if the thief is close enough.
export function tryPickup(player, level) {
  for (const lantern of level.lanterns) {
    if (!lantern.taken && Math.hypot(lantern.x - player.x, lantern.y - player.y) < TILE * 0.75) {
      lantern.taken = true;
      return lantern;
    }
  }
  return null;
}

export function lanternsLeft(level) {
  return level.lanterns.filter((l) => !l.taken).length;
}

export function atExit(player, level) {
  return Math.hypot(level.exit.x - player.x, level.exit.y - player.y) < TILE * 0.7;
}
