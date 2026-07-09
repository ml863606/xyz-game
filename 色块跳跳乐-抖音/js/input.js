const { VIEW, PHASE } = require('./constants');

class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.left = false;
    this.right = false;
    this.jump = false;
    this.jumpPressed = false;
    this.start = false;
    this.restart = false;
    this.escape = false;
    this.touches = {};
    this.primaryTouchId = null;
    this.primaryStart = null;
    this.primaryCurrent = null;
    this.gestureAxis = 0;
    this.touchActive = false;
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

  consumeJumpPress() {
    const value = this.jumpPressed;
    this.jumpPressed = false;
    return value;
  }

  install() {
    const api = typeof tt !== 'undefined' ? tt : null;
    if (api && api.onTouchStart) {
      this.safeBind(api, 'onTouchStart', (event) => this.handleTouchStart(this.eventTouches(event)));
      this.safeBind(api, 'onTouchMove', (event) => this.handleTouchMove(this.eventTouches(event)));
      this.safeBind(api, 'onTouchEnd', (event) => this.handleTouchEnd(event.changedTouches || event.touches || []));
      if (api.onTouchCancel) {
        this.safeBind(api, 'onTouchCancel', (event) => this.handleTouchEnd(event.changedTouches || event.touches || []));
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
        domCanvas.addEventListener('touchstart', (event) => this.domTouch(event, 'start'), { passive: false });
        domCanvas.addEventListener('touchmove', (event) => this.domTouch(event, 'move'), { passive: false });
        domCanvas.addEventListener('touchend', (event) => this.domTouch(event, 'end'), { passive: false });
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
    if (key === 'a' || key === 'arrowleft') this.left = down || this.gestureAxis < -0.2;
    if (key === 'd' || key === 'arrowright') this.right = down || this.gestureAxis > 0.2;
    if (key === 'w' || key === 'arrowup' || key === ' ') this.jump = down;
    if (down && (key === 'w' || key === 'arrowup' || key === ' ')) this.jumpPressed = true;
    if (down && (key === 'enter' || key === ' ')) this.start = true;
    if (down && key === 'r') this.restart = true;
    if (down && key === 'escape') this.escape = true;
  }

  domTouch(event, phase) {
    event.preventDefault();
    const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const touches = Array.prototype.map.call(event.touches, (touch) => ({
      identifier: touch.identifier,
      clientX: touch.clientX - rect.left,
      clientY: touch.clientY - rect.top
    }));
    const changed = Array.prototype.map.call(event.changedTouches || event.touches, (touch) => ({
      identifier: touch.identifier,
      clientX: touch.clientX - rect.left,
      clientY: touch.clientY - rect.top
    }));
    if (phase === 'start') this.handleTouchStart(touches);
    else if (phase === 'move') this.handleTouchMove(touches);
    else this.handleTouchEnd(changed);
  }

  pointer(event, active) {
    const rect = this.canvas.getBoundingClientRect ? this.canvas.getBoundingClientRect() : { left: 0, top: 0 };
    const touch = {
      identifier: 'mouse',
      clientX: event.clientX - rect.left,
      clientY: event.clientY - rect.top
    };
    if (active) {
      if (!this.touchActive) this.handleTouchStart([touch]);
      else this.handleTouchMove([touch]);
    } else {
      this.handleTouchEnd([touch]);
    }
  }

  handleTouchStart(touches) {
    if (!touches || touches.length === 0) return;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const id = touch.identifier || i;
      const point = this.readTouchPoint(touch);
      const p = this.toVirtual(point.x, point.y);
      this.touches[id] = p;
      if (this.primaryTouchId === null) {
        this.primaryTouchId = id;
        this.primaryStart = { x: p.x, y: p.y, time: Date.now() };
        this.primaryCurrent = { x: p.x, y: p.y };
        this.touchActive = true;
      }
    }
    this.updateGesture();
  }

  handleTouchMove(touches) {
    if (!touches || touches.length === 0) return;
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      const id = touch.identifier || i;
      const point = this.readTouchPoint(touch);
      const p = this.toVirtual(point.x, point.y);
      this.touches[id] = p;
      if (id === this.primaryTouchId) {
        this.primaryCurrent = { x: p.x, y: p.y };
      }
    }
    this.updateGesture();
  }

  handleTouchEnd(touches) {
    const endedIds = {};
    for (let i = 0; i < touches.length; i++) {
      const touch = touches[i];
      endedIds[touch.identifier || i] = true;
    }

    if (this.primaryTouchId !== null && (endedIds[this.primaryTouchId] || touches.length === 0)) {
      this.finishPrimaryGesture();
    }

    Object.keys(endedIds).forEach((id) => {
      delete this.touches[id];
    });

    if (Object.keys(this.touches).length === 0) {
      this.resetTouch();
    } else if (this.primaryTouchId === null) {
      const nextId = Object.keys(this.touches)[0];
      const p = this.touches[nextId];
      this.primaryTouchId = nextId;
      this.primaryStart = { x: p.x, y: p.y, time: Date.now() };
      this.primaryCurrent = { x: p.x, y: p.y };
      this.touchActive = true;
      this.updateGesture();
    }
  }

  finishPrimaryGesture() {
    if (!this.primaryStart || !this.primaryCurrent) return;
    const dx = this.primaryCurrent.x - this.primaryStart.x;
    const dy = this.primaryCurrent.y - this.primaryStart.y;
    const dt = Math.max(1, Date.now() - this.primaryStart.time);
    const distance = Math.sqrt(dx * dx + dy * dy);
    const quickTap = distance < 18 && dt < 280;
    const upwardSwipe = dy < -34 && Math.abs(dy) > Math.abs(dx) * 0.65;
    if (quickTap || upwardSwipe) {
      this.jump = true;
      this.jumpPressed = true;
      this.start = true;
      this.restart = true;
    }
  }

  resetTouch() {
    this.touches = {};
    this.primaryTouchId = null;
    this.primaryStart = null;
    this.primaryCurrent = null;
    this.gestureAxis = 0;
    this.touchActive = false;
    this.left = false;
    this.right = false;
    this.jump = false;
  }

  updateGesture() {
    if (!this.primaryStart || !this.primaryCurrent) return;
    const dx = this.primaryCurrent.x - this.primaryStart.x;
    this.gestureAxis = clamp(dx / 54, -1, 1);
    this.left = this.gestureAxis < -0.18;
    this.right = this.gestureAxis > 0.18;
    this.jump = false;

    const p = this.primaryCurrent;
    if (p.y > 292 && p.y < 388 && p.x > 84 && p.x < 306) {
      this.start = true;
      this.restart = true;
    }
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

  drawHintPhase(phase) {
    if (phase === PHASE.menu) return 'menu';
    if (phase === PHASE.gameOver) return 'restart';
    return 'playing';
  }
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
