const { VIEW, PHASE } = require('./constants');

class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.start = false;
    this.restart = false;
    this.escape = false;
    this.touches = {};
    this.screen = this.getScreenInfo();
    this.install();
  }

  consumeStart() {
    const value = this.start;
    this.start = false;
    return value;
  }

  consumeRestart() {
    const value = this.restart;
    this.restart = false;
    return value;
  }

  consumeEscape() {
    const value = this.escape;
    this.escape = false;
    return value;
  }

  install() {
    const api = typeof tt !== 'undefined' ? tt : null;
    if (api && api.onTouchStart) {
      this.safeBind(api, 'onTouchStart', (event) => this.handleTouch(this.eventTouches(event), true));
      this.safeBind(api, 'onTouchMove', (event) => this.handleTouch(this.eventTouches(event), true));
      this.safeBind(api, 'onTouchEnd', (event) => this.handleTouch(event.touches || [], false));
      if (api.onTouchCancel) {
        this.safeBind(api, 'onTouchCancel', (event) => this.handleTouch(event.touches || [], false));
      }
    }

    if (api && api.onKeyDown) {
      this.safeBind(api, 'onKeyDown', (event) => this.key(event.key || event.code || '', true));
    }
    if (api && api.onKeyUp) {
      this.safeBind(api, 'onKeyUp', (event) => this.key(event.key || event.code || '', false));
    }

    if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
      window.addEventListener('keydown', (event) => this.key(event.key, true));
      window.addEventListener('keyup', (event) => this.key(event.key, false));
      const domCanvas = this.canvas;
      if (domCanvas && domCanvas.addEventListener) {
        domCanvas.addEventListener('touchstart', (event) => this.domTouch(event, true), { passive: false });
        domCanvas.addEventListener('touchmove', (event) => this.domTouch(event, true), { passive: false });
        domCanvas.addEventListener('touchend', (event) => this.domTouch(event, false), { passive: false });
        domCanvas.addEventListener('mousedown', (event) => this.pointer(event, true));
        domCanvas.addEventListener('mouseup', (event) => this.pointer(event, false));
        domCanvas.addEventListener('mousemove', (event) => {
          if (event.buttons) this.pointer(event, true);
        });
      }
    }
  }

  getScreenInfo() {
    if (typeof tt !== 'undefined' && tt.getSystemInfoSync) {
      try {
        const info = tt.getSystemInfoSync();
        return {
          width: info.windowWidth || info.screenWidth || this.canvas.width,
          height: info.windowHeight || info.screenHeight || this.canvas.height,
          dpr: info.pixelRatio || 1
        };
      } catch (error) {
        // Fall through to browser/canvas values.
      }
    }

    if (typeof window !== 'undefined' && typeof window.innerWidth === 'number') {
      return {
        width: window.innerWidth || this.canvas.width,
        height: window.innerHeight || this.canvas.height,
        dpr: window.devicePixelRatio || 1
      };
    }

    return {
      width: this.canvas.width,
      height: this.canvas.height,
      dpr: 1
    };
  }

  eventTouches(event) {
    if (!event) return [];
    return event.touches || event.changedTouches || [];
  }

  safeBind(api, name, handler) {
    if (!api || typeof api[name] !== 'function') return;
    try {
      api[name](handler);
    } catch (error) {
      // Some mini-game platforms reject optional keyboard APIs; touch controls still work.
    }
  }

  key(raw, down) {
    const key = String(raw).toLowerCase();
    if (key === 'a' || key === 'arrowleft') this.left = down;
    if (key === 'd' || key === 'arrowright') this.right = down;
    if (key === 'w' || key === 'arrowup' || key === ' ') this.jump = down;
    if (down && (key === 'enter' || key === ' ')) this.start = true;
    if (down && key === 'r') this.restart = true;
    if (down && key === 'escape') this.escape = true;
  }

  domTouch(event, active) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const touches = Array.prototype.map.call(event.touches, (touch) => ({
      identifier: touch.identifier,
      clientX: touch.clientX - rect.left,
      clientY: touch.clientY - rect.top
    }));
    this.handleTouch(touches, active);
  }

  pointer(event, active) {
    const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
    this.handleTouch([{
      identifier: 'mouse',
      clientX: event.clientX - rect.left,
      clientY: event.clientY - rect.top
    }], active);
  }

  handleTouch(touches, active) {
    if (!active || touches.length === 0) {
      this.touches = {};
      this.left = false;
      this.right = false;
      this.jump = false;
      return;
    }

    this.touches = {};
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const point = this.readTouchPoint(touch);
      const p = this.toVirtual(point.x, point.y);
      this.touches[touch.identifier || i] = p;
    }
    this.updateTouchButtons();
  }

  readTouchPoint(touch) {
    const x = firstNumber(touch.x, touch.clientX, touch.pageX, touch.screenX, 0);
    const y = firstNumber(touch.y, touch.clientY, touch.pageY, touch.screenY, 0);
    return { x, y };
  }

  toVirtual(x, y) {
    const logicalWidth = this.screen.width || this.canvas.width;
    const logicalHeight = this.screen.height || this.canvas.height;
    const looksLogical = x <= logicalWidth + 2 && y <= logicalHeight + 2;
    const sourceWidth = looksLogical ? logicalWidth : this.canvas.width;
    const sourceHeight = looksLogical ? logicalHeight : this.canvas.height;
    const scaleX = VIEW.width / sourceWidth;
    const scaleY = VIEW.height / sourceHeight;
    return {
      x: x * scaleX,
      y: y * scaleY
    };
  }

  updateTouchButtons() {
    let left = false;
    let right = false;
    let jump = false;
    let start = false;
    let restart = false;

    Object.keys(this.touches).forEach((id) => {
      const p = this.touches[id];
      if (p.y > VIEW.height - 168) {
        if (p.x < 118) left = true;
        else if (p.x < 236) right = true;
        else jump = true;
      } else if (p.y > 292 && p.y < 388 && p.x > 98 && p.x < 292) {
        start = true;
        restart = true;
      }
    });

    this.left = left;
    this.right = right;
    this.jump = jump;
    if (start) this.start = true;
    if (restart) this.restart = true;
  }

  drawHintPhase(phase) {
    if (phase === PHASE.menu) return 'menu';
    if (phase === PHASE.gameOver) return 'restart';
    return 'playing';
  }
}

function firstNumber(...values) {
  for (let i = 0; i < values.length; i++) {
    if (typeof values[i] === 'number' && Number.isFinite(values[i])) {
      return values[i];
    }
  }
  return 0;
}

module.exports = Input;
