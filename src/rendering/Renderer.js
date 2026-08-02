import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass }     from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Renderer {
  constructor(container, quality) {
    this._renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this._renderer.setSize(window.innerWidth, window.innerHeight);
    this._renderer.toneMapping = THREE.ReinhardToneMapping;
    this._renderer.toneMappingExposure = 1.2;
    container.appendChild(this._renderer.domElement);

    this.scene  = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x000000, 0.018);

    this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    this.camera.position.z = 13;

    this._composer = null;
    this._bloomPass = null;
    this._buildComposer(quality);

    window.addEventListener('resize', () => this._onResize());

    // Handle WebGL context loss
    this._renderer.domElement.addEventListener('webglcontextlost', e => {
      e.preventDefault();
      console.warn('[Renderer] WebGL context lost');
    });
    this._renderer.domElement.addEventListener('webglcontextrestored', () => {
      console.log('[Renderer] WebGL context restored');
      this._buildComposer(this._lastQuality);
    });

    this._lastQuality = quality;
  }

  _buildComposer(quality) {
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    if (this._composer) this._composer.dispose?.();

    this._composer = new EffectComposer(this._renderer);
    this._composer.addPass(new RenderPass(this.scene, this.camera));

    this._bloomPass = new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      quality.bloomStrength,
      quality.bloomRadius,
      quality.bloomThreshold
    );
    this._composer.addPass(this._bloomPass);
  }

  applyQuality(quality) {
    this._lastQuality = quality;
    this._renderer.setPixelRatio(Math.min(window.devicePixelRatio, quality.pixelRatio));
    if (this._bloomPass) {
      this._bloomPass.strength  = quality.bloomStrength;
      this._bloomPass.radius    = quality.bloomRadius;
      this._bloomPass.threshold = quality.bloomThreshold;
    }
  }

  render() {
    this._composer.render();
  }

  cameraShake(intensity = 0.05) {
    this.camera.position.x += (Math.random() - 0.5) * intensity;
    this.camera.position.y += (Math.random() - 0.5) * intensity;
    setTimeout(() => {
      this.camera.position.x = 0;
      this.camera.position.y = 0;
    }, 80);
  }

  _onResize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this._renderer.setSize(w, h);
    this._composer.setSize(w, h);
  }

  dispose() {
    this._renderer.dispose();
    this._composer.dispose?.();
  }
}
