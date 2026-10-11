// Keyboard input with "pressed this frame" tracking.

const BIND = {
  left: ['KeyA', 'ArrowLeft'],
  right: ['KeyD', 'ArrowRight'],
  up: ['KeyW', 'ArrowUp'],
  down: ['KeyS', 'ArrowDown'],
  jump: ['Space'],
  sprint: ['ShiftLeft', 'ShiftRight'],
  roll: ['KeyC'],
  attack: ['KeyX'],
  interact: ['KeyF', 'Enter'],
  back: ['KeyQ'],
  forward: ['KeyE'],
  peek: ['Tab'],
  inventory: ['KeyI'],
  pause: ['Escape', 'KeyP'],
  controls: ['KeyH'],
  hint: ['KeyG'],
  seal: ['KeyR'],
  echo: ['KeyV'],
  // Tempo's own buttons on touch (virtual codes: no physical key sends them)
  slow: ['TempoSlow'],
  fast: ['TempoFast'],
};

class Input {
  constructor() {
    this.down = new Set();
    this.pressed = new Set();
    this.enabled = true;
    // analog stick from the touch controls (-1..1); zero when unused
    this.axis = { x: 0, z: 0 };
    window.addEventListener('keydown', (e) => {
      if (['Space', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
      if (!this.down.has(e.code)) this.pressed.add(e.code);
      this.down.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.down.delete(e.code));
    window.addEventListener('blur', () => this.down.clear());
  }
  /** Virtual key press / release, used by the on-screen touch controls. */
  press(code) {
    if (!this.down.has(code)) this.pressed.add(code);
    this.down.add(code);
  }
  release(code) {
    this.down.delete(code);
  }
  held(action) {
    return BIND[action].some((c) => this.down.has(c));
  }
  hit(action) {
    return BIND[action].some((c) => this.pressed.has(c));
  }
  /** Call at end of each frame. */
  endFrame() {
    this.pressed.clear();
  }
}

export const input = new Input();
