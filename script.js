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

  /* ── Visitor counter ──────────────────────────── */
  const countEl = document.getElementById('visitorCount');
  if (countEl) {
    let count = parseInt(localStorage.getItem('rsam_visitors') || '0', 10);
    if (!sessionStorage.getItem('rsam_visited')) {
      count += 1;
      localStorage.setItem('rsam_visitors', count);
      sessionStorage.setItem('rsam_visited', '1');
    }
    countEl.textContent = count.toLocaleString();
  }

  /* ── Fade-in on scroll ────────────────────────── */
  const fadeObserver = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('visible'); fadeObserver.unobserve(e.target); }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.fade-in').forEach(el => fadeObserver.observe(el));

  /* ── Connect floating panel ──────────────────── */
  const connectTab      = document.getElementById('connectTab');
  const connectPanel    = document.getElementById('connectPanel');
  const connectClose    = document.getElementById('connectClose');
  const connectBackdrop = document.getElementById('connectBackdrop');

  function openConnect() {
    connectPanel.classList.add('open');
    connectBackdrop.classList.add('open');
    connectTab.classList.add('open');
    connectTab.setAttribute('aria-expanded', 'true');
    connectPanel.setAttribute('aria-hidden', 'false');
  }
  function closeConnect() {
    connectPanel.classList.remove('open');
    connectBackdrop.classList.remove('open');
    connectTab.classList.remove('open');
    connectTab.setAttribute('aria-expanded', 'false');
    connectPanel.setAttribute('aria-hidden', 'true');
  }

  if (connectTab)      connectTab.addEventListener('click', () => connectPanel.classList.contains('open') ? closeConnect() : openConnect());
  if (connectClose)    connectClose.addEventListener('click', closeConnect);
  if (connectBackdrop) connectBackdrop.addEventListener('click', closeConnect);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeConnect(); });

  /* ── Highlight image carousels ───────────────── */
  function initHlCarousel(el) {
    const track  = el.querySelector('.hl-track');
    const slides = el.querySelectorAll('.hl-slide');
    const dots   = el.querySelectorAll('.hl-dot');
    const prev   = el.querySelector('.hl-arrow--prev');
    const next   = el.querySelector('.hl-arrow--next');
    const counter = el.querySelector('.hl-counter');
    let cur = 0;

    function goTo(idx) {
      cur = (idx + slides.length) % slides.length;
      track.style.transform = `translateX(-${cur * 100}%)`;
      dots.forEach((d, i) => d.classList.toggle('active', i === cur));
      if (counter) counter.textContent = `${cur + 1} / ${slides.length}`;
    }

    if (prev) prev.addEventListener('click', e => { e.stopPropagation(); goTo(cur - 1); });
    if (next) next.addEventListener('click', e => { e.stopPropagation(); goTo(cur + 1); });
    dots.forEach(d => d.addEventListener('click', e => { e.stopPropagation(); goTo(+d.dataset.idx); }));

    let tx = 0;
    el.addEventListener('touchstart', e => { tx = e.touches[0].clientX; }, { passive: true });
    el.addEventListener('touchend',   e => {
      const diff = tx - e.changedTouches[0].clientX;
      if (Math.abs(diff) > 40) goTo(diff > 0 ? cur + 1 : cur - 1);
    });
  }

  document.querySelectorAll('.hl-carousel').forEach(initHlCarousel);

  /* ── Archive toggles ─────────────────────────── */
  document.querySelectorAll('.archive-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const panel = document.getElementById(btn.dataset.target);
      if (!panel) return;
      const open = panel.classList.toggle('open');
      btn.classList.toggle('open', open);
      btn.querySelector('.archive-chevron').style.transform = open ? 'rotate(180deg)' : '';
      /* fade-in newly revealed cards + init any highlight carousels inside */
      if (open) {
        panel.querySelectorAll('.fade-in').forEach(el => el.classList.add('visible'));
        panel.querySelectorAll('.hl-carousel').forEach(initHlCarousel);
      }
    });
  });

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


}

