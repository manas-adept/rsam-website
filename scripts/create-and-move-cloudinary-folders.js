const path = require('path');
const fs = require('fs');
const dotenv = require(path.join(__dirname, '../whatsapp-server/node_modules/dotenv'));
const cloudinary = require(path.join(__dirname, '../whatsapp-server/node_modules/cloudinary')).v2;

dotenv.config({ path: path.join(__dirname, '../whatsapp-server/.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

const foldersToCreate = [
  'rsam_website/branding',
  'rsam_website/affiliations',
  'rsam_website/certificates',
  'rsam_website/officials',
  'rsam_website/highlights',
  'rsam_website/news',
  'rsam_website/events',
  'rsam_website/gallery',
  'rsam_website/gallery/up_state_championship_2026',
  'rsam_website/gallery/district_showcase_2026',
  'rsam_website/gallery/national_championships_2026'
];

// Map of filenames to target Cloudinary subfolder
const fileSubfolderMap = {
  // Branding
  'rsam-logo.png': 'rsam_website/branding',
  'skater-boy.png': 'rsam_website/branding',

  // Affiliations
  'affil1.jpg': 'rsam_website/affiliations',
  'affil2.jpg': 'rsam_website/affiliations',
  'affil3.jpg': 'rsam_website/affiliations',

  // Certificates
  'rsam_pan.jpeg': 'rsam_website/certificates',
  'rsam_regcert.jpeg': 'rsam_website/certificates',

  // Officials
  'gs_devendrarana.jpeg': 'rsam_website/officials',
  'treasurer.png': 'rsam_website/officials',
  'manas.jpeg': 'rsam_website/officials',
  'manas1.jpg': 'rsam_website/officials',
  'manasq.jpeg': 'rsam_website/officials',
  'refree_devanand.jpeg': 'rsam_website/officials',
  'refree_devrana.jpeg': 'rsam_website/officials',
  'refree_dummy.png': 'rsam_website/officials',
  'refree_gouravsingh.jpeg': 'rsam_website/officials',
  'refree_parmesh.jpeg': 'rsam_website/officials',
  'refree_rohit.jpeg': 'rsam_website/officials',
  'refree_rupesh.jpeg': 'rsam_website/officials',
  'refree_sachinnainwal.jpeg': 'rsam_website/officials',
  'refree_shyam.jpg': 'rsam_website/officials',
  'refree_sid.jpeg': 'rsam_website/officials',
  'refree_vikas.jpeg': 'rsam_website/officials',
  'refree_vipin.jpeg': 'rsam_website/officials',

  // Highlights
  'highlight1.JPG': 'rsam_website/highlights',
  'highlight2.JPG': 'rsam_website/highlights',
  'highlight3.jpg': 'rsam_website/highlights',
  'highlight4.jpg': 'rsam_website/highlights',
  'vedanga-medal.png': 'rsam_website/highlights',
  'test.JPG': 'rsam_website/highlights',

  // News
  'news_main.jpg': 'rsam_website/news',
  'news_lko.JPG': 'rsam_website/news',

  // Events / Gallery Subfolders
  'event-lko.png': 'rsam_website/events',
  'lko1.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko2.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko3.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko4.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko5.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko6.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko7.JPG': 'rsam_website/gallery/up_state_championship_2026',
  'lko8.JPG': 'rsam_website/gallery/up_state_championship_2026',

  'row-event.JPG': 'rsam_website/gallery/district_showcase_2026',
  'row-event1.JPG': 'rsam_website/gallery/district_showcase_2026',
  'row-event2.JPG': 'rsam_website/gallery/district_showcase_2026',
  'row-event5.JPG': 'rsam_website/gallery/district_showcase_2026',
  'row4.jpg': 'rsam_website/gallery/district_showcase_2026'
};

async function executeFolderOrganization() {
  console.log('----------------------------------------------------');
  console.log('📂 Creating Cloudinary Folder Structure & Moving Files');
  console.log('----------------------------------------------------\n');

  // 1. Explicitly create all folders on Cloudinary
  for (const folderPath of foldersToCreate) {
    try {
      await cloudinary.api.create_folder(folderPath);
      console.log(`✅ Created Folder: ${folderPath}`);
    } catch (err) {
      console.log(`ℹ️ Folder exists or created: ${folderPath} (${err.message})`);
    }
  }

  console.log('\n--- Moving Assets into Respective Subfolders ---\n');

  const mapFile = path.join(__dirname, '../data/cloudinary-media-map.json');
  const newMap = {};
  let movedCount = 0;

  for (const [filename, targetFolder] of Object.entries(fileSubfolderMap)) {
    const baseName = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const newPublicId = `${targetFolder}/${baseName}`;
    const key = `images/${filename}`;

    // Try finding old public ID locations
    const possibleOldIds = [
      `rsam_website/${baseName}`,
      `rsam_website/events/${baseName}`,
      `rsam_website/highlights/${baseName}`,
      `rsam_website/branding/${baseName}`,
      `rsam_website/officials/${baseName}`,
      `rsam_website/affiliations/${baseName}`,
      `rsam_website/certificates/${baseName}`
    ];

    let currentUrl = null;

    for (const oldId of possibleOldIds) {
      if (oldId === newPublicId) continue;
      try {
        const result = await cloudinary.uploader.rename(oldId, newPublicId, { overwrite: true, invalidate: true });
        currentUrl = result.secure_url;
        console.log(`  ✅ Moved: ${filename} ➔ ${newPublicId}`);
        movedCount++;
        break;
      } catch (err) {
        // try next
      }
    }

    if (!currentUrl) {
      try {
        const res = await cloudinary.api.resource(newPublicId);
        currentUrl = res.secure_url;
        console.log(`  ℹ️ Verified at: ${newPublicId}`);
        movedCount++;
      } catch (fetchErr) {
        console.error(`  ❌ Failed to locate ${filename} at ${newPublicId}`);
      }
    }

    if (currentUrl) {
      newMap[key] = currentUrl;
    }
  }

  fs.writeFileSync(mapFile, JSON.stringify(newMap, null, 2), 'utf8');
  console.log('\n----------------------------------------------------');
  console.log(`🎉 Organized ${movedCount} Cloudinary assets across all folders!`);
  console.log(`📄 Updated mapping saved to: data/cloudinary-media-map.json`);
  console.log('----------------------------------------------------');
}

executeFolderOrganization();
