const fs = require('fs');
const path = require('path');
const dotenv = require(path.join(__dirname, '../whatsapp-server/node_modules/dotenv'));
const cloudinary = require(path.join(__dirname, '../whatsapp-server/node_modules/cloudinary')).v2;

dotenv.config({ path: path.join(__dirname, '../whatsapp-server/.env') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('❌ Missing Cloudinary credentials in whatsapp-server/.env');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true
});

const categorisation = {
  'branding': [
    'rsam-logo.png',
    'skater-boy.png'
  ],
  'affiliations': [
    'affil1.jpg',
    'affil2.jpg',
    'affil3.jpg'
  ],
  'certificates': [
    'rsam_pan.jpeg',
    'rsam_regcert.jpeg'
  ],
  'officials': [
    'gs_devendrarana.jpeg',
    'treasurer.png',
    'manas.jpeg',
    'manas1.jpg',
    'manasq.jpeg',
    'refree_devanand.jpeg',
    'refree_devrana.jpeg',
    'refree_dummy.png',
    'refree_gouravsingh.jpeg',
    'refree_parmesh.jpeg',
    'refree_rohit.jpeg',
    'refree_rupesh.jpeg',
    'refree_sachinnainwal.jpeg',
    'refree_shyam.jpg',
    'refree_sid.jpeg',
    'refree_vikas.jpeg',
    'refree_vipin.jpeg'
  ],
  'highlights': [
    'highlight1.JPG',
    'highlight2.JPG',
    'highlight3.jpg',
    'highlight4.jpg',
    'vedanga-medal.png',
    'test.JPG'
  ],
  'events': [
    'event-lko.png',
    'lko1.JPG',
    'lko2.JPG',
    'lko3.JPG',
    'lko4.JPG',
    'lko5.JPG',
    'lko6.JPG',
    'lko7.JPG',
    'lko8.JPG',
    'news_lko.JPG',
    'news_main.jpg',
    'row-event.JPG',
    'row-event1.JPG',
    'row-event2.JPG',
    'row-event5.JPG',
    'row4.jpg'
  ]
};

const mapFile = path.join(__dirname, '../data/cloudinary-media-map.json');
const newMap = {};

async function organize() {
  console.log('----------------------------------------------------');
  console.log('📁 Organizing Cloudinary Assets into Category Subfolders');
  console.log('----------------------------------------------------\n');

  let successCount = 0;

  for (const [subfolder, filenames] of Object.entries(categorisation)) {
    console.log(`\n📂 Subfolder: rsam_website/${subfolder}`);

    for (const filename of filenames) {
      const oldPublicId = `rsam_website/${path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;
      const newPublicId = `rsam_website/${subfolder}/${path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '_')}`;

      const key = `images/${filename}`;

      try {
        const result = await cloudinary.uploader.rename(oldPublicId, newPublicId, { overwrite: true, invalidate: true });
        newMap[key] = result.secure_url;
        console.log(`  ✅ Moved: ${filename} ➔ ${result.secure_url}`);
        successCount++;
      } catch (err) {
        // If rename fails (e.g. already renamed), fetch resource info
        try {
          const res = await cloudinary.api.resource(newPublicId);
          newMap[key] = res.secure_url;
          console.log(`  ℹ️ Already exists at: ${res.secure_url}`);
          successCount++;
        } catch (fetchErr) {
          console.error(`  ❌ Failed to organize ${filename}:`, err.message);
        }
      }
    }
  }

  fs.writeFileSync(mapFile, JSON.stringify(newMap, null, 2), 'utf8');
  console.log('\n----------------------------------------------------');
  console.log(`🎉 Organized ${successCount} assets into subfolders!`);
  console.log(`📄 Updated mapping saved to: data/cloudinary-media-map.json`);
  console.log('----------------------------------------------------');
}

organize();
