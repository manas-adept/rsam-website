/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   render.js — reads config + data files, builds HTML
   You should never need to edit this file.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ── Helpers ──────────────────────────────────────── */
function mount(id, html) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = html;
}

function photoFallback() {
  return `<div class="photo-fallback">
    <svg viewBox="0 0 60 60" width="48" height="48">
      <circle cx="30" cy="22" r="14" fill="rgba(224,28,46,0.4)"/>
      <path d="M6,60 Q6,40 30,40 Q54,40 54,60" fill="rgba(224,28,46,0.4)"/>
    </svg>
  </div>`;
}

function placeholderImg(classes = "") {
  return `<div class="placeholder-hl ${classes}">
    <svg viewBox="0 0 120 80" width="90" height="60">
      <rect x="5" y="5" width="110" height="70" rx="4" fill="none" stroke="rgba(224,28,46,0.4)" stroke-width="2"/>
      <circle cx="60" cy="40" r="20" fill="rgba(224,28,46,0.2)"/>
      <polygon points="53,32 53,48 72,40" fill="rgba(224,28,46,0.5)"/>
    </svg>
  </div>`;
}

function getActiveEventsList() {
  const saved = localStorage.getItem("RSAM_ADMIN_EVENTS");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }

  return [
    {
      id: "evt_district_2026",
      title: "4th District Championship 2026",
      year: "2026",
      category: "District Championship",
      date: "15th - 16th October 2026",
      startDateTime: "2026-10-15T08:00",
      endDateTime: "2026-10-16T18:00",
      deadline: "2026-10-01T23:59:59+05:30",
      location: "Moradabad Sports Complex, Kanth Road",
      feeType: "online",
      baseFee: 500.00,
      gatewayPercent: 2.0,
      gstPercent: 18.0,
      image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
      body: "Official 4th District Championship for all age groups & disciplines in Moradabad.",
      showOnTicker: true,
      isRegistrationActive: true
    },
    {
      id: "evt_up_state_2026",
      title: "7th UP Open State (Flat Track)",
      year: "2026",
      category: "State Championship",
      date: "July 19, 2026",
      startDateTime: "2026-05-10T04:30",
      endDateTime: "2026-05-10T10:30",
      location: "Central Academy, Lucknow, Uttar Pradesh",
      feeType: "organizer",
      baseFee: 0,
      image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797445/rsam_website/news/news_lko.jpg",
      body: "Moradabad speeders won 5 Gold, 8 Silver and 4+ Bronze Medals at 7th UP Open-state Championship at Central Academy, Lucknow. Organized by UPRSA and hosted by LRSA.",
      showOnTicker: true,
      isRegistrationActive: false
    },
    {
      id: "evt_marathon_2026",
      title: "Run on Wheels 4.0 Skating Marathon",
      year: "2026",
      category: "Marathon Championship",
      date: "May 10, 2026",
      startDateTime: "2026-05-10T06:00",
      endDateTime: "2026-05-10T12:00",
      location: "Agra, Uttar Pradesh",
      feeType: "organizer",
      baseFee: 0,
      image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797458/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event.jpg",
      body: "The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
      showOnTicker: true,
      isRegistrationActive: false
    }
  ];
}

function getActiveEventConfig() {
  const saved = localStorage.getItem("RSAM_ADMIN_EVENT");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  const events = getActiveEventsList();
  const active = events.find(e => e.isRegistrationActive);
  if (active) return active;
  return (window.ADMIN_CONFIG && window.ADMIN_CONFIG.activeEvent) || {
    title: "4th District Championship 2026",
    year: "2026",
    date: "15th - 16th October 2026",
    location: "Moradabad Sports Complex, Kanth Road",
    deadline: "2026-10-01T23:59:59+05:30",
    status: "active"
  };
}

function getActiveNewsItems() {
  const saved = localStorage.getItem("RSAM_ADMIN_NEWS");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return (window.NEWS && window.NEWS.items) || [];
}

function getActiveHighlights() {
  const saved = localStorage.getItem("RSAM_ADMIN_HIGHLIGHTS");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  return window.HIGHLIGHTS || [];
}

function getActiveOfficials() {
  const saved = localStorage.getItem("RSAM_ADMIN_OFFICIALS");
  if (saved) {
    try { return JSON.parse(saved); } catch (e) {}
  }
  const off = typeof OFFICIALS !== 'undefined' ? OFFICIALS : (window.OFFICIALS || {});
  const assoc = off.association || [];
  const comm = (off.committee && (Array.isArray(off.committee) ? off.committee : off.committee.members)) || [];
  return [...assoc, ...comm];
}

/* ── Navbar ───────────────────────────────────────── */
function renderNavbar() {
  const links = CONFIG.nav.map(l =>
    `<li><a href="${l.href}"${l.cta ? ' class="nav-cta"' : ""}>${l.label}</a></li>`
  ).join("");

  const events = getActiveEventsList();
  const tickerEvents = events.filter(e => e.showOnTicker);

  let tickerHTML = "";
  if (tickerEvents.length > 0) {
    document.body.classList.add("has-ticker");
    const items = tickerEvents.map(ev => {
      const ctaLabel = ev.isRegistrationActive ? 'Register Online &rarr;' : 'View Event &rarr;';
      const targetHref = ev.isRegistrationActive ? 'event-register.html' : 'index.html#events';

      return `
        <a href="${targetHref}" class="ticker-item">
          <span class="ticker-badge">⚡ ANNOUNCEMENT</span>
          <span><strong>${ev.title}</strong> — ${ev.date} · Venue: <strong>${ev.location}</strong></span>
          <span class="ticker-link-btn">${ctaLabel}</span>
        </a>
      `;
    }).join("");

    tickerHTML = `
      <div class="top-ticker-bar" id="topTickerBar">
        <div class="ticker-track">
          ${items}
          ${items}
        </div>
      </div>`;
  } else {
    document.body.classList.remove("has-ticker");
  }


  mount("app-navbar", `
    ${tickerHTML}
    <nav class="navbar spotlight-nav" id="navbar">
      <div class="nav-inner">
        <a href="index.html" class="nav-logo-link" style="text-decoration:none; color:inherit; display:flex; align-items:center; gap:0.8rem;">
          <div class="logo-img-wrap">
            <img src="https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png" alt="RSAM Logo" class="logo-img"/>
          </div>
          <div class="nav-logo-text">
            <span class="nav-logo-full">Roller Sports Association Moradabad</span>
          </div>
        </a>
        <button class="nav-toggle" id="navToggle" aria-label="Toggle menu">
          <span></span><span></span><span></span>
        </button>
        <ul class="nav-links" id="navLinks">${links}</ul>
      </div>
    </nav>
  `);
}

/* ── Hero ─────────────────────────────────────────── */
function renderHero() {
  if (!CONFIG.sections.hero.enabled) return;

  const { hero } = CONFIG;
  const ctaButtons = hero.cta.map(b =>
    `<a href="${b.href}" class="btn-${b.style}">${b.label}</a>`
  ).join("");

  // Collect all images from highlights marked for homepage carousel
  const carouselImages = (window.HIGHLIGHTS || [])
    .filter(h => h.homepage_carousel)
    .flatMap(h => Array.isArray(h.images) ? h.images : [h.images])
    .filter(Boolean);

  const carouselHTML = carouselImages.length ? `
    <div class="hero-carousel" id="heroCarousel">
      <div class="hero-carousel-track" id="heroCarouselTrack">
        ${carouselImages.map((src, i) => `
          <div class="hero-carousel-slide${i === 0 ? ' active' : ''}">
            <img src="${src}" alt="Highlight" loading="${i === 0 ? 'eager' : 'lazy'}" decoding="async"/>
          </div>`).join("")}
      </div>
      <div class="hero-carousel-dots">
        ${carouselImages.map((_, i) => `<button class="hc-dot${i === 0 ? ' active' : ''}" data-i="${i}" aria-label="Slide ${i+1}"></button>`).join("")}
      </div>
    </div>` : `
    <div class="skater-bg" aria-hidden="true">
      <img src="${hero.skaterImage}" alt="" class="skater-bg-img"/>
    </div>`;

  mount("app-hero", `
    <section class="hero" id="home">
      <div class="aurora-hero-bg" aria-hidden="true">
        <div class="aurora-blob aurora-blob--1"></div>
        <div class="aurora-blob aurora-blob--2"></div>
        <div class="aurora-blob aurora-blob--3"></div>
        <div class="aurora-blob aurora-blob--4"></div>
      </div>

      <div class="hero-inner">
        <div class="hero-content">
          <div class="hero-badge">${hero.badge}</div>
          <h1 class="hero-title">
            <span class="word-roll">${hero.titleLine1}</span>
            <br/>
            <span class="hero-name">${hero.titleLine2}</span>
          </h1>
          <p class="hero-desc">${hero.description}</p>
          <div class="hero-cta">${ctaButtons}</div>
        </div>
        ${carouselHTML}
      </div>

      <div class="hero-scroll-hint">
        <div class="scroll-dot"></div>
        <span>Scroll to explore</span>
      </div>
    </section>
  `);
}

