import { bus, EVENTS } from '../core/EventBus.js';
import { GESTURE_CONFIG as CFG } from '../config/gestureConfig.js';
import {
  avgFingerCurl,
  allFingersExtension,
  fingerExtension,
  fingerCurl,
  palmScale,
  palmCenter,
  pinchRatio,
  palmAngle,
  unwrapDelta,
  landmarkVelocity,
  ema,
  clamp,
} from './gestureMath.js';

export const GESTURE_STATES = {
  NO_HAND:          'NO_HAND',
  IDLE:             'IDLE',
  FIST_HOLD:        'FIST_HOLD',
  OPEN_PALM:        'OPEN_PALM',
  PINCH_CHARGE:     'PINCH_CHARGE',
  SNAP_PRIMED:      'SNAP_PRIMED',
  ROTATING:         'ROTATING',
  SWIPING_LEFT:     'SWIPING_LEFT',
  SWIPING_RIGHT:    'SWIPING_RIGHT',
  VICTORY:          'VICTORY',
  POINTING:         'POINTING',
};

export class GestureStateMachine {
  constructor() {
    this.state = GESTURE_STATES.NO_HAND;

    // Hold timers
    this._fistHoldStart     = null;
    this._palmHoldStart     = null;
    this._pinchHoldStart    = null;
    this._victoryHoldStart  = null;
    this._pointHoldStart    = null;

    // Cooldowns (timestamp ms)
    this._fistCooldownUntil  = 0;
    this._palmCooldownUntil  = 0;
    this._snapCooldownUntil  = 0;
    this._swipeCooldownUntil = 0;
    this._victoryCooldownUntil = 0;

    // Snap internal
    this._snapPrimed       = false;
    this._snapPrimedTime   = 0;

    // Swipe window: ring buffer of { x, t }
    this._swipeWindow      = [];
    this._swipeWindowSize  = CFG.swipe.windowFrames;

    // Rotation
    this._lastPalmAngle    = null;
    this._rotVelocity      = CFG.rotation.baseAutoSpin;

    // Landmark velocity (for snap release)
    this._prevMiddleTip    = null;

    // Smoothed scores for debug
    this.debug = {
      curlScore: 0,
      extensionScores: [0, 0, 0, 0],
      pinchRatioIndex: 1,
      pinchRatioMiddle: 1,
      palmScaleValue: 0,
    };
  }

