// Lantern Thief — the game loop and its states.
// title → playing → (caught → retry) / (level clear → next level) → won.
// A level is won by pocketing every moon-lantern and reaching the garden
// gate. Getting caught by a guard restarts the level. The timer is per
// level; running out of time also restarts it.
// ?shot=<name> opens a fixed, deterministic scene for screenshots:
//   title, patrol, spotted, hidden, win.

import { VIEW_W, VIEW_H, LEVELS, TILE } from './config.js';
import { parseLevel } from './level.js';
import { createInput } from './input.js';
import { createPlayer, updatePlayer, tryPickup, lanternsLeft, atExit } from './player.js';
import { createGuard, updateGuard, distractGuard } from './guard.js';
import { drawWorld, drawHUD } from './render.js';
import { createAudio } from './audio.js';

const LEVEL_TIME = 180; // seconds per level

export function startGame(canvas) {
  const ctx = canvas.getContext('2d');
  const input = createInput(canvas);
  const audio = createAudio();
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');

  const game = {
    state: 'title',
    levelIndex: 0,
    level: null,
    guards: [],
    player: null,
    pebbles: [],
    ripples: [],
    score: 0,
    timeLeft: LEVEL_TIME,
    message: '',
    messageTimer: 0,
    caughtTimer: 0,
    flash: 0,
    levelIntro: 0,
  };
  game.lanternsLeft = 0;

  function loadLevel(i) {
    game.levelIndex = i;
    game.level = parseLevel(LEVELS[i]);
    game.player = createPlayer(game.level.playerStart);
    game.guards = LEVELS[i].guards.map((g) => createGuard(g, game.level));
    game.pebbles = [];
    game.ripples = [];
    game.timeLeft = LEVEL_TIME;
    game.lanternsLeft = game.level.lanterns.length;
    game.levelIntro = 2.4;
    game.state = 'playing';
  }

  function restartLevel() {
    loadLevel(game.levelIndex);
  }

  function setupShot(name) {
    loadLevel(name === 'win' ? 0 : name === 'spotted' ? 0 : 0);
    const p = game.player;
    const g0 = game.guards[0];
    const g1 = game.guards[1];
    if (name === 'title') {
      game.state = 'title';
    } else if (name === 'patrol') {
      // Thief crouched inside a hedge while a guard patrols past, cone visible.
      p.x = 6.5 * TILE; p.y = 3.5 * TILE; p.sneaking = true; p.hidden = true;
      g0.x = 12.5 * TILE; g0.y = 3.5 * TILE; g0.dir = Math.PI;
      g1.x = 13.5 * TILE; g1.y = 10.5 * TILE; g1.dir = 0;
    } else if (name === 'spotted') {
      // Caught in the open, moonlit: guard mid-chase, red cone, alarm banner.
      p.x = 12.5 * TILE; p.y = 3.5 * TILE;
      g0.x = 10.5 * TILE; g0.y = 3.5 * TILE; g0.dir = 0;
      g0.state = 'chase'; g0.suspicion = 1; g0.lastSeen = { x: p.x, y: p.y };
      g1.x = 9.5 * TILE; g1.y = 8.5 * TILE; g1.dir = -Math.PI / 2; g1.suspicion = 0.7;
    } else if (name === 'hidden') {
      // Hidden inside a hedge; a guard walks by, suspicious, '?' overhead.
      p.x = 6.5 * TILE; p.y = 3.5 * TILE; p.hidden = true; p.sneaking = true;
      g0.x = 10.5 * TILE; g0.y = 3.5 * TILE; g0.dir = Math.PI;
      g0.state = 'suspicious'; g0.suspicion = 0.6;
      g0.investigate = { x: 6.5 * TILE, y: 3.5 * TILE };
      game.level.lanterns[0].taken = true;
      game.lanternsLeft = game.level.lanterns.length - 1;
    } else if (name === 'win') {
      // All lanterns pocketed, gate open, thief one step from leaving.
      for (const l of game.level.lanterns) l.taken = true;
      game.lanternsLeft = 0;
      p.x = game.level.exit.x - 55; p.y = game.level.exit.y;
      g0.x = 13.5 * TILE; g0.y = 10.5 * TILE; g0.dir = Math.PI / 2;
      g1.x = 5.5 * TILE; g1.y = 6.5 * TILE; g1.dir = 0;
      game.score = 2450;
    }
    game.levelIntro = 0;
    game.shotFrozen = true;
  }

  function update(dt) {
    // Shot scenes are frozen tableaus: they render one fixed moment.
    if (game.shotFrozen) return;
    if (game.state === 'title') {
      if (input.confirmPressed) {
        input.confirmPressed = false;
        audio.unlock();
        audio.click();
        loadLevel(0);
      }
      return;
    }
    if (game.state === 'won' || game.state === 'gameover') {
      if (input.confirmPressed) {
        input.confirmPressed = false;
        audio.click();
        if (game.state === 'gameover') restartLevel();
        else { game.score = 0; loadLevel(0); }
      }
      return;
    }
    if (game.state === 'caught') {
      game.caughtTimer -= dt;
      if (game.caughtTimer <= 0) restartLevel();
      return;
    }
    if (game.state !== 'playing') return;

    if (input.pausePressed) {
      input.pausePressed = false;
      game.state = 'paused';
      return;
    }
    if (game.levelIntro > 0) game.levelIntro -= dt;

    game.timeLeft -= dt;
    if (game.timeLeft <= 0) {
      game.state = 'caught';
      game.message = 'Out of time — the watch changed shifts!';
      game.caughtTimer = 2.2;
      audio.caught();
      return;
    }

    const events = [];
    updatePlayer(game.player, input, game.level, dt, events);
    for (const e of events) {
      if (e.type === 'step') audio.step(e.sneaking);
      if (e.type === 'pebble') {
        audio.pebble();
        game.pebbles.push({ x: e.x, y: e.y, age: 0 });
        game.ripples.push({ x: e.x, y: e.y, age: 0, life: 0.9 });
        for (const g of game.guards) distractGuard(g, e.x, e.y);
        setTimeout(() => audio.pebbleLand(), 180);
      }
    }
    for (const p of game.pebbles) p.age += dt;
    game.pebbles = game.pebbles.filter((p) => p.age < 25);
    for (const r of game.ripples) r.age += dt;
    game.ripples = game.ripples.filter((r) => r.age < r.life);

    const taken = tryPickup(game.player, game.level);
    if (taken) {
      audio.lantern();
      game.lanternsLeft = lanternsLeft(game.level);
      game.score += 250;
      game.message = game.lanternsLeft === 0
        ? 'All lanterns pocketed — reach the gate!'
        : `Lantern pocketed! ${game.lanternsLeft} left.`;
      game.messageTimer = 2.2;
    }

    const guardEvents = [];
    for (const g of game.guards) updateGuard(g, game.player, game.level, dt, guardEvents);
    for (const e of guardEvents) {
      if (e.type === 'suspicious') audio.suspicious();
      if (e.type === 'alarm') { audio.alarm(); game.flash = 0.5; }
    }

    // Caught: a chasing guard touches the thief.
    for (const g of game.guards) {
      if (g.state === 'chase' && Math.hypot(g.x - game.player.x, g.y - game.player.y) < 24) {
        game.state = 'caught';
        game.message = 'Caught by the night watch!';
        game.caughtTimer = 2.2;
        audio.caught();
        return;
      }
    }

    if (game.lanternsLeft === 0 && atExit(game.player, game.level)) {
      game.score += Math.round(game.timeLeft) * 5 + 500;
      audio.win();
      if (game.levelIndex + 1 < LEVELS.length) {
        game.message = 'Escaped! On to the next garden…';
        game.messageTimer = 2.0;
        loadLevel(game.levelIndex + 1);
      } else {
        game.state = 'won';
      }
    }

    if (game.messageTimer > 0) game.messageTimer -= dt;
    if (game.flash > 0) game.flash -= dt;
  }

  function draw(time) {
    if (game.state === 'title') {
      drawTitle(ctx, time);
      return;
    }
    if (!game.level) return;
    drawWorld(ctx, game, time);
    drawHUD(ctx, game);

    if (game.state === 'paused') {
      overlay(ctx, 'Paused', 'Press P to keep sneaking', 'rgba(8, 12, 16, 0.72)');
      return;
    }
    if (game.levelIntro > 0 && game.state === 'playing') {
      ctx.fillStyle = `rgba(8, 12, 16, ${Math.min(0.8, game.levelIntro)})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
      ctx.fillStyle = '#ffd977';
      ctx.font = 'bold 30px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.level.name, VIEW_W / 2, VIEW_H / 2 - 12);
      ctx.fillStyle = '#f2e3c2';
      ctx.font = '16px sans-serif';
      ctx.fillText(game.level.brief, VIEW_W / 2, VIEW_H / 2 + 22);
    }
    if (game.messageTimer > 0 && game.message) {
      ctx.fillStyle = 'rgba(8, 12, 10, 0.8)';
      const w = ctx.measureText(game.message).width + 36;
      ctx.fillRect(VIEW_W / 2 - w / 2, VIEW_H - 64, w, 30);
      ctx.fillStyle = '#ffe9a8';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(game.message, VIEW_W / 2, VIEW_H - 44);
    }
    if (game.state === 'caught') {
      overlay(ctx, game.message || 'Caught!', 'The level starts over…', 'rgba(60, 8, 6, 0.78)');
    }
    if (game.state === 'won') {
      overlay(ctx, 'Clean getaway!', `Every lantern stolen. Final score: ${game.score}`, 'rgba(8, 20, 12, 0.8)', 'Press Enter to play again');
    }
    if (game.state === 'gameover') {
      overlay(ctx, 'The watch wins this night', 'Press Enter to try again', 'rgba(20, 8, 8, 0.8)');
    }
    if (game.flash > 0) {
      ctx.fillStyle = `rgba(255, 40, 20, ${game.flash * 0.25})`;
      ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    }
  }

  function overlay(ctx, title, sub, bg, sub2) {
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    ctx.fillStyle = '#f2e3c2';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(title, VIEW_W / 2, VIEW_H / 2 - 8);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#c9c2ae';
    ctx.fillText(sub, VIEW_W / 2, VIEW_H / 2 + 26);
    if (sub2) ctx.fillText(sub2, VIEW_W / 2, VIEW_H / 2 + 52);
  }

  function drawTitle(ctx, time) {
    ctx.fillStyle = '#0b120d';
    ctx.fillRect(0, 0, VIEW_W, VIEW_H);
    // A moonlit garden behind the title: a few glowing lanterns and hedges.
    const flicker = 0.7 + Math.sin(time * 1.6) * 0.3;
    for (let i = 0; i < 5; i++) {
      const x = 120 + i * 180;
      const y = 430 + Math.sin(i * 2.1) * 24;
      const g = ctx.createRadialGradient(x, y, 2, x, y, 60);
      g.addColorStop(0, `rgba(255, 205, 100, ${0.5 * flicker})`);
      g.addColorStop(1, 'rgba(255, 205, 100, 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(x, y, 60, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffd977';
      ctx.beginPath();
      ctx.arc(x, y, 9, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#f2e3c2';
    ctx.font = 'bold 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('A  S T E A L T H  G A M E', VIEW_W / 2, 130);
    ctx.fillStyle = '#ffd977';
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText('Lantern Thief', VIEW_W / 2, 210);
    ctx.fillStyle = '#c9c2ae';
    ctx.font = '17px sans-serif';
    ctx.fillText('Slip through the manor garden. Pocket every moon-lantern.', VIEW_W / 2, 258);
    ctx.fillText('Dodge the watchmen’s cones of light. Leave through the gate, unseen.', VIEW_W / 2, 286);
    ctx.fillStyle = '#9fc98f';
    ctx.font = 'bold 16px sans-serif';
    const blink = 0.6 + Math.sin(time * 3) * 0.4;
    ctx.globalAlpha = blink;
    ctx.fillText('Press Enter to begin', VIEW_W / 2, 350);
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#8a938a';
    ctx.font = '13px sans-serif';
    ctx.fillText('WASD / arrows — move · Shift — sneak · E / click — toss a pebble · P — pause · M — mute', VIEW_W / 2, 540);
    ctx.fillText('Hide in hedges. Moonlight exposes you; shade hides you. Three gardens, one clean getaway.', VIEW_W / 2, 564);
  }

  // Pause toggle lives here so the paused state can resume.
  window.addEventListener('keydown', (e) => {
    if ((e.code === 'KeyP' || e.code === 'Escape') && game.state === 'paused') {
      game.state = 'playing';
      input.pausePressed = false;
    }
    if (e.code === 'KeyM') audio.toggleMute();
  });

  if (shot) {
    setupShot(shot);
  } else {
    game.state = 'title';
  }
  // Expose a tiny hook for play-testing and screenshots (not part of play).
  window.__lanternThief = game;

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    update(dt);
    draw(now / 1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
