import '../src/styles/global.css';
import { App } from './core/App.js';

const root = document.getElementById('app');
if (!root) throw new Error('Missing #app element');

// Check WebGL
const testCanvas = document.createElement('canvas');
const gl = testCanvas.getContext('webgl2') || testCanvas.getContext('webgl');
if (!gl) {
  root.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100vh;text-align:center;color:#fff;font-family:monospace;padding:20px">
    <div>
      <h1 style="color:#ff0055">WebGL Not Available</h1>
      <p>Neural Core X requires WebGL. Please use Chrome, Edge, or Firefox with hardware acceleration enabled.</p>
    </div>
  </div>`;
  throw new Error('WebGL unavailable');
}

const app = new App(root);
app.init().catch(err => {
  console.error('[NeuralCoreX] Fatal init error:', err);
});

// Cleanup on unload
window.addEventListener('beforeunload', () => app.dispose());
