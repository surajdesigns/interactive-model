import { bus, EVENTS } from '../core/EventBus.js';
import { SHAPE_DEFS } from '../particles/ShapeManager.js';
import { GESTURE_STATES } from '../hand-tracking/GestureStateMachine.js';

export class HUD {
  constructor(container) {
    this._container = container;
    this._el        = null;
    this._refs      = {};
    this._toasts    = [];
    this._debugMode = new URLSearchParams(location.search).has('debug');
    this._build();
    this._bindBus();
  }

  _build() {
    const el = document.createElement('div');
    el.id = 'ncx-hud';
    el.innerHTML = `
      <div class="hud-panel" id="ncx-panel">
        <h1 class="hud-title">NEURAL CORE X</h1>
        <div class="hud-row"><span>SYSTEM</span><span class="hud-val" id="ncx-shape">—</span></div>
        <div class="hud-row"><span>DEPTH</span><span class="hud-val" id="ncx-zoom">1.0×</span></div>
        <div class="hud-row"><span>ROTATION</span><span class="hud-val" id="ncx-rot">0.0</span></div>
        <div class="hud-row"><span>ENERGY</span><span class="hud-val" id="ncx-energy">0%</span></div>
        <div class="hud-row" id="ncx-fps-row" style="display:none"><span>FPS</span><span class="hud-val" id="ncx-fps">—</span></div>
        <div class="hud-row" id="ncx-quality-row" style="display:none"><span>QUALITY</span><span class="hud-val" id="ncx-quality">—</span></div>
        <div id="ncx-gesture-status" class="hud-gesture">WAITING...</div>
        <div class="hud-controls">
          <b>✊</b> FREEZE &nbsp; <b>✋</b> EXPLODE &nbsp; <b>🫰</b> SNAP<br>
          <b>←→</b> SHAPE &nbsp; <b>SPACE</b> BURST &nbsp; <b>F</b> FREEZE
        </div>
        <div class="hud-buttons">
          <button class="hud-btn" id="ncx-cam-btn">📷 START CAMERA</button>
          <button class="hud-btn" id="ncx-stop-btn" style="display:none">⏹ STOP CAMERA</button>
          <button class="hud-btn" id="ncx-fallback-btn">🎮 KEYBOARD MODE</button>
          <button class="hud-btn" id="ncx-fullscreen-btn">⛶</button>
        </div>
      </div>

      <div id="ncx-toasts"></div>

      <div id="ncx-privacy" class="privacy-badge">🔒 Camera processed locally — never uploaded</div>
    `;
    this._container.appendChild(el);
    this._el = el;

    // Cache refs
    const $ = id => document.getElementById(id);
    this._refs = {
      panel:      $('ncx-panel'),
      shape:      $('ncx-shape'),
      zoom:       $('ncx-zoom'),
      rot:        $('ncx-rot'),
      energy:     $('ncx-energy'),
      gesture:    $('ncx-gesture-status'),
      toasts:     $('ncx-toasts'),
      camBtn:     $('ncx-cam-btn'),
      stopBtn:    $('ncx-stop-btn'),
      fbBtn:      $('ncx-fallback-btn'),
      fsBtn:      $('ncx-fullscreen-btn'),
      fps:        $('ncx-fps'),
      fpsRow:     $('ncx-fps-row'),
      quality:    $('ncx-quality'),
      qualityRow: $('ncx-quality-row'),
    };

    if (this._debugMode) {
      this._refs.fpsRow.style.display     = '';
      this._refs.qualityRow.style.display = '';
    }

    this._refs.fsBtn.addEventListener('click', () => {
      if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
      else document.exitFullscreen?.();
    });
  }

  _bindBus() {
    bus.on(EVENTS.SHAPE_CHANGE, ({ index }) => {
      this._refs.shape.textContent = SHAPE_DEFS[index]?.label ?? '—';
      this._refs.panel.style.borderLeftColor = this._themeColor(index);
    });
    bus.on(EVENTS.HAND_DETECTED, () => { this._refs.gesture.textContent = 'HAND ACTIVE'; });
    bus.on(EVENTS.HAND_LOST,     () => { this._refs.gesture.textContent = 'WAITING FOR HAND...'; });
    bus.on(EVENTS.GESTURE_FIST,      () => this._setGesture('✊ TIME FREEZE'));
    bus.on(EVENTS.GESTURE_OPEN_PALM, () => this._setGesture('✋ NOVA BURST'));
    bus.on(EVENTS.GESTURE_SNAP,      () => this._setGesture('🫰 SNAP!'));
    bus.on(EVENTS.GESTURE_SWIPE_LEFT,  () => this._setGesture('← PREV SHAPE'));
    bus.on(EVENTS.GESTURE_SWIPE_RIGHT, () => this._setGesture('→ NEXT SHAPE'));
    bus.on(EVENTS.GESTURE_VICTORY,  () => this._setGesture('✌️ VICTORY MODE'));
    bus.on(EVENTS.QUALITY_CHANGE, ({ key }) => {
      if (this._refs.quality) this._refs.quality.textContent = key;
    });
  }

  _setGesture(text) {
    this._refs.gesture.textContent = text;
    this._refs.gesture.classList.add('active');
    setTimeout(() => this._refs.gesture.classList.remove('active'), 900);
  }

  _themeColor(idx) {
    const themes = [
      '#ff0055','#00ccff','#ffaa00','#00ff88','#aa55ff','#ff8800','#00ddff','#dd00ff',
    ];
    return themes[idx % themes.length];
  }

  // ── Per-frame updates (batched) ──────────────────────────────────────────
  update(state) {
    this._refs.zoom.textContent   = state.zoom.toFixed(2) + '×';
    this._refs.rot.textContent    = (state.rotVelocity * 100).toFixed(1);
    this._refs.energy.textContent = Math.floor(state.chargeLevel * 100) + '%';
    if (this._debugMode) this._refs.fps.textContent = state.fps.toFixed(0);
  }

  // Button references for App wiring
  get camBtn()      { return this._refs.camBtn; }
  get stopBtn()     { return this._refs.stopBtn; }
  get fallbackBtn() { return this._refs.fbBtn; }

  showCamBtn(show)  {
    this._refs.camBtn.style.display  = show ? '' : 'none';
    this._refs.stopBtn.style.display = show ? 'none' : '';
  }

  toast(msg, type = 'info', durationMs = 3000) {
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = msg;
    this._refs.toasts.appendChild(t);
    setTimeout(() => t.remove(), durationMs);
  }

  dispose() {
    this._el?.remove();
  }
}
