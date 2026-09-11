const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const cloudinary = require('cloudinary').v2;

dotenv.config({ path: path.join(__dirname, '.env') });

const CLOUD_NAME = process.env.CLOUDINARY_CLOUD_NAME;
const API_KEY = process.env.CLOUDINARY_API_KEY;
const API_SECRET = process.env.CLOUDINARY_API_SECRET;

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error('\n❌ Missing Cloudinary credentials in .env!');
  process.exit(1);
}

cloudinary.config({
  cloud_name: CLOUD_NAME,
  api_key: API_KEY,
  api_secret: API_SECRET,
  secure: true
});

const IMAGES_DIR = path.join(__dirname, '../images');
const MAP_FILE = path.join(__dirname, '../data/cloudinary-media-map.json');

async function uploadAllMedia() {
  console.log('----------------------------------------------------');
  console.log(`🚀 Uploading RSAM Website Media to Cloudinary [Cloud: ${CLOUD_NAME}]`);
  console.log('----------------------------------------------------\n');

  const files = fs.readdirSync(IMAGES_DIR);
  const mediaMap = {};
  let successCount = 0;

  for (const filename of files) {
    const filePath = path.join(IMAGES_DIR, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const publicId = path.parse(filename).name.replace(/[^a-zA-Z0-9_-]/g, '_');
    console.log(`Uploading [${(stat.size / 1024 / 1024).toFixed(2)} MB] ${filename}...`);

    try {
      const result = await cloudinary.uploader.upload(filePath, {
        folder: 'rsam_website',
        public_id: publicId,
        overwrite: true,
        resource_type: 'auto'
      });

      mediaMap[`images/${filename}`] = result.secure_url;
      successCount++;
      console.log(`  ✅ Uploaded: ${result.secure_url}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${filename}:`, err.message);
    }
  }

  // Ensure data directory exists
  const dataDir = path.dirname(MAP_FILE);
  if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

  fs.writeFileSync(MAP_FILE, JSON.stringify(mediaMap, null, 2), 'utf8');
  console.log('\n----------------------------------------------------');
  console.log(`🎉 Successfully uploaded ${successCount}/${files.length} media files to Cloudinary!`);
  console.log(`📄 URL mapping saved to: data/cloudinary-media-map.json`);
  console.log('----------------------------------------------------');
}

uploadAllMedia();
