/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   RSAM – script.js  (animations & interactions)
   Runs after render.js has built all HTML.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function initInteractions() {

  /* ── Navbar scroll behavior ───────────────────── */
  const navbar    = document.getElementById('navbar');
  const navToggle = document.getElementById('navToggle');
  const navLinks  = document.getElementById('navLinks');
  const scrollHint = document.querySelector('.hero-scroll-hint');

  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 50);
    if (scrollHint) scrollHint.classList.toggle('hidden', window.scrollY > 80);
    updateActiveNavLink();
  });

  navToggle.addEventListener('click', () => navLinks.classList.toggle('open'));

  navLinks.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => navLinks.classList.remove('open'))
  );

  function updateActiveNavLink() {
    const scrollY = window.scrollY + 100;
    document.querySelectorAll('section[id]').forEach(sec => {
      const link = navLinks.querySelector(`a[href="#${sec.id}"]`);
      if (link) link.classList.toggle('active', scrollY >= sec.offsetTop && scrollY < sec.offsetTop + sec.offsetHeight);
    });
  }

  /* ── Footer year ──────────────────────────────── */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ── Fade-in on scroll ────────────────────────── */
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); fadeObserver.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

  /* ── Animated counters ────────────────────────── */
  const countObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { animateCounter(e.target); countObserver.unobserve(e.target); }
    });
  }, { threshold: 0.5 });
  document.querySelectorAll('.stat-num').forEach(el => countObserver.observe(el));

  function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const increment = target / (1600 / 16);
    let current = 0;
    const timer = setInterval(() => {
      current = Math.min(current + increment, target);
      el.textContent = Math.floor(current);
      if (current >= target) clearInterval(timer);
    }, 16);
  }

  /* ── Smooth scroll ────────────────────────────── */
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', e => {
      const target = document.querySelector(anchor.getAttribute('href'));
      if (target) { e.preventDefault(); target.scrollIntoView({ behavior: 'smooth', block: 'start' }); }
    });
  });

  /* ── Events carousel ─────────────────────────── */
  const carousel = document.getElementById('eventsCarousel');
  if (carousel) {
    const track  = carousel.querySelector('.events-track');
    const slides = carousel.querySelectorAll('.events-slide');
    const dots   = carousel.querySelectorAll('.events-dot');
    const prev   = carousel.querySelector('.events-arrow--prev');
    const next   = carousel.querySelector('.events-arrow--next');
    let current  = 0;

    function goTo(idx) {
      current = (idx + slides.length) % slides.length;
      track.style.transform = `translateX(-${current * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === current));
    }

    if (prev) prev.addEventListener('click', () => goTo(current - 1));
    if (next) next.addEventListener('click', () => goTo(current + 1));
    dots.forEach(d => d.addEventListener('click', () => goTo(+d.dataset.idx)));

    /* touch / swipe */
    let touchStartX = 0;
    carousel.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
    carousel.addEventListener('touchend', e => {
      const diff = touchStartX - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? current + 1 : current - 1);
    });

    /* auto-advance every 5 s */
    if (slides.length > 1) setInterval(() => goTo(current + 1), 5000);
  }

  /* ── Hero canvas wheel animation ─────────────── */
  const canvas = document.getElementById('wheelCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() { canvas.width = canvas.offsetWidth; canvas.height = canvas.offsetHeight; }
  resize();
  window.addEventListener('resize', resize);

  const wheels = Array.from({ length: 7 }, () => ({
    x:      Math.random() * canvas.width,
    y:      Math.random() * canvas.height,
    r:      30 + Math.random() * 90,
    speed:  (0.002 + Math.random() * 0.006) * (Math.random() > 0.5 ? 1 : -1),
    angle:  Math.random() * Math.PI * 2,
    alpha:  0.04 + Math.random() * 0.08,
    dx:     (Math.random() - 0.5) * 0.3,
    dy:     (Math.random() - 0.5) * 0.3,
    spokes: 8,
  }));

  function drawWheel(w) {
    ctx.save();
    ctx.translate(w.x, w.y);
    ctx.rotate(w.angle);
    ctx.strokeStyle = '#e01c2e';
    ctx.lineWidth = 1.2;

    ctx.globalAlpha = w.alpha;
    ctx.beginPath(); ctx.arc(0, 0, w.r, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, w.r * 0.55, 0, Math.PI * 2); ctx.stroke();

    ctx.globalAlpha = w.alpha * 1.6;
    ctx.fillStyle = '#e01c2e';
    ctx.beginPath(); ctx.arc(0, 0, w.r * 0.12, 0, Math.PI * 2); ctx.fill();

    ctx.globalAlpha = w.alpha * 0.9;
    ctx.lineWidth = 0.8;
    for (let s = 0; s < w.spokes; s++) {
      const a = (s / w.spokes) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * w.r * 0.12, Math.sin(a) * w.r * 0.12);
      ctx.lineTo(Math.cos(a) * w.r, Math.sin(a) * w.r);
      ctx.stroke();
    }
    ctx.restore();
  }

  (function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    wheels.forEach(w => {
      w.angle += w.speed; w.x += w.dx; w.y += w.dy;
      if (w.x < -w.r)               w.x = canvas.width + w.r;
      if (w.x > canvas.width + w.r)  w.x = -w.r;
      if (w.y < -w.r)               w.y = canvas.height + w.r;
      if (w.y > canvas.height + w.r) w.y = -w.r;
      drawWheel(w);
    });
    requestAnimationFrame(tick);
  })();
}

/* Run after render.js has finished building the DOM */
initInteractions();
