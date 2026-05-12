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

/* ── Navbar ───────────────────────────────────────── */
function renderNavbar() {
  const links = CONFIG.nav.map(l =>
    `<li><a href="${l.href}">${l.label}</a></li>`
  ).join("");

  mount("app-navbar", `
    <nav class="navbar" id="navbar">
      <div class="nav-inner">
        <div class="nav-logo">
          <div class="logo-img-wrap">
            <img src="images/rsam-logo.PNG" alt="RSAM Logo" class="logo-img"/>
            <svg class="logo-ring logo-ring--outer" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="47" fill="none" stroke="#e01c2e" stroke-width="2.5" stroke-dasharray="74 222" stroke-linecap="round"/>
            </svg>
            <svg class="logo-ring logo-ring--inner" viewBox="0 0 100 100" aria-hidden="true">
              <circle cx="50" cy="50" r="34" fill="none" stroke="#c9922a" stroke-width="2" stroke-dasharray="40 174" stroke-linecap="round"/>
            </svg>
          </div>
        </div>
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

  mount("app-hero", `
    <section class="hero" id="home">
      <canvas id="wheelCanvas"></canvas>

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

      <div class="hero-scroll-hint">
        <div class="scroll-dot"></div>
        <span>Scroll to explore</span>
      </div>

      <div class="skater-bg" aria-hidden="true">
        <img src="${hero.skaterImage}" alt="" class="skater-bg-img"/>
      </div>

      <div class="deco-wheel deco-wheel--1">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(224,28,46,0.25)" stroke-width="3"/><circle cx="50" cy="50" r="28" fill="none" stroke="rgba(224,28,46,0.15)" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="rgba(224,28,46,0.3)"/><line x1="50" y1="4" x2="50" y2="96" stroke="rgba(224,28,46,0.2)" stroke-width="1.5"/><line x1="4" y1="50" x2="96" y2="50" stroke="rgba(224,28,46,0.2)" stroke-width="1.5"/><line x1="17.6" y1="17.6" x2="82.4" y2="82.4" stroke="rgba(224,28,46,0.2)" stroke-width="1.5"/><line x1="82.4" y1="17.6" x2="17.6" y2="82.4" stroke="rgba(224,28,46,0.2)" stroke-width="1.5"/></svg>
      </div>
      <div class="deco-wheel deco-wheel--2">
        <svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="46" fill="none" stroke="rgba(224,28,46,0.15)" stroke-width="3"/><circle cx="50" cy="50" r="28" fill="none" stroke="rgba(224,28,46,0.1)" stroke-width="2"/><circle cx="50" cy="50" r="10" fill="rgba(224,28,46,0.2)"/><line x1="50" y1="4" x2="50" y2="96" stroke="rgba(224,28,46,0.12)" stroke-width="1.5"/><line x1="4" y1="50" x2="96" y2="50" stroke="rgba(224,28,46,0.12)" stroke-width="1.5"/><line x1="17.6" y1="17.6" x2="82.4" y2="82.4" stroke="rgba(224,28,46,0.12)" stroke-width="1.5"/><line x1="82.4" y1="17.6" x2="17.6" y2="82.4" stroke="rgba(224,28,46,0.12)" stroke-width="1.5"/></svg>
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
    <div class="stat">
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
        <img src="${a.image}" alt="${a.label}"
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
            <div class="about-stats">${stats}</div>
          </div>
          <div class="about-affiliation fade-in">
            <p class="affil-heading">${about.affiliationsHeading}</p>
            <div class="affil-logo-grid">${affilItems}</div>
          </div>
        </div>
      </div>
    </section>
  `);
}

/* ── Officials ────────────────────────────────────── */
function renderOfficials() {
  if (!CONFIG.sections.officials.enabled) return;

  function officialCard(o, idx, small = false) {
    const cls = small ? "official-card official-card--sm fade-in" : "official-card fade-in";
    const imgSize = small ? "36" : "48";
    return `
      <div class="${cls}">
        <div class="official-photo-wrap">
          <div class="official-photo placeholder-photo${small ? " sm" : ""}">
            <img src="${o.photo}" alt="${o.name}"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='flex'"/>
            <div class="photo-fallback">
              <svg viewBox="0 0 60 60" width="${imgSize}" height="${imgSize}">
                <circle cx="30" cy="22" r="14" fill="rgba(224,28,46,0.4)"/>
                <path d="M6,60 Q6,40 30,40 Q54,40 54,60" fill="rgba(224,28,46,0.4)"/>
              </svg>
            </div>
          </div>
          ${!small ? `<div class="official-rank">${String(idx + 1).padStart(2,"0")}</div>` : ""}
        </div>
        <div class="official-info">
          <h4>${o.name}</h4>
          <span class="designation ${o.designationClass}">${o.designation}</span>
        </div>
      </div>
    `;
  }

  const execCards = OFFICIALS.association.map((o, i) => officialCard(o, i)).join("");

  let committeeHTML = "";
  if (OFFICIALS.committee.enabled) {
    const memberCards = OFFICIALS.committee.members.map((o, i) => officialCard(o, i, true)).join("");
    committeeHTML = `
      <h3 class="sub-heading" style="margin-top:3rem;">Committee Members</h3>
      <div class="officials-grid officials-grid--small">${memberCards}</div>
    `;
  }

  mount("app-officials", `
    <section class="officials section dark-section" id="officials">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Leadership</span>
          <h2>Our <span class="accent">Officials</span></h2>
          <p class="section-desc">The governing body steering roller sports in Moradabad</p>
        </div>
        <h3 class="sub-heading">Association Members</h3>
        <div class="officials-grid">${execCards}</div>
        ${committeeHTML}
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
function normaliseImg(entry) {
  if (typeof entry === 'string') return { src: entry, fit: 'cover', position: 'center' };
  return { src: entry.src || '', fit: entry.fit || 'cover', position: entry.position || 'center' };
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

  const events = NEWS.upcomingEvents || (NEWS.featured ? [NEWS.featured] : []);

  function eventSlide(ev) {
    const evImg = normaliseImg(ev.image || '');
    const img = evImg.src
      ? `<img src="${evImg.src}" alt="${ev.title}" style="${imgStyle(evImg)}"/>`
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

  const sorted    = [...NEWS.items].sort((a, b) => new Date(b.date) - new Date(a.date));
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
      imgSection = `<img src="${imgs[0].src}" alt="${h.event}" class="hl-img" style="${imgStyle(imgs[0])}"/>`;
    } else {
      const slides = imgs.map(img =>
        `<div class="hl-slide"><img src="${img.src}" alt="${h.event}" class="hl-img" style="${imgStyle(img)}"/></div>`
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

  const visible  = HIGHLIGHTS.slice(0, HL_LIMIT);
  const archived = HIGHLIGHTS.slice(HL_LIMIT);

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
        <div class="highlights-grid">${visibleCards}</div>
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

      const videoId = item.link.split("v=")[1];
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
    <button class="connect-tab" id="connectTab" aria-label="Toggle connect panel" aria-expanded="false">
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
                <img src="images/rsam-logo.PNG" alt="RSAM Logo" class="logo-img"/>
                <svg class="logo-ring logo-ring--outer" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="47" fill="none" stroke="#e01c2e" stroke-width="2.5" stroke-dasharray="74 222" stroke-linecap="round"/>
                </svg>
                <svg class="logo-ring logo-ring--inner" viewBox="0 0 100 100" aria-hidden="true">
                  <circle cx="50" cy="50" r="34" fill="none" stroke="#c9922a" stroke-width="2" stroke-dasharray="40 174" stroke-linecap="round"/>
                </svg>
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

/* ── Boot ─────────────────────────────────────────── */
function renderAll() {
  document.title = CONFIG.site.tabTitle;
  renderNavbar();
  renderHero();
  renderAbout();
  renderOfficials();
  renderNews();
  renderHighlights();
  renderLatestVideo();
  renderCertificate();
  renderConnect();
  renderFooter();
}

renderAll();
