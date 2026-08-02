import { bus, EVENTS } from '../core/EventBus.js';

export class PointerControls {
  constructor(domElement) {
    this._el        = domElement;
    this._dragging  = false;
    this._lastX     = 0;
    this._lastY     = 0;
    this._holdTimer = null;

    this._onDown  = this._onDown.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onUp    = this._onUp.bind(this);
    this._onWheel = this._onWheel.bind(this);

    this._el.addEventListener('pointerdown', this._onDown);
    this._el.addEventListener('pointermove', this._onMove);
    this._el.addEventListener('pointerup',   this._onUp);
    this._el.addEventListener('wheel',       this._onWheel, { passive: true });
  }

  _onDown(e) {
    this._dragging = true;
    this._lastX = e.clientX;
    this._lastY = e.clientY;
    this._holdTimer = setTimeout(() => {
      bus.emit(EVENTS.GESTURE_PINCH_START, { mouse: true });
    }, 400);
  }

  _onMove(e) {
    if (!this._dragging) return;
    const dx = e.clientX - this._lastX;
    bus.emit('mouse:delta', { dx, dy: e.clientY - this._lastY });
    this._lastX = e.clientX;
    this._lastY = e.clientY;
  }

  _onUp() {
    this._dragging = false;
    clearTimeout(this._holdTimer);
    bus.emit(EVENTS.GESTURE_PINCH_END, {});
  }

  _onWheel(e) {
    bus.emit('mouse:wheel', { delta: e.deltaY });
  }

  dispose() {
    this._el.removeEventListener('pointerdown', this._onDown);
    this._el.removeEventListener('pointermove', this._onMove);
    this._el.removeEventListener('pointerup',   this._onUp);
    this._el.removeEventListener('wheel',       this._onWheel);
  }
}