/* ── About ────────────────────────────────────────── */
function renderAbout() {
  if (!CONFIG.sections.about.enabled) return;

  const { about } = CONFIG;

  const paragraphs = about.paragraphs.map(p => `<p>${p}</p>`).join("");

  const stats = about.stats.map(s => `
    <div class="veng-stat-card stat">
      <div class="veng-stat-glow"></div>
      <div class="stat-num-wrap">
        <span class="stat-num" data-target="${s.value}">0</span>
        <span class="stat-unit">${s.unit}</span>
      </div>
      <span class="stat-label">${s.label}</span>
    </div>
  `).join("");

  const affilItems = AFFILIATIONS.map(a => `
    <div class="affil-logo-cell">
      <div class="affil-logo-img-wrap">
        <img src="${a.image}" alt="${a.label}" loading="lazy" decoding="async"
             onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"/>
        <div class="affil-logo-fallback">Logo</div>
      </div>
      <span class="affil-logo-label">${a.label}</span>
    </div>
  `).join("");

  mount("app-about", `
    <section class="about section" id="about">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Who We Are</span>
          <h2>About <span class="accent">RSAM</span></h2>
        </div>
        <div class="about-grid">
          <div class="about-text fade-in">
            ${paragraphs}
          </div>
          <div class="about-affiliation fade-in">
            <p class="affil-heading">${about.affiliationsHeading}</p>
            <div class="affil-logo-grid">${affilItems}</div>
            <div class="about-stats">${stats}</div>
          </div>
        </div>

      </div>
    </section>
  `);
}

/* ── Officials ────────────────────────────────────── */
function renderOfficials() {
  if (!CONFIG.sections.officials.enabled) return;

  function officialCard(o, i) {
    return `
      <div class="official-card fade-in">
        <div class="oc-rhombus-wrap" style="--card-i:${i}">
          <div class="oc-rhombus ${o.designationClass || 'member'}">
            <img src="${o.photo}" alt="${o.name}" loading="lazy" decoding="async"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"/>
            <div class="photo-fallback">
              <svg viewBox="0 0 60 60" width="40" height="40">
                <circle cx="30" cy="22" r="14" fill="rgba(255,255,255,0.25)"/>
                <path d="M6,60 Q6,40 30,40 Q54,40 54,60" fill="rgba(255,255,255,0.25)"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="oc-info">
          <h4 class="oc-name">${o.name}</h4>
          ${o.degrees ? `<p class="oc-degrees">${o.degrees}</p>` : ""}
          <span class="oc-role ${o.designationClass || 'member'}"><span>${o.designation}</span></span>
        </div>
      </div>
    `;
  }

  const activeOfficialsList = getActiveOfficials();
  const execMembers = activeOfficialsList.filter(o => o.category === 'executive' || ['president','secretary','treasurer','technical'].includes(o.designationClass));
  const refMembers = activeOfficialsList.filter(o => !execMembers.includes(o));

  const execCards = execMembers.map((o, i) => officialCard(o, i)).join("");
  const refereeCards = refMembers.map((o, i) => officialCard(o, i)).join("");

  let refereesSectionHTML = "";
  if (refMembers.length > 0) {
    refereesSectionHTML = `
      <div class="oc-referees-wrap" style="margin-top: 3.5rem;">
        <div style="text-align: center; margin-bottom: 2rem;">
          <span class="section-tag" style="font-size:0.85rem;">Certified Officiating Team</span>
          <h3 style="font-size: 1.6rem; font-weight: 700; color: #fff; margin-top: 0.3rem;">Technical <span class="accent">Referees &amp; Judges</span></h3>
          <p style="color: #9ca3af; font-size: 0.95rem;">UPRSA &amp; District Certified Referees supervising official competitions in Moradabad</p>
        </div>
        <div class="officials-roster officials-roster--sm">${refereeCards}</div>
      </div>
    `;
  }

  mount("app-officials", `
    <section class="officials section dark-section" id="officials">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Leadership &amp; Officiating</span>
          <h2>Our <span class="accent">Officials</span></h2>
          <p class="section-desc">The governing body steering roller sports in Moradabad</p>
        </div>
        <div class="officials-roster">${execCards}</div>
        ${refereesSectionHTML}
      </div>
    </section>
  `);
}


