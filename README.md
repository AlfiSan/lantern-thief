# Lantern Thief — a stealth game

Wren, a small hooded thief, slips through a moonlit manor garden at night.
Pocket every moon-lantern on the level, then leave through the garden gate —
without ever being seen by the night watch.

## How to play

- **WASD / arrow keys** — move. **Shift** — sneak (slower, quieter, harder to spot).
- **E or mouse click** — toss a pebble to pull a guard toward the sound.
- **P / Esc** — pause. **M** — mute. **Enter** — start / continue.
- Hide in **hedges**: a guard cannot see you inside one unless they are almost
  on top of you. **Shade** (dark ground) hides you; **moonlight** exposes you.
- A guard's **vision cone** is pale yellow while calm, orange while suspicious
  (with a `?` and a suspicion meter overhead), red while chasing (with a `!`).
  A full suspicion meter means the guard gives chase. If a chasing guard
  touches you, the level restarts. Running footsteps are heard nearby.
- Three gardens, one clean getaway. Score: 250 per lantern, plus a time bonus
  for escaping.

## Screenshots

The four screenshots under `screenshots/` are real renders of this game's own
code in a desktop browser, taken with `?shot=<scene>` opening a fixed scene:

1. `1-title.jpg` — the title screen (`?shot=title`)
2. `2-patrol.jpg` — sneaking past a patrol, vision cones visible (`?shot=patrol`)
3. `3-spotted.jpg` — caught in the moonlight, guard giving chase (`?shot=spotted`)
4. `4-hidden.jpg` — hidden in a hedge while a suspicious guard walks by (`?shot=hidden`)

## Files

- `game/index.html` — the game page (loads `game/src/*.js`, no network requests)
- `game/src/config.js` — constants and the three level maps
- `game/src/level.js` — tiles, collision, line of sight, raycasting
- `game/src/input.js` — keyboard and mouse
- `game/src/player.js` — the thief: movement, sneaking, pebbles, pickups
- `game/src/guard.js` — the watchmen: patrol, suspicion, chase, search
- `game/src/render.js` — all drawing: garden, cones, entities, night lighting, HUD
- `game/src/audio.js` — procedural WebAudio sounds (no audio files)
- `game/src/main.js` — game loop and states (title, playing, paused, caught, won)
- `main.ts` — the hand-in program: copies `game/` + `screenshots/` to `/output`
  and writes `dossier.json` with `vendor/makefun-game.ts`
- `serve.ts` — local static server (`node serve.ts` → http://localhost:8080)
- `shots.json` — the screenshot list

## Play locally

```
node serve.ts
# open http://localhost:8080 in a desktop browser
```

## License

MIT — see `LICENSE`.
