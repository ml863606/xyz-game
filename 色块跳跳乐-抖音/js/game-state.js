const { VIEW, PHASE, PLATFORM } = require('./constants');

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rand(min, max) {
  return min + Math.random() * (max - min);
}

class GameState {
  constructor(input) {
    this.input = input;
    this.best = this.loadBest();
    this.phase = PHASE.menu;
    this.platforms = [];
    this.particles = [];
    this.floatTexts = [];
    this.cameraY = 0;
    this.height = 0;
    this.combo = 0;
    this.highestGeneratedY = 0;
    this.reverseTimer = 0;
    this.player = this.createPlayer();
  }

  createPlayer() {
    return {
      x: VIEW.width * 0.5,
      y: 520,
      w: 38,
      h: 38,
      vx: 0,
      vy: 0,
      grounded: false,
      coyote: 0,
      jumpBuffer: 0,
      jumpHeld: false,
      scaleX: 1,
      scaleY: 1,
      tilt: 0,
      dead: false
    };
  }

  start() {
    this.phase = PHASE.playing;
    this.platforms = [];
    this.particles = [];
    this.floatTexts = [];
    this.cameraY = 250;
    this.height = 0;
    this.combo = 0;
    this.reverseTimer = 0;
    this.highestGeneratedY = 620;
    this.player = this.createPlayer();
    this.player.x = VIEW.width * 0.5;
    this.player.y = 520;
    this.addPlatform(VIEW.width * 0.5, 650, 290, PLATFORM.normal);
    for (let i = 0; i < 12; i++) {
      this.highestGeneratedY -= 82 + i * 5;
      this.addRandomPlatform(this.highestGeneratedY);
    }
  }

  goMenu() {
    this.phase = PHASE.menu;
  }

  update(dt) {
    if (this.input.consumeEscape()) {
      this.phase = PHASE.menu;
    }

    if (this.phase === PHASE.menu) {
      if (this.input.consumeStart()) this.start();
      this.updateEffects(dt);
      return;
    }

    if (this.phase === PHASE.gameOver) {
      if (this.input.consumeRestart() || this.input.consumeStart()) this.start();
      this.updateEffects(dt);
      return;
    }

    if (this.input.consumeRestart()) this.start();
    this.updatePlaying(dt);
  }

  updatePlaying(dt) {
    this.reverseTimer = Math.max(0, this.reverseTimer - dt);
    const p = this.player;
    const jumpDown = this.input.jump;
    if (this.input.consumeJumpPress() || (jumpDown && !p.jumpHeld)) p.jumpBuffer = 0.13;
    p.jumpHeld = jumpDown;

    const reversed = this.reverseTimer > 0 ? -1 : 1;
    let axis = 0;
    if (this.input.left) axis -= 1;
    if (this.input.right) axis += 1;
    axis *= reversed;

    const targetVx = axis * 255;
    const accel = p.grounded ? 2350 : 1700;
    p.vx = moveToward(p.vx, targetVx, accel * dt);
    if (axis === 0) p.vx = moveToward(p.vx, 0, 1800 * dt);

    p.vy += 1450 * dt;
    p.coyote = Math.max(0, p.coyote - dt);
    p.jumpBuffer = Math.max(0, p.jumpBuffer - dt);
    if (p.grounded) p.coyote = 0.11;

    if (p.jumpBuffer > 0 && p.coyote > 0) {
      p.vy = -650;
      p.jumpBuffer = 0;
      p.coyote = 0;
      p.grounded = false;
      this.burst(p.x, p.y + p.h * 0.5, '#8ff7ff', 10);
    }

    const oldBottom = p.y + p.h * 0.5;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.x < -28) p.x = VIEW.width + 28;
    if (p.x > VIEW.width + 28) p.x = -28;
    p.grounded = false;

    this.updatePlatforms(dt);
    this.resolvePlatformLanding(oldBottom);
    this.updateCamera(dt);
    this.generateAhead();
    this.cleanup();
    this.updateEffects(dt);
    this.height = Math.max(this.height, (650 - p.y) / 12);
    this.best = Math.max(this.best, this.height);

    if (p.y > this.cameraY + VIEW.height * 0.5 + 96) {
      this.gameOver();
    }