/* ── Image entry normaliser ───────────────────────── */
/*
  Each image entry in data files can be either:
    "images/photo.jpg"                          ← plain string, uses defaults
    { src: "images/photo.jpg" }                 ← object, uses defaults
    { src: "images/photo.jpg",
      fit: "contain",                           ← object-fit: cover|contain|fill
      position: "top center" }                  ← object-position (any CSS value)

  fit defaults to "cover"  (fills the box, crops excess)
  position defaults to "center"
*/
function resolveCloudinarySrc(src) {
  if (!src) return '';
  if (src.startsWith('images/')) {
    const filename = src.replace(/^images\//, '').replace(/[^a-zA-Z0-9_.-]/g, '_');
    const baseName = filename.substring(0, filename.lastIndexOf('.')) || filename;
    return `https://res.cloudinary.com/igjmhsju/image/upload/v1/rsam_website/${baseName}`;
  }
  return src;
}

function normaliseImg(entry) {
  let src = typeof entry === 'string' ? entry : (entry.src || '');
  src = resolveCloudinarySrc(src);
  const fit = (typeof entry === 'object' && entry.fit) || 'cover';
  const position = (typeof entry === 'object' && entry.position) || 'center';
  return { src, fit, position };
}

function imgStyle(entry) {
  const { fit, position } = normaliseImg(entry);
  return `object-fit:${fit};object-position:${position};`;
}

/* ── Event status helper (IST-aware) ──────────────── */
function getEventStatus(ev) {
  if (!ev.startDateTime && !ev.endDateTime) {
    return { label: ev.category, cls: 'status-default' };
  }
  /* IST = UTC + 5h 30m */
  const nowIST = new Date(Date.now() + (5.5 * 60 - new Date().getTimezoneOffset()) * 60000);
  const start  = ev.startDateTime ? new Date(ev.startDateTime) : null;
  const end    = ev.endDateTime   ? new Date(ev.endDateTime)   : null;

  if (end && nowIST > end)          return { label: 'Event Ended',    cls: 'status-ended' };
  if (start && nowIST < start)      return { label: 'Upcoming Event', cls: 'status-upcoming' };
  return                                   { label: 'Happening Now',  cls: 'status-live' };
}

/* ── News ─────────────────────────────────────────── */
function renderNews() {
  if (!CONFIG.sections.news.enabled) return;

  const events = getActiveEventsList();

  function eventSlide(ev) {
    const evImg = normaliseImg(ev.image || '');
    const img = evImg.src
      ? `<img src="${evImg.src}" alt="${ev.title}" loading="lazy" decoding="async" style="${imgStyle(evImg)}"/>`
      : `<div class="placeholder-img-inner">
          <svg viewBox="0 0 80 80" width="60" height="60">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(224,28,46,0.4)" stroke-width="3"/>
            <circle cx="40" cy="40" r="16" fill="rgba(224,28,46,0.2)"/>
            <line x1="40" y1="4" x2="40" y2="76" stroke="rgba(224,28,46,0.3)" stroke-width="2"/>
            <line x1="4" y1="40" x2="76" y2="40" stroke="rgba(224,28,46,0.3)" stroke-width="2"/>
          </svg>
        </div>`;
    const status = getEventStatus(ev);
    return `
      <div class="events-slide">
        <div class="news-card featured">
          <div class="news-card-img">
            ${img}
            <div class="news-cat ${status.cls}">${status.label}</div>
          </div>
          <div class="news-card-body">
            <div class="news-meta">
              <span class="news-date">📅 ${ev.date}</span>
              <span class="news-location">📍 ${ev.location}</span>
            </div>
            <h3>${ev.title}</h3>
            <p>${ev.body}</p>
            <!-- circular link hidden until content is ready
            <a href="${ev.linkHref}" class="news-link">${ev.linkText} →</a>
            -->
          </div>
        </div>
      </div>`;
  }

  const dots = events.length > 1
    ? `<div class="events-dots">${events.map((_, i) =>
        `<button class="events-dot${i === 0 ? ' active' : ''}" data-idx="${i}" aria-label="Event ${i + 1}"></button>`
      ).join("")}</div>`
    : "";

  const arrows = events.length > 1 ? `
    <button class="events-arrow events-arrow--prev" aria-label="Previous event">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
    </button>
    <button class="events-arrow events-arrow--next" aria-label="Next event">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
    </button>` : "";

  const NEWS_LIMIT = 5;

  function newsItemHTML(item) {
    return `
    <div class="news-item fade-in">
      <div class="news-item-dot"></div>
      <div class="news-item-body">
        <span class="news-item-tag ${item.tag}">${item.tag.charAt(0).toUpperCase() + item.tag.slice(1)}</span>
        <h4>${item.title}</h4>
        <p class="news-item-date">${item.date}${item.location ? " · " + item.location : ""}</p>
        <p>${item.body}</p>
        <!-- details link hidden until content is ready
        <a href="${item.linkHref}">${item.linkText} →</a>
        -->
      </div>
    </div>`;
  }

  const activeNewsItems = getActiveNewsItems();
  const sorted    = [...activeNewsItems].sort((a, b) => new Date(b.date) - new Date(a.date));
  const recent    = sorted.slice(0, NEWS_LIMIT);
  const archived  = sorted.slice(NEWS_LIMIT);

  const newsItems        = recent.map(newsItemHTML).join("");
  const archivedNewsHTML = archived.length ? `
    <div class="archive-toggle-wrap">
      <button class="archive-toggle" data-target="newsArchive">
        Show Archive <span class="archive-count">${archived.length}</span>
        <svg class="archive-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="archive-panel" id="newsArchive">
      ${archived.map(newsItemHTML).join("")}
    </div>` : "";

  mount("app-news", `
    <section class="news section" id="news">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Updates</span>
          <h2>News &amp; <span class="accent">Circulars</span></h2>
          <p class="section-desc">Stay updated with the latest events, championships, and official notifications</p>
        </div>
        <div class="news-layout">
          <div class="news-featured fade-in">
            <div class="events-carousel" id="eventsCarousel">
              <div class="events-track">${events.map(eventSlide).join("")}</div>
              ${arrows}
              ${dots}
            </div>
          </div>
          <div class="news-list-wrap">
            <div class="news-list">${newsItems}</div>
            ${archivedNewsHTML}
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ── Highlights ───────────────────────────────────── */
function renderHighlights() {
  if (!CONFIG.sections.highlights.enabled) return;

  const HL_LIMIT = 5;

  let hlCarouselIdx = 0;

  function hlCardHTML(h, forceNarrow = false) {
    /* normalise: support both `image` (string) and `images` (array of strings or objects) */
    const rawImgs = h.images && h.images.length ? h.images
                    : h.image ? [h.image] : [];
    const imgs = rawImgs.map(normaliseImg);
    const wide = h.wide && !forceNarrow;
    const id   = `hlc-${hlCarouselIdx++}`;

    let imgSection;
    if (imgs.length === 0) {
      imgSection = placeholderImg();
    } else if (imgs.length === 1) {
      imgSection = `<img src="${imgs[0].src}" alt="${h.event}" class="hl-img" loading="lazy" decoding="async" style="${imgStyle(imgs[0])}"/>`;
    } else {
      const slides = imgs.map(img =>
        `<div class="hl-slide"><img src="${img.src}" alt="${h.event}" class="hl-img" loading="lazy" decoding="async" style="${imgStyle(img)}"/></div>`
      ).join("");
      const dots = imgs.map((_, i) =>
        `<button class="hl-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></button>`
      ).join("");
      imgSection = `
        <div class="hl-carousel" id="${id}">
          <div class="hl-track">${slides}</div>
          <button class="hl-arrow hl-arrow--prev" aria-label="Previous">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
          </button>
          <button class="hl-arrow hl-arrow--next" aria-label="Next">
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>
          </button>
          <div class="hl-dots">${dots}</div>
          <span class="hl-counter">1 / ${imgs.length}</span>
        </div>`;
    }

    return `
      <div class="highlight-card fade-in${wide ? " highlight-card--wide" : ""}">
        <div class="hl-img-wrap">
          ${imgSection}
          <div class="hl-overlay"><div class="hl-trophy">${h.trophy}</div></div>
        </div>
        <div class="hl-caption">
          ${h.date ? `<span class="hl-date">${h.date}</span>` : ""}
          <span class="hl-event-tag">${h.event}</span>
          <h3>"${h.caption}"</h3>
          <p>${h.body}</p>
        </div>
      </div>`;
  }

  const activeHlList = getActiveHighlights();
  const unarchived = activeHlList.filter(h => !h.archived);
  const explicitArchived = activeHlList.filter(h => h.archived);
  const visible  = unarchived.slice(0, HL_LIMIT);
  const archived = [...unarchived.slice(HL_LIMIT), ...explicitArchived];

  const visibleCards  = visible.map(h => hlCardHTML(h)).join("");
  const archiveCards  = archived.map(h => hlCardHTML(h, true)).join("");

  const archivedHlHTML = archived.length ? `
    <div class="archive-toggle-wrap" style="margin-top:2rem;">
      <button class="archive-toggle" data-target="hlArchive">
        Show Archive <span class="archive-count">${archived.length}</span>
        <svg class="archive-chevron" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
      </button>
    </div>
    <div class="archive-panel" id="hlArchive">
      <div class="highlights-grid highlights-grid--archive">${archiveCards}</div>
    </div>` : "";

  mount("app-highlights", `
    <section class="highlights section dark-section" id="highlights">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Championship Moments</span>
          <h2>Hall of <span class="accent">Highlights</span></h2>
          <p class="section-desc">Reliving the glory, grit, and greatness from our championships</p>
        </div>
        <div class="highlights-grid cylinder-carousel">${visibleCards}</div>
        ${archivedHlHTML}
      </div>
    </section>
  `);
}

