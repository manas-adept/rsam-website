/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/highlights.js  ← ADMIN: add championship moments here
   HOW TO UPDATE:
   • Add a new highlight by adding an object to the array
   • The FIRST item is always shown as the wide featured card
   • Remove old entries by deleting their block
   • trophy: any emoji works (🏆 🥇 🥈 🥉 ⚡ 🌟 🎖️)
   • Add  wide: true  only to the item you want full-width
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const HIGHLIGHTS = [
  {
    wide:    true,                       // featured card — keep on first item
    image:   "images/highlight1.jpg",
    trophy:  "🏆",
    event:   "District Level Roller Skating Championship Spring",
    caption: "Aryans International School won First Prize in roller speed skating!",
    body:    "The event took place at Summer Valley School, MORADABAD. and the event was hosted under the presence of UPRSA General Secretary Mr DS Rathor",
  },
  {
    image:   "images/highlight2.jpg",
    trophy:  "🥇",
    event:   "District Level Roller Skating Championship Spring | May 2026",
    caption: "Chaitanya Garg sweeps gold in speed skating!",
    body:    "Chaitanya Garg from Aryans Internations School sweeps gold in 6-8yrs quad-boys category in speed skating!",
  },
  {
    image:   "images/highlight3.jpg",
    trophy:  "⚡",
    event:   "District Level Roller Skating Championship Spring | May 2026",
    caption: "Thrilling Speed Skating at Summer Valley School, Moradabad",
    body:    "Crossing the line at lightning speed and signing off in style — moments like these are what make skating truly electrifying!",
  },
  {
    image:   "images/highlight4.jpg",
    trophy:  "🌟",
    event:   "District Level Roller Skating Championship Spring | May 2026",
    caption: "[Inspiring caption for this highlight]",
    body:    "[Brief description of this championship moment.]",
  },
  // {
  //   image:   "images/highlight5.jpg",
  //   trophy:  "🎖️",
  //   event:   "[Event · Year]",
  //   caption: "[Inspiring caption for this highlight]",
  //   body:    "[Brief description of this championship moment.]",
  // },
];
