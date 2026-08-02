/**
 * Builds and manages the full-screen overlay for landing, permission, loading, error states.
 */
export class PermissionScreen {
  constructor(container) {
    this._container = container;
    this._el        = null;
  }

  showLanding(onStart, onFallback) {
    this._clear();
    this._el = document.createElement('div');
    this._el.className = 'overlay';
    this._el.innerHTML = `
      <div class="overlay-box">
        <div class="overlay-logo">⬡</div>
        <h1 class="overlay-title">NEURAL CORE X</h1>
        <p class="overlay-sub">Advanced AI Gesture Particle Engine</p>
        <ul class="overlay-features">
          <li>🤚 Hand gesture control via webcam</li>
          <li>✨ ${''/* dynamic */}45,000+ GPU particles</li>
          <li>🔒 All processing stays in your browser</li>
          <li>🎮 Keyboard / touch fallback available</li>
        </ul>
        <p class="overlay-privacy">Your camera feed is processed <strong>entirely locally</strong>.<br>
           No video or images are ever uploaded or recorded.</p>
        <div class="overlay-actions">
          <button class="btn-primary" id="ps-start">▶ START NEURAL CORE</button>
          <button class="btn-secondary" id="ps-fallback">🎮 Use Keyboard Instead</button>
        </div>
        <p class="overlay-hint">Best in Chrome/Edge · HTTPS required for camera</p>
      </div>
    `;
    this._container.appendChild(this._el);
    document.getElementById('ps-start').addEventListener('click', onStart);
    document.getElementById('ps-fallback').addEventListener('click', onFallback);
  }

  showLoading(message = 'Loading hand model…') {
    this._clear();
    this._el = document.createElement('div');
    this._el.className = 'overlay';
    this._el.innerHTML = `
      <div class="overlay-box">
        <div class="spinner"></div>
        <p class="overlay-sub" id="ps-msg">${message}</p>
      </div>
    `;
    this._container.appendChild(this._el);
  }

  updateLoadingMessage(msg) {
    const el = document.getElementById('ps-msg');
    if (el) el.textContent = msg;
  }

  showError(message, onRetry, onFallback) {
    this._clear();
    this._el = document.createElement('div');
    this._el.className = 'overlay';
    this._el.innerHTML = `
      <div class="overlay-box overlay-error">
        <div class="overlay-logo">⚠</div>
        <h2 class="overlay-title">Error</h2>
        <p class="overlay-sub">${message}</p>
        <div class="overlay-actions">
          ${onRetry ? '<button class="btn-primary" id="ps-retry">↺ Retry</button>' : ''}
          ${onFallback ? '<button class="btn-secondary" id="ps-fb-err">🎮 Keyboard Mode</button>' : ''}
        </div>
      </div>
    `;
    this._container.appendChild(this._el);
    document.getElementById('ps-retry')?.addEventListener('click', onRetry);
    document.getElementById('ps-fb-err')?.addEventListener('click', onFallback);
  }

  hide() { this._clear(); }

  _clear() {
    this._el?.remove();
    this._el = null;
  }
}
