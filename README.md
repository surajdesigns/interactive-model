# Neural Core X 🧠

> Advanced AI Gesture Particle Engine — Three.js × MediaPipe × WebGL

**[Live Demo](https://YOUR_USERNAME.github.io/neural-core-x/)** · **[Screenshot placeholder]**

---

## Features

- 🤚 **Hand gesture control** via webcam (MediaPipe Tasks Vision)
- ✨ **Adaptive particle count** — 10K–70K based on device performance
- 🔀 **8 particle shapes**: Heart, Black Hole, Cube, DNA, Galaxy, Saturn, Sphere, Infinity
- 🎮 **Full keyboard / mouse / touch fallback** — no camera required
- 🔒 **100% local processing** — no video uploaded, ever
- ⚡ **Zero per-frame allocation** in particle loop
- 📱 **Mobile-friendly** responsive layout
- 🚀 **GitHub Pages ready** via GitHub Actions

---

## Gestures

| Gesture | Action |
|---------|--------|
| ✊ Fist | Freeze particles |
| ✋ Open palm | Nova burst explosion |
| 🫰 Middle-thumb snap | Change shape |
| ← → Swipe | Previous / next shape |
| 👌 Index-thumb pinch | Charge energy |
| 🤞 Victory sign | Special effect |
| 👆 Point | Attract particles to fingertip |
| 🤚 Rotate hand | Spin particle object |
| Hand distance | Zoom in/out |

---

## Keyboard Controls

| Key | Action |
|-----|--------|
| `←` / `A` | Previous shape |
| `→` / `D` | Next shape |
| `Space` | Explosion burst |
| `F` | Toggle freeze |
| `C` (hold) | Charge energy |
| `V` | Victory mode |
| `+` / `−` (scroll) | Zoom |

**Mouse:** drag to rotate, scroll to zoom, hold to charge.  
**Touch:** swipe to change shape, pinch to zoom, double-tap to explode.

---

## Tech Stack

- [Three.js](https://threejs.org) r160
- [MediaPipe Tasks Vision](https://developers.google.com/mediapipe) 0.10.9
- [Vite](https://vitejs.dev) 5
- [Vitest](https://vitest.dev) for unit tests
- GitHub Actions → GitHub Pages

---

## Privacy

- ✅ Camera processed entirely in your browser via WebAssembly
- ✅ No video, images, or landmarks are sent to any server
- ✅ No analytics, no trackers, no API keys required
- ✅ No microphone permission requested

---

## Browser Requirements

- Chrome 90+ or Edge 90+ (recommended)
- Firefox 90+ (WebGL required)
- Safari 15.4+ (limited MediaPipe support)
- HTTPS required for camera (or `localhost`)

---

## Local Setup

```bash
git clone https://github.com/YOUR_USERNAME/neural-core-x.git
cd neural-core-x
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

### Optional: Download local model

```bash
curl -o public/models/hand_landmarker.task \
  "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task"
```

If absent, the app fetches from CDN automatically.

---

## Build & Preview

```bash
npm run build      # outputs to dist/
npm run preview    # serve dist/ locally
npm run test:run   # run unit tests once
npm run lint       # lint source
```

---

## Deploy to GitHub Pages

### 1. Create GitHub repository

```bash
git init
git add .
git commit -m "Initial release of Neural Core X"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/neural-core-x.git
git push -u origin main
```

### 2. Enable GitHub Pages

1. Go to **Settings → Pages**
2. Under **Source**, select **GitHub Actions**
3. Push to `main` — the workflow runs automatically
4. Visit `https://YOUR_USERNAME.github.io/neural-core-x/`

> Camera access requires HTTPS — GitHub Pages provides this automatically.

---

## Performance

Quality presets auto-selected at startup:

| Preset | Particles | Target |
|--------|-----------|--------|
| LOW    | 10,000    | old/mobile |
| MEDIUM | 22,000    | mid-range |
| HIGH   | 45,000    | modern desktop |
| ULTRA  | 70,000    | high-end GPU |

Add `?debug=true` to URL to show FPS and quality level.

---

## Project Structure

```
src/
  config/         — app, gesture, quality configs
  core/           — App, EventBus, StateManager
  hand-tracking/  — HandTracker, GestureStateMachine, LandmarkSmoother, gestureMath
  particles/      — ParticleEngine, ShapeManager, shapes/
  rendering/      — Renderer, PerformanceManager
  controls/       — Keyboard, Pointer, Touch
  ui/             — HUD, PermissionScreen
  styles/         — global.css
tests/            — unit tests (Vitest)
public/models/    — hand_landmarker.task (optional local)
```

---

## Troubleshooting

**Camera permission denied:** Click the camera icon in your browser's address bar and allow access.

**Model fails to load:** Check internet connection. Model downloads ~9MB on first use.

**Low FPS:** The app auto-downgrades quality. You can manually use `?debug=true` to monitor.

**Mobile Safari:** MediaPipe WASM may be slower on iOS. Keyboard/touch mode is recommended for older iPhones.

---

## Limitations

- Webcam depth estimation is approximate (inferred from hand scale, not true depth sensor)
- Snap detection is a gesture *sequence*, not audio-based finger snap
- Lighting, background clutter, and motion blur affect tracking accuracy
- No hand tracker can guarantee 100% gesture accuracy

---

## License

MIT — see [LICENSE](LICENSE)
