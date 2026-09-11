/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   data/officials.js
   RSAM Officials, Referees & Skinsuit Roster
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

const OFFICIALS = {

  /* ── Executive Association Members ───────────────── */
  association: [
    {
      name:             "Ashok Singhal",
      designation:      "President",
      designationClass: "president",
      degrees:          "",
      photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
      category:         "executive"
    },
    {
      name:             "Devendra Rana",
      designation:      "General Secretary",
      designationClass: "secretary",
      degrees:          "",
      photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797357/rsam_website/officials/gs_devendrarana.jpg",
      category:         "executive"
    },
    {
      name:             "Parmesh Charan",
      designation:      "Treasurer",
      designationClass: "treasurer",
      degrees:          "M.Com, M.P.Ed.",
      photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797473/rsam_website/officials/treasurer.png",
      category:         "executive"
    },
    {
      name:             "Manas Garg",
      designation:      "Technical / Media Person",
      designationClass: "technical",
      degrees:          "B.Tech",
      photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797435/rsam_website/officials/manas.jpg",
      category:         "executive"
    }
  ],

  /* ── Technical Referees & Committee Members ──────── */
  committee: {
    enabled: true,
    title: "Technical Officials & Referees",
    members: [
      {
        name:             "Parmesh Charan",
        designation:      "State Referee, UPRSA",
        designationClass: "member",
        degrees:          "M.Com, M.P.Ed.",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797452/rsam_website/officials/refree_parmesh.jpg",
        category:         "referee"
      },
      {
        name:             "Gourav Singh",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797451/rsam_website/officials/refree_gouravsingh.jpg",
        category:         "referee"
      },
      {
        name:             "Devendra Rana",
        designation:      "Head Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797449/rsam_website/officials/refree_devrana.jpg",
        category:         "referee"
      },
      {
        name:             "Rohit Hans",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797453/rsam_website/officials/refree_rohit.jpg",
        category:         "referee"
      },
      {
        name:             "Vipin Jakhmola",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797457/rsam_website/officials/refree_vipin.jpg",
        category:         "referee"
      },
      {
        name:             "Sachin Nainwal",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797454/rsam_website/officials/refree_sachinnainwal.jpg",
        category:         "referee"
      },
      {
        name:             "Rupesh Singh",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797453/rsam_website/officials/refree_rupesh.jpg",
        category:         "referee"
      },
      {
        name:             "Devanand (Sourav Singh)",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797448/rsam_website/officials/refree_devanand.jpg",
        category:         "referee"
      },
      {
        name:             "Vikas Khairwal",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797456/rsam_website/officials/refree_vikas.jpg",
        category:         "referee"
      },
      {
        name:             "Siddharth Saxena",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797456/rsam_website/officials/refree_sid.jpg",
        category:         "referee"
      },
      {
        name:             "Shyam Thakur",
        designation:      "District Referee",
        designationClass: "member",
        degrees:          "",
        photo:            "https://res.cloudinary.com/igjmhsju/image/upload/v1788797455/rsam_website/officials/refree_shyam.jpg",
        category:         "referee"
      }
    ]
  },

  /* ── Official Racing Skinsuit Design ────────────── */
  skinsuit: {
    title: "RSAM Official Skater Racing Skinsuit",
    subtitle: "Mandatory official racing uniform design for all RSAM athletes competing in district & state events",
    frontImage: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797466/rsam_website/branding/rsam-logo.png",
    backImage: "https://res.cloudinary.com/igjmhsju/image/upload/v1788797469/rsam_website/branding/skater-boy.png",
    description: "Official Moradabad district emblem, chest sponsor placement, and athlete registration ID print."
  }

};

if (typeof window !== "undefined") {
  window.OFFICIALS = OFFICIALS;
}