/* ── Latest Video ─────────────────────────────────── */
function renderLatestVideo() {
  if (!CONFIG.sections.latestVideo.enabled) return;
  const { channelId } = CONFIG.latestVideo;

  mount("app-latestvideo", `
    <section class="latestvideo section" id="latestvideo">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">On YouTube</span>
          <h2>Latest <span class="accent">Video</span></h2>
        </div>
        <div class="lv-wrap" id="lvWrap">
          <div class="lv-loading">Loading latest video…</div>
        </div>
      </div>
    </section>
  `);

  if (!channelId) {
    document.getElementById("lvWrap").innerHTML =
      `<p class="lv-error">Add your YouTube channel ID to <code>config.js → latestVideo.channelId</code> to enable this section.</p>`;
    return;
  }

  const rssUrl = encodeURIComponent(
    `https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`
  );
  const apiUrl = `https://api.rss2json.com/v1/api.json?rss_url=${rssUrl}`;

  fetch(apiUrl)
    .then(r => r.json())
    .then(data => {
      if (data.status !== "ok") throw new Error(data.message || "rss2json error");
      const item = data.items && data.items[0];
      if (!item) throw new Error("no items");

      const videoId = new URL(item.link).searchParams.get("v");
      const title   = item.title;
      const pubDate = new Date(item.pubDate).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" });

      document.getElementById("lvWrap").innerHTML = `
        <div class="lv-card fade-in">
          <div class="lv-embed-wrap">
            <iframe
              src="https://www.youtube.com/embed/${videoId}"
              title="${title}"
              frameborder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowfullscreen>
            </iframe>
          </div>
          <div class="lv-meta">
            <p class="lv-date">${pubDate}</p>
            <h3 class="lv-title">${title}</h3>
            <a class="lv-channel-link" href="${CONFIG.connect.youtube}" target="_blank" rel="noopener">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="#e01c2e"><path d="M23.5 6.2a3 3 0 0 0-2.1-2.1C19.5 3.5 12 3.5 12 3.5s-7.5 0-9.4.6A3 3 0 0 0 .5 6.2 31 31 0 0 0 0 12a31 31 0 0 0 .5 5.8 3 3 0 0 0 2.1 2.1c1.9.6 9.4.6 9.4.6s7.5 0 9.4-.6a3 3 0 0 0 2.1-2.1A31 31 0 0 0 24 12a31 31 0 0 0-.5-5.8zM9.75 15.5v-7l6.5 3.5-6.5 3.5z"/></svg>
              View channel
            </a>
          </div>
        </div>
      `;
    })
    .catch(err => {
      console.error("Latest video fetch failed:", err);
      document.getElementById("lvWrap").innerHTML =
        `<p class="lv-error">Could not load the latest video. <a href="${CONFIG.connect.youtube}" target="_blank" rel="noopener">Visit our YouTube channel →</a></p>`;
    });
}

/* ── Certificate ──────────────────────────────────── */
function renderCertificate() {
  if (!CONFIG.sections.certificate.enabled) return;

  function protectedFrame(src, label) {
    return `
      <div class="cert-doc-wrap fade-in">
        <div class="cert-doc-label">${label}</div>
        <div class="cert-frame">
          <!-- corner decorations -->
          <span class="cert-corner cert-corner--tl"></span>
          <span class="cert-corner cert-corner--tr"></span>
          <span class="cert-corner cert-corner--bl"></span>
          <span class="cert-corner cert-corner--br"></span>
          <!-- protected image -->
          <div class="cert-img-shield">
            <img src="${src}" alt="${label}" class="cert-img"
                 draggable="false"
                 oncontextmenu="return false"
                 onmousedown="return false"/>
            <div class="cert-watermark">RSAM</div>
            <div class="cert-shield-overlay"></div>
          </div>
        </div>
      </div>`;
  }

  mount("app-certificate", `
    <section class="certificate section" id="certificate">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Official Recognition</span>
          <h2>Registration <span class="accent">Certificate</span></h2>
          <p class="section-desc">Official documentation of RSAM's accreditation and registration</p>
        </div>
        <div class="cert-docs-grid">
          <div class="cert-col cert-col--main">
            ${protectedFrame(CERTIFICATE.regImage, "Registration Certificate")}
          </div>
          <div class="cert-col cert-col--side">
            ${protectedFrame(CERTIFICATE.panImage, "PAN Card")}
          </div>
        </div>

        <!-- Official Skater Skinsuit Showcase -->
        ${(() => {
          let skinsuitConfig = (OFFICIALS && OFFICIALS.skinsuit) || {};
          const savedSkinsuit = localStorage.getItem("RSAM_ADMIN_SKINSUIT");
          if (savedSkinsuit) {
            try { skinsuitConfig = JSON.parse(savedSkinsuit); } catch (e) {}
          }
          const frontImg = skinsuitConfig.frontImage || "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png";
          const backImg  = skinsuitConfig.backImage || "https://res.cloudinary.com/igjmhsju/image/upload/v1788797469/rsam_website/branding/skater-boy.png";

          return `
            <div class="skinsuit-showcase-wrap fade-in" style="margin-top: 3rem; background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.08); border-radius: 16px; padding: 2rem;">
              <div style="text-align: center; margin-bottom: 1.8rem;">
                <span class="section-tag" style="font-size: 0.8rem;">Official Race Uniform</span>
                <h3 style="font-size: 1.5rem; font-weight: 700; color: #fff; margin-top: 0.4rem;">${skinsuitConfig.title || 'RSAM Official Skater Skinsuit'}</h3>
                <p style="color: #9ca3af; font-size: 0.92rem; margin-top: 0.2rem;">${skinsuitConfig.subtitle || 'Mandatory official racing uniform design for all RSAM athletes'}</p>
              </div>
              <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 1.5rem;">
                <div class="skinsuit-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.2rem; text-align: center;">
                  <h4 style="font-size: 1.05rem; color: #38bdf8; margin-bottom: 0.3rem; font-weight: 600;">Front View Design</h4>
                  <p style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 1rem;">Official RSAM emblem &amp; chest crest</p>
                  ${protectedFrame(frontImg, "Skinsuit Front View")}
                </div>
                <div class="skinsuit-card" style="background: rgba(255,255,255,0.02); border: 1px solid rgba(255,255,255,0.06); border-radius: 12px; padding: 1.2rem; text-align: center;">
                  <h4 style="font-size: 1.05rem; color: #38bdf8; margin-bottom: 0.3rem; font-weight: 600;">Back View Design</h4>
                  <p style="color: #9ca3af; font-size: 0.85rem; margin-bottom: 1rem;">District title typography &amp; athlete ID area</p>
                  ${protectedFrame(backImg, "Skinsuit Back View")}
                </div>
              </div>
            </div>
          `;
        })()}


        <p class="cert-note-text fade-in">${CERTIFICATE.note}</p>
      </div>
    </section>
  `);
}

/* ── Connect (floating panel) ─────────────────────── */
function renderConnect() {
  if (!CONFIG.sections.connect.enabled) return;

  const { connect } = CONFIG;

  mount("app-connect", `
    <!-- floating trigger tab -->
    <button class="connect-tab creepy-btn" id="connectTab" aria-label="Toggle connect panel" aria-expanded="false">
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="connect-tab__label">Connect</span>
    </button>

    <!-- sliding panel -->
    <div class="connect-panel" id="connectPanel" aria-hidden="true">
      <button class="connect-panel__close" id="connectClose" aria-label="Close">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
        </svg>
      </button>

      <div class="connect-socials">
        <a href="${connect.youtube}" target="_blank" rel="noopener" class="connect-social-btn youtube" aria-label="YouTube">
          <svg viewBox="0 0 48 48" width="24" height="24">
            <rect x="2" y="10" width="44" height="28" rx="8" fill="#FF0000"/>
            <polygon points="20,17 20,31 33,24" fill="white"/>
          </svg>
        </a>
        <a href="${connect.instagram}" target="_blank" rel="noopener" class="connect-social-btn instagram" aria-label="Instagram">
          <svg viewBox="0 0 48 48" width="24" height="24">
            <defs>
              <linearGradient id="ig2" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%"   style="stop-color:#f09433"/>
                <stop offset="50%"  style="stop-color:#dc2743"/>
                <stop offset="100%" style="stop-color:#bc1888"/>
              </linearGradient>
            </defs>
            <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig2)"/>
            <circle cx="24" cy="24" r="9" fill="none" stroke="white" stroke-width="2.5"/>
            <circle cx="34.5" cy="13.5" r="2.5" fill="white"/>
          </svg>
        </a>
      </div>

      <div class="connect-divider"></div>

      <div class="connect-contacts">
        <a href="mailto:${connect.email}" class="connect-contact-row">
          <span class="connect-contact-icon">📧</span>
          <span>${connect.email}</span>
        </a>
        <div class="connect-contact-row">
          <span class="connect-contact-icon">📍</span>
          <span>${connect.address}</span>
        </div>
        <a href="tel:${connect.phone.replace(/[^+\d]/g,"")}" class="connect-contact-row">
          <span class="connect-contact-icon">📞</span>
          <span>${connect.phone}</span>
        </a>
      </div>
    </div>

    <!-- backdrop -->
    <div class="connect-backdrop" id="connectBackdrop"></div>
  `);
}

