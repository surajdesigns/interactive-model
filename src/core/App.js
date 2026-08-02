import { bus, EVENTS } from './EventBus.js';
import { StateManager, APP_STATES } from './StateManager.js';
import { HandTracker }          from '../hand-tracking/HandTracker.js';
import { ShapeManager }         from '../particles/ShapeManager.js';
import { ParticleEngine }       from '../particles/ParticleEngine.js';
import { Renderer }             from '../rendering/Renderer.js';
import { PerformanceManager }   from '../rendering/PerformanceManager.js';
import { KeyboardControls }     from '../controls/KeyboardControls.js';
import { PointerControls }      from '../controls/PointerControls.js';
import { TouchControls }        from '../controls/TouchControls.js';
import { HUD }                  from '../ui/HUD.js';
import { PermissionScreen }     from '../ui/PermissionScreen.js';
import { QUALITY_PRESETS }      from '../config/qualityConfig.js';
import { GESTURE_CONFIG as CFG } from '../config/gestureConfig.js';
import { ema, clamp }           from '../hand-tracking/gestureMath.js';

export class App {
  constructor(root) {
    this._root     = root;
    this._sm       = new StateManager();
    this._raf      = null;
    this._clock    = { last: 0, elapsed: 0 };

    // Runtime state
    this._isFrozen    = false;
    this._isExploding = false;
    this._isCharging  = false;
    this._chargeLevel = 0;
    this._explodeFactor = 0;
    this._zoom        = 1.0;
    this._targetZoom  = 1.0;
    this._rotAngle    = 0;
    this._rotVelocity = 0.002;
    this._sceneOffX   = 0;
    this._sceneOffY   = 0;
    this._handDetected = false;
    this._handX       = 0;
    this._handY       = 0;
    this._palmScaleBaseline = null;
  }

  async init() {
    this._sm.transition(APP_STATES.LANDING);

    // Build DOM scaffold
    this._root.innerHTML = `
      <div id="ncx-canvas-container"></div>
      <video id="ncx-video" playsinline muted></video>
    `;

    // Show landing screen
    this._permScreen = new PermissionScreen(this._root);
    this._permScreen.showLanding(
      () => this._startCameraFlow(),
      () => this._startFallback()
    );
  }

  // ── Camera flow ──────────────────────────────────────────────────────────

  async _startCameraFlow() {
    this._sm.transition(APP_STATES.REQUESTING_PERMISSION);
    this._permScreen.showLoading('Requesting camera permission…');

    try {
      // Load model + request camera concurrently
      this._tracker = new HandTracker();
      this._permScreen.updateLoadingMessage('Loading hand tracking model…');
      await this._tracker.loadModel();
      this._permScreen.updateLoadingMessage('Starting camera…');
      await this._tracker.startCamera();
    } catch (err) {
      const msg = this._humanizeError(err);
      this._permScreen.showError(msg,
        () => this._startCameraFlow(),
        () => this._startFallback()
      );
      this._sm.transition(APP_STATES.ERROR);
      return;
    }

    this._sm.transition(APP_STATES.LOADING_MODEL);
    this._sm.transition(APP_STATES.CALIBRATING);
    this._sm.transition(APP_STATES.RUNNING_CAMERA);

    this._permScreen.hide();
    this._launch();
  }

  _startFallback() {
    this._sm.transition(APP_STATES.RUNNING_FALLBACK);
    this._permScreen.hide();
    this._launch();
  }

  // ── Core launch ───────────────────────────────────────────────────────────

