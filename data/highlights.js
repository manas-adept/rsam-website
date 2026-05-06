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
    event:   "[Championship Name · Year]",
    caption: "[A bold, inspiring caption about this championship moment — e.g. Moradabad sweeps gold in speed skating!]",
    body:    "[Brief description: what happened, who competed, what was achieved. Replace with real content.]",
  },
  {
    image:   "images/highlight2.jpg",
    trophy:  "🥇",
    event:   "[Event · Year]",
    caption: "[Inspiring caption for this highlight]",
    body:    "[Brief description of this championship moment.]",
  },
  {
    image:   "images/highlight3.jpg",
    trophy:  "⚡",
    event:   "[Event · Year]",
    caption: "[Inspiring caption for this highlight]",
    body:    "[Brief description of this championship moment.]",
  },
  {
    image:   "images/highlight4.jpg",
    trophy:  "🌟",
    event:   "[Event · Year]",
    caption: "[Inspiring caption for this highlight]",
    body:    "[Brief description of this championship moment.]",
  },
  {
    image:   "images/highlight5.jpg",
    trophy:  "🎖️",
    event:   "[Event · Year]",
    caption: "[Inspiring caption for this highlight]",
    body:    "[Brief description of this championship moment.]",
  },
];
