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
  executive: [
    {
      name:             "Ashok K. Singhal",
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
    // {
    //   name:             "[Vice President Name]",
    //   designation:      "Vice President",
    //   designationClass: "vp",
    //   photo:            "images/vp.jpg",
    // },
    // {
    //   name:             "[Joint Secretary Name]",
    //   designation:      "Joint Secretary",
    //   designationClass: "joint",
    //   photo:            "images/joint_sec.jpg",
    // },
    {
      name:             "[Technical Director Name]",
      designation:      "Technical Director",
      designationClass: "technical",
      photo:            "images/technical.jpg",
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