    const targetScaleX = p.grounded ? 1.14 : (p.vy < -30 ? 0.9 : 1.08);
    const targetScaleY = p.grounded ? 0.86 : (p.vy < -30 ? 1.18 : 0.94);
    p.scaleX += (targetScaleX - p.scaleX) * Math.min(1, dt * 12);
    p.scaleY += (targetScaleY - p.scaleY) * Math.min(1, dt * 12);
    p.tilt += ((axis * 0.18) - p.tilt) * Math.min(1, dt * 10);
  }

  resolvePlatformLanding(oldBottom) {
    const p = this.player;
    if (p.vy < 0) return;
    const newBottom = p.y + p.h * 0.5;

    for (let i = 0; i < this.platforms.length; i++) {
      const platform = this.platforms[i];
      if (!platform.active) continue;
      const top = platform.y - platform.h * 0.5;
      const withinX = p.x + p.w * 0.35 > platform.x - platform.w * 0.5 &&
        p.x - p.w * 0.35 < platform.x + platform.w * 0.5;
      if (withinX && oldBottom <= top && newBottom >= top) {
        p.y = top - p.h * 0.5;
        p.vy = 0;
        p.grounded = true;
        p.coyote = 0.11;
        this.activatePlatform(platform);
        return;
      }
    }
  }

  activatePlatform(platform) {
    const accuracy = clamp(1 - Math.abs(this.player.x - platform.x) / (platform.w * 0.5), 0, 1);
    if (accuracy > 0.62) {
      this.combo += 1;
      this.floatText('+' + this.combo, platform.x, platform.y - 50, '#facc15');
    } else {
      this.combo = 0;
    }

    if (platform.type === PLATFORM.spring) {
      this.player.vy = -820;
      this.burst(platform.x, platform.y, platform.color, 16);
      this.floatText('弹跳!', platform.x, platform.y - 70, platform.color);
    } else if (platform.type === PLATFORM.crumble && !platform.crumbling) {
      platform.crumbling = 0.62;
      this.floatText('碎裂!', platform.x, platform.y - 70, platform.color);
    } else if (platform.type === PLATFORM.reverse) {
      this.reverseTimer = 2.1;
      this.player.vx += this.player.x < platform.x ? -190 : 190;
      this.burst(platform.x, platform.y, platform.color, 12);
      this.floatText('反向!', platform.x, platform.y - 70, platform.color);
    }
  }

  updatePlatforms(dt) {
    this.platforms.forEach((platform) => {
      if (platform.type === PLATFORM.moving) {
        platform.moveTime += dt;
        platform.x = platform.homeX + Math.sin(platform.moveTime * platform.speed * Math.PI * 2) * platform.range;
      }
      if (platform.crumbling) {
        platform.crumbling -= dt;
        platform.alpha = Math.max(0, platform.crumbling / 0.62);
        if (platform.crumbling <= 0 && platform.active) {
          platform.active = false;
          this.burst(platform.x, platform.y, platform.color, 18);
        }
      }
    });
  }

  updateCamera(dt) {
    const target = this.player.y - 120;
    if (target < this.cameraY) {
      this.cameraY += (target - this.cameraY) * Math.min(1, dt * 5);
    }
  }

  generateAhead() {
    while (this.highestGeneratedY > this.cameraY - 560) {
      const difficulty = this.difficultyAt(this.highestGeneratedY);
      this.highestGeneratedY -= 82 + difficulty * 60 + rand(-10, 18);
      this.addRandomPlatform(this.highestGeneratedY);
    }
  }

  addRandomPlatform(y) {
    const difficulty = this.difficultyAt(y);
    const width = rand(150, 250) - difficulty * 54;
    const x = rand(width * 0.5 + 28, VIEW.width - width * 0.5 - 28);
    this.addPlatform(x, y, width, this.rollType(difficulty));
  }

  addPlatform(x, y, width, type) {
    const colorMap = {
      [PLATFORM.normal]: '#4ade80',
      [PLATFORM.spring]: '#38bdf8',
      [PLATFORM.moving]: '#facc15',
      [PLATFORM.crumble]: '#fb7185',
      [PLATFORM.reverse]: '#a78bfa'
    };
    this.platforms.push({
      x,
      y,
      w: width,
      h: 26,
      type,
      color: colorMap[type],
      active: true,
      alpha: 1,
      homeX: x,
      range: 46 + this.difficultyAt(y) * 46,
      speed: 0.65 + this.difficultyAt(y) * 0.65,
      moveTime: rand(0, 2)
    });
  }

  rollType(difficulty) {
    let r = Math.random();
    const spring = 0.13 + difficulty * 0.05;
    const moving = 0.05 + difficulty * 0.14;
    const crumble = 0.02 + difficulty * 0.14;
    const reverse = 0.01 + difficulty * 0.09;
    if (r < spring) return PLATFORM.spring;
    r -= spring;
    if (r < moving) return PLATFORM.moving;
    r -= moving;
    if (r < crumble) return PLATFORM.crumble;
    r -= crumble;
    if (r < reverse) return PLATFORM.reverse;
    return PLATFORM.normal;
  }

  difficultyAt(y) {
    return clamp((650 - y) / 1500, 0, 1);
  }

  cleanup() {
    const bottom = this.cameraY + VIEW.height * 0.5 + 260;
    this.platforms = this.platforms.filter((platform) => platform.y < bottom && platform.alpha > 0.01);
  }

  gameOver() {
    this.phase = PHASE.gameOver;
    this.saveBest();
    this.burst(this.player.x, this.player.y, '#79f2ff', 26);
  }

  burst(x, y, color, count) {
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x,
        y,
        vx: rand(-120, 120),
        vy: rand(-220, 80),
        life: rand(0.34, 0.72),
        maxLife: 0.72,
        size: rand(3, 8),
        color
      });
    }
  }

  floatText(text, x, y, color) {
    this.floatTexts.push({
      text,
      x,
      y,
      vy: -42,
      life: 0.85,
      color
    });
  }

  updateEffects(dt) {
    this.particles.forEach((particle) => {
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 460 * dt;
      particle.life -= dt;
    });
    this.particles = this.particles.filter((particle) => particle.life > 0);

    this.floatTexts.forEach((label) => {
      label.y += label.vy * dt;
      label.life -= dt;
    });
    this.floatTexts = this.floatTexts.filter((label) => label.life > 0);
  }

  loadBest() {
    try {
      if (typeof tt !== 'undefined' && tt.getStorageSync) return Number(tt.getStorageSync('colorBlockBest') || 0);
      if (typeof localStorage !== 'undefined') return Number(localStorage.getItem('colorBlockBest') || 0);
    } catch (error) {
      return 0;
    }
    return 0;
  }

  saveBest() {
    try {
      const value = String(Math.floor(this.best));
      if (typeof tt !== 'undefined' && tt.setStorageSync) tt.setStorageSync('colorBlockBest', value);
      if (typeof localStorage !== 'undefined') localStorage.setItem('colorBlockBest', value);
    } catch (error) {
      // Storage is optional in preview-like runtimes.
    }
  }
}

function moveToward(value, target, delta) {
  if (value < target) return Math.min(value + delta, target);
  if (value > target) return Math.max(value - delta, target);
  return value;
}

module.exports = GameState;
