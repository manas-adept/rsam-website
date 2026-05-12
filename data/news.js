/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/news.js  ← ADMIN: post new news & circulars here
   HOW TO UPDATE:
   • Add events to `upcomingEvents` — they appear as a swipeable carousel
   • startDateTime / endDateTime use IST in format "YYYY-MM-DDTHH:MM" (24-hr)
     - Before startDateTime  → badge shows "Upcoming Event"
     - Between start & end   → badge shows "Happening Now"
     - After endDateTime     → badge shows "Event Ended"
     - Leave both "" to always show the label in `category`
   • Add a new circular/notice by adding an object to `items`
   • tag options: "circular" | "result" | "notice"
   • Leave location as "" if not applicable
   • EVENT IMAGE DISPLAY CONTROL:
       image: "images/photo.jpg"                            (default: cover + center)
       image: { src: "images/photo.jpg", fit: "contain", position: "top" }
         fit:  "cover" | "contain"   position: any CSS object-position value
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const NEWS = {

  /* ── Upcoming Events carousel (left column) ──────── */
  upcomingEvents: [
    {
      image:         { src: "images/row4.jpg", fit: "contain", position: "top" },   // leave "" to show placeholder
      category:      "Upcoming Event",    // fallback if no start/end set
      startDateTime: "2026-05-10T04:30",  // IST: event starts
      endDateTime:   "2026-05-10T10:30",  // IST: event ends
      date:          "May 10, 2026",
      location:      "Agra",
      title:         "Run on Wheels 4.0",
      body:          "Roll with Passion, Finish with PRIDE! It's The Great Skating Marathon 2026 organized by Agra Roller Skating Welfare Association under the aegis of UPRSA.",
      linkText:      "Read Circular",
      linkHref:      "#",
    },
  ],

  /* ── News list (right column) ────────────────────── */
  items: [
    {
      tag:      "news",
      title:    "Moradabad Skaters Shine at Run on Wheels 4.0 Marathon, Agra",
      date:     "2026-05-10",
      location: "Agra, Uttar Pradesh",
      body:     "We are proud to announce that our skaters from Moradabad participated in the highly anticipated Run on Wheels 4.0 Marathon, held in the city of Agra. Every single skater who took to the track gave their absolute best and completed the marathon with great courage and determination. While the thrill of competition drives every athlete, it is the spirit of participation that truly defines a champion. Winning is not mandatory — but showing up, giving your all, and finishing strong always is. Our skaters proved exactly that. Each participant returned not just with memories of a remarkable event, but with invaluable experiences and learnings that no podium finish can replace. The real victory lies in the journey — in every stride, every push, and every moment spent on wheels. We congratulate all our skaters for their bravery and dedication, and look forward to seeing them grow stronger with every event they take part in.<b>Keep skating, keep growing!</b>",
      linkText: "View Details",
      linkHref: "#",
    },
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
