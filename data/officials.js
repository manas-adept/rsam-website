/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/officials.js
   HOW TO UPDATE:
   • Edit name / designation / photo for any member
   • Add a new member by copying a block and appending it
   • Remove a member by deleting their block
   • Set committee.enabled = false to hide the committee row
   • designationClass controls the badge colour:
     president | secretary | treasurer | vp | joint | technical | member
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const OFFICIALS = {

  /* ── Executive Committee ─────────────────────────── */
  association: [
    {
      name:             "Ashok Singhal",
      designation:      "President",
      designationClass: "president",
      photo:            "images/president.jpg",
    },
    {
      name:             "Devendra Rana",
      designation:      "General Secretary",
      designationClass: "secretary",
      photo:            "images/secretary.jpg",
    },
    {
      name:             "Pramesh Charan",
      designation:      "Treasurer",
      designationClass: "treasurer",
      photo:            "images/treasurer.jpg",
    },
    {
      name:             "Manas Garg",
      designation:      "Technical",
      designationClass: "technical",
      photo:            "images/manas.jpeg",
    },
  ],

  /* ── Committee Members ───────────────────────────── */
  committee: {
    enabled: false,   // set to true to show this block
    members: [
      {
        name:             "[Member Name]",
        designation:      "Executive Member",
        designationClass: "member",
        photo:            "images/member1.jpg",
      },
      {
        name:             "[Member Name]",
        designation:      "Executive Member",
        designationClass: "member",
        photo:            "images/member2.jpg",
      },
      {
        name:             "[Member Name]",
        designation:      "Executive Member",
        designationClass: "member",
        photo:            "images/member3.jpg",
      },
      {
        name:             "[Member Name]",
        designation:      "Executive Member",
        designationClass: "member",
        photo:            "images/member4.jpg",
      },
    ],
  },

};
