/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   config.js — site-wide settings
   Edit this file to change branding, hero text, nav,
   social links, and to enable/disable entire sections.
   For adding/updating content items (news, officials,
   highlights etc.) edit the files in data/ instead.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   ENVIRONMENT MODE FLAG
   Options:
     "dev"  — Local Development mode (http://localhost:3001)
     "prod" — Production Live mode (https://rsam-whatsapp-bot.onrender.com)
     "auto" — Auto-detect mode (localhost/127.0.0.1 -> dev, else -> prod)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
window.RSAM_ENV = "dev"; // 👈 CHANGE THIS SINGLE FLAG ("dev" | "prod" | "auto")

window.ENV_CONFIG = {
  dev: {
    mode: "dev",
    name: "Development (Localhost)",
    backendUrl: "http://localhost:3001",
    sheetUrl: "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec",
    razorpayKey: "rzp_test_TZa1vfjhrPJobv",
    openwaServerUrl: "http://localhost:3001/send-registration",
    debug: true
  },
  prod: {
    mode: "prod",
    name: "Production (Netlify / Live)",
    backendUrl: "https://rsam-whatsapp-bot.onrender.com",
    sheetUrl: "https://script.google.com/macros/s/AKfycbyrxUIvQMXOzaBFNKwle-kOC0xMlc0ezufhIRXSyyid3Zx6Rhk9SKMZhNIoBBB290Xw/exec",
    razorpayKey: "rzp_test_TZa1vfjhrPJobv",
    openwaServerUrl: "https://rsam-whatsapp-bot.onrender.com/send-registration",
    debug: false
  },

  get activeEnv() {
    const flag = String(window.RSAM_ENV || "dev").toLowerCase().trim();
    if (flag === "dev") return "dev";
    if (flag === "prod") return "prod";
    const isLocal = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    );
    return isLocal ? "dev" : "prod";
  },

  get current() {
    return this[this.activeEnv];
  },

  get mode() { return this.current.mode; },
  get name() { return this.current.name; },
  get backendUrl() { return this.current.backendUrl; },
  get sheetUrl() { return this.current.sheetUrl; },
  get razorpayKey() { return this.current.razorpayKey; },
  get openwaServerUrl() { return this.current.openwaServerUrl; },
  get debug() { return this.current.debug; }
};

window.PRODUCTION_API_URL = window.ENV_CONFIG.backendUrl;

const CONFIG = {

  /* ── Site meta ─────────────────────────────────── */
  site: {
    name:     "RSAM",
    fullName: "Roller Sports Association Moradabad",
    tabTitle: "RSAM – Roller Sports Association Moradabad",
  },

  /* ── Section visibility ─────────────────────────── */
  /* Set enabled: false to completely hide any section */
  sections: {
    hero:        { enabled: true  },
    about:       { enabled: true  },
    officials:   { enabled: true  },
    news:        { enabled: true  },
    highlights:  { enabled: true  },
    gallery:     { enabled: true  },
    latestVideo:  { enabled: false },
    certificate: { enabled: true  },
    connect:     { enabled: true  },
  },

  /* ── Navigation ─────────────────────────────────── */
  nav: [
    { label: "About",       href: "#about"       },
    { label: "Officials",   href: "#officials"   },
    { label: "News",        href: "#news"        },
    { label: "Highlights",  href: "#highlights"  },
    { label: "Gallery",     href: "#gallery"     },
    { label: "Certificate", href: "#certificate" },
    { label: "Contact Us",   href: "#connect"     },
    { label: "Register",    href: "register.html", cta: true },
  ],

  /* ── Hero section ───────────────────────────────── */
  hero: {
    badge:       "Recognised by UPRSA · RSFI - IndiaSkate",
    titleLine1:  "Rolling",      // displayed in handwriting font (Pacifico)
    titleLine2:  "Moradabad",    // displayed in racing font (Racing Sans One)
    description: "Promoting excellence in roller sports across Moradabad since our founding. Affiliated with Roller Sports Federation of India under the Government of India.",
    skaterImage: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797469/rsam_website/branding/skater-boy.png",
    cta: [
      { label: "Latest News",     href: "#news",       style: "primary" },
      { label: "View Highlights", href: "#highlights", style: "ghost"   },
    ],
  },

  /* ── About section ──────────────────────────────── */
  about: {
    paragraphs: [
      "The <strong>Roller Sports Association Moradabad (RSAM)</strong> is the apex body governing roller sports in Moradabad district, Uttar Pradesh. We are officially recognized by UPRSA (Uttar Pradesh Roller Sports Association) recognized by the <strong>Roller Sports Federation of India (RSFI)</strong>, operating under the Ministry of Youth Affairs &amp; Sports, Government of India.",
      "Our mission is to identify, nurture, and develop talent in disciplines such as inline skating, artistic skating, speed skating, and roller hockey — and to represent Moradabad athletes at state, national, and international competitions.",
    ],
    stats: [
      { value: 200, unit: "+", label: "Registered Athletes" },
      { value: 15,  unit: "+", label: "Championships"       },
      { value: 50,  unit: "+", label: "Medals Won"          },
    ],
    affiliationsHeading: "Affiliated &amp; Accredited By",
  },

  /* ── Latest Video ───────────────────────────────── */
  /* To find your channel ID: go to your YouTube channel page,
     view source, and search for "channelId" or "externalId".
     It starts with "UC…"  */
  latestVideo: {
    channelId: "UCnDTfJxx_2QcyQeSCbhZTjw",   // ← paste your UC… channel ID here
  },

  /* ── Connect / social ───────────────────────────── */
  connect: {
    youtube:   "https://www.youtube.com/@rsam_mbd",  // replace with actual URL
    instagram: "https://www.instagram.com/rsam_mbd_official",         // replace with actual URL
    email:     "contact@rsam.in",
    phone:     "+91-8057781350",
    address:   "139, Rana Bhawan, Near 23 PAC, Kanth Road, Moradabad, Uttar Pradesh, India",
  },

};
window.CONFIG = CONFIG;
