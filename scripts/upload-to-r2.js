/**
 * Automated Cloudflare R2 Media Uploader for RSAM Website
 * 
 * Usage:
 *   node scripts/upload-to-r2.js
 * 
 * Required Environment Variables in .env:
 *   R2_ACCOUNT_ID=your_cloudflare_account_id
 *   R2_ACCESS_KEY_ID=your_r2_access_key_id
 *   R2_SECRET_ACCESS_KEY=your_r2_secret_access_key
 *   R2_BUCKET_NAME=rsam-media
 *   R2_PUBLIC_URL=https://pub-xxxx.r2.dev (or https://media.rsam.org)
 */

const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

dotenv.config({ path: path.join(__dirname, '../whatsapp-server/.env') });

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'rsam-media';
const PUBLIC_URL = (process.env.R2_PUBLIC_URL || '').replace(/\/$/, '');

if (!ACCOUNT_ID || !ACCESS_KEY_ID || !SECRET_ACCESS_KEY) {
  console.error('\n❌ Missing Cloudflare R2 credentials in .env!');
  console.error('Please add R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY to whatsapp-server/.env file.\n');
  process.exit(1);
}

const s3 = new S3Client({
  region: 'auto',
  endpoint: `https://${ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: ACCESS_KEY_ID,
    secretAccessKey: SECRET_ACCESS_KEY
  }
});

const IMAGES_DIR = path.join(__dirname, '../images');
const MAP_FILE = path.join(__dirname, '../data/r2-media-map.json');

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  switch (ext) {
    case '.jpg': case '.jpeg': return 'image/jpeg';
    case '.png': return 'image/png';
    case '.gif': return 'image/gif';
    case '.webp': return 'image/webp';
    case '.pdf': return 'application/pdf';
    default: return 'application/octet-stream';
  }
}

async function uploadMedia() {
  console.log('----------------------------------------------------');
  console.log(`🚀 Uploading RSAM Media Files to Cloudflare R2 Bucket: ${BUCKET_NAME}`);
  console.log('----------------------------------------------------\n');

  const files = fs.readdirSync(IMAGES_DIR);
  const mediaMap = {};
  let successCount = 0;

  for (const filename of files) {
    const filePath = path.join(IMAGES_DIR, filename);
    const stat = fs.statSync(filePath);
    if (!stat.isFile()) continue;

    const fileStream = fs.readFileSync(filePath);
    const contentType = getContentType(filename);
    const r2Key = `images/${filename}`;

    console.log(`Uploading [${(stat.size / 1024 / 1024).toFixed(2)} MB] ${filename} ➔ ${r2Key}...`);

    try {
      await s3.send(new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: r2Key,
        Body: fileStream,
        ContentType: contentType
      }));

      const filePublicUrl = PUBLIC_URL ? `${PUBLIC_URL}/${r2Key}` : `https://${BUCKET_NAME}.${ACCOUNT_ID}.r2.cloudflarestorage.com/${r2Key}`;
      mediaMap[`images/${filename}`] = filePublicUrl;
      successCount++;
      console.log(`  ✅ Success: ${filePublicUrl}`);
    } catch (err) {
      console.error(`  ❌ Failed to upload ${filename}:`, err.message);
    }
  }

  // Save URL map file
  fs.writeFileSync(MAP_FILE, JSON.stringify(mediaMap, null, 2), 'utf8');
  console.log('\n----------------------------------------------------');
  console.log(`🎉 Finished uploading ${successCount}/${files.length} media files!`);
  console.log(`📄 URL Map saved to: data/r2-media-map.json`);
  console.log('----------------------------------------------------');
}

uploadMedia();