/* ── Footer ───────────────────────────────────────── */
function renderFooter() {
  const links = CONFIG.nav.map(l =>
    `<a href="${l.href}">${l.label}</a>`
  ).join("");

  mount("app-footer", `
    <footer class="footer">
      <div class="container">
        <div class="footer-inner">
          <div class="footer-brand">
            <div class="footer-logo">
              <div class="logo-img-wrap" style="width:36px;height:36px;">
                <img src="https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png" alt="RSAM Logo" class="logo-img"/>
              </div>
              <span>${CONFIG.site.name}</span>
            </div>
            <p>${CONFIG.site.fullName}<br/>Approved by UPRSA · UPRSA approved by RSFI</p>
          </div>
          <div class="footer-links">${links}</div>
        </div>
        <div class="footer-bottom">
          <span>© <span id="year"></span> ${CONFIG.site.fullName}. All rights reserved.</span>
          <span class="visitor-counter"><span id="visitorCount">—</span> visitors</span>
        </div>
      </div>
    </footer>
  `);
}

/* ── About RSFI ───────────────────────────────────── */
function renderRsfi() {
  mount("app-rsfi", `
    <section class="rsfi-section section" id="rsfi">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">National Federation</span>
          <h2>About <span class="accent">RSFI</span></h2>
        </div>
        <div class="rsfi-body">
          <p>The Roller Skating Federation of India (INDIA SKATE) registered in 1955, Permanent Head office A695 Shastri Nagar New Delhi India, is affiliated with World Skate (World Parent body of Roller Skating) since 1971. R.S.F.I is founder member of the Asian body World Skate Asia (In 1978). Roller Skating Federation of India was accorded recognition by the Government of India since September 1990 followed by recognition by the Indian Olympic Association.</p>
          <p>National Championships are conducted for age groups, Cadet, Sub Juniors, Juniors, Seniors &amp; Masters (Men &amp; Women) for disciplines i.e. Skateboarding, Artistic Skating, Speed Skating, Inline Freestyle, Roller Freestyle, Roller Hockey, Inline Hockey, Inline Downhill, Inline Alpine, Roller Derby &amp; Roller Scooter, Skate cross.</p>
          <p>Roller Skating is a part of All India University Games, SGFI Nationals, CBSE Nationals, KV Nationals and ICSE Nationals.</p>
          <p>Indian Team is overall <strong>2nd in Asia</strong>. Roller Skating was included in the 1992 Olympic Games as a demonstration event and as a medal event in the 16th Asian Games 2010 in Guangzhou, 3rd Beach Asian Games 2012 in China, World University Games 2017 in Taiwan, 18th Asian Games 2018 in Indonesia, Youth Olympic Games 2018 in Argentina, 2020 Olympic Games &amp; 2024 Olympic Games.</p>
          <p>India team has achieved <strong>2nd and 3rd position</strong> in Asian Championships. Roller skating is a medal event in National Games, Asian Games, Olympic Games, World University Championships and Youth Olympic Games.</p>
        </div>
      </div>
    </section>
  `);
}

