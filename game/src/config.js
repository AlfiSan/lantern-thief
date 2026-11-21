// Lantern Thief — configuration and level data.
// A top-down stealth game: Wren, a small hooded thief, slips through a
// moonlit manor garden at night, pockets the three moon-lanterns and leaves
// through the garden gate without ever being seen.

export const TILE = 40; // pixels per tile
export const VIEW_W = 960;
export const VIEW_H = 640;

export const PLAYER_SPEED = 150; // px/s walking
export const PLAYER_SNEAK_SPEED = 80; // px/s while sneaking (Shift)
export const GUARD_PATROL_SPEED = 62;
export const GUARD_CHASE_SPEED = 148;
export const GUARD_SUSPICIOUS_SPEED = 95;

// How far a guard can spot the player, in px, before light modifiers.
export const GUARD_SIGHT = 235;
export const GUARD_CONE_HALF = 0.62; // radians, ~35 degrees each side
export const GUARD_HEARING = 150; // px: running footsteps are heard inside this

// Suspicion fills 0..1 while the player is seen; 1 means the guard gives chase.
export const SUSPICION_RATE = 1.35; // per second, fully seen, close and lit
export const SUSPICION_DECAY = 0.22; // per second while unseen
export const CHASE_MEMORY = 4.5; // seconds a guard keeps chasing after losing sight
export const SEARCH_TIME = 6; // seconds a guard searches the last-seen spot

export const PEBBLES_START = 3;

// Tile legend (levels below):
//   # wall / fence   . garden floor   , dark shade (harder to spot)
//   * moonlit patch (easier to spot)  H hedge (cover: blocks sight, hides you)
//   L moon-lantern   E garden gate (exit)   P player start   G guard spawn
// Guard patrol routes are listed per level (tile coords, looped).

export const LEVELS = [
  {
    name: 'I — The Rose Garden',
    brief: 'Pocket all 3 moon-lanterns, then slip out through the garden gate.',
    map: [
      '####################',
      '#P....,....H....L..#',
      '#..##....####...##.#',      '#..##.H........H...#',
      '#......####.####...#',
      '#.H....#......#..L.#',
      '#......#..**..#.##.#',
      '#..####....##......#',
      '#..#....H....#..H..#',
      '#..#..####...#.....#',
      '#.....#....#....##.#',
      '#.L...#..H....#....#',
      '#.....,....##....E.#',
      '#..####..#......#..#',
      '#......H....H......#',
      '####################',
    ],
    guards: [
      { spawn: [2, 1], route: [[2, 1], [5, 1], [5, 4], [2, 4]] },
      { spawn: [15, 5], route: [[15, 5], [18, 5], [18, 14], [15, 14]] },
      { spawn: [1, 10], route: [[1, 10], [5, 10], [5, 12], [1, 12]] },
    ],
  },
  {
    name: 'II — The Statue Court',
    brief: 'Three lanterns now, and the watch walks in pairs. Mind the moonlight.',
    map: [
      '####################',
      '#P....H....*....L..#',
      '#..##....####..##..#',
      '#..##.H......H.....#',
      '#.....,..####......#',
      '#.H....#......#..H.#',
      '#..##..#..**..#....#',
      '#......#......#.##.#',
      '#..####....##......#',
      '#..#....H....#..L..#',
      '#..#..####...#.....#',
      '#.....#....#....##.#',
      '#.L...#..H....#....#',
      '#.....,....##....E.#',
      '#..####..#..H......#',
      '####################',
    ],
    guards: [
      { spawn: [2, 1], route: [[2, 1], [5, 1], [5, 4], [2, 4]] },
      { spawn: [15, 3], route: [[15, 3], [18, 3], [18, 14], [15, 14]] },
      { spawn: [8, 5], route: [[8, 5], [13, 5], [13, 7], [8, 7]] },
      { spawn: [1, 11], route: [[1, 11], [5, 11], [5, 13], [1, 13]] },
    ],
  },
  {
    name: 'III — The Moonlit Archive',
    brief: 'The last lanterns hang by the archive wall. Four lanterns, four watchmen.',
    map: [
      '####################',
      '#P...H....*.....L..#',
      '#..##...####...##..#',
      '#..##.H......H.....#',
      '#......####.####...#',
      '#.H...#........#.L.#',
      '#....#...**...#....#',
      '#.##.#..####..#.##.#',
      '#....#........#....#',
      '#..####..H..###..H.#',
      '#..#....####......##',
      '#..#..H......#..L..#',
      '#.....####...#.....#',
      '#.L...#..H....#...##',
      '#.....,....##....E.#',
      '####################',
    ],
    guards: [
      { spawn: [14, 1], route: [[14, 1], [18, 1], [18, 3], [14, 3]] },
      { spawn: [7, 5], route: [[7, 5], [13, 5], [13, 8], [7, 8]] },
      { spawn: [15, 6], route: [[15, 6], [18, 6], [18, 8], [15, 8]] },
      { spawn: [14, 10], route: [[14, 10], [17, 10], [17, 12], [14, 12]] },
    ],
  },
];