/* ── Hero carousel ────────────────────────────────── */
function initHeroCarousel() {
  const track = document.getElementById("heroCarouselTrack");
  if (!track) return;
  const slides = track.querySelectorAll(".hero-carousel-slide");
  const dots   = document.querySelectorAll(".hc-dot");
  if (slides.length <= 1) return;

  let current = 0;

  function goTo(n) {
    slides[current].classList.remove("active");
    dots[current].classList.remove("active");
    current = (n + slides.length) % slides.length;
    slides[current].classList.add("active");
    dots[current].classList.add("active");
  }

  dots.forEach(d => d.addEventListener("click", () => goTo(+d.dataset.i)));
  setInterval(() => goTo(current + 1), 4000);
}

/* ── Skiper UI: Skate Motion Trail Particle Effect ── */
function initSkateTrail() {
  let lastX = 0, lastY = 0;
  window.addEventListener('mousemove', e => {
    const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
    if (dist > 25) {
      lastX = e.clientX;
      lastY = e.clientY;
      const p = document.createElement('div');
      p.className = 'skate-cursor-particle';
      p.style.left = `${e.clientX}px`;
      p.style.top = `${e.clientY}px`;
      document.body.appendChild(p);
      setTimeout(() => {
        p.style.transform = 'translate(-50%, -50%) scale(0.2)';
        p.style.opacity = '0';
      }, 50);
      setTimeout(() => { p.remove(); }, 450);
    }
  });
}