/* ── Cloudinary Optimization Helper (7-Day Rule) ──── */
function getOptimizedCloudinaryUrl(url, uploadedAt, mode = 'full') {
  if (!url || typeof url !== 'string' || !url.includes('res.cloudinary.com')) return url;

  const uploadDate = uploadedAt ? new Date(uploadedAt) : new Date();
  const ageDays = (Date.now() - uploadDate.getTime()) / (1000 * 60 * 60 * 24);
  const isRecent = ageDays <= 7;

  let transform = '';
  if (mode === 'thumb') {
    transform = 'q_auto,f_auto,w_450,h_320,c_fill,g_auto';
  } else if (isRecent) {
    transform = 'q_auto:best,f_auto';
  } else {
    transform = 'q_auto:good,f_auto,w_1200';
  }

  const parts = url.split('/image/upload/');
  if (parts.length === 2) {
    const rest = parts[1].replace(/^(q_[^/]+|f_[^/]+|w_[^/]+|h_[^/]+|c_[^/]+|g_[^/]+|,)+\//, '');
    return `${parts[0]}/image/upload/${transform}/${rest}`;
  }
  return url;
}

/* ── Event Photo Gallery (Config-driven Folder Architecture) ────────── */
let galleryState = {
  currentFolderId: null, // null = Folder Overview, string = inside event folder
  currentPage: 1,
  itemsPerPage: 20,
  viewMode: 'grid', // 'grid' | 'list'
  lightbox: {
    isOpen: false,
    albumPhotos: [],
    currentIndex: 0
  }
};

function renderGallery() {
  if (!CONFIG.sections.gallery || !CONFIG.sections.gallery.enabled) return;

  const rawAlbums = window.GALLERY_ALBUMS || [];
  const galleryConfig = window.GALLERY_CONFIG || { folders: [] };

  // Enforce 28 compact photo thumbnails per page in inside folder view
  galleryState.itemsPerPage = 28;

  const cloudMap = window.CLOUDINARY_MEDIA_MAP || {};
  const liveCache = window.LIVE_GALLERY_CACHE || {};
  const discoveredFolders = window.LIVE_CLOUDINARY_DISCOVERED_FOLDERS;

  // Render dynamically discovered Cloudinary subfolders first, or fall back to gallery-config.json
  let albums = [];
  if (discoveredFolders && Array.isArray(discoveredFolders) && discoveredFolders.length > 0) {
    albums = discoveredFolders.map(folder => ({
      id: folder.folderId,
      title: folder.title,
      date: folder.date || 'Event Gallery',
      location: folder.location || 'Moradabad / UP',
      category: folder.category || 'Championship',
      description: folder.description || '',
      cloudinarySubfolder: folder.cloudinarySubfolder,
      photos: folder.photos || []
    }));
  } else if (galleryConfig.folders && galleryConfig.folders.length > 0) {
    albums = galleryConfig.folders
      .filter(f => f.enabled !== false)
      .sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99))
      .map(folder => {
        const matchingAlbum = rawAlbums.find(a => a.id === folder.folderId) || {};
        let rawPhotos = matchingAlbum.photos || [];
        const subfolder = folder.cloudinarySubfolder || '';
        let albumPhotos = [];

        // 1. Live Cloudinary API cache priority (dynamic update without file edits)
        if (subfolder && Array.isArray(liveCache[subfolder])) {
          albumPhotos = liveCache[subfolder];
        } else {
          // 2. Fallback to matching photos in gallery.json & media map
          albumPhotos = [...rawPhotos];
          if (subfolder) {
            const subfolderMatches = rawPhotos.filter(p => p.src && p.src.includes(subfolder));
            if (subfolderMatches.length > 0) {
              albumPhotos = subfolderMatches;
            } else {
              const allSitePhotos = rawAlbums.flatMap(a => a.photos || []);
              const globalMatches = allSitePhotos.filter(p => p.src && p.src.includes(subfolder));
              if (globalMatches.length > 0) {
                albumPhotos = globalMatches;
              }
            }
          }

          const existingSrcs = new Set(albumPhotos.map(p => p.src));
          for (const [key, url] of Object.entries(cloudMap)) {
            if (url && url.includes(subfolder) && !existingSrcs.has(url)) {
              const baseName = key.split('/').pop().split('.')[0];
              albumPhotos.push({
                src: url,
                caption: `Event Showcase Photo (${baseName})`,
                uploadedAt: new Date().toISOString()
              });
              existingSrcs.add(url);
            }
          }
        }

        return {
          id: folder.folderId,
          title: folder.title || matchingAlbum.title || 'Event Album',
          date: folder.date || matchingAlbum.date || '',
          location: folder.location || matchingAlbum.location || '',
          category: folder.category || matchingAlbum.category || 'Event',
          description: folder.description || matchingAlbum.description || '',
          cloudinarySubfolder: subfolder,
          photos: albumPhotos
        };
      });
  } else {
    albums = rawAlbums;
  }

  // Mode A: Folder Overview (galleryState.currentFolderId === null)
  if (!galleryState.currentFolderId) {
    const folderCardsHTML = albums.map(album => {
      const photos = album.photos || [];
      const fallbackStack = [
        'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/events/state2026/state2026_photo1.jpg',
        'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/events/state2026/state2026_photo2.jpg',
        'https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/events/district2026/district2026_photo1.jpg'
      ];
      const p1 = photos[0] ? getOptimizedCloudinaryUrl(photos[0].src, photos[0].uploadedAt, 'thumb') : fallbackStack[0];
      const p2 = photos[1] ? getOptimizedCloudinaryUrl(photos[1].src, photos[1].uploadedAt, 'thumb') : (photos[0] ? fallbackStack[1] : fallbackStack[1]);
      const p3 = photos[2] ? getOptimizedCloudinaryUrl(photos[2].src, photos[2].uploadedAt, 'thumb') : (photos[0] ? fallbackStack[2] : fallbackStack[2]);
      const photoCount = photos.length;

      const stackHTML = `<div class="devi-folder-stack">
            <img src="${p3}" alt="${album.title}" class="devi-thumb devi-thumb--3" loading="lazy"/>
            <img src="${p2}" alt="${album.title}" class="devi-thumb devi-thumb--2" loading="lazy"/>
            <img src="${p1}" alt="${album.title}" class="devi-thumb devi-thumb--1" loading="lazy"/>
          </div>`;

      return `
        <div class="g-folder-card devi-folder-card visible" data-folder-id="${album.id}">
          <div class="devi-folder-header-tab">📂 ${album.category}</div>
          <div class="g-folder-img-wrap">
            ${stackHTML}
            <div class="g-folder-overlay">
              <span class="g-folder-open-badge">📂 Open Event Folder</span>
            </div>
            <span class="g-folder-count-badge">📷 ${photoCount} Photos</span>
          </div>
          <div class="g-folder-info">
            <div class="g-folder-header">
              <h3 class="g-folder-title">${album.title}</h3>
            </div>
            <p class="g-folder-meta">📅 ${album.date} · 📍 ${album.location}</p>
            <p class="g-folder-desc">${album.description}</p>
            <div class="g-folder-action-btn">
              <span>Open Event Folder (${photoCount} Photos)</span>
              <span class="g-btn-arrow">→</span>
            </div>
          </div>
        </div>
      `;
    }).join('');

    mount("app-gallery", `
      <section class="gallery-section section dark-section" id="gallery">
        <div class="container">
          <div class="section-header">
            <span class="section-tag">Event Showcase</span>
            <h2>Photo <span class="accent">Gallery</span></h2>
            <p class="section-desc">Select an event folder to view championship photos and action archives</p>
          </div>

          <div class="g-folders-grid">
            ${folderCardsHTML}
          </div>
        </div>
      </section>
    `);

    // Add folder click listeners
    document.querySelectorAll('.g-folder-card').forEach(card => {
      card.onclick = () => {
        galleryState.currentFolderId = card.dataset.folderId;
        galleryState.currentPage = 1;
        renderGallery();
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      };
    });
    return;
  }

  // Mode B: Inside Event Folder (galleryState.currentFolderId !== null)
  const currentAlbum = albums.find(a => a.id === galleryState.currentFolderId || a.cloudinarySubfolder === galleryState.currentFolderId)
    || albums.find(a => a.id === galleryState.currentFolderId)
    || albums[0]
    || { id: 'unknown', title: 'Event Album', photos: [] };

  const allPhotos = (currentAlbum.photos || []).map(p => ({
    ...p,
    albumId: currentAlbum.id,
    albumTitle: currentAlbum.title,
    albumDate: currentAlbum.date,
    category: currentAlbum.category
  }));

  const totalPhotos = allPhotos.length;
  const itemsPerPage = 28; // 28 thumbnails per page
  const totalPages = Math.max(1, Math.ceil(totalPhotos / itemsPerPage));

  // Sanity check current page
  if (galleryState.currentPage > totalPages) galleryState.currentPage = totalPages;
  if (galleryState.currentPage < 1) galleryState.currentPage = 1;

  const startIndex = (galleryState.currentPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalPhotos);
  const pagePhotos = allPhotos.slice(startIndex, endIndex);

  // Pagination HTML Builder
  let paginationHTML = '';
  if (totalPages > 1) {
    let pageButtonsHTML = '';
    for (let p = 1; p <= totalPages; p++) {
      pageButtonsHTML += `
        <button class="g-page-btn${galleryState.currentPage === p ? ' active' : ''}" data-page="${p}">
          ${p}
        </button>
      `;
    }

    paginationHTML = `
      <div class="g-pagination-bar">
        <span class="g-page-info">Showing ${startIndex + 1}–${endIndex} of ${totalPhotos} photos</span>
        <div class="g-page-controls">
          <button class="g-page-nav-btn" id="gPrevPage" ${galleryState.currentPage === 1 ? 'disabled' : ''}>
            ‹ Prev
          </button>
          ${pageButtonsHTML}
          <button class="g-page-nav-btn" id="gNextPage" ${galleryState.currentPage === totalPages ? 'disabled' : ''}>
            Next ›
          </button>
        </div>
      </div>
    `;
  }

  // View Switcher Buttons
  const viewSwitcherHTML = `
    <div class="g-view-switcher">
      <button class="g-view-btn${galleryState.viewMode === 'grid' ? ' active' : ''}" data-view="grid" title="Grid View">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/></svg>
        <span>Grid</span>
      </button>
      <button class="g-view-btn${galleryState.viewMode === 'list' ? ' active' : ''}" data-view="list" title="List View">
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/></svg>
        <span>List</span>
      </button>
    </div>
  `;

  // Grid View HTML (Compact 28-Photo Collapsed Grid)
  const gridCardsHTML = pagePhotos.map((photo, pageIdx) => {
    const globalIdx = startIndex + pageIdx;
    const thumbUrl = getOptimizedCloudinaryUrl(photo.src, photo.uploadedAt, 'thumb');

    return `
      <div class="g-grid-card visible" data-global-photo-idx="${globalIdx}">
        <div class="g-card-img-wrap">
          <img src="${thumbUrl}" alt="Photo ${globalIdx + 1}" loading="lazy" decoding="async"/>
          <div class="g-card-overlay">
            <span class="g-zoom-icon">🔍</span>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // List View HTML
  const listCardsHTML = pagePhotos.map((photo, pageIdx) => {
    const globalIdx = startIndex + pageIdx;
    const thumbUrl = getOptimizedCloudinaryUrl(photo.src, photo.uploadedAt, 'thumb');
    const ageDays = photo.uploadedAt ? (Date.now() - new Date(photo.uploadedAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
    const isRecent = ageDays <= (galleryConfig.autoOptimizeAfterDays || 7);
    const qualityLabel = isRecent ? `✨ Master High Quality (< ${galleryConfig.autoOptimizeAfterDays || 7} days)` : `⚡ Cloudinary Auto-Optimized (> ${galleryConfig.autoOptimizeAfterDays || 7} days)`;

    return `
      <div class="g-list-item visible" data-global-photo-idx="${globalIdx}">
        <div class="g-list-cover">
          <img src="${thumbUrl}" alt="${photo.caption}" loading="lazy"/>
        </div>
        <div class="g-list-content">
          <div class="g-list-meta">
            <span class="g-list-cat">${currentAlbum.category}</span>
            <span class="g-list-date">Photo #${globalIdx + 1}</span>
            <span class="g-quality-note">${qualityLabel}</span>
          </div>
          <h3 class="g-list-title">${photo.caption}</h3>
          <p class="g-list-desc">Album: <strong>${currentAlbum.title}</strong> · ${currentAlbum.date}</p>
          <div class="g-list-footer">
            <button class="btn-primary btn-sm g-view-photo-btn" data-global-photo-idx="${globalIdx}">View Fullscreen Showcase →</button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  const cylinderCardsHTML = allPhotos.map((photo, pIdx) => {
    const thumbUrl = getOptimizedCloudinaryUrl(photo.src, photo.uploadedAt, 'thumb');
    return `
      <div class="g-cylinder-card${pIdx === 0 ? ' center' : ''}" data-cyl-idx="${pIdx}" data-global-photo-idx="${pIdx}">
        <img src="${thumbUrl}" alt="${photo.caption}" loading="lazy"/>
        <div class="g-cyl-overlay">
          <p class="g-cyl-caption">${photo.caption || 'Event Showcase Photo'}</p>
        </div>
      </div>
    `;
  }).join('');

  const cylinderShowcaseHTML = totalPhotos > 0 ? `
    <div class="g-cylinder-showcase" id="gCylinderShowcase">
      <div class="g-cylinder-viewport" id="gCylinderViewport">
        ${cylinderCardsHTML}
      </div>
      <div class="g-cylinder-controls">
        <button class="g-cyl-btn" id="gCylPrev">‹ Prev Photo</button>
        <span class="g-cyl-counter" id="gCylCounter">1 / ${totalPhotos}</span>
        <button class="g-cyl-btn" id="gCylNext">Next Photo ›</button>
      </div>
    </div>
  ` : '';

  let bodyHTML = '';
  if (totalPhotos === 0) {
    bodyHTML = `
      <div class="g-empty-folder-state" style="text-align: center; padding: 60px 20px; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.12); border-radius: 16px; margin: 25px 0;">
        <div style="font-size: 52px; margin-bottom: 12px; opacity: 0.8;">📷</div>
        <h3 style="font-size: 22px; font-weight: 700; color: #f3f4f6; margin-bottom: 8px;">0 Photos Available</h3>
        <p style="color: #9ca3af; max-width: 520px; margin: 0 auto; line-height: 1.6;">There are currently 0 photos in this event folder (<code>${currentAlbum.cloudinarySubfolder || currentAlbum.id}</code>). Upload photos directly to Cloudinary and they will appear here automatically.</p>
      </div>
    `;
  } else {
    bodyHTML = `<div class="g-grid-container">${gridCardsHTML}</div>`;
  }

  mount("app-gallery", `
    <section class="gallery-section section dark-section" id="gallery">
      <div class="container">
        <!-- Breadcrumb Header -->
        <div class="g-breadcrumb-bar">
          <button class="g-back-btn" id="gBackToFolders">
            ← Back to All Event Folders
          </button>
          <div class="g-breadcrumb-path">
            <span class="g-bc-root">📁 Gallery</span>
            <span class="g-bc-sep">/</span>
            <span class="g-bc-current">${currentAlbum.title}</span>
          </div>
        </div>

        <div class="g-album-header-banner">
          <div>
            <h2>${currentAlbum.title}</h2>
            <p class="g-album-meta-text">📅 ${currentAlbum.date} · 📍 ${currentAlbum.location} · 📷 Total ${totalPhotos} Photos</p>
            <p class="g-album-desc-text">${currentAlbum.description}</p>
          </div>
          ${viewSwitcherHTML}
        </div>

        ${cylinderShowcaseHTML}
        ${bodyHTML}
        ${paginationHTML}
      </div>

      <!-- Lightbox Showcase Modal -->
      <div class="g-lightbox-modal" id="gLightboxModal" aria-hidden="true">
        <div class="g-lightbox-backdrop" id="gLightboxBackdrop"></div>
        <div class="g-lightbox-dialog">
          <button class="g-lightbox-close" id="gLightboxClose" aria-label="Close Showcase">✕</button>

          <div class="g-lightbox-header">
            <div class="g-lh-info">
              <span class="g-lh-album" id="gLhAlbumTitle">${currentAlbum.title}</span>
              <span class="g-lh-counter" id="gLhCounter">1 / ${totalPhotos}</span>
            </div>
            <div id="gLhQualityBadge"></div>
          </div>

          <div class="g-lightbox-viewport">
            <button class="g-lh-nav g-lh-nav--prev" id="gLhPrev" aria-label="Previous Photo">❮</button>
            <div class="g-lh-img-wrap">
              <img src="" id="gLhImage" alt="Gallery Photo" />
            </div>
            <button class="g-lh-nav g-lh-nav--next" id="gLhNext" aria-label="Next Photo">❯</button>
          </div>

          <div class="g-lightbox-caption-wrap">
            <p class="g-lh-caption" id="gLhCaption">Photo Caption</p>
          </div>

          <div class="g-lightbox-strip" id="gLhStrip"></div>
        </div>
      </div>
    </section>
  `);

  setupInsideFolderListeners(allPhotos, totalPages);
}

function setupInsideFolderListeners(allPhotos, totalPages) {
  // Back to Folders button
  const backBtn = document.getElementById('gBackToFolders');
  if (backBtn) {
    backBtn.onclick = () => {
      galleryState.currentFolderId = null;
      galleryState.currentPage = 1;
      renderGallery();
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    };
  }

  // View switcher
  document.querySelectorAll('.g-view-btn').forEach(btn => {
    btn.onclick = () => {
      galleryState.viewMode = btn.dataset.view;
      renderGallery();
    };
  });

  // Page numbers
  document.querySelectorAll('.g-page-btn').forEach(btn => {
    btn.onclick = () => {
      galleryState.currentPage = parseInt(btn.dataset.page, 10);
      renderGallery();
      document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
    };
  });

  // Prev / Next page buttons
  const prevPageBtn = document.getElementById('gPrevPage');
  const nextPageBtn = document.getElementById('gNextPage');
  if (prevPageBtn) {
    prevPageBtn.onclick = () => {
      if (galleryState.currentPage > 1) {
        galleryState.currentPage--;
        renderGallery();
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      }
    };
  }
  if (nextPageBtn) {
    nextPageBtn.onclick = () => {
      if (galleryState.currentPage < totalPages) {
        galleryState.currentPage++;
        renderGallery();
        document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' });
      }
    };
  }

  // Photo Cards / Buttons -> Open Lightbox
  document.querySelectorAll('[data-global-photo-idx]').forEach(el => {
    el.onclick = () => {
      const idx = parseInt(el.dataset.globalPhotoIdx, 10);
      openLightbox(allPhotos, idx);
    };
  });

  // Lightbox Close
  const closeBtn = document.getElementById('gLightboxClose');
  const backdrop = document.getElementById('gLightboxBackdrop');
  if (closeBtn) closeBtn.onclick = closeLightbox;
  if (backdrop) backdrop.onclick = closeLightbox;

  // Lightbox Nav
  const prevBtn = document.getElementById('gLhPrev');
  const nextBtn = document.getElementById('gLhNext');
  if (prevBtn) prevBtn.onclick = () => navigateLightbox(-1);
  if (nextBtn) nextBtn.onclick = () => navigateLightbox(1);

  if (typeof window.initCylinderGalleryCarousel === 'function') {
    window.initCylinderGalleryCarousel();
  }
}

function openLightbox(photos, startIndex = 0) {
  if (!photos || photos.length === 0) return;
  galleryState.lightbox.isOpen = true;
  galleryState.lightbox.albumPhotos = photos;
  galleryState.lightbox.currentIndex = startIndex;

  const modal = document.getElementById('gLightboxModal');
  if (modal) {
    modal.classList.add('active');
    modal.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }
  updateLightboxContent();
}

function closeLightbox() {
  galleryState.lightbox.isOpen = false;
  const modal = document.getElementById('gLightboxModal');
  if (modal) {
    modal.classList.remove('active');
    modal.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }
}

function navigateLightbox(direction) {
  const { albumPhotos, currentIndex } = galleryState.lightbox;
  if (!albumPhotos || !albumPhotos.length) return;
  let newIdx = currentIndex + direction;
  if (newIdx < 0) newIdx = albumPhotos.length - 1;
  if (newIdx >= albumPhotos.length) newIdx = 0;
  galleryState.lightbox.currentIndex = newIdx;
  updateLightboxContent();
}

function updateLightboxContent() {
  const { albumPhotos, currentIndex } = galleryState.lightbox;
  const photo = albumPhotos[currentIndex];
  if (!photo) return;

  const imgEl = document.getElementById('gLhImage');
  const captionEl = document.getElementById('gLhCaption');
  const albumTitleEl = document.getElementById('gLhAlbumTitle');
  const counterEl = document.getElementById('gLhCounter');
  const qualityBadgeEl = document.getElementById('gLhQualityBadge');
  const stripEl = document.getElementById('gLhStrip');

  const fullUrl = getOptimizedCloudinaryUrl(photo.src, photo.uploadedAt, 'full');
  if (imgEl) imgEl.src = fullUrl;
  if (captionEl) captionEl.textContent = photo.caption || '';
  if (albumTitleEl) albumTitleEl.textContent = photo.albumTitle || 'Event Showcase';
  if (counterEl) counterEl.textContent = `${currentIndex + 1} / ${albumPhotos.length}`;

  const ageDays = photo.uploadedAt ? (Date.now() - new Date(photo.uploadedAt).getTime()) / (1000 * 60 * 60 * 24) : 999;
  const isRecent = ageDays <= 7;
  if (qualityBadgeEl) {
    qualityBadgeEl.innerHTML = isRecent
      ? `<span class="g-lh-badge hq">✨ Master High Quality (&lt;7 days)</span>`
      : `<span class="g-lh-badge opt">⚡ Cloudinary Auto-Optimized (&gt;7 days)</span>`;
  }

  if (stripEl) {
    stripEl.innerHTML = albumPhotos.map((p, i) => `
      <img src="${getOptimizedCloudinaryUrl(p.src, p.uploadedAt, 'thumb')}" class="g-lh-strip-thumb${i === currentIndex ? ' active' : ''}" data-idx="${i}" alt=""/>
    `).join('');

    stripEl.querySelectorAll('.g-lh-strip-thumb').forEach(t => {
      t.onclick = () => {
        galleryState.lightbox.currentIndex = parseInt(t.dataset.idx, 10);
        updateLightboxContent();
      };
    });
  }
}

document.addEventListener('keydown', (e) => {
  if (!galleryState.lightbox || !galleryState.lightbox.isOpen) return;
  if (e.key === 'Escape') closeLightbox();
  if (e.key === 'ArrowLeft') navigateLightbox(-1);
  if (e.key === 'ArrowRight') navigateLightbox(1);
});

/* ── Boot ─────────────────────────────────────────── */
function renderAll() {
  document.title = CONFIG.site.tabTitle;
  renderNavbar();
  renderHero();
  renderAbout();
  renderRsfi();
  renderOfficials();
  renderNews();
  renderHighlights();
  renderGallery();
  renderLatestVideo();
  renderCertificate();
  renderConnect();
  renderFooter();
}

async function loadLiveCloudinaryGalleries() {
  window.LIVE_GALLERY_CACHE = window.LIVE_GALLERY_CACHE || {};
  window.LIVE_CLOUDINARY_DISCOVERED_FOLDERS = null;

  const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const baseUrl = isLocal ? 'http://localhost:3001' : (window.PRODUCTION_API_URL || 'https://rsam-whatsapp-bot.onrender.com');

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`${baseUrl}/api/cloudinary-gallery-folders`, { signal: controller.signal });
    clearTimeout(timer);
    if (res.ok) {
      const data = await res.json();
      if (data && data.success && Array.isArray(data.folders) && data.folders.length > 0) {
        const galleryConfig = window.GALLERY_CONFIG || { folders: [] };
        const configFolders = galleryConfig.folders || [];

        for (const f of data.folders) {
          const matchedConfig = configFolders.find(c => c.cloudinarySubfolder === f.cloudinarySubfolder || c.folderId === f.folderId || c.folderId === f.name) || {};
          if (matchedConfig.title) f.title = matchedConfig.title;
          if (matchedConfig.category) f.category = matchedConfig.category;
          if (matchedConfig.date) f.date = matchedConfig.date;
          if (matchedConfig.location) f.location = matchedConfig.location;
          if (matchedConfig.description) f.description = matchedConfig.description;
          if (matchedConfig.displayOrder) f.displayOrder = matchedConfig.displayOrder;

          if (f.cloudinarySubfolder && f.photos) {
            window.LIVE_GALLERY_CACHE[f.cloudinarySubfolder] = f.photos;
          }
        }
        data.folders.sort((a, b) => (a.displayOrder || 99) - (b.displayOrder || 99));
        window.LIVE_CLOUDINARY_DISCOVERED_FOLDERS = data.folders;
        return;
      }
    }
  } catch (e) {
    // API server offline or sleeping fallback
  }

  // Fallback if dynamic folder discovery API fails
  const galleryConfig = window.GALLERY_CONFIG || { folders: [] };
  if (galleryConfig.folders && galleryConfig.folders.length > 0) {
    const fetchPromises = galleryConfig.folders
      .filter(f => f.enabled !== false && f.cloudinarySubfolder)
      .map(async (folder) => {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 3000);
          const res = await fetch(`${baseUrl}/api/cloudinary-gallery?subfolder=${encodeURIComponent(folder.cloudinarySubfolder)}`, { signal: controller.signal });
          clearTimeout(timer);
          if (res.ok) {
            const data = await res.json();
            if (data && data.success && Array.isArray(data.photos)) {
              window.LIVE_GALLERY_CACHE[folder.cloudinarySubfolder] = data.photos;
            }
          }
        } catch (e) {}
      });
    await Promise.all(fetchPromises);
  }
}

