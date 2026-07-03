"use strict";

(function () {
  var DESIGN_W = 720;
  var DESIGN_H = 1280;
  var ROUND_SECONDS = 60;
  var LAUNCH = { x: 360, y: 1120 };
  var MAX_DRAG = 250;
  var ENERGY_MAX = 100;

  var ttApi = typeof tt !== "undefined" ? tt : null;
  var canvas = createGameCanvas();
  var ctx = canvas.getContext("2d");
  var dpr = 1;
  var screenW = DESIGN_W;
  var screenH = DESIGN_H;
  var scale = 1;
  var offsetX = 0;
  var offsetY = 0;

  var state = "playing";
  var level = 1;
  var score = 0;
  var targetScore = 520;
  var bestScore = 0;
  var timeLeft = ROUND_SECONDS;
  var combo = 0;
  var energy = 0;
  var frenzyLeft = 0;
  var freezeLeft = 0;
  var spawnTimer = 0;
  var mission = null;
  var missionDone = false;
  var dragging = false;
  var dragCurrent = { x: LAUNCH.x, y: LAUNCH.y };
  var lastTime = Date.now();
  var shakeLeft = 0;
  var shakePower = 0;
  var flash = { a: 0, color: "#ffffff" };

  var balloons = [];
  var darts = [];
  var particles = [];
  var rings = [];
  var bolts = [];
  var rockets = [];
  var floatingTexts = [];

  var kinds = {
    NORMAL: "normal",
    GOLD: "gold",
    BOMB: "bomb",
    SHIELD: "shield",
    CLOCK: "clock",
    THUNDER: "thunder",
    BLACK_HOLE: "black_hole",
    ROCKET: "rocket",
    NUKE: "nuke"
  };

  resize();
  loadBestScore();
  bindInput();
  startRound(1);
  loop();

  function createGameCanvas() {
    if (ttApi && ttApi.createCanvas) {
      return ttApi.createCanvas();
    }
    if (typeof document !== "undefined") {
      var c = document.createElement("canvas");
      document.body.style.margin = "0";
      document.body.style.background = "#77cdfd";
      document.body.appendChild(c);
      return c;
    }
    return {
      width: DESIGN_W,
      height: DESIGN_H,
      getContext: function () {
        return {};
      }
    };
  }

  function resize() {
    var info = ttApi && ttApi.getSystemInfoSync ? ttApi.getSystemInfoSync() : null;
    screenW = info ? info.windowWidth : (typeof window !== "undefined" ? window.innerWidth : DESIGN_W);
    screenH = info ? info.windowHeight : (typeof window !== "undefined" ? window.innerHeight : DESIGN_H);
    dpr = info ? (info.pixelRatio || 1) : (typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1);
    canvas.width = Math.floor(screenW * dpr);
    canvas.height = Math.floor(screenH * dpr);
    canvas.style && (canvas.style.width = screenW + "px");
    canvas.style && (canvas.style.height = screenH + "px");
    scale = Math.min(screenW / DESIGN_W, screenH / DESIGN_H);
    offsetX = (screenW - DESIGN_W * scale) * 0.5;
    offsetY = (screenH - DESIGN_H * scale) * 0.5;
  }

  function bindInput() {
    if (ttApi && ttApi.onTouchStart) {
      ttApi.onTouchStart(function (event) {
        var t = event.touches && event.touches[0];
        if (t) beginDrag(toGamePoint(t.clientX, t.clientY));
      });
      ttApi.onTouchMove(function (event) {
        var t = event.touches && event.touches[0];
        if (t) moveDrag(toGamePoint(t.clientX, t.clientY));
      });
      ttApi.onTouchEnd(function (event) {
        var t = event.changedTouches && event.changedTouches[0];
        endDrag(t ? toGamePoint(t.clientX, t.clientY) : dragCurrent);
      });
      return;
    }
    if (canvas.addEventListener) {
      canvas.addEventListener("mousedown", function (event) {
        beginDrag(toGamePoint(event.clientX, event.clientY));
      });
      canvas.addEventListener("mousemove", function (event) {
        moveDrag(toGamePoint(event.clientX, event.clientY));
      });
      canvas.addEventListener("mouseup", function (event) {
        endDrag(toGamePoint(event.clientX, event.clientY));
      });
      canvas.addEventListener("touchstart", function (event) {
        beginDrag(toGamePoint(event.touches[0].clientX, event.touches[0].clientY));
      }, { passive: true });
      canvas.addEventListener("touchmove", function (event) {
        moveDrag(toGamePoint(event.touches[0].clientX, event.touches[0].clientY));
      }, { passive: true });
      canvas.addEventListener("touchend", function (event) {
        var t = event.changedTouches[0];
        endDrag(toGamePoint(t.clientX, t.clientY));
      }, { passive: true });
    }
  }

  function toGamePoint(x, y) {
    return {
      x: (x - offsetX) / scale,
      y: (y - offsetY) / scale
    };
  }

  function startRound(nextLevel) {
    level = Math.max(1, Math.min(3, nextLevel));
    targetScore = level === 1 ? 520 : level === 2 ? 780 : 1080;
    state = "playing";
    score = 0;
    combo = 0;
    energy = 0;
    frenzyLeft = 0;
    freezeLeft = 0;
    timeLeft = ROUND_SECONDS;
    spawnTimer = 0.1;
    balloons.length = 0;
    darts.length = 0;
    particles.length = 0;
    rings.length = 0;
    bolts.length = 0;
    rockets.length = 0;
    floatingTexts.length = 0;
    mission = makeMission();
    missionDone = false;
    spawnOpeningTargets();
  }

  function makeMission() {
    var options = [
      { type: "combo", text: "连击", goal: 5, progress: 0 },
      { type: "gold", text: "金气球", goal: 2, progress: 0 },
      { type: "clean_score", text: "无炸弹得分", goal: 300, progress: 0 },
      { type: "red", text: "红气球", goal: 5, progress: 0 }
    ];
    return options[Math.floor(Math.random() * options.length)];
  }

  function spawnOpeningTargets() {
    addBalloon(kinds.NORMAL, 150, 610, 46, 16, -18);
    addBalloon(kinds.GOLD, 410, 485, 42, -10, -14);
    addBalloon(kinds.BOMB, 270, 805, 40, 12, -12);
    addBalloon(kinds.SHIELD, 560, 525, 40, -8, -12);
    addBalloon(kinds.THUNDER, 355, 650, 42, 5, -10);
    addBalloon(kinds.ROCKET, 650, 430, 40, -16, -8);
    addBalloon(kinds.NUKE, 360, 710, 44, 0, -10);
  }

  function addBalloon(kind, x, y, r, vx, vy) {
    balloons.push({
      kind: kind,
      x: x,
      y: y,
      r: r,
      vx: vx,
      vy: vy,
      wobble: Math.random() * Math.PI * 2,
      age: 0,
      hits: kind === kinds.SHIELD ? 2 : 1,
      dead: false,
      popAge: 0
    });
  }

  function spawnBalloon() {
    var roll = Math.random();
    var kind = kinds.NORMAL;
    var bomb = level === 1 ? 0.07 : level === 2 ? 0.1 : 0.14;
    var gold = level === 1 ? 0.14 : 0.13;
    var shield = level >= 2 ? 0.16 : 0;
    var clock = level >= 3 ? 0.1 : 0;
    if (roll < bomb) kind = kinds.BOMB;
    else if (roll < bomb + gold) kind = kinds.GOLD;
    else if (roll < bomb + gold + shield) kind = kinds.SHIELD;
    else if (roll < bomb + gold + shield + clock) kind = kinds.CLOCK;
    else if (level === 1 && roll > 0.94) kind = Math.random() < 0.55 ? kinds.THUNDER : kinds.ROCKET;
    else if (level === 2 && roll > 0.91) kind = pick([kinds.THUNDER, kinds.ROCKET, kinds.BLACK_HOLE]);
    else if (level >= 3 && roll > 0.88) kind = pick([kinds.THUNDER, kinds.ROCKET, kinds.BLACK_HOLE, kinds.NUKE]);

    var side = Math.random() < 0.5 ? -1 : 1;
    var x = side < 0 ? -80 : 800;
    var speed = level === 1 ? 92 : level === 2 ? 128 : 168;
    addBalloon(kind, x, rand(250, 880), rand(34, 52), -side * rand(speed * 0.45, speed), -rand(30, 85));
  }

  function loop() {
    var now = Date.now();
    var dt = Math.min(0.033, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    draw();
    requestFrame(loop);
  }

  function requestFrame(fn) {
    if (typeof requestAnimationFrame !== "undefined") requestAnimationFrame(fn);
    else setTimeout(fn, 16);
  }

  function update(dt) {
    if (state === "playing") {
      if (freezeLeft > 0) freezeLeft = Math.max(0, freezeLeft - dt);
      else timeLeft = Math.max(0, timeLeft - dt);
      if (frenzyLeft > 0) frenzyLeft = Math.max(0, frenzyLeft - dt);
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawnBalloon();
        spawnTimer = level === 1 ? 0.7 : level === 2 ? 0.56 : 0.44;
      }
      if (timeLeft <= 0) finishRound();
    }
    updateBalloons(dt);
    updateDarts(dt);
    updateRockets(dt);
    updateEffects(dt);
  }

  function updateBalloons(dt) {
    balloons.forEach(function (b) {
      b.age += dt;
      if (b.dead) {
        b.popAge += dt;
        return;
      }
      b.x += b.vx * dt + Math.sin(b.age * 3 + b.wobble) * 18 * dt;
      b.y += b.vy * dt;
      if (b.y < -120 || b.y > 1160 || b.x < -160 || b.x > 880) b.dead = true;
    });
    for (var i = balloons.length - 1; i >= 0; i--) {
      if (balloons[i].dead && balloons[i].popAge > 0.35) balloons.splice(i, 1);
    }
  }

  function updateDarts(dt) {
    var wind = level === 1 ? 0 : level === 2 ? 35 : -45;
    for (var i = darts.length - 1; i >= 0; i--) {
      var d = darts[i];
      d.vx += wind * dt;
      d.vy += 620 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.trail.push({ x: d.x, y: d.y });
      if (d.trail.length > 12) d.trail.shift();
      for (var j = 0; j < balloons.length; j++) {
        var b = balloons[j];
        if (!b.dead && dist(d.x, d.y, b.x, b.y) < b.r + 16) {
          darts.splice(i, 1);
          hitBalloon(b);
          break;
        }
      }
      if (d.x < -120 || d.x > 840 || d.y < -180 || d.y > 1350) {
        darts.splice(i, 1);
        combo = 0;
      }
    }
  }

  function updateRockets(dt) {
    for (var i = rockets.length - 1; i >= 0; i--) {
      var r = rockets[i];
      if (!r.target || r.target.dead) {
        rockets.splice(i, 1);
        continue;
      }
      var angle = Math.atan2(r.target.y - r.y, r.target.x - r.x);
      r.vx = lerp(r.vx, Math.cos(angle) * 520, 0.12);
      r.vy = lerp(r.vy, Math.sin(angle) * 520, 0.12);
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      r.trail.push({ x: r.x, y: r.y });
      if (r.trail.length > 16) r.trail.shift();
      r.life -= dt;
      if (dist(r.x, r.y, r.target.x, r.target.y) < 34) {
        shockwave(r.target.x, r.target.y, "#ff7a30", 120);
        popByPower(r.target, kinds.ROCKET);
        rockets.splice(i, 1);
      } else if (r.life <= 0) rockets.splice(i, 1);
    }
  }

  function updateEffects(dt) {
    [particles, rings, bolts, floatingTexts].forEach(function (arr) {
      for (var i = arr.length - 1; i >= 0; i--) {
        arr[i].age += dt;
        if (arr[i].age >= arr[i].life) arr.splice(i, 1);
      }
    });
    particles.forEach(function (p) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 90 * dt;
    });
    flash.a = Math.max(0, flash.a - dt * 2.8);
    shakeLeft = Math.max(0, shakeLeft - dt);
    shakePower = Math.max(0, shakePower - dt * 38);
  }

  function beginDrag(p) {
    if (state !== "playing") {
      if (state === "win") startRound(Math.min(3, level + 1));
      else startRound(level);
      return;
    }
    if (dist(p.x, p.y, LAUNCH.x, LAUNCH.y) > 260) return;
    dragging = true;
    dragCurrent = p;
  }

  function moveDrag(p) {
    if (dragging) dragCurrent = p;
  }

  function endDrag(p) {
    if (!dragging) return;
    dragging = false;
    dragCurrent = p;
    var v = aimVector();
    var len = Math.min(MAX_DRAG, Math.sqrt(v.x * v.x + v.y * v.y));
    if (len < 18) return;
    var power = lerp(320, 1180, len / MAX_DRAG);
    var bonus = frenzyLeft > 0 ? 1.25 : 1;
    darts.push({
      x: LAUNCH.x,
      y: LAUNCH.y,
      vx: v.x / len * power * bonus,
      vy: v.y / len * power * bonus,
      trail: []
    });
  }

  function aimVector() {
    var x = dragCurrent.x - LAUNCH.x;
    var y = dragCurrent.y - LAUNCH.y;
    if (y > -12) y = -12;
    return { x: x, y: y };
  }

  function hitBalloon(b) {
    if (b.kind === kinds.SHIELD && b.hits > 1) {
      b.hits -= 1;
      b.r *= 0.92;
      floatingText(b.x, b.y - 55, "破盾!");
      shockwave(b.x, b.y, "#66e0ff", 92);
      return;
    }
    if ([kinds.THUNDER, kinds.BLACK_HOLE, kinds.ROCKET, kinds.NUKE].indexOf(b.kind) >= 0) {
      triggerPowerup(b);
      b.dead = true;
      return;
    }
    resolveHit(b);
    b.dead = true;
  }

  function resolveHit(b) {
    var text = "";
    var color = "#ff4f73";
    var base = 25;
    var gainEnergy = 12;
    if (b.kind === kinds.BOMB) {
      combo = 0;
      timeLeft = Math.max(0, timeLeft - 5);
      energy = Math.max(0, energy - 18);
      flashScreen("rgba(255,20,20,0.32)");
      shake(0.28, 16);
      burst(b.x, b.y, "#30384d", 14);
      floatingText(b.x, b.y - 55, "-5s 断连");
      updateMission(b, 0);
      return;
    }
    combo += 1;
    if (b.kind === kinds.GOLD) {
      base = 45;
      gainEnergy = 24;
      timeLeft = Math.min(ROUND_SECONDS, timeLeft + 3);
      color = "#ffd34d";
      text = "金气球 +3s";
    } else if (b.kind === kinds.SHIELD) {
      base = 60;
      gainEnergy = 18;
      color = "#66e0ff";
      text = "破盾";
    } else if (b.kind === kinds.CLOCK) {
      base = 35;
      gainEnergy = 14;
      freezeLeft = 2;
      color = "#9b5cff";
      text = "时间冻结";
    } else {
      text = "命中";
    }
    var gained = base + combo * 5;
    if (frenzyLeft > 0) gained *= 2;
    score += gained;
    energy = Math.min(ENERGY_MAX, energy + gainEnergy + combo * 1.5);
    if (energy >= ENERGY_MAX && frenzyLeft <= 0) {
      energy = 0;
      frenzyLeft = 6;
      floatingText(360, 250, "狂热时间!");
      flashScreen("rgba(255,230,80,0.32)");
    }
    if (combo === 3 || combo === 5 || combo === 8) {
      var bonus = combo * 10;
      score += bonus;
      text += " 连击+" + bonus;
    }
    updateMission(b, gained);
    burst(b.x, b.y, color, frenzyLeft > 0 ? 22 : 12);
    floatingText(b.x, b.y - 55, text + " +" + gained);
    if (score >= targetScore) finishRound();
  }

  function triggerPowerup(b) {
    combo += 1;
    score += 35 + combo * 5;
    energy = Math.min(ENERGY_MAX, energy + 20);
    shockwave(b.x, b.y, "#ffffff", 180);
    shake(0.24, 12);
    if (b.kind === kinds.THUNDER) {
      flashScreen("rgba(90,230,255,0.34)");
      floatingText(b.x, b.y - 70, "雷暴连锁");
      triggerThunder(b.x, b.y);
    } else if (b.kind === kinds.BLACK_HOLE) {
      flashScreen("rgba(180,30,255,0.28)");
      floatingText(b.x, b.y - 70, "黑洞吸附");
      triggerBlackHole(b.x, b.y);
    } else if (b.kind === kinds.ROCKET) {
      flashScreen("rgba(255,120,20,0.28)");
      floatingText(b.x, b.y - 70, "火箭齐射");
      triggerRockets(b.x, b.y);
    } else if (b.kind === kinds.NUKE) {
      flashScreen("rgba(255,245,50,0.42)");
      floatingText(b.x, b.y - 70, "全屏爆破");
      triggerNuke(b.x, b.y);
    }
  }

  function triggerThunder(x, y) {
    var targets = nearestTargets(x, y, 5, true);
    var px = x;
    var py = y;
    targets.forEach(function (t, i) {
      setTimeout(function () {
        bolts.push({ x1: px, y1: py, x2: t.x, y2: t.y, age: 0, life: 0.18 });
        popByPower(t, kinds.THUNDER);
      }, i * 80);
      px = t.x;
      py = t.y;
    });
    shake(0.35, 16);
  }

  function triggerBlackHole(x, y) {
    var targets = targetsInRadius(x, y, 260, true);
    shockwave(x, y, "#ff4fd8", 260);
    targets.forEach(function (t) {
      t.vx = (x - t.x) * 1.6;
      t.vy = (y - t.y) * 1.6;
    });
    setTimeout(function () {
      shockwave(x, y, "#ff4fd8", 320);
      shake(0.45, 18);
      targets.forEach(function (t) { popByPower(t, kinds.BLACK_HOLE); });
    }, 1100);
  }

  function triggerRockets(x, y) {
    nearestTargets(x, y, 3, true).forEach(function (target, i) {
      rockets.push({ x: LAUNCH.x + (i - 1) * 70, y: LAUNCH.y - 25, vx: 0, vy: -260, target: target, life: 2.4, trail: [] });
    });
    shake(0.22, 10);
  }

  function triggerNuke(x, y) {
    shockwave(x, y, "#fff45c", 760);
    shockwave(x, y, "#ff2bd6", 560);
    shockwave(x, y, "#69f7ff", 380);
    shake(0.65, 28);
    setTimeout(function () {
      targetsInRadius(360, 600, 820, true).forEach(function (t) { popByPower(t, kinds.NUKE); });
    }, 180);
  }

  function popByPower(b, source) {
    if (!b || b.dead || b.kind === kinds.BOMB) return;
    if ([kinds.THUNDER, kinds.BLACK_HOLE, kinds.ROCKET, kinds.NUKE].indexOf(b.kind) >= 0) {
      score += 45;
      b.dead = true;
      burst(b.x, b.y, "#ffffff", 14);
      return;
    }
    if (b.kind === kinds.SHIELD) b.hits = 1;
    resolveHit(b);
    b.dead = true;
  }

  function updateMission(b, gained) {
    if (missionDone || !mission) return;
    if (mission.type === "combo") mission.progress = Math.max(mission.progress, combo);
    else if (mission.type === "gold" && b.kind === kinds.GOLD) mission.progress += 1;
    else if (mission.type === "clean_score") mission.progress = b.kind === kinds.BOMB ? 0 : mission.progress + gained;
    else if (mission.type === "red" && b.kind === kinds.NORMAL) mission.progress += 1;
    if (mission.progress >= mission.goal) {
      mission.progress = mission.goal;
      missionDone = true;
      score += 80;
      timeLeft = Math.min(ROUND_SECONDS, timeLeft + 5);
      floatingText(360, 300, "任务完成 +80 +5s");
    }
  }

  function finishRound() {
    if (score > bestScore) {
      bestScore = score;
      saveBestScore();
    }
    state = score >= targetScore ? "win" : "lose";
  }

  function nearestTargets(x, y, count, skipBombs) {
    return balloons.filter(function (b) {
      return !b.dead && (!skipBombs || b.kind !== kinds.BOMB);
    }).sort(function (a, b) {
      return dist(a.x, a.y, x, y) - dist(b.x, b.y, x, y);
    }).slice(0, count);
  }

  function targetsInRadius(x, y, radius, skipBombs) {
    return balloons.filter(function (b) {
      return !b.dead && (!skipBombs || b.kind !== kinds.BOMB) && dist(b.x, b.y, x, y) <= radius;
    });
  }

  function draw() {
    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, screenW, screenH);
    ctx.translate(offsetX, offsetY);
    ctx.scale(scale, scale);
    if (shakeLeft > 0) ctx.translate(rand(-shakePower, shakePower), rand(-shakePower, shakePower));
    drawBackground();
    balloons.forEach(drawBalloon);
    rings.forEach(drawRing);
    bolts.forEach(drawBolt);
    particles.forEach(drawParticle);
    rockets.forEach(drawRocket);
    darts.forEach(drawDart);
    drawLauncher();
    drawAim();
    floatingTexts.forEach(drawFloatingText);
    drawHud();
    if (flash.a > 0) {
      ctx.fillStyle = flash.color;
      ctx.globalAlpha = flash.a;
      ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }

  function drawBackground() {
    ctx.fillStyle = "#77cdfd";
    ctx.fillRect(0, 0, DESIGN_W, DESIGN_H);
    drawCloud(90, 125, 42);
    drawCloud(235, 220, 48);
    drawCloud(380, 130, 58);
    drawCloud(525, 220, 58);
    drawCloud(670, 125, 60);
    ctx.fillStyle = "#ef476f";
    ctx.fillRect(42, 980, 636, 28);
    ctx.fillStyle = "#ffd166";
    ctx.fillRect(0, 1040, 720, 240);
  }

  function drawCloud(x, y, r) {
    ctx.fillStyle = "rgba(255,255,255,0.55)";
    circle(x, y, r);
    circle(x - r * 0.75, y + r * 0.2, r * 0.72);
    circle(x + r * 0.82, y + r * 0.2, r * 0.62);
  }

  function drawBalloon(b) {
    var colors = balloonColors(b.kind);
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(Math.sin(b.age * 2.5 + b.wobble) * 0.08);
    ctx.globalAlpha = b.dead ? Math.max(0, 1 - b.popAge * 3) : 1;
    ctx.fillStyle = colors.side;
    circle(0, 0, b.r);
    ctx.fillStyle = colors.main;
    circle(-b.r * 0.12, -b.r * 0.1, b.r * 0.92);
    ctx.fillStyle = "rgba(255,255,255,0.6)";
    circle(-b.r * 0.28, -b.r * 0.35, b.r * 0.18);
    ctx.strokeStyle = "#6b4f3a";
    ctx.lineWidth = 3;
    line(0, b.r * 1.1, 0, b.r * 1.65);
    drawIcon(b.kind, b.r);
    ctx.restore();
  }

  function balloonColors(kind) {
    if (kind === kinds.GOLD) return { main: "#ffd34d", side: "#f59e0b" };
    if (kind === kinds.BOMB) return { main: "#2d3448", side: "#1b2130" };
    if (kind === kinds.SHIELD) return { main: "#66e0ff", side: "#168aad" };
    if (kind === kinds.CLOCK) return { main: "#9b5cff", side: "#5b2abf" };
    if (kind === kinds.THUNDER) return { main: "#50f5ff", side: "#006dff" };
    if (kind === kinds.BLACK_HOLE) return { main: "#27123d", side: "#ff4fd8" };
    if (kind === kinds.ROCKET) return { main: "#ff7a30", side: "#b82020" };
    if (kind === kinds.NUKE) return { main: "#ffffff", side: "#ff2bd6" };
    return { main: "#ff4f73", side: "#d9365d" };
  }

  function drawIcon(kind, r) {
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    if (kind === kinds.BOMB) {
      ctx.strokeStyle = "#f7f2dc";
      ctx.lineWidth = 4;
      line(-r * 0.35, 0, r * 0.35, 0);
      line(-r * 0.35, 14, r * 0.35, 14);
    } else if (kind === kinds.THUNDER) {
      ctx.strokeStyle = "#fff45c";
      ctx.lineWidth = 7;
      polyline([[-4, -r * 0.5], [-r * 0.32, 0], [0, 0], [-r * 0.14, r * 0.5], [r * 0.34, -r * 0.16]]);
    } else if (kind === kinds.BLACK_HOLE) {
      ctx.fillStyle = "#090514";
      circle(0, 0, r * 0.5);
      ctx.strokeStyle = "#ff8cf0";
      ctx.lineWidth = 7;
      arc(0, 0, r * 0.6, 0, Math.PI * 1.55);
    } else if (kind === kinds.ROCKET) {
      ctx.fillStyle = "#ffffff";
      triangle(0, -r * 0.55, -r * 0.24, r * 0.12, r * 0.24, r * 0.12);
      ctx.fillStyle = "#26364f";
      ctx.fillRect(-r * 0.17, -r * 0.05, r * 0.34, r * 0.52);
    } else if (kind === kinds.NUKE) {
      ctx.strokeStyle = "#69f7ff";
      ctx.lineWidth = 5;
      arc(0, 0, r * 0.68, 0, Math.PI * 2);
      ctx.fillStyle = "#ff2bd6";
      circle(0, 0, r * 0.3);
    } else if (kind === kinds.CLOCK) {
      ctx.fillStyle = "#fff7d6";
      circle(0, 0, r * 0.48);
      ctx.strokeStyle = "#5b2abf";
      ctx.lineWidth = 4;
      line(0, 0, 0, -r * 0.28);
      line(0, 0, r * 0.22, r * 0.12);
    } else if (kind === kinds.SHIELD) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 6;
      arc(0, 0, r * 0.58, Math.PI * 0.12, Math.PI * 1.88);
      line(-r * 0.24, 0, r * 0.24, 0);
    }
  }

  function drawLauncher() {
    ctx.save();
    ctx.translate(LAUNCH.x, LAUNCH.y);
    ctx.fillStyle = frenzyLeft > 0 ? "rgba(255,230,80,0.3)" : "rgba(255,255,255,0.16)";
    circle(0, 18, 76);
    ctx.strokeStyle = "#fff";
    ctx.lineWidth = 5;
    arc(0, 0, 62, Math.PI * 1.08, Math.PI * 1.92);
    ctx.strokeStyle = "#26364f";
    ctx.lineWidth = 12;
    line(0, 42, 0, -74);
    ctx.strokeStyle = "#f8d78a";
    ctx.lineWidth = 6;
    line(0, 30, 0, -50);
    ctx.fillStyle = "#d7e8ff";
    triangle(0, -94, -18, -64, 18, -64);
    ctx.fillStyle = "#ff4b70";
    triangle(0, 48, -28, 82, -8, 60);
    triangle(0, 48, 28, 82, 8, 60);
    ctx.fillStyle = "#fff";
    circle(0, 0, 8);
    ctx.restore();
  }

  function drawAim() {
    if (!dragging) return;
    var v = aimVector();
    var len = Math.min(MAX_DRAG, Math.sqrt(v.x * v.x + v.y * v.y));
    var nx = v.x / Math.max(1, Math.sqrt(v.x * v.x + v.y * v.y));
    var ny = v.y / Math.max(1, Math.sqrt(v.x * v.x + v.y * v.y));
    ctx.strokeStyle = "rgba(255,255,255,0.8)";
    ctx.lineWidth = 7;
    line(LAUNCH.x, LAUNCH.y, LAUNCH.x + nx * len, LAUNCH.y + ny * len);
  }

  function drawDart(d) {
    ctx.save();
    ctx.translate(d.x, d.y);
    ctx.rotate(Math.atan2(d.vy, d.vx));
    ctx.strokeStyle = "#26364f";
    ctx.lineWidth = 8;
    line(-34, 0, 30, 0);
    ctx.strokeStyle = "#f6d78c";
    ctx.lineWidth = 4;
    line(-28, 0, 18, 0);
    ctx.fillStyle = "#d6e5ff";
    triangle(30, 0, 50, -9, 50, 9);
    ctx.fillStyle = "#ff4b70";
    triangle(-34, 0, -55, -14, -55, 14);
    ctx.restore();
  }

  function drawRocket(r) {
    r.trail.forEach(function (p, i) {
      ctx.fillStyle = "rgba(255,120,10," + ((i + 1) / r.trail.length * 0.45) + ")";
      circle(p.x, p.y, 5);
    });
    ctx.save();
    ctx.translate(r.x, r.y);
    ctx.rotate(Math.atan2(r.vy, r.vx));
    ctx.fillStyle = "#ffffff";
    triangle(26, 0, -18, -12, -18, 12);
    ctx.fillStyle = "#26364f";
    ctx.fillRect(-20, -6, 26, 12);
    ctx.fillStyle = "#ff4b1f";
    triangle(-20, -10, -38, 0, -20, 10);
    ctx.restore();
  }

  function drawRing(r) {
    var t = r.age / r.life;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = r.color;
    ctx.lineWidth = lerp(12, 1, t);
    arc(r.x, r.y, lerp(10, r.radius, t), 0, Math.PI * 2);
    ctx.globalAlpha = 1;
  }

  function drawBolt(b) {
    var t = b.age / b.life;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 9;
    jitterLine(b.x1, b.y1, b.x2, b.y2);
    ctx.strokeStyle = "#69f7ff";
    ctx.lineWidth = 4;
    jitterLine(b.x1, b.y1, b.x2, b.y2);
    ctx.globalAlpha = 1;
  }

  function drawParticle(p) {
    var t = p.age / p.life;
    ctx.fillStyle = p.color;
    ctx.globalAlpha = Math.max(0, 1 - t);
    ctx.fillRect(p.x, p.y, p.size, p.size);
    ctx.globalAlpha = 1;
  }

  function drawFloatingText(t) {
    var p = t.age / t.life;
    ctx.globalAlpha = Math.max(0, 1 - p);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 24px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(t.text, t.x, t.y - p * 70);
    ctx.globalAlpha = 1;
  }

  function drawHud() {
    ctx.fillStyle = "rgba(13,20,38,0.24)";
    ctx.fillRect(0, 0, 720, 168);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 34px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("得分 " + score + "/" + targetScore, 28, 60);
    ctx.fillText((freezeLeft > 0 ? "冻结 " : "时间 ") + Math.ceil(timeLeft), 285, 60);
    ctx.fillText("第 " + level + " 关", 535, 60);
    ctx.fillStyle = "#fff6bf";
    ctx.font = "bold 28px sans-serif";
    ctx.fillText("连击 x" + combo, 28, 104);
    ctx.fillStyle = "#e6f7ff";
    ctx.font = "bold 23px sans-serif";
    ctx.fillText(windText(), 285, 104);
    ctx.fillText("最高 " + bestScore, 535, 104);
    ctx.fillStyle = "#fff";
    ctx.font = "bold 24px sans-serif";
    ctx.fillText("任务 " + mission.text + " " + mission.progress + "/" + mission.goal, 28, 148);
    ctx.fillStyle = "#fff6bf";
    ctx.fillText(frenzyLeft > 0 ? "狂热 " + Math.ceil(frenzyLeft) + "s" : "能量 " + Math.floor(energy) + "%", 455, 148);
    if (state !== "playing") {
      ctx.fillStyle = "#fff";
      ctx.font = "bold 48px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(state === "win" ? "过关!" : "时间到", 360, 555);
      ctx.font = "bold 36px sans-serif";
      ctx.fillText(state === "win" ? "点击进入下一关" : "点击重开", 360, 610);
    }
  }

  function windText() {
    if (level === 1) return "风向 -";
    return level === 2 ? "风向 →" : "风向 ←";
  }

  function burst(x, y, color, count) {
    for (var i = 0; i < count; i++) {
      var a = rand(0, Math.PI * 2);
      var speed = rand(90, frenzyLeft > 0 ? 250 : 180);
      particles.push({ x: x, y: y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, size: rand(6, 12), color: color, age: 0, life: 0.4 });
    }
  }

  function shockwave(x, y, color, radius) {
    rings.push({ x: x, y: y, color: color, radius: radius, age: 0, life: 0.48 });
  }

  function floatingText(x, y, text) {
    floatingTexts.push({ x: x, y: y, text: text, age: 0, life: 0.65 });
  }

  function flashScreen(color) {
    flash.color = color;
    flash.a = 1;
  }

  function shake(duration, power) {
    shakeLeft = Math.max(shakeLeft, duration);
    shakePower = Math.max(shakePower, power);
  }

  function saveBestScore() {
    try {
      if (ttApi && ttApi.setStorageSync) ttApi.setStorageSync("dart_balloon_best", bestScore);
      else if (typeof localStorage !== "undefined") localStorage.setItem("dart_balloon_best", String(bestScore));
    } catch (e) {}
  }

  function loadBestScore() {
    try {
      if (ttApi && ttApi.getStorageSync) bestScore = Number(ttApi.getStorageSync("dart_balloon_best") || 0);
      else if (typeof localStorage !== "undefined") bestScore = Number(localStorage.getItem("dart_balloon_best") || 0);
    } catch (e) {
      bestScore = 0;
    }
  }

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function dist(x1, y1, x2, y2) { var dx = x1 - x2; var dy = y1 - y2; return Math.sqrt(dx * dx + dy * dy); }

  function circle(x, y, r) {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  function arc(x, y, r, a, b) {
    ctx.beginPath();
    ctx.arc(x, y, r, a, b);
    ctx.stroke();
  }
  function line(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
  function triangle(x1, y1, x2, y2, x3, y3) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();
    ctx.fill();
  }
  function polyline(points) {
    ctx.beginPath();
    ctx.moveTo(points[0][0], points[0][1]);
    for (var i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
    ctx.stroke();
  }
  function jitterLine(x1, y1, x2, y2) {
    var seg = 8;
    var dx = x2 - x1;
    var dy = y2 - y1;
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    var nx = -dy / len;
    var ny = dx / len;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    for (var i = 1; i < seg; i++) {
      var t = i / seg;
      var j = rand(-24, 24);
      ctx.lineTo(x1 + dx * t + nx * j, y1 + dy * t + ny * j);
    }
    ctx.lineTo(x2, y2);
    ctx.stroke();
  }
})();

