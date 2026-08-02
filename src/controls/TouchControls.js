import { bus, EVENTS } from '../core/EventBus.js';

export class TouchControls {
  constructor(domElement) {
    this._el         = domElement;
    this._touches    = new Map();
    this._lastPinch  = null;
    this._lastTap    = 0;
    this._swipeStart = null;

    this._onStart = this._onStart.bind(this);
    this._onMove  = this._onMove.bind(this);
    this._onEnd   = this._onEnd.bind(this);

    this._el.addEventListener('touchstart', this._onStart, { passive: false });
    this._el.addEventListener('touchmove',  this._onMove,  { passive: false });
    this._el.addEventListener('touchend',   this._onEnd);
  }

  _onStart(e) {
    e.preventDefault();
    for (const t of e.changedTouches) this._touches.set(t.identifier, t);

    if (this._touches.size === 1) {
      const t = e.changedTouches[0];
      this._swipeStart = { x: t.clientX, y: t.clientY, time: Date.now() };

      // Double-tap → explosion
      const now = Date.now();
      if (now - this._lastTap < 300) bus.emit(EVENTS.GESTURE_OPEN_PALM, {});
      this._lastTap = now;
    }
  }

  _onMove(e) {
    e.preventDefault();
    for (const t of e.changedTouches) this._touches.set(t.identifier, t);

    if (this._touches.size === 2) {
      const [t1, t2] = [...this._touches.values()];
      const dist = Math.hypot(t1.clientX - t2.clientX, t1.clientY - t2.clientY);
      if (this._lastPinch !== null) {
        bus.emit('touch:pinch', { delta: dist - this._lastPinch });
      }
      this._lastPinch = dist;
    }
  }

  _onEnd(e) {
    for (const t of e.changedTouches) this._touches.delete(t.identifier);
    if (this._touches.size < 2) this._lastPinch = null;

    if (this._touches.size === 0 && this._swipeStart) {
      const t    = e.changedTouches[0];
      const dx   = t.clientX - this._swipeStart.x;
      const dy   = t.clientY - this._swipeStart.y;
      const dt   = Date.now() - this._swipeStart.time;
      const spd  = Math.abs(dx) / dt;
      if (Math.abs(dx) > 60 && spd > 0.3 && Math.abs(dy) < Math.abs(dx) * 0.7) {
        bus.emit(dx < 0 ? EVENTS.GESTURE_SWIPE_LEFT : EVENTS.GESTURE_SWIPE_RIGHT, {});
      }
      this._swipeStart = null;
    }
  }

  dispose() {
    this._el.removeEventListener('touchstart', this._onStart);
    this._el.removeEventListener('touchmove',  this._onMove);
    this._el.removeEventListener('touchend',   this._onEnd);
  }
}