Promise.all([
  fetch("data/news-items.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/upcoming-events.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/highlights.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/officials.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/affiliations.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/gallery.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/gallery-config.json").then(r => r.ok ? r.json() : null).catch(() => null),
  fetch("data/cloudinary-media-map.json").then(r => r.ok ? r.json() : null).catch(() => null),
]).then(async ([newsItems, upcomingEvents, highlights, officials, affiliations, galleryData, galleryConfig, cloudMap]) => {
  if (newsItems && newsItems.items) {
    window.NEWS = {
      items: newsItems.items,
      upcomingEvents: (upcomingEvents && upcomingEvents.events) || (window.NEWS && window.NEWS.upcomingEvents) || []
    };
  }
  if (highlights && highlights.items) {
    window.HIGHLIGHTS = highlights.items;
  }
  if (officials) {
    window.OFFICIALS = officials;
  }
  if (affiliations && affiliations.items) {
    window.AFFILIATIONS = affiliations.items;
  }
  if (galleryData && galleryData.albums) {
    window.GALLERY_ALBUMS = galleryData.albums;
  }
  if (galleryConfig) {
    window.GALLERY_CONFIG = galleryConfig;
  }
  if (cloudMap) {
    window.CLOUDINARY_MEDIA_MAP = cloudMap;
  }

  try {
    await loadLiveCloudinaryGalleries();
  } catch (e) {
    console.warn("Live gallery loading skipped:", e);
  }

  renderAll();
  document.dispatchEvent(new Event('rsam:ready'));
}).catch(err => {
  console.error("Data fetch warning, rendering with default data:", err);
  renderAll();
  document.dispatchEvent(new Event('rsam:ready'));
});
