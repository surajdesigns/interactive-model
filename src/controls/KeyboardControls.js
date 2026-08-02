import { bus, EVENTS } from '../core/EventBus.js';

export class KeyboardControls {
  constructor() {
    this._keys = new Set();
    this._onKeyDown = this._onKeyDown.bind(this);
    this._onKeyUp   = this._onKeyUp.bind(this);
    window.addEventListener('keydown', this._onKeyDown);
    window.addEventListener('keyup',   this._onKeyUp);
  }

  _onKeyDown(e) {
    if (this._keys.has(e.code)) return; // already held
    this._keys.add(e.code);

    switch (e.code) {
      case 'ArrowLeft':  case 'KeyA': bus.emit(EVENTS.GESTURE_SWIPE_LEFT,  {}); break;
      case 'ArrowRight': case 'KeyD': bus.emit(EVENTS.GESTURE_SWIPE_RIGHT, {}); break;
      case 'Space':      bus.emit(EVENTS.GESTURE_OPEN_PALM, {}); e.preventDefault(); break;
      case 'KeyF':       bus.emit(EVENTS.GESTURE_FIST, {}); break;
      case 'KeyC':       bus.emit(EVENTS.GESTURE_PINCH_START, {}); break;
      case 'KeyV':       bus.emit(EVENTS.GESTURE_VICTORY, {}); break;
    }
  }

  _onKeyUp(e) {
    this._keys.delete(e.code);
    if (e.code === 'KeyC') bus.emit(EVENTS.GESTURE_PINCH_END, {});
    if (e.code === 'KeyF') bus.emit(EVENTS.GESTURE_IDLE, {});
  }

  dispose() {
    window.removeEventListener('keydown', this._onKeyDown);
    window.removeEventListener('keyup',   this._onKeyUp);
  }
}
