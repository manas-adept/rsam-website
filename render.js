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

  const execCards = OFFICIALS.executive.map((o, i) => officialCard(o, i)).join("");

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
        <h3 class="sub-heading">Executive Committee</h3>
        <div class="officials-grid">${execCards}</div>
        ${committeeHTML}
      </div>
    </section>
  `);
}

/* ── News ─────────────────────────────────────────── */
function renderNews() {
  if (!CONFIG.sections.news.enabled) return;

  const events = NEWS.upcomingEvents || (NEWS.featured ? [NEWS.featured] : []);

  function eventSlide(ev) {
    const img = ev.image
      ? `<img src="${ev.image}" alt="${ev.title}"/>`
      : `<div class="placeholder-img-inner">
          <svg viewBox="0 0 80 80" width="60" height="60">
            <circle cx="40" cy="40" r="36" fill="none" stroke="rgba(224,28,46,0.4)" stroke-width="3"/>
            <circle cx="40" cy="40" r="16" fill="rgba(224,28,46,0.2)"/>
            <line x1="40" y1="4" x2="40" y2="76" stroke="rgba(224,28,46,0.3)" stroke-width="2"/>
            <line x1="4" y1="40" x2="76" y2="40" stroke="rgba(224,28,46,0.3)" stroke-width="2"/>
          </svg>
        </div>`;
    return `
      <div class="events-slide">
        <div class="news-card featured">
          <div class="news-card-img">
            ${img}
            <div class="news-cat">${ev.category}</div>
          </div>
          <div class="news-card-body">
            <div class="news-meta">
              <span class="news-date">📅 ${ev.date}</span>
              <span class="news-location">📍 ${ev.location}</span>
            </div>
            <h3>${ev.title}</h3>
            <p>${ev.body}</p>
            <a href="${ev.linkHref}" class="news-link">${ev.linkText} →</a>
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

  const newsItems = NEWS.items.map(item => `
    <div class="news-item fade-in">
      <div class="news-item-dot"></div>
      <div class="news-item-body">
        <span class="news-item-tag ${item.tag}">${item.tag.charAt(0).toUpperCase() + item.tag.slice(1)}</span>
        <h4>${item.title}</h4>
        <p class="news-item-date">${item.date}${item.location ? " · " + item.location : ""}</p>
        <p>${item.body}</p>
        <a href="${item.linkHref}">${item.linkText} →</a>
      </div>
    </div>
  `).join("");

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
          <div class="news-list">${newsItems}</div>
        </div>
      </div>
    </section>
  `);
}

/* ── Highlights ───────────────────────────────────── */
function renderHighlights() {
  if (!CONFIG.sections.highlights.enabled) return;

  const cards = HIGHLIGHTS.map(h => {
    const imgHTML = h.image
      ? `<img src="${h.image}" alt="${h.event}" class="hl-img"/>`
      : placeholderImg();

    return `
      <div class="highlight-card fade-in${h.wide ? " highlight-card--wide" : ""}">
        <div class="hl-img-wrap">
          ${imgHTML}
          <div class="hl-overlay"><div class="hl-trophy">${h.trophy}</div></div>
        </div>
        <div class="hl-caption">
          <span class="hl-event-tag">${h.event}</span>
          <h3>"${h.caption}"</h3>
          <p>${h.body}</p>
        </div>
      </div>
    `;
  }).join("");

  mount("app-highlights", `
    <section class="highlights section dark-section" id="highlights">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Championship Moments</span>
          <h2>Hall of <span class="accent">Highlights</span></h2>
          <p class="section-desc">Reliving the glory, grit, and greatness from our championships</p>
        </div>
        <div class="highlights-grid">${cards}</div>
      </div>
    </section>
  `);
}

/* ── Certificate ──────────────────────────────────── */
function renderCertificate() {
  if (!CONFIG.sections.certificate.enabled) return;

  const certContent = CERTIFICATE.image
    ? `<img src="${CERTIFICATE.image}" alt="RSAM Registration Certificate" class="cert-img"/>`
    : `<div class="cert-placeholder">
        <div class="cert-placeholder-inner">
          <svg viewBox="0 0 80 80" width="64" height="64">
            <rect x="8" y="4" width="64" height="72" rx="4" fill="none" stroke="#e01c2e" stroke-width="2"/>
            <circle cx="40" cy="28" r="14" fill="none" stroke="#ff6b6b" stroke-width="2"/>
            <line x1="22" y1="50" x2="58" y2="50" stroke="#e01c2e" stroke-width="1.5"/>
            <line x1="22" y1="58" x2="58" y2="58" stroke="#e01c2e" stroke-width="1.5"/>
            <line x1="22" y1="66" x2="45" y2="66" stroke="#e01c2e" stroke-width="1.5"/>
            <polygon points="40,20 42.4,26.4 49,26.4 43.8,30.2 45.9,36.6 40,32.8 34.1,36.6 36.2,30.2 31,26.4 37.6,26.4" fill="#ff6b6b"/>
          </svg>
          <h3>Certificate of Registration</h3>
          <div class="cert-details">
            ${CERTIFICATE.details.map(d => `
              <div class="cert-detail-row">
                <span class="cert-label">${d.label}:</span>
                <span class="cert-value">${d.value}</span>
              </div>
            `).join("")}
          </div>
        </div>
      </div>`;

  mount("app-certificate", `
    <section class="certificate section" id="certificate">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Official Recognition</span>
          <h2>Registration <span class="accent">Certificate</span></h2>
          <p class="section-desc">Official documentation of RSAM's accreditation and registration</p>
        </div>
        <div class="cert-wrap fade-in">
          <div class="cert-frame">${certContent}</div>
          <div class="cert-note"><p>${CERTIFICATE.note}</p></div>
        </div>
      </div>
    </section>
  `);
}

/* ── Connect ──────────────────────────────────────── */
function renderConnect() {
  if (!CONFIG.sections.connect.enabled) return;

  const { connect } = CONFIG;

  mount("app-connect", `
    <section class="connect section dark-section" id="connect">
      <div class="container">
        <div class="section-header">
          <span class="section-tag">Follow Us</span>
          <h2>Stay <span class="accent">Connected</span></h2>
          <p class="section-desc">Follow RSAM on social media for live updates, championship coverage, and more</p>
        </div>
        <div class="social-grid">
          <a href="${connect.youtube}" target="_blank" rel="noopener" class="social-card youtube fade-in">
            <div class="social-icon">
              <svg viewBox="0 0 48 48" width="52" height="52">
                <rect x="2" y="10" width="44" height="28" rx="8" fill="#FF0000"/>
                <polygon points="20,17 20,31 33,24" fill="white"/>
              </svg>
            </div>
            <div class="social-info">
              <h3>YouTube</h3>
              <p>Watch championship videos, highlights, and tutorials on our YouTube channel.</p>
              <span class="social-cta">Subscribe &amp; Watch →</span>
            </div>
          </a>
          <a href="${connect.instagram}" target="_blank" rel="noopener" class="social-card instagram fade-in">
            <div class="social-icon">
              <svg viewBox="0 0 48 48" width="52" height="52">
                <defs>
                  <linearGradient id="ig-grad" x1="0%" y1="100%" x2="100%" y2="0%">
                    <stop offset="0%"   style="stop-color:#f09433"/>
                    <stop offset="25%"  style="stop-color:#e6683c"/>
                    <stop offset="50%"  style="stop-color:#dc2743"/>
                    <stop offset="75%"  style="stop-color:#cc2366"/>
                    <stop offset="100%" style="stop-color:#bc1888"/>
                  </linearGradient>
                </defs>
                <rect x="4" y="4" width="40" height="40" rx="12" fill="url(#ig-grad)"/>
                <circle cx="24" cy="24" r="9" fill="none" stroke="white" stroke-width="2.5"/>
                <circle cx="34.5" cy="13.5" r="2.5" fill="white"/>
              </svg>
            </div>
            <div class="social-info">
              <h3>Instagram</h3>
              <p>Follow us for behind-the-scenes, athlete stories, event photos, and daily updates.</p>
              <span class="social-cta">Follow Us →</span>
            </div>
          </a>
        </div>
        <div class="contact-strip fade-in">
          <div class="contact-item">
            <span class="contact-icon">📧</span>
            <div>
              <span class="contact-label">Email</span>
              <a href="mailto:${connect.email}">${connect.email}</a>
            </div>
          </div>
          <div class="contact-divider"></div>
          <div class="contact-item">
            <span class="contact-icon">📍</span>
            <div>
              <span class="contact-label">Address</span>
              <span>${connect.address}</span>
            </div>
          </div>
          <div class="contact-divider"></div>
          <div class="contact-item">
            <span class="contact-icon">📞</span>
            <div>
              <span class="contact-label">Phone</span>
              <a href="tel:${connect.phone.replace(/[^+\d]/g,"")}">${connect.phone}</a>
            </div>
          </div>
        </div>
      </div>
    </section>
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
            <p>${CONFIG.site.fullName}<br/>Affiliated with RSFI · Govt. of India</p>
          </div>
          <div class="footer-links">${links}</div>
        </div>
        <div class="footer-bottom">
          <span>© <span id="year"></span> ${CONFIG.site.fullName}. All rights reserved.</span>
          <span>Accredited by <strong>RSFI</strong> · Ministry of Youth Affairs &amp; Sports, Govt. of India</span>
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
  renderCertificate();
  renderConnect();
  renderFooter();
}

renderAll();
