import { bus, EVENTS } from './EventBus.js';

export const APP_STATES = {
  BOOT:                'BOOT',
  LANDING:             'LANDING',
  REQUESTING_PERMISSION: 'REQUESTING_PERMISSION',
  LOADING_MODEL:       'LOADING_MODEL',
  CALIBRATING:         'CALIBRATING',
  RUNNING_CAMERA:      'RUNNING_CAMERA',
  RUNNING_FALLBACK:    'RUNNING_FALLBACK',
  CAMERA_STOPPED:      'CAMERA_STOPPED',
  ERROR:               'ERROR',
  PAUSED:              'PAUSED',
};

// Valid state transitions
const TRANSITIONS = {
  BOOT:                  ['LANDING'],
  LANDING:               ['REQUESTING_PERMISSION', 'RUNNING_FALLBACK'],
  REQUESTING_PERMISSION: ['LOADING_MODEL', 'ERROR', 'RUNNING_FALLBACK'],
  LOADING_MODEL:         ['CALIBRATING', 'ERROR'],
  CALIBRATING:           ['RUNNING_CAMERA', 'ERROR'],
  RUNNING_CAMERA:        ['PAUSED', 'CAMERA_STOPPED', 'ERROR', 'RUNNING_FALLBACK'],
  RUNNING_FALLBACK:      ['REQUESTING_PERMISSION', 'PAUSED'],
  CAMERA_STOPPED:        ['REQUESTING_PERMISSION', 'RUNNING_FALLBACK'],
  ERROR:                 ['LANDING', 'RUNNING_FALLBACK'],
  PAUSED:                ['RUNNING_CAMERA', 'RUNNING_FALLBACK', 'CAMERA_STOPPED'],
};

export class StateManager {
  constructor() {
    this.current = APP_STATES.BOOT;
    this.history = [APP_STATES.BOOT];
  }

  transition(next) {
    const allowed = TRANSITIONS[this.current] || [];
    if (!allowed.includes(next)) {
      console.warn(`[StateManager] Invalid transition ${this.current} → ${next}`);
      return false;
    }
    const prev = this.current;
    this.current = next;
    this.history.push(next);
    bus.emit(EVENTS.APP_STATE_CHANGE, { prev, next });
    return true;
  }

  is(state) { return this.current === state; }
}
