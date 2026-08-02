/**
 * Tiny typed event bus. Avoids global state coupling.
 */
export class EventBus {
  constructor() {
    this._listeners = new Map();
  }

  on(event, fn) {
    if (!this._listeners.has(event)) this._listeners.set(event, new Set());
    this._listeners.get(event).add(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    this._listeners.get(event)?.delete(fn);
  }

  emit(event, data) {
    this._listeners.get(event)?.forEach(fn => fn(data));
  }

  dispose() {
    this._listeners.clear();
  }
}

// Singleton for app-wide events
export const bus = new EventBus();

/**
 * Event names used across the app.
 * Centralised to catch typos.
 */
export const EVENTS = {
  // App state
  APP_STATE_CHANGE: 'app:stateChange',
  // Gestures
  GESTURE_FIST:        'gesture:fist',
  GESTURE_OPEN_PALM:   'gesture:openPalm',
  GESTURE_PINCH_START: 'gesture:pinchStart',
  GESTURE_PINCH_END:   'gesture:pinchEnd',
  GESTURE_SNAP:        'gesture:snap',
  GESTURE_SWIPE_LEFT:  'gesture:swipeLeft',
  GESTURE_SWIPE_RIGHT: 'gesture:swipeRight',
  GESTURE_VICTORY:     'gesture:victory',
  GESTURE_POINTING:    'gesture:pointing',
  GESTURE_IDLE:        'gesture:idle',
  // Hand tracking
  HAND_DETECTED:       'hand:detected',
  HAND_LOST:           'hand:lost',
  HAND_UPDATE:         'hand:update',   // { landmarks, worldLandmarks, handedness, palmScale, palmCenter }
  // Shape
  SHAPE_CHANGE:        'shape:change',  // { index, label }
  // Quality
  QUALITY_CHANGE:      'quality:change',
  // Errors
  ERROR:               'error',         // { code, message }
};
