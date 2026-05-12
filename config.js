/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   config.js — site-wide settings
   Edit this file to change branding, hero text, nav,
   social links, and to enable/disable entire sections.
   For adding/updating content items (news, officials,
   highlights etc.) edit the files in data/ instead.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

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
    latestVideo:  { enabled: true  },
    certificate: { enabled: true  },
    connect:     { enabled: true  },
  },

  /* ── Navigation ─────────────────────────────────── */
  nav: [
    { label: "About",       href: "#about"       },
    { label: "Officials",   href: "#officials"   },
    { label: "News",        href: "#news"        },
    { label: "Highlights",  href: "#highlights"  },
    { label: "Certificate", href: "#certificate" },
  ],

  /* ── Hero section ───────────────────────────────── */
  hero: {
    badge:       "Recognised by UPRSA · RSFI - IndiaSkate",
    titleLine1:  "Rolling",      // displayed in handwriting font (Pacifico)
    titleLine2:  "Moradabad",    // displayed in racing font (Racing Sans One)
    description: "Promoting excellence in roller sports across Moradabad since our founding. Affiliated with Roller Sports Federation of India under the Government of India.",
    skaterImage: "images/skater-boy.png",
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
