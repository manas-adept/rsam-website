/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/highlights.js  ← ADMIN: add championship moments here
   HOW TO UPDATE:
   • Add a new highlight by adding an object to the array
   • Keep newest items at the TOP — top 5 show on the page, rest auto-archive
   • The FIRST item is always shown as the wide featured card
   • date: "YYYY-MM-DD" — shown in archive, helps readers orient in time
   • trophy: any emoji works (🏆 🥇 🥈 🥉 ⚡ 🌟 🎖️)
   • Add  wide: true  only to the item you want full-width (first item only)
   • SINGLE image  →  images: ["images/photo.jpg"]
   • MULTIPLE images →  images: ["images/a.jpg", "images/b.jpg"]
     (cards with multiple images become a swipeable gallery)
   • IMAGE DISPLAY CONTROL — each entry can be a plain string or an object:
       Plain string  →  "images/photo.jpg"            (default: cover + center)
       Object        →  { src: "images/photo.jpg", fit: "contain", position: "top" }
         fit:      "cover"   — fills box, crops excess  (default, good for action shots)
                   "contain" — shows full image, no cropping (good for group/wide shots)
         position: any CSS value — "center" "top" "bottom" "50% 20%" etc.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const HIGHLIGHTS = [
  {
    wide:    true,                       // featured card — keep on first item
    date:    "2026-05-10",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797458/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event.jpg","https://res.cloudinary.com/igjmhsju/image/upload/v1788797458/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event1.jpg","https://res.cloudinary.com/igjmhsju/image/upload/v1788797459/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event2.jpg","https://res.cloudinary.com/igjmhsju/image/upload/v1788797460/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event5.jpg"],   // add more paths to enable swipe
    trophy:  "🌟",
    event:   "RUN ON WHEELS 4.0 SKATING MARATHON",
    caption: "Moradabad Skaters Shine at Run on Wheels 4.0 Marathon, Agra",
    body:    "We are proud to announce that our skaters from Moradabad participated in the highly anticipated Run on Wheels 4.0 Marathon, held in the city of Agra. Every single skater who took to the track gave their absolute best and completed the marathon with great courage and determination. While the thrill of competition drives every athlete, it is the spirit of participation that truly defines a champion. Winning is not mandatory — but showing up, giving your all, and finishing strong always is. Our skaters proved exactly that. Each participant returned not just with memories of a remarkable event, but with invaluable experiences and learnings that no podium finish can replace. The real victory lies in the journey — in every stride, every push, and every moment spent on wheels. We congratulate all our skaters for their bravery and dedication, and look forward to seeing them grow stronger with every event they take part in. <b>Keep skating, keep growing!</b>",
  },
  {
    date:    "2026-05-02",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797358/rsam_website/highlights/highlight1.jpg"],
    trophy:  "🏆",
    event:   "District Level Roller Skating Championship Spring",
    caption: "Aryans International School won First Prize in roller speed skating!",
    body:    "The event took place at Summer Valley School, MORADABAD. and the event was hosted under the presence of UPRSA General Secretary Mr DS RathorE",
  },
  {
    date:    "2026-05-02",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797446/rsam_website/news/news_main.jpg","https://res.cloudinary.com/igjmhsju/image/upload/v1788797358/rsam_website/highlights/highlight2.jpg","https://res.cloudinary.com/igjmhsju/image/upload/v1788797471/rsam_website/highlights/test.jpg"],
    trophy:  "🥇",
    event:   "District Level Roller Skating Championship Spring",
    caption: "Chaitanya Garg sweeps gold in speed skating!",
    body:    "Chaitanya Garg from Aryans Internations School sweeps gold in 6-8yrs quad-boys category in speed skating!",
  },
  {
    date:    "2026-05-02",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797359/rsam_website/highlights/highlight3.jpg"],
    trophy:  "⚡",
    event:   "District Level Roller Skating Championship Spring",
    caption: "Thrilling Speed Skating at Summer Valley School, Moradabad",
    body:    "Crossing the line at lightning speed and signing off in style — moments like these are what make skating truly electrifying!",
  },
  {
    date:    "2026-05-02",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797360/rsam_website/highlights/highlight4.jpg"],
    trophy:  "🌟",
    event:   "District Level Roller Skating Championship Spring",
    caption: "The Chase Is On — Speed, Grit, and Determination Define the Race",
    body:    "There is nothing quite like the sight of skaters in full flight, each one pushing harder than the last, wheels cutting through the track as the crowd roars in anticipation. At the heart of every great race lies one simple truth — only the fastest, the bravest, and the most determined will cross that finish line first. This is what skating is all about — the thrill of the chase, the rush of the race, and the courage to give everything you have until the very end.",
  },
  {
    date:    "2025-11-15",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797445/rsam_website/news/news_lko.jpg"],
    trophy:  "📦",
    event:   "3rd District Roller Skating Championship 2025",
    caption: "Moradabad Athletes Podium Sweep at 3rd District Meet",
    body:    "Over 120 speed skaters competed across quad and inline categories in Moradabad, establishing new district records across all age groups.",
    archived: true,
    homepage_carousel: false
  },
  {
    date:    "2025-08-20",
    images:  ["https://res.cloudinary.com/igjmhsju/image/upload/v1788797458/rsam_website/gallery/felicitaion_ceremony_dmr_2026/row-event1.jpg"],
    trophy:  "📦",
    event:   "UP State Inter-District Roller Meet 2025",
    caption: "Moradabad Contingent Wins 8 Medals in State Inter-District",
    body:    "Official state roller skating championship delegation from Moradabad showcased stellar endurance and tactical prowess on the flat track.",
    archived: true,
    homepage_carousel: false
  }
];

if (typeof window !== "undefined") {
  window.HIGHLIGHTS = HIGHLIGHTS;
}

