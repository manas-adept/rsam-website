/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/news.js  ← ADMIN: post new news & circulars here
   HOW TO UPDATE:
   • Change `featured` to update the main card on the left
   • Add a new circular/notice by adding an object to `items`
   • The FIRST item in the list appears at the top
   • Remove old entries by deleting their block
   • tag options: "circular" | "result" | "notice"
   • Leave location as "" if not applicable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const NEWS = {

  /* ── Featured card (left column, large) ─────────── */
  featured: {
    image:    "images/news_main.jpg",   // leave "" to show placeholder
    category: "Upcoming Event",
    date:     "[Event Date]",
    location: "[Venue, Moradabad]",
    title:    "[Championship / Event Name]",
    body:     "Details about the upcoming championship or event. Replace this with the actual description, schedule, eligibility criteria, and any other important information for participants.",
    linkText: "Read Circular",
    linkHref: "#",
  },

  /* ── News list (right column) ────────────────────── */
  items: [
    {
      tag:      "circular",
      title:    "[Circular Title / Event Name]",
      date:     "[Date]",
      location: "[Location]",
      body:     "[Brief description of the circular or event notice.]",
      linkText: "View Details",
      linkHref: "#",
    },
    {
      tag:      "result",
      title:    "[Championship Name] – Results Declared",
      date:     "[Date]",
      location: "[Location]",
      body:     "[Brief description about the results of the recently concluded championship.]",
      linkText: "View Results",
      linkHref: "#",
    },
    {
      tag:      "notice",
      title:    "[General Notice / Announcement Title]",
      date:     "[Date]",
      location: "",
      body:     "[Replace with actual notice text — meeting notices, selection trials, or administrative communication.]",
      linkText: "Read Notice",
      linkHref: "#",
    },
    {
      tag:      "circular",
      title:    "[Another Circular or Announcement]",
      date:     "[Date]",
      location: "[Location]",
      body:     "[Replace with actual content for this entry.]",
      linkText: "View Details",
      linkHref: "#",
    },
  ],

};
