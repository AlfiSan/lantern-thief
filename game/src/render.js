// Lantern Thief — all drawing: the moonlit garden, the watchmen and their
// vision cones, the thief, the lanterns and the gate, plus the HUD.
// The scene is drawn in layers: floor, cover and walls, vision cones
// (raycast against walls so the cone stops at cover), entities, then a
// night overlay with holes of light around lanterns, the thief and the gate.

import { TILE, VIEW_W, VIEW_H, GUARD_SIGHT, GUARD_CONE_HALF } from './config.js';
import { raycast } from './level.js';

const FLOOR_A = '#1d2b1f';
const FLOOR_B = '#1a271c';
const SHADE = '#16211a';
const MOON = '#2c3d2a';
const WALL = '#3d3226';
const WALL_TOP = '#57493a';

function conePolygon(level, gx, gy, dir, dist, half) {
  const points = [{ x: gx, y: gy }];
  const rays = 26;
  for (let i = 0; i <= rays; i++) {
    const a = dir - half + (2 * half * i) / rays;
    const d = raycast(level, gx, gy, a, dist);
    points.push({ x: gx + Math.cos(a) * d, y: gy + Math.sin(a) * d });
  }
  return points;
}

function drawCone(ctx, level, guard, dist) {
  const pts = conePolygon(level, guard.x, guard.y, guard.dir, dist, GUARD_CONE_HALF);
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.closePath();
  const alert = guard.state === 'chase';
  const wary = guard.state === 'suspicious' || guard.state === 'search';
  ctx.fillStyle = alert
    ? 'rgba(255, 64, 48, 0.42)'
    : wary
      ? 'rgba(255, 176, 32, 0.36)'
      : 'rgba(255, 222, 110, 0.30)';
  ctx.fill();
  ctx.strokeStyle = alert ? 'rgba(255, 90, 70, 0.65)' : 'rgba(255, 224, 120, 0.45)';
  ctx.lineWidth = 1;
  ctx.stroke();
}

