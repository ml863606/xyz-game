const Input = require('./input');
const GameState = require('./game-state');
const Renderer = require('./renderer');

function createCanvas() {
  if (typeof tt !== 'undefined' && tt.createCanvas) {
    return tt.createCanvas();
  }
  if (typeof document !== 'undefined' && document.createElement && document.body) {
    const canvas = document.createElement('canvas');
    document.body.style.margin = '0';
    document.body.style.overflow = 'hidden';
    document.body.style.background = '#10192f';
    document.body.appendChild(canvas);
    return canvas;
  }
  throw new Error('No canvas runtime found.');
}

function getWindowInfo() {
  if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
    const info = tt.getSystemInfoSync();
    return {
      width: info.windowWidth || 390,
      height: info.windowHeight || 844,
      dpr: info.pixelRatio || 1
    };
  }
  if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
    return {
      width: window.innerWidth || 390,
      height: window.innerHeight || 844,
      dpr: window.devicePixelRatio || 1
    };
  }
  return { width: 390, height: 844, dpr: 1 };
}

const canvas = createCanvas();
const ctx = canvas.getContext('2d');
const renderer = new Renderer(canvas, ctx);
const input = new Input(canvas);
const game = new GameState(input);

function resize() {
  const info = getWindowInfo();
  renderer.resize(info.width, info.height, info.dpr);
}

resize();
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  window.addEventListener('resize', resize);
}

let lastTime = Date.now();

function frame() {
  const now = Date.now();
  const dt = Math.min(0.033, Math.max(0.001, (now - lastTime) / 1000));
  lastTime = now;
  game.update(dt);
  renderer.render(game);
  requestNextFrame(frame);
}

function requestNextFrame(callback) {
  if (canvas.requestAnimationFrame) {
    canvas.requestAnimationFrame(callback);
  } else if (typeof requestAnimationFrame === 'function') {
    requestAnimationFrame(callback);
  } else {
    setTimeout(callback, 1000 / 60);
  }
}

frame();