  async _launch() {
    // Benchmark → pick quality
    const qualityKey = await PerformanceManager.benchmark();
    const quality    = QUALITY_PRESETS[qualityKey];

    // Renderer
    this._renderer = new Renderer(
      document.getElementById('ncx-canvas-container'),
      quality
    );

    // Particles
    this._shapes = new ShapeManager(quality.particleCount);
    this._particles = new ParticleEngine(this._renderer.scene, quality.particleCount);

    // Performance
    this._perf = new PerformanceManager(qualityKey);
    bus.on(EVENTS.QUALITY_CHANGE, ({ key }) => {
      const p = QUALITY_PRESETS[key];
      this._renderer.applyQuality(p);
      this._tracker?.setTargetFPS(p.trackingFPS);
    });

    // HUD
    this._hud = new HUD(this._root);
    this._hud.showCamBtn(this._sm.is(APP_STATES.RUNNING_FALLBACK));
    bus.emit(EVENTS.SHAPE_CHANGE, { index: 0 });

    // Controls
    this._kb      = new KeyboardControls();
    this._pointer = new PointerControls(this._renderer.scene.userData._domEl ?? document.body);
    this._touch   = new TouchControls(document.body);

    // Wire HUD buttons
    this._hud.camBtn.addEventListener('click', () => this._startCameraFlow());
    this._hud.stopBtn.addEventListener('click', () => this._stopCamera());
    this._hud.fallbackBtn.addEventListener('click', () => this._startFallback());

    // Gesture events
    this._wireGestureEvents();

    // Visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this._tracker) this._tracker.setTargetFPS(5);
      else if (this._tracker) this._tracker.setTargetFPS(QUALITY_PRESETS[this._perf.qualityKey].trackingFPS);
    });

    // Start render loop
    this._loop();
  }

  _wireGestureEvents() {
    bus.on(EVENTS.GESTURE_FIST,       () => { this._isFrozen = true; });
    bus.on(EVENTS.GESTURE_IDLE,       () => { this._isFrozen = false; });
    bus.on(EVENTS.GESTURE_OPEN_PALM,  () => {
      this._isExploding = true;
      this._renderer?.cameraShake(0.08);
      setTimeout(() => { this._isExploding = false; }, 600);
    });
    bus.on(EVENTS.GESTURE_PINCH_START, () => { this._isCharging = true; });
    bus.on(EVENTS.GESTURE_PINCH_END,   () => { this._isCharging = false; });
    bus.on(EVENTS.GESTURE_SNAP,   () => this._nextShape());
    bus.on(EVENTS.GESTURE_SWIPE_LEFT,  () => this._prevShape());
    bus.on(EVENTS.GESTURE_SWIPE_RIGHT, () => this._nextShape());

    bus.on(EVENTS.HAND_UPDATE, (data) => {
      if (!data) return;
      if (data.rotationVelocity !== undefined) this._rotVelocity = data.rotationVelocity;
      if (data.palmCenter) {
        // Map normalized [0..1] → world [-5..5], mirror X
        const raw = {
          x: -(data.palmCenter.x - 0.5) * 10,
          y:  -(data.palmCenter.y - 0.5) * 10,
        };
        this._handX = this._handX + (raw.x - this._handX) * 0.15;
        this._handY = this._handY + (raw.y - this._handY) * 0.15;
      }
      if (data.palmScale !== undefined) {
        // Zoom from palm scale
        if (!this._palmScaleBaseline) this._palmScaleBaseline = data.palmScale;
        const ratio = data.palmScale / this._palmScaleBaseline;
        this._targetZoom = clamp(ratio, CFG.zoom.min, CFG.zoom.max);
      }
    });

    bus.on(EVENTS.HAND_DETECTED, () => { this._handDetected = true; });
    bus.on(EVENTS.HAND_LOST,     () => {
      this._handDetected = false;
      this._isFrozen     = false;
      this._isExploding  = false;
      this._isCharging   = false;
      this._palmScaleBaseline = null;
    });

    // Mouse wheel zoom
    bus.on('mouse:wheel', ({ delta }) => {
      this._targetZoom = clamp(this._targetZoom - delta * 0.001, 0.4, 3.0);
    });
    // Mouse drag rotation
    bus.on('mouse:delta', ({ dx }) => {
      this._rotVelocity += dx * 0.001;
    });
    // Touch pinch zoom
    bus.on('touch:pinch', ({ delta }) => {
      this._targetZoom = clamp(this._targetZoom + delta * 0.004, 0.4, 3.0);
    });
  }

  _nextShape() {
    this._shapes.next();
    bus.emit(EVENTS.SHAPE_CHANGE, { index: this._shapes.shapeIndex });
    this._hud?.toast(`▶ ${this._shapes.shapeDef.label}`, 'info', 1500);
  }
  _prevShape() {
    this._shapes.prev();
    bus.emit(EVENTS.SHAPE_CHANGE, { index: this._shapes.shapeIndex });
    this._hud?.toast(`◀ ${this._shapes.shapeDef.label}`, 'info', 1500);
  }

  _stopCamera() {
    this._tracker?.stopCamera();
    this._sm.transition(APP_STATES.CAMERA_STOPPED);
    this._hud?.showCamBtn(true);
    this._hud?.toast('Camera stopped', 'warn');
  }

  // ── Render loop ──────────────────────────────────────────────────────────

  _loop() {
    this._raf = requestAnimationFrame(() => this._loop());

    const now = performance.now();
    const dt  = Math.min((now - this._clock.last) / 1000, 0.1); // cap 100ms
    this._clock.last    = now;
    this._clock.elapsed += dt;
    const time = this._clock.elapsed;

    const fps = this._perf.tick();

    // Charge
    if (this._isCharging) {
      this._chargeLevel = Math.min(1.0, this._chargeLevel + CFG.pinch.chargeRate);
    } else {
      this._chargeLevel = Math.max(0, this._chargeLevel - CFG.pinch.dischargeRate);
    }

    // Explode factor
    this._explodeFactor += ((this._isExploding ? 1 : 0) - this._explodeFactor) * 0.12;

    // Rotation
    if (!this._isFrozen) {
      this._rotVelocity *= CFG.rotation.inertia;
      this._rotAngle    += this._rotVelocity;
    }

    // Zoom smooth
    this._zoom += (this._targetZoom - this._zoom) * CFG.zoom.smoothing;

    // Scene offset (hand position → slow follow)
    this._sceneOffX += (this._handX * 0.5 - this._sceneOffX) * 0.10;
    this._sceneOffY += (this._handY * 0.5 - this._sceneOffY) * 0.10;

    // Heart pulse
    let pulse = 1.0;
    if (this._shapes.shapeIndex === 0) {
      const beat = Math.sin(time * 2.8);
      pulse = 1.0 + (beat > 0.85 ? 0.08 : 0);
    }

    // Update shape morph
    const targets = this._shapes.updateMorph(null);

    // Set particle engine state
    const pe = this._particles;
    pe.rotAngle      = this._rotAngle;
    pe.rotVelocity   = this._rotVelocity;
    pe.zoom          = this._zoom;
    pe.targetZoom    = this._targetZoom;
    pe.pulse         = pulse;
    pe.explodeFactor = this._explodeFactor;
    pe.chargeLevel   = this._chargeLevel;
    pe.isFrozen      = this._isFrozen;
    pe.isExploding   = this._isExploding;
    pe.isCharging    = this._isCharging;
    pe.sceneOffsetX  = this._sceneOffX;
    pe.sceneOffsetY  = this._sceneOffY;
    pe.handX         = this._handX;
    pe.handY         = this._handY;
    pe.handDetected  = this._handDetected;
    pe.theme         = this._shapes.shapeDef.theme;

    pe.animate(targets);

    this._renderer.render();

    // HUD update (not every frame on mobile to save JS time)
    if (this._hud) {
      this._hud.update({
        zoom:        this._zoom,
        rotVelocity: this._rotVelocity,
        chargeLevel: this._chargeLevel,
        fps,
      });
    }
  }

  _humanizeError(err) {
    const msg = err?.message ?? String(err);
    if (msg.includes('Permission denied') || msg.includes('NotAllowedError'))
      return 'Camera permission denied. Please allow camera access and try again.';
    if (msg.includes('NotFoundError') || msg.includes('no camera'))
      return 'No camera found. Connect a camera or use keyboard mode.';
    if (msg.includes('timeout'))
      return 'Camera took too long to start. Check if another app is using it.';
    if (msg.includes('model') || msg.includes('MediaPipe'))
      return 'Failed to load hand tracking model. Check your internet connection.';
    return msg;
  }

  dispose() {
    if (this._raf) cancelAnimationFrame(this._raf);
    this._tracker?.dispose();
    this._particles?.dispose();
    this._renderer?.dispose();
    this._kb?.dispose();
    this._pointer?.dispose();
    this._touch?.dispose();
    this._hud?.dispose();
    bus.dispose();
  }
}