function drawGuard(ctx, guard, time) {
  // Body: a night watchman in a dark blue coat with a brass lantern.
  ctx.save();
  ctx.translate(guard.x, guard.y);
  ctx.rotate(guard.dir);
  ctx.fillStyle = '#2c3e5e';
  ctx.beginPath();
  ctx.arc(0, 0, 13, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#d8b25c';
  ctx.fillRect(4, -4, 12, 8); // brass lantern held ahead
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(16, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1c2a44';
  ctx.beginPath();
  ctx.arc(-4, 0, 7, 0, Math.PI * 2); // cap
  ctx.fill();
  ctx.restore();

  // Suspicion meter above the guard's head.
  if (guard.suspicion > 0.05) {
    const w = 30;
    const x = guard.x - w / 2;
    const y = guard.y - 26;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(x - 1, y - 1, w + 2, 7);
    ctx.fillStyle = guard.suspicion >= 1 ? '#ff4030' : guard.suspicion >= 0.35 ? '#ffb020' : '#ffe06a';
    ctx.fillRect(x, y, w * guard.suspicion, 5);
    if (guard.state === 'chase') {
      ctx.fillStyle = '#ff5040';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('!', guard.x, guard.y - 32);
    } else if (guard.suspicion >= 0.35) {
      ctx.fillStyle = '#ffb020';
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('?', guard.x, guard.y - 32);
    }
  }
  void time;
}

function drawPlayer(ctx, player, time) {
  const bob = player.moving ? Math.sin(player.stepPhase) * 1.5 : 0;
  ctx.save();
  ctx.translate(player.x, player.y + bob * 0.3);
  // Hooded cloak, deep teal, with a pale face in the hood.
  ctx.rotate(player.facing);
  ctx.fillStyle = player.hidden ? 'rgba(38, 122, 102, 0.75)' : '#2f8f7a';
  ctx.beginPath();
  ctx.moveTo(13, 0);
  ctx.lineTo(-9, -10);
  ctx.lineTo(-12, 0);
  ctx.lineTo(-9, 10);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#123b32';
  ctx.beginPath();
  ctx.arc(2, 0, 7.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f2e3c2';
  ctx.beginPath();
  ctx.arc(5, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Soft glow of the thief's own small lantern.
  const g = ctx.createRadialGradient(player.x, player.y, 2, player.x, player.y, 46);
  g.addColorStop(0, 'rgba(255, 214, 120, 0.20)');
  g.addColorStop(1, 'rgba(255, 214, 120, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(player.x, player.y, 46, 0, Math.PI * 2);
  ctx.fill();
  void time;
}

function drawLantern(ctx, lantern, time) {
  const pulse = 0.75 + Math.sin(time * 2.4 + lantern.x) * 0.25;
  const g = ctx.createRadialGradient(lantern.x, lantern.y, 2, lantern.x, lantern.y, 52);
  g.addColorStop(0, `rgba(255, 205, 100, ${0.45 * pulse})`);
  g.addColorStop(1, 'rgba(255, 205, 100, 0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y, 52, 0, Math.PI * 2);
  ctx.fill();
  // Paper lantern: warm round body on a small stand.
  ctx.fillStyle = '#8a6a2f';
  ctx.fillRect(lantern.x - 2, lantern.y + 8, 4, 8);
  ctx.fillStyle = '#ffd977';
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#c98f2e';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(lantern.x, lantern.y, 6, 0, Math.PI * 2);
  ctx.stroke();
}

export function drawWorld(ctx, game, time) {
  const { level, guards, player, pebbles, ripples } = game;
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);

  // Floor.
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      const t = level.tiles[y][x];
      const px = x * TILE;
      const py = y * TILE;
      if (t === '#') continue;
      ctx.fillStyle = (x + y) % 2 === 0 ? FLOOR_A : FLOOR_B;
      if (t === ',') ctx.fillStyle = SHADE;
      if (t === '*') ctx.fillStyle = MOON;
      ctx.fillRect(px, py, TILE, TILE);
      if (t === '*') {
        ctx.fillStyle = 'rgba(255, 244, 190, 0.08)';
        ctx.fillRect(px + 4, py + 4, TILE - 8, TILE - 8);
      }
      if (t === ',') {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
        ctx.fillRect(px, py, TILE, TILE);
      }
    }
  }

  // Exit gate: a wrought-iron arch on the east wall.
  const ex = level.exit;
  const gateOpen = game.lanternsLeft === 0;
  ctx.save();
  ctx.translate(ex.x, ex.y);
  ctx.fillStyle = gateOpen ? '#ffd977' : '#6b5a44';
  ctx.fillRect(-14, -18, 28, 36);
  ctx.fillStyle = '#10160f';
  ctx.fillRect(-10, -14, 20, 28);
  ctx.strokeStyle = gateOpen ? '#ffe9a8' : '#3a2f22';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, -18, 14, Math.PI, 0);
  ctx.stroke();
  if (gateOpen) {
    ctx.fillStyle = '#ffe9a8';
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('OPEN', 0, 30);
  }
  ctx.restore();

  // Lanterns still hanging.
  for (const l of level.lanterns) if (!l.taken) drawLantern(ctx, l, time);

  // Hedges (cover) drawn over the floor.
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if (level.tiles[y][x] !== 'H') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = '#2c4a26';
      ctx.fillRect(px + 1, py + 1, TILE - 2, TILE - 2);
      ctx.fillStyle = '#3a5f30';
      ctx.beginPath();
      ctx.arc(px + 12, py + 14, 9, 0, Math.PI * 2);
      ctx.arc(px + 27, py + 12, 10, 0, Math.PI * 2);
      ctx.arc(px + 20, py + 27, 9, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // Walls.
  for (let y = 0; y < level.rows; y++) {
    for (let x = 0; x < level.cols; x++) {
      if (level.tiles[y][x] !== '#') continue;
      const px = x * TILE;
      const py = y * TILE;
      ctx.fillStyle = WALL;
      ctx.fillRect(px, py, TILE, TILE);
      ctx.fillStyle = WALL_TOP;
      ctx.fillRect(px, py, TILE, 5);
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.fillRect(px, py + TILE - 4, TILE, 4);
    }
  }

  // Vision cones are drawn twice: once under the entities for depth, and
  // once over the night overlay so they stay bright and readable.
  for (const guard of guards) {
    const dist = guard.state === 'chase' ? GUARD_SIGHT * 1.05 : GUARD_SIGHT;
    drawCone(ctx, level, guard, dist);
  }

  // Pebbles in flight / lying, with their sound ripples.
  for (const p of pebbles) {
    ctx.fillStyle = '#b9b3a4';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const r of ripples) {
    ctx.strokeStyle = `rgba(255, 230, 150, ${0.55 * (1 - r.age / r.life)})`;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x, r.y, 6 + (r.age / r.life) * 46, 0, Math.PI * 2);
    ctx.stroke();
  }

  for (const guard of guards) drawGuard(ctx, guard, time);
  drawPlayer(ctx, player, time);

  // Night overlay: darkness everywhere except around lights.
  ctx.save();
  ctx.fillStyle = 'rgba(6, 10, 18, 0.30)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.globalCompositeOperation = 'destination-out';
  const holes = [];
  for (const l of level.lanterns) if (!l.taken) holes.push([l.x, l.y, 85]);
  holes.push([player.x, player.y, 110]);
  holes.push([ex.x, ex.y, 75]);
  for (const guard of guards) holes.push([guard.x, guard.y, 95]);
  for (const [hx, hy, hr] of holes) {
    const g = ctx.createRadialGradient(hx, hy, 4, hx, hy, hr);
    g.addColorStop(0, 'rgba(0,0,0,1)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(hx, hy, hr, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Second cone pass over the night overlay: the cones must read at a glance.
  for (const guard of guards) {
    const dist = guard.state === 'chase' ? GUARD_SIGHT * 1.05 : GUARD_SIGHT;
    drawCone(ctx, level, guard, dist);
  }
}

export function drawHUD(ctx, game) {
  const { level, player, levelIndex, score, timeLeft } = game;
  ctx.fillStyle = 'rgba(8, 12, 10, 0.78)';
  ctx.fillRect(0, 0, VIEW_W, 34);
  ctx.fillStyle = '#f2e3c2';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(`${level.name}`, 12, 22);
  ctx.textAlign = 'center';
  const left = game.lanternsLeft;
  const total = level.lanterns.length;
  ctx.fillStyle = '#ffd977';
  ctx.fillText(`🏮 ${total - left}/${total} lanterns`, VIEW_W / 2 - 60, 22);
  ctx.fillStyle = '#b9b3a4';
  ctx.fillText(`🪨 ${player.pebbles} pebbles`, VIEW_W / 2 + 70, 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f2e3c2';
  ctx.fillText(`Score ${score}`, VIEW_W - 110, 22);
  ctx.fillStyle = timeLeft < 30 ? '#ff7050' : '#9fc98f';
  ctx.fillText(`${Math.ceil(timeLeft)}s`, VIEW_W - 12, 22);

  // Hints along the bottom.
  ctx.fillStyle = 'rgba(8, 12, 10, 0.6)';
  ctx.fillRect(0, VIEW_H - 24, VIEW_W, 24);
  ctx.fillStyle = '#c9c2ae';
  ctx.font = '12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(
    'WASD / arrows — move    Shift — sneak    E / click — toss a pebble    P — pause    M — mute',
    VIEW_W / 2,
    VIEW_H - 8,
  );

  // Alert banner when any guard is chasing.
  const chasing = game.guards.some((g) => g.state === 'chase');
  if (chasing) {
    ctx.fillStyle = 'rgba(180, 20, 10, 0.85)';
    ctx.fillRect(VIEW_W / 2 - 90, 44, 180, 26);
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 14px sans-serif';
    ctx.fillText('SPOTTED — RUN!', VIEW_W / 2, 62);
  } else if (player.hidden) {
    ctx.fillStyle = 'rgba(30, 90, 60, 0.85)';
    ctx.fillRect(VIEW_W / 2 - 110, 44, 220, 26);
    ctx.fillStyle = '#dff5e6';
    ctx.font = 'bold 13px sans-serif';
    ctx.fillText('Hidden in the hedge', VIEW_W / 2, 62);
  }
  void levelIndex;
}
