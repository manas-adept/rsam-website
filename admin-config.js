/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   admin-config.js — RSAM Developer & Admin Configuration
   
   Developers can set the Admin Portal credentials below.
   Admins can change event fees, title, dates, news, etc.
   directly from the website Admin Portal (admin.html).
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const ADMIN_CONFIG = {

  /* ── Developer Admin Credentials ─────────────────── */
  credentials: {
    username: "admin",
    password: "rsam@password2026", // Change this password for production
    adminName: "RSAM Admin"
  },

  /* ── Default Active Event Configuration ──────────── */
  activeEvent: {
    title: "4th District Championship 2026",
    year: "2026",
    date: "15th - 16th October 2026",
    location: "Moradabad Sports Complex, Kanth Road, Moradabad",
    deadline: "2026-10-01T23:59:59+05:30",
    baseFee: 500.00,       // Admin configurable base registration fee
    gatewayPercent: 2.0,   // 2% gateway transaction fee
    gstPercent: 18.0,      // 18% GST on gateway fee
    image: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
    status: "active",       // "active" or "closed"
    description: "Official 4th District Championship for all age groups & disciplines in Moradabad."
  }

};

if (typeof window !== "undefined") {
  window.ADMIN_CONFIG = ADMIN_CONFIG;
}
