/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RSAM – script.js
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Navbar scroll behavior ─────────────────────── */
const navbar = document.getElementById('navbar');
const navToggle = document.getElementById('navToggle');
const navLinks = document.getElementById('navLinks');

window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 50);
  updateActiveNavLink();
});

navToggle.addEventListener('click', () => {
  navLinks.classList.toggle('open');
});

/* Close mobile nav on link click */
navLinks.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => navLinks.classList.remove('open'));
});

/* Active nav link highlight */
function updateActiveNavLink() {
  const sections = document.querySelectorAll('section[id]');
  const scrollY = window.scrollY + 100;
  sections.forEach(sec => {
    const top = sec.offsetTop;
    const height = sec.offsetHeight;
    const id = sec.getAttribute('id');
    const link = navLinks.querySelector(`a[href="#${id}"]`);
    if (link) link.classList.toggle('active', scrollY >= top && scrollY < top + height);
  });
}

/* ── Footer year ────────────────────────────────── */
document.getElementById('year').textContent = new Date().getFullYear();

/* ── Intersection Observer – fade-in ────────────── */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      e.target.classList.add('visible');
      observer.unobserve(e.target);
    }
  });
}, { threshold: 0.12 });

document.querySelectorAll('.fade-in').forEach(el => observer.observe(el));

/* ── Counter animation ──────────────────────────── */
const countObserver = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCounter(e.target);
      countObserver.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });

document.querySelectorAll('.stat-num').forEach(el => countObserver.observe(el));

function animateCounter(el) {
  const target = parseInt(el.dataset.target, 10);
  const duration = 1600;
  const step = 16;
  const increment = target / (duration / step);
  let current = 0;
  const timer = setInterval(() => {
    current = Math.min(current + increment, target);
    el.textContent = Math.floor(current);
    if (current >= target) clearInterval(timer);
  }, step);
}

/* ── Hero canvas wheel animation ───────────────── */
(function initCanvas() {
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  const wheels = Array.from({ length: 7 }, (_, i) => ({
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    r: 30 + Math.random() * 90,
    speed: (0.002 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
    angle: Math.random() * Math.PI * 2,
    alpha: 0.04 + Math.random() * 0.08,
    dx: (Math.random() - 0.5) * 0.3,
    dy: (Math.random() - 0.5) * 0.3,
    spokes: 8,
  }));

  function drawWheel(w) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);
    ctx.globalAlpha = w.alpha;
    ctx.strokeStyle = '#f97316';
    ctx.lineWidth = 1.2;

    /* Outer rim */
    ctx.beginPath();
    ctx.arc(0, 0, w.r, 0, Math.PI * 2);
    ctx.stroke();

    /* Inner rim */
    ctx.beginPath();
    ctx.arc(0, 0, w.r * 0.55, 0, Math.PI * 2);
    ctx.stroke();

    /* Hub */
    ctx.globalAlpha = w.alpha * 1.6;
    ctx.fillStyle = '#f97316';
    ctx.beginPath();
    ctx.arc(0, 0, w.r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    /* Spokes */
    ctx.globalAlpha = w.alpha * 0.9;
    ctx.lineWidth = 0.8;
    for (let s = 0; s < w.spokes; s++) {
      const a = (s / w.spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * w.r * 0.12, Math.sin(a) * w.r * 0.12);
      ctx.lineTo(Math.cos(a) * w.r,        Math.sin(a) * w.r);
      ctx.stroke();
    }

    ctx.restore();
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    wheels.forEach(w => {
      w.angle += w.speed;
      w.x += w.dx;
      w.y += w.dy;

      /* Bounce */
      if (w.x < -w.r)              w.x = canvas.width + w.r;
      if (w.x > canvas.width + w.r) w.x = -w.r;
      if (w.y < -w.r)              w.y = canvas.height + w.r;
      if (w.y > canvas.height + w.r) w.y = -w.r;

      drawWheel(w);
    });
    requestAnimationFrame(tick);
  }
  tick();
})();

/* ── Smooth internal links ──────────────────────── */
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', e => {
    const target = document.querySelector(anchor.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });
});