/* ── 3D Cylinder Gallery Carousel (Vengeance UI Cylinder Carousel) ──── */
function initCylinderGalleryCarousel() {
  const container = document.getElementById('gCylinderShowcase');
  if (!container) return;
  const viewport = document.getElementById('gCylinderViewport');
  const cards = Array.from(container.querySelectorAll('.g-cylinder-card'));
  if (!cards.length) return;

  let curIdx = 0;
  const total = cards.length;
  let isDragging = false;
  let startX = 0;
  let currentDragOffset = 0;

  function render3DCylinder(dragOffsetPx = 0) {
    const radius = Math.min(window.innerWidth * 0.35, 440);
    const dragAngleOffset = (dragOffsetPx / (window.innerWidth * 0.4)) * 360;

    cards.forEach((card, idx) => {
      let offset = idx - curIdx;
      // Wrap around math for smooth cylinder loop
      if (offset > total / 2) offset -= total;
      if (offset < -total / 2) offset += total;

      const absOffset = Math.abs(offset);

      if (absOffset > 4 && dragOffsetPx === 0) {
        card.style.opacity = '0';
        card.style.pointerEvents = 'none';
        card.style.transform = `translate3d(0, 0, -600px) scale(0)`;
        card.classList.remove('center');
        return;
      }

      const angle = offset * 25 + dragAngleOffset;
      const rad = (angle * Math.PI) / 180;
      const translateX = Math.sin(rad) * radius;
      const translateZ = Math.cos(rad) * radius - radius;
      const rotateY = -angle;

      const normOffset = Math.abs(angle / 25);
      const isCenter = Math.abs(angle) < 12;

      card.style.opacity = isCenter ? '1' : Math.max(0.2, 1 - normOffset * 0.25);
      card.style.pointerEvents = 'auto';
      card.style.transform = `translate3d(${translateX.toFixed(2)}px, 0, ${translateZ.toFixed(2)}px) rotateY(${rotateY.toFixed(2)}deg) scale(${isCenter ? 1.08 : 0.84})`;
      card.style.zIndex = `${Math.round(100 - normOffset * 10)}`;

      if (isCenter) {
        card.classList.add('center');
      } else {
        card.classList.remove('center');
      }
    });

    const counter = document.getElementById('gCylCounter');
    if (counter) counter.textContent = `${curIdx + 1} / ${total}`;
  }

  render3DCylinder();

  const prevBtn = document.getElementById('gCylPrev');
  const nextBtn = document.getElementById('gCylNext');

  if (prevBtn) prevBtn.onclick = (e) => { e.stopPropagation(); curIdx = (curIdx - 1 + total) % total; render3DCylinder(); };
  if (nextBtn) nextBtn.onclick = (e) => { e.stopPropagation(); curIdx = (curIdx + 1) % total; render3DCylinder(); };

  // Card click interaction
  cards.forEach((card, i) => {
    card.onclick = (e) => {
      if (Math.abs(currentDragOffset) > 10) return; // Ignore clicks if dragging
      if (i === curIdx) {
        const globalBtn = document.querySelector(`[data-global-photo-idx="${i}"]`);
        if (globalBtn) globalBtn.click();
      } else {
        curIdx = i;
        render3DCylinder();
      }
    };
  });

  // Touch / Drag Controls (Vengeance UI Interactive Fluid 3D Spin)
  const targetEl = viewport || container;
  if (targetEl) {
    const handleStart = (x) => {
      isDragging = true;
      startX = x;
      currentDragOffset = 0;
      targetEl.style.cursor = 'grabbing';
    };

    const handleMove = (x) => {
      if (!isDragging) return;
      currentDragOffset = x - startX;
      render3DCylinder(currentDragOffset);
    };

    const handleEnd = () => {
      if (!isDragging) return;
      isDragging = false;
      targetEl.style.cursor = 'grab';

      const threshold = 45;
      if (currentDragOffset < -threshold) {
        curIdx = (curIdx + 1) % total;
      } else if (currentDragOffset > threshold) {
        curIdx = (curIdx - 1 + total) % total;
      }
      currentDragOffset = 0;
      render3DCylinder(0);
    };

    targetEl.style.cursor = 'grab';

    targetEl.addEventListener('mousedown', (e) => handleStart(e.clientX));
    window.addEventListener('mousemove', (e) => handleMove(e.clientX));
    window.addEventListener('mouseup', handleEnd);

    targetEl.addEventListener('touchstart', (e) => handleStart(e.touches[0].clientX), { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    }, { passive: true });
    window.addEventListener('touchend', handleEnd);

    // Mouse Wheel 3D Cylinder Rotation
    targetEl.addEventListener('wheel', (e) => {
      if (Math.abs(e.deltaX) > 15 || Math.abs(e.deltaY) > 15) {
        const delta = e.deltaX || e.deltaY;
        if (delta > 0) curIdx = (curIdx + 1) % total;
        else curIdx = (curIdx - 1 + total) % total;
        render3DCylinder();
      }
    }, { passive: true });
  }

  // Keyboard Navigation Support
  window.addEventListener('keydown', (e) => {
    if (!document.getElementById('gCylinderShowcase')) return;
    if (e.key === 'ArrowRight') {
      curIdx = (curIdx + 1) % total;
      render3DCylinder();
    } else if (e.key === 'ArrowLeft') {
      curIdx = (curIdx - 1 + total) % total;
      render3DCylinder();
    }
  });
}

window.initCylinderGalleryCarousel = initCylinderGalleryCarousel;

/* ── Spotlight Navbar Interaction ─────────────────── */
function initSpotlightNavbar() {
  const nav = document.getElementById('navbar');
  if (!nav) return;
  const updateSpotlight = (e) => {
    const rect = nav.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    nav.style.setProperty('--spotlight-x', `${x}px`);
    nav.style.setProperty('--spotlight-y', `${y}px`);
  };
  nav.addEventListener('mousemove', updateSpotlight);
  window.addEventListener('mousemove', (e) => {
    if (e.clientY < 120) updateSpotlight(e);
  });
}

/* Run after render.js has finished building the DOM (async fetch) */
document.addEventListener('rsam:ready', () => {
  initInteractions();
  initHeroCarousel();
  initSkateTrail();
  initSpotlightNavbar();
  initCylinderGalleryCarousel();
});
