/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/news.js  ← ADMIN: post new news & circulars here
   HOW TO UPDATE:
   • Add events to `upcomingEvents` — they appear as a swipeable carousel
   • Add a new circular/notice by adding an object to `items`
   • The FIRST item in the list appears at the top
   • Remove old entries by deleting their block
   • tag options: "circular" | "result" | "notice"
   • Leave location as "" if not applicable
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const NEWS = {

  /* ── Upcoming Events carousel (left column) ──────── */
  upcomingEvents: [
    {
      image:    "images/row4.jpg",   // leave "" to show placeholder
      category: "Upcoming Event",
      date:     "May 10, 2026",
      location: "Agra",
      title:    "Run on Wheels 4.0",
      body:     "Roll with Passion, Finish with PRIDE! It's The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
      linkText: "Read Circular",
      linkHref: "#",
    },
    // {
    //   image:    "images/row4.jpg",   // leave "" to show placeholder
    //   category: "Upcoming Event",
    //   date:     "May 10, 2026",
    //   location: "Agra",
    //   title:    "Run on Wheels 4.0",
    //   body:     "The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
    //   linkText: "Read Circular",
    //   linkHref: "#",
    // }
    // {
    //   image:    "",
    //   category: "District Championship",
    //   date:     "[Event Date]",
    //   location: "[Venue, Moradabad]",
    //   title:    "[District Level Championship]",
    //   body:     "Second upcoming event details. Add date, venue, eligibility, and any registration information here.",
    //   linkText: "Read Circular",
    //   linkHref: "#",
    // },
    // {
    //   image:    "",
    //   category: "State Selection",
    //   date:     "[Event Date]",
    //   location: "[Venue, Moradabad]",
    //   title:    "[State Selection Trials]",
    //   body:     "Third upcoming event details. Add date, venue, eligibility, and any registration information here.",
    //   linkText: "Read Circular",
    //   linkHref: "#",
    // },
  ],

  /* ── News list (right column) ────────────────────── */
  items: [
    {
      tag:      "news",
      title:    "District Level  Roller Skating Championship Spring",
      date:     "2026-05-02",
      location: "Summer Valley School, MORADABAD",
      body:     "Aryans International School stands at the top in Roller Speed Skating. The event took place at Summer Valley School, Moradabad, and was hosted in the presence of UPRSA Secretary Mr. DS Rathore. The event was graced by Chief Guests Mr. Vishal Upadhyay, Principal of Summer Valley School, and Mr. Devendra Rana, Secretary of the Roller Sports Association, Moradabad.",
      linkText: "View Details",
      linkHref: "#",
    },
    {
      tag:      "news",
      title:    "District Level  Roller Skating Championship Summer",
      date:     "2026-04-19",
      location: "S.S Children School, MORADABAD",
      body:     "Aryans International School won First Prize, while Golden Gate Public School and PMS Public School finished 2nd and 3rd respectively.",
      linkText: "View Details",
      linkHref: "#",
    },
    // {
    //   tag:      "result",
    //   title:    "[Championship Name] – Results Declared",
    //   date:     "[Date]",
    //   location: "[Location]",
    //   body:     "[Brief description about the results of the recently concluded championship.]",
    //   linkText: "View Results",
    //   linkHref: "#",
    // },
    // {
    //   tag:      "notice",
    //   title:    "[General Notice / Announcement Title]",
    //   date:     "[Date]",
    //   location: "",
    //   body:     "[Replace with actual notice text — meeting notices, selection trials, or administrative communication.]",
    //   linkText: "Read Notice",
    //   linkHref: "#",
    // },
    // {
    //   tag:      "circular",
    //   title:    "[Another Circular or Announcement]",
    //   date:     "[Date]",
    //   location: "[Location]",
    //   body:     "[Replace with actual content for this entry.]",
    //   linkText: "View Details",
    //   linkHref: "#",
    // },
  ],

};
