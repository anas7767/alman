// =========================================================
//  GALAXY SHOOTER — Vanilla JS + HTML5 Canvas (OOP)
// =========================================================

const canvas = document.getElementById('game');
const ctx    = canvas.getContext('2d');
const scoreEl    = document.getElementById('score');
const overlayEl  = document.getElementById('overlay');
const titleEl    = document.getElementById('title');
const subtitleEl = document.getElementById('subtitle');
const startBtn   = document.getElementById('startBtn');

// --- Responsive canvas sizing ---
function resizeCanvas() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();

// =========================================================
//  CLASSES
// =========================================================

/* ---------- Player ship ---------- */
class Player {
  constructor() {
    this.width  = 50;
    this.height = 40;
    this.x = canvas.width / 2 - this.width / 2;
    this.y = canvas.height - this.height - 20;
    this.speed = 7;
  }

  // ===== MOVEMENT =====
  // Called every frame; reads global `keys` state to move left/right
  // and clamps position so the ship cannot leave the screen.
  update() {
    if ((keys.ArrowLeft || keys.a) && this.x > 0) {
      this.x -= this.speed;
    }
    if ((keys.ArrowRight || keys.d) && this.x + this.width < canvas.width) {
      this.x += this.speed;
    }
  }

  draw() {
    // Triangular ship with glow
    ctx.save();
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00ffea';
    ctx.fillStyle = '#00ffea';
    ctx.beginPath();
    ctx.moveTo(this.x + this.width / 2, this.y);             // tip
    ctx.lineTo(this.x, this.y + this.height);                // left base
    ctx.lineTo(this.x + this.width, this.y + this.height);   // right base
    ctx.closePath();
    ctx.fill();

    // Cockpit
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(this.x + this.width / 2, this.y + this.height * 0.55, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- Projectile (player bullet) ---------- */
class Projectile {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = 4;
    this.speed = 10;
  }

  update() { this.y -= this.speed; }

  draw() {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#fff700';
    ctx.fillStyle = '#fff700';
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- Enemy ---------- */
class Enemy {
  constructor(speedBoost = 0) {
    this.size  = 30 + Math.random() * 20;
    this.x = Math.random() * (canvas.width - this.size);
    this.y = -this.size;
    this.speed = 1.5 + Math.random() * 1.5 + speedBoost; // grows with score
    this.hue   = Math.floor(Math.random() * 60) + 280;   // purple-pink range
  }

  update() { this.y += this.speed; }

  draw() {
    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = `hsl(${this.hue},100%,60%)`;
    ctx.fillStyle   = `hsl(${this.hue},100%,55%)`;
    // Diamond-shaped enemy
    ctx.beginPath();
    ctx.moveTo(this.x + this.size / 2, this.y);
    ctx.lineTo(this.x + this.size, this.y + this.size / 2);
    ctx.lineTo(this.x + this.size / 2, this.y + this.size);
    ctx.lineTo(this.x, this.y + this.size / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // Hit-box helpers (used for collision checks)
  get cx() { return this.x + this.size / 2; }
  get cy() { return this.y + this.size / 2; }
  get r()  { return this.size / 2; }
}

/* ---------- Particle (explosion) ---------- */
class Particle {
  constructor(x, y, color) {
    this.x = x; this.y = y;
    this.radius  = Math.random() * 3 + 1;
    this.color   = color;
    const angle  = Math.random() * Math.PI * 2;
    const speed  = Math.random() * 5 + 1;
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.alpha = 1;
  }

  update() {
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.96;        // friction
    this.vy *= 0.96;
    this.alpha -= 0.02;     // fade out
  }

  draw() {
    ctx.save();
    ctx.globalAlpha = Math.max(this.alpha, 0);
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

/* ---------- Star (background scrolling starfield) ---------- */
class Star {
  constructor() { this.reset(true); }
  reset(initial = false) {
    this.x = Math.random() * canvas.width;
    this.y = initial ? Math.random() * canvas.height : 0;
    this.size  = Math.random() * 1.8 + 0.2;
    this.speed = this.size * 0.8;
  }
  update() {
    this.y += this.speed;
    if (this.y > canvas.height) this.reset();
  }
  draw() {
    ctx.fillStyle = `rgba(255,255,255,${this.size / 2})`;
    ctx.fillRect(this.x, this.y, this.size, this.size);
  }
}

// =========================================================
//  GAME STATE
// =========================================================
let player, projectiles, enemies, particles, stars;
let score, frame, enemySpawnRate, isRunning;

const keys = { ArrowLeft: false, ArrowRight: false, a: false, d: false, Space: false };
let canShoot = true; // throttle so holding Space doesn't spam-fire every frame

function initGame() {
  player        = new Player();
  projectiles   = [];
  enemies       = [];
  particles     = [];
  stars         = Array.from({ length: 150 }, () => new Star());
  score         = 0;
  frame         = 0;
  enemySpawnRate = 60; // every N frames
  isRunning     = true;
  scoreEl.textContent = 'Score: 0';
  overlayEl.classList.remove('visible');
}

function endGame() {
  isRunning = false;
  titleEl.textContent    = 'Game Over';
  subtitleEl.textContent = `Final Score: ${score}`;
  startBtn.textContent   = 'Restart';
  overlayEl.classList.add('visible');
}

// =========================================================
//  COLLISION HELPERS
// =========================================================
function circleHit(ax, ay, ar, bx, by, br) {
  const dx = ax - bx, dy = ay - by;
  return Math.hypot(dx, dy) < ar + br;
}

function spawnExplosion(x, y, color) {
  for (let i = 0; i < 10; i++) particles.push(new Particle(x, y, color));
}

// =========================================================
//  SHOOTING
// =========================================================
// Spawns a projectile from the tip of the ship. Throttled by `canShoot`
// so each Space press = one bullet (released on keyup).
function shoot() {
  if (!isRunning || !canShoot) return;
  projectiles.push(new Projectile(player.x + player.width / 2, player.y));
  canShoot = false;
}

// =========================================================
//  INPUT HANDLERS
// =========================================================
window.addEventListener('keydown', (e) => {
  if (e.code === 'ArrowLeft')  keys.ArrowLeft  = true;
  if (e.code === 'ArrowRight') keys.ArrowRight = true;
  if (e.key === 'a' || e.key === 'A') keys.a = true;
  if (e.key === 'd' || e.key === 'D') keys.d = true;
  if (e.code === 'Space') { e.preventDefault(); shoot(); }
});

window.addEventListener('keyup', (e) => {
  if (e.code === 'ArrowLeft')  keys.ArrowLeft  = false;
  if (e.code === 'ArrowRight') keys.ArrowRight = false;
  if (e.key === 'a' || e.key === 'A') keys.a = false;
  if (e.key === 'd' || e.key === 'D') keys.d = false;
  if (e.code === 'Space') canShoot = true;
});

// Touch controls (mobile)
function bindTouch(id, onStart, onEnd) {
  const el = document.getElementById(id);
  el.addEventListener('touchstart', (e) => { e.preventDefault(); onStart(); });
  el.addEventListener('touchend',   (e) => { e.preventDefault(); onEnd && onEnd(); });
  el.addEventListener('mousedown',  onStart);
  el.addEventListener('mouseup',    () => onEnd && onEnd());
  el.addEventListener('mouseleave', () => onEnd && onEnd());
}
bindTouch('tc-left',  () => keys.ArrowLeft = true,  () => keys.ArrowLeft = false);
bindTouch('tc-right', () => keys.ArrowRight = true, () => keys.ArrowRight = false);
bindTouch('tc-fire',  () => { shoot(); }, () => { canShoot = true; });

// Start / restart button
startBtn.addEventListener('click', () => {
  initGame();
  loop();
});

// =========================================================
//  MAIN GAME LOOP (requestAnimationFrame ~60FPS)
// =========================================================
function loop() {
  if (!isRunning) return;

  // Clear (with slight trail for motion feel)
  ctx.fillStyle = 'rgba(0,0,10,0.35)';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Starfield
  stars.forEach(s => { s.update(); s.draw(); });

  // Player
  player.update();
  player.draw();

  // Projectiles
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.update();
    p.draw();
    if (p.y + p.radius < 0) projectiles.splice(i, 1);
  }

  // Enemy spawning — frequency & speed scale with score
  const speedBoost = Math.min(score / 200, 5);
  enemySpawnRate   = Math.max(20, 60 - Math.floor(score / 100));
  if (frame % enemySpawnRate === 0) enemies.push(new Enemy(speedBoost));

  // Enemies + collision detection
  for (let i = enemies.length - 1; i >= 0; i--) {
    const e = enemies[i];
    e.update();
    e.draw();

    // Off-screen
    if (e.y > canvas.height) { enemies.splice(i, 1); continue; }

    // Enemy vs Player
    const playerCx = player.x + player.width / 2;
    const playerCy = player.y + player.height / 2;
    if (circleHit(e.cx, e.cy, e.r, playerCx, playerCy, player.width / 2)) {
      spawnExplosion(playerCx, playerCy, '#00ffea');
      endGame();
      return;
    }

    // Enemy vs Projectiles
    for (let j = projectiles.length - 1; j >= 0; j--) {
      const p = projectiles[j];
      if (circleHit(e.cx, e.cy, e.r, p.x, p.y, p.radius)) {
        spawnExplosion(e.cx, e.cy, `hsl(${e.hue},100%,60%)`);
        enemies.splice(i, 1);
        projectiles.splice(j, 1);
        score += 10;
        scoreEl.textContent = `Score: ${score}`;
        break;
      }
    }
  }

  // Particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const pt = particles[i];
    pt.update();
    pt.draw();
    if (pt.alpha <= 0) particles.splice(i, 1);
  }

  frame++;
  requestAnimationFrame(loop);
}

// Show start overlay on first load (loop kicks off when user clicks Start)
overlayEl.classList.add('visible');
