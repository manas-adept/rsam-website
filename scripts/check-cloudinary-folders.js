const path = require('path');
const dotenv = require(path.join(__dirname, '../whatsapp-server/node_modules/dotenv'));
const cloudinary = require(path.join(__dirname, '../whatsapp-server/node_modules/cloudinary')).v2;

dotenv.config({ path: path.join(__dirname, '../whatsapp-server/.env') });

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true
});

async function checkFolders() {
  try {
    console.log('--- Root Folders ---');
    const root = await cloudinary.api.root_folders();
    console.log(root.folders);

    console.log('\n--- Subfolders of rsam_website ---');
    try {
      const sub = await cloudinary.api.sub_folders('rsam_website');
      console.log(sub.folders);
    } catch (e) {
      console.log('No subfolders under rsam_website or error:', e.message);
    }

    console.log('\n--- Sample Resources under rsam_website ---');
    const res = await cloudinary.api.resources({ prefix: 'rsam_website', max_results: 20 });
    console.log(res.resources.map(r => r.public_id));
  } catch (err) {
    console.error('Error checking Cloudinary:', err);
  }
}

checkFolders();