  /**
   * Main update — call once per inference frame with smoothed landmarks.
   * @param {Array<{x,y,z}>|null} landmarks
   * @param {number} now  performance.now()
   */
  update(landmarks, now) {
    if (!landmarks || landmarks.length < 21) {
      this._transition(GESTURE_STATES.NO_HAND);
      this._prevMiddleTip = null;
      return;
    }

    const lm = landmarks;
    const scale = palmScale(lm);
    const center = palmCenter(lm);

    // ── Scores ────────────────────────────────────────────────────────────
    const curlScore   = avgFingerCurl(lm);
    const extScores   = allFingersExtension(lm);  // [index, middle, ring, pinky]
    const pRatioIdx   = pinchRatio(lm, 8);   // thumb ↔ index
    const pRatioMid   = pinchRatio(lm, 12);  // thumb ↔ middle
    const angle       = palmAngle(lm);

    // Velocity of middle tip (for snap)
    const midTipVel   = landmarkVelocity(this._prevMiddleTip, lm[12]) / scale;
    this._prevMiddleTip = { x: lm[12].x, y: lm[12].y };

    // Store debug
    this.debug = { curlScore, extensionScores: extScores, pinchRatioIndex: pRatioIdx, pinchRatioMiddle: pRatioMid, palmScaleValue: scale };

    // ── Priority 1: FIST ─────────────────────────────────────────────────
    if (curlScore > CFG.fist.curlThresholdEnter && now > this._fistCooldownUntil) {
      if (!this._fistHoldStart) this._fistHoldStart = now;
      if (now - this._fistHoldStart >= CFG.fist.holdMs) {
        if (this.state !== GESTURE_STATES.FIST_HOLD) {
          this._transition(GESTURE_STATES.FIST_HOLD);
          bus.emit(EVENTS.GESTURE_FIST, { curlScore });
        }
        // Update swipe window while fist (neutral)
        this._swipeWindow = [];
        return;
      }
    } else {
      if (this.state === GESTURE_STATES.FIST_HOLD && curlScore < CFG.fist.curlThresholdExit) {
        this._fistCooldownUntil = now + CFG.fist.cooldownMs;
        this._transition(GESTURE_STATES.IDLE);
      }
      if (curlScore < CFG.fist.curlThresholdEnter) this._fistHoldStart = null;
    }

    // ── Priority 2: OPEN PALM (after fist released) ───────────────────────
    const allExtended = extScores.every(s => s > CFG.openPalm.extensionThreshold);
    if (allExtended && now > this._palmCooldownUntil && this.state !== GESTURE_STATES.FIST_HOLD) {
      if (!this._palmHoldStart) this._palmHoldStart = now;
      if (now - this._palmHoldStart >= CFG.openPalm.holdMs) {
        if (this.state !== GESTURE_STATES.OPEN_PALM) {
          this._transition(GESTURE_STATES.OPEN_PALM);
          bus.emit(EVENTS.GESTURE_OPEN_PALM, {});
        }
        return;
      }
    } else {
      if (this.state === GESTURE_STATES.OPEN_PALM) {
        this._palmCooldownUntil = now + CFG.openPalm.cooldownMs;
        this._transition(GESTURE_STATES.IDLE);
      }
      if (!allExtended) this._palmHoldStart = null;
    }

    // ── Priority 3: PINCH CHARGE (index-thumb) ────────────────────────────
    if (pRatioIdx < CFG.pinch.enterRatio && this.state !== GESTURE_STATES.FIST_HOLD && this.state !== GESTURE_STATES.OPEN_PALM) {
      if (!this._pinchHoldStart) this._pinchHoldStart = now;
      if (now - this._pinchHoldStart >= CFG.pinch.holdMs) {
        if (this.state !== GESTURE_STATES.PINCH_CHARGE) {
          this._transition(GESTURE_STATES.PINCH_CHARGE);
          bus.emit(EVENTS.GESTURE_PINCH_START, { ratio: pRatioIdx });
        }
        return;
      }
    } else {
      if (this.state === GESTURE_STATES.PINCH_CHARGE && pRatioIdx > CFG.pinch.exitRatio) {
        this._transition(GESTURE_STATES.IDLE);
        bus.emit(EVENTS.GESTURE_PINCH_END, {});
      }
      if (pRatioIdx >= CFG.pinch.enterRatio) this._pinchHoldStart = null;
    }

    // ── Priority 4: SNAP (middle-thumb sequence) ──────────────────────────
    if (this.state !== GESTURE_STATES.FIST_HOLD && this.state !== GESTURE_STATES.OPEN_PALM &&
        this.state !== GESTURE_STATES.PINCH_CHARGE && now > this._snapCooldownUntil) {
      if (pRatioMid < CFG.snap.primeRatio) {
        if (!this._snapPrimed) {
          this._snapPrimed = true;
          this._snapPrimedTime = now;
        }
      } else if (this._snapPrimed && pRatioMid > CFG.snap.releaseRatio) {
        // Only fire if middle tip moved fast enough
        if (midTipVel > CFG.snap.velocityThreshold) {
          this._snapPrimed = false;
          this._snapCooldownUntil = now + CFG.snap.cooldownMs;
          bus.emit(EVENTS.GESTURE_SNAP, {});
        } else {
          this._snapPrimed = false; // slow release → ignore
        }
      }
    } else {
      this._snapPrimed = false;
    }

    // ── Priority 5: SWIPE ────────────────────────────────────────────────
    if (this.state !== GESTURE_STATES.FIST_HOLD && this.state !== GESTURE_STATES.OPEN_PALM &&
        this.state !== GESTURE_STATES.PINCH_CHARGE && now > this._swipeCooldownUntil) {
      this._swipeWindow.push({ x: center.x, y: center.y, t: now });
      if (this._swipeWindow.length > this._swipeWindowSize) this._swipeWindow.shift();

      if (this._swipeWindow.length === this._swipeWindowSize) {
        const first = this._swipeWindow[0];
        const last  = this._swipeWindow[this._swipeWindowSize - 1];
        const dx    = last.x - first.x;
        const dy    = last.y - first.y;
        const dt    = (last.t - first.t) / 1000;
        const vx    = Math.abs(dx) / dt;
        const vertRatio = Math.abs(dy) / (Math.abs(dx) + 1e-6);

        if (Math.abs(dx) > CFG.swipe.minTravel && vx > CFG.swipe.minVelocity * 60 &&
            vertRatio < CFG.swipe.maxVerticalRatio) {
          this._swipeCooldownUntil = now + CFG.swipe.cooldownMs;
          this._swipeWindow = [];
          if (dx < 0) {
            bus.emit(EVENTS.GESTURE_SWIPE_LEFT, {});
          } else {
            bus.emit(EVENTS.GESTURE_SWIPE_RIGHT, {});
          }
        }
      }
    }

    // ── Priority 6: VICTORY ────────────────────────────────────────────────
    const victoryOk = extScores[0] > CFG.victory.extensionThreshold &&
                      extScores[1] > CFG.victory.extensionThreshold &&
                      extScores[2] < 0.45 && extScores[3] < 0.45 &&
                      pRatioIdx > 0.5; // thumb not pinching
    if (victoryOk && now > this._victoryCooldownUntil && this.state === GESTURE_STATES.IDLE) {
      if (!this._victoryHoldStart) this._victoryHoldStart = now;
      if (now - this._victoryHoldStart >= CFG.victory.holdMs) {
        this._victoryCooldownUntil = now + CFG.victory.cooldownMs;
        this._victoryHoldStart = null;
        this._transition(GESTURE_STATES.VICTORY);
        bus.emit(EVENTS.GESTURE_VICTORY, {});
      }
    } else if (!victoryOk) {
      this._victoryHoldStart = null;
      if (this.state === GESTURE_STATES.VICTORY) this._transition(GESTURE_STATES.IDLE);
    }

    // ── Priority 7: POINTING ─────────────────────────────────────────────
    const pointOk = extScores[0] > CFG.pointing.extensionThreshold &&
                    extScores[1] < CFG.pointing.otherCurlThreshold &&
                    extScores[2] < CFG.pointing.otherCurlThreshold;
    if (pointOk && this.state === GESTURE_STATES.IDLE) {
      if (!this._pointHoldStart) this._pointHoldStart = now;
      if (now - this._pointHoldStart >= CFG.pointing.holdMs) {
        this._transition(GESTURE_STATES.POINTING);
        bus.emit(EVENTS.GESTURE_POINTING, { tip: lm[8] });
      }
    } else {
      this._pointHoldStart = null;
      if (this.state === GESTURE_STATES.POINTING && !pointOk) this._transition(GESTURE_STATES.IDLE);
    }

    // ── ROTATION (always updates when hand visible) ───────────────────────
    if (this.state !== GESTURE_STATES.FIST_HOLD && this.state !== GESTURE_STATES.OPEN_PALM) {
      if (this._lastPalmAngle !== null) {
        let delta = unwrapDelta(angle, this._lastPalmAngle);
        // Dead zone
        if (Math.abs(delta) < CFG.rotation.deadZoneRad) delta = 0;
        // Clamp sudden jumps
        delta = clamp(delta, -CFG.rotation.maxDeltaRad, CFG.rotation.maxDeltaRad);
        this._rotVelocity = ema(this._rotVelocity, delta * 3.0, CFG.rotation.smoothing);
      }
      this._lastPalmAngle = angle;
    }

    // Apply inertia
    this._rotVelocity *= CFG.rotation.inertia;
    if (Math.abs(this._rotVelocity) < 0.0001) this._rotVelocity = CFG.rotation.baseAutoSpin;

    // ── Default: set IDLE if nothing active ──────────────────────────────
    if (this.state === GESTURE_STATES.NO_HAND) this._transition(GESTURE_STATES.IDLE);

    // Emit hand update with derived data
    bus.emit(EVENTS.HAND_UPDATE, {
      landmarks: lm,
      palmCenter: center,
      palmScale: scale,
      rotationVelocity: this._rotVelocity,
      gestureState: this.state,
      snapPrimed: this._snapPrimed,
      pinchRatioIndex: pRatioIdx,
    });
  }

  _transition(next) {
    if (this.state !== next) this.state = next;
  }

  get rotationVelocity() { return this._rotVelocity; }

  dispose() {}
}
