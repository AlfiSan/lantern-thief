// Lantern Thief — keyboard and mouse input.
// WASD / arrows to move, Shift to sneak, E or click to toss a pebble,
// P or Esc to pause, Enter / Space to start or advance.

export function createInput(canvas) {
  const keys = new Set();
  const state = {
    keys,
    pebbleQueued: false,
    pebbleTarget: null,
    pausePressed: false,
    confirmPressed: false,
    anyKeyPressed: false,
  };

  const MOVE_KEYS = ['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'];

  window.addEventListener('keydown', (e) => {
    if (MOVE_KEYS.includes(e.code) || e.code === 'Space') e.preventDefault();
    if (!e.repeat) {
      state.anyKeyPressed = true;
      if (e.code === 'KeyE') state.pebbleQueued = true;
      if (e.code === 'KeyP' || e.code === 'Escape') state.pausePressed = true;
      if (e.code === 'Enter' || e.code === 'Space') state.confirmPressed = true;
    }
    keys.add(e.code);
  });
  window.addEventListener('keyup', (e) => keys.delete(e.code));
  window.addEventListener('blur', () => keys.clear());

  canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    state.pebbleTarget = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    state.pebbleQueued = true;
  });

  return state;
}

export function moveVector(input) {
  let x = 0;
  let y = 0;
  const k = input.keys;
  if (k.has('KeyA') || k.has('ArrowLeft')) x -= 1;
  if (k.has('KeyD') || k.has('ArrowRight')) x += 1;
  if (k.has('KeyW') || k.has('ArrowUp')) y -= 1;
  if (k.has('KeyS') || k.has('ArrowDown')) y += 1;
  if (x !== 0 && y !== 0) {
    x *= Math.SQRT1_2;
    y *= Math.SQRT1_2;
  }
  return { x, y };
}

export function isSneaking(input) {
  return input.keys.has('ShiftLeft') || input.keys.has('ShiftRight');
}
