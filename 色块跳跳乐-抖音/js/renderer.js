const { VIEW, PHASE, PLATFORM, COLORS } = require('./constants');

class Renderer {
  constructor(canvas, ctx) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.scale = 1;
    this.offsetX = 0;
    this.offsetY = 0;
  }

  resize(width, height, dpr) {
    this.canvas.width = Math.floor(width * dpr);
    this.canvas.height = Math.floor(height * dpr);
    if (this.canvas.style) {
      this.canvas.style.width = width + 'px';
      this.canvas.style.height = height + 'px';
    }
    this.scale = Math.min(this.canvas.width / VIEW.width, this.canvas.height / VIEW.height);
    this.offsetX = (this.canvas.width - VIEW.width * this.scale) * 0.5;
    this.offsetY = (this.canvas.height - VIEW.height * this.scale) * 0.5;
  }

  render(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    ctx.translate(this.offsetX, this.offsetY);
    ctx.scale(this.scale, this.scale);

    this.background();
    this.world(state);
    this.hud(state);
    this.touchControls(state.phase);
    if (state.phase === PHASE.menu) this.menu(state);
    if (state.phase === PHASE.gameOver) this.gameOver(state);

    ctx.restore();
  }

  background() {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, VIEW.height);
    gradient.addColorStop(0, COLORS.bgTop);
    gradient.addColorStop(0.55, '#17213f');
    gradient.addColorStop(1, COLORS.bgBottom);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);

    ctx.fillStyle = 'rgba(62, 226, 255, .08)';
    ctx.beginPath();
    ctx.arc(VIEW.width * 0.5, 120, 260, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = 'rgba(255,255,255,.13)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) {
      ctx.beginPath();
      const y = 180 + i * 118;
      ctx.moveTo(0, y);
      for (let x = 0; x <= VIEW.width; x += 34) {
        ctx.lineTo(x, y + Math.sin(x * 0.025 + i) * 10);
      }
      ctx.stroke();
    }

    ctx.fillStyle = 'rgba(255,255,255,.3)';
    for (let i = 0; i < 32; i++) {
      const x = (i * 73) % VIEW.width;
      const y = (i * 109) % (VIEW.height * 0.72);
      ctx.fillRect(x, y, 2, 2);
    }
  }

  world(state) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(0, VIEW.height * 0.5 - state.cameraY);

    state.platforms.forEach((platform) => this.platform(platform));
    this.player(state);
    state.particles.forEach((particle) => this.particle(particle));
    state.floatTexts.forEach((label) => this.floatText(label));

    ctx.restore();
  }

  platform(platform) {
    if (!platform.active && platform.alpha <= 0) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = platform.alpha;
    ctx.translate(platform.x, platform.y);

    ctx.fillStyle = 'rgba(0,0,0,.22)';
    roundRect(ctx, -platform.w * 0.5 + 4, -platform.h * 0.5 + 8, platform.w, platform.h, 13);
    ctx.fill();

    ctx.fillStyle = platform.color;
    roundRect(ctx, -platform.w * 0.5, -platform.h * 0.5, platform.w, platform.h, 13);
    ctx.fill();

    ctx.fillStyle = 'rgba(255,255,255,.35)';
    roundRect(ctx, -platform.w * 0.5 + 10, -platform.h * 0.5 + 5, platform.w - 20, 7, 4);
    ctx.fill();

    ctx.fillStyle = 'rgba(20, 24, 40, .55)';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(iconFor(platform.type), 0, 1);
    ctx.restore();
  }

  player(state) {
    const p = state.player;
    if (state.phase === PHASE.menu) return;
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.tilt);
    ctx.scale(p.scaleX, p.scaleY);

    const gradient = ctx.createLinearGradient(-22, -22, 22, 22);
    gradient.addColorStop(0, COLORS.playerA);
    gradient.addColorStop(1, COLORS.playerB);
    ctx.fillStyle = 'rgba(0,0,0,.25)';
    roundRect(ctx, -18, -15, 42, 42, 11);
    ctx.fill();
    ctx.fillStyle = gradient;
    roundRect(ctx, -21, -21, 42, 42, 11);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.42)';
    ctx.lineWidth = 2;
    roundRect(ctx, -16, -16, 32, 32, 8);
    ctx.stroke();

    ctx.fillStyle = '#10243f';
    ctx.beginPath();
    ctx.arc(-7, -3, 2.7, 0, Math.PI * 2);
    ctx.arc(7, -3, 2.7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#10243f';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 5, 7, 0.15, Math.PI - 0.15);
    ctx.stroke();
    ctx.restore();
  }

  particle(particle) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, particle.life / particle.maxLife);
    ctx.fillStyle = particle.color;
    ctx.translate(particle.x, particle.y);
    ctx.rotate(particle.x * 0.02);
    ctx.fillRect(-particle.size * 0.5, -particle.size * 0.5, particle.size, particle.size);
    ctx.restore();
  }

  floatText(label) {
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = Math.max(0, label.life / 0.85);
    ctx.fillStyle = label.color;
    ctx.strokeStyle = 'rgba(0,0,0,.55)';
    ctx.lineWidth = 4;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.strokeText(label.text, label.x, label.y);
    ctx.fillText(label.text, label.x, label.y);
    ctx.restore();
  }

  hud(state) {
    if (state.phase !== PHASE.playing) return;
    const ctx = this.ctx;
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText('高度 ' + Math.floor(state.height) + 'm', 18, 32);
    ctx.font = '16px sans-serif';
    ctx.fillStyle = COLORS.muted;
    ctx.fillText('最高 ' + Math.floor(state.best) + 'm', 18, 56);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('连跳 x' + state.combo, VIEW.width - 18, 32);
    if (state.reverseTimer > 0) {
      ctx.fillStyle = COLORS.reverse;
      ctx.fillText('左右反向', VIEW.width - 18, 58);
    }
  }

  menu(state) {
    this.panel();
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#bafcf1';
    ctx.font = 'bold 42px sans-serif';
    ctx.fillText('色块跳跳乐', VIEW.width * 0.5, 190);
    ctx.fillStyle = COLORS.text;
    ctx.font = '18px sans-serif';
    ctx.fillText('看颜色，踩平台，向上冲。', VIEW.width * 0.5, 232);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '15px sans-serif';
    ctx.fillText('左下移动，右下跳跃', VIEW.width * 0.5, 264);
    this.button('开始', 110, 316, 170, 54, COLORS.spring);
    ctx.fillStyle = COLORS.muted;
    ctx.font = '14px sans-serif';
    ctx.fillText('开发工具里也可用 A/D + Space', VIEW.width * 0.5, 410);
    ctx.fillText('最高纪录 ' + Math.floor(state.best) + 'm', VIEW.width * 0.5, 440);
  }

  gameOver(state) {
    this.panel();
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#ffd3dc';
    ctx.font = 'bold 40px sans-serif';
    ctx.fillText('掉下去了', VIEW.width * 0.5, 206);
    ctx.fillStyle = COLORS.text;
    ctx.font = '20px sans-serif';
    ctx.fillText('本局 ' + Math.floor(state.height) + 'm    最高 ' + Math.floor(state.best) + 'm', VIEW.width * 0.5, 260);
    this.button('再跳一次', 106, 320, 178, 54, COLORS.crumble);
  }

  panel() {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(5,8,18,.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  }

  button(text, x, y, w, h, color) {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    roundRect(ctx, x, y, w, h, 16);
    ctx.fill();
    ctx.fillStyle = '#10243f';
    ctx.font = 'bold 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + w * 0.5, y + h * 0.5);
    ctx.textBaseline = 'alphabetic';
  }

  touchControls(phase) {
    const ctx = this.ctx;
    if (phase !== PHASE.playing) return;
    ctx.save();
    ctx.globalAlpha = 0.78;
    this.controlButton(28, VIEW.height - 112, 70, '←');
    this.controlButton(118, VIEW.height - 112, 70, '→');
    this.controlButton(VIEW.width - 104, VIEW.height - 122, 82, '跳');
    ctx.restore();
  }

  controlButton(x, y, size, text) {
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,.14)';
    roundRect(ctx, x, y, size, size, 18);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.28)';
    ctx.lineWidth = 2;
    roundRect(ctx, x, y, size, size, 18);
    ctx.stroke();
    ctx.fillStyle = COLORS.text;
    ctx.font = 'bold 24px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x + size * 0.5, y + size * 0.5);
    ctx.textBaseline = 'alphabetic';
  }
}

function iconFor(type) {
  if (type === PLATFORM.spring) return '↑';
  if (type === PLATFORM.moving) return '↔';
  if (type === PLATFORM.crumble) return '✦';
  if (type === PLATFORM.reverse) return '⇄';
  return '◆';
}

function roundRect(ctx, x, y, w, h, r) {
  const radius = Math.min(r, w * 0.5, h * 0.5);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

module.exports = Renderer;
