/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/certificate.js  ← ADMIN: update registration details here
   HOW TO UPDATE:
   • Set image to the scanned certificate file path once available
   • Leave image as "" to show the details panel instead
   • Update registrationNo and validTill when renewed
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const CERTIFICATE = {
  /* Path to scanned certificate image — leave "" to show details panel */
  image: "",   // e.g. "images/certificate.jpg"

  details: [
    { label: "Association",  value: "Roller Sports Association Moradabad" },
    { label: "Affiliated To", value: "Roller Sports Federation of India (RSFI)" },
    { label: "Registration No.", value: "[REG-XXXX-XXXX]" },
    { label: "Valid Till",   value: "[DD/MM/YYYY]" },
  ],

  note: "RSAM is a duly registered association accredited by the Roller Sports Federation of India under the aegis of the Ministry of Youth Affairs &amp; Sports, Government of India. The above certificate is the official proof of our recognition and standing.",
};
