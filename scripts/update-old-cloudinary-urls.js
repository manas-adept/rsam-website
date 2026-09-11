const fs = require('fs');
const path = require('path');

const mapFile = path.join(__dirname, '../data/cloudinary-media-map.json');
if (!fs.existsSync(mapFile)) {
  console.error('❌ Map file not found:', mapFile);
  process.exit(1);
}

const map = JSON.parse(fs.readFileSync(mapFile, 'utf8'));

// Build flexible baseName to new URL lookup
const urlMap = {};
for (const [key, newUrl] of Object.entries(map)) {
  const filename = path.basename(key);
  const rawBase = path.parse(filename).name;
  
  urlMap[rawBase] = newUrl;
  urlMap[rawBase.toLowerCase()] = newUrl;
  urlMap[rawBase.replace(/-/g, '_')] = newUrl;
  urlMap[rawBase.replace(/_/g, '-')] = newUrl;
  urlMap[rawBase.toLowerCase().replace(/-/g, '_')] = newUrl;
  urlMap[rawBase.toLowerCase().replace(/_/g, '-')] = newUrl;
}

const filesToUpdate = [
  'config.js',
  'render.js',
  'index.html',
  'register.html',
  'data/affiliations.json',
  'data/affiliations.js',
  'data/certificate.js',
  'data/highlights.json',
  'data/highlights.js',
  'data/news.js',
  'data/news-items.json',
  'data/officials.json',
  'data/officials.js',
  'data/upcoming-events.json',
  'data/gallery.json'
];

let totalReplacements = 0;

// Regex matches any Cloudinary URL starting with https://res.cloudinary.com/igjmhsju/image/upload/
const cloudinaryRegex = /https:\/\/res\.cloudinary\.com\/igjmhsju\/image\/upload\/v\d+\/(?:[^\/"']+\/)*([a-zA-Z0-9_-]+)\.(?:jpg|png|jpeg|gif|webp)/gi;

for (const relFile of filesToUpdate) {
  const fullPath = path.join(__dirname, '..', relFile);
  if (!fs.existsSync(fullPath)) continue;

  let content = fs.readFileSync(fullPath, 'utf8');
  let fileReplacements = 0;

  content = content.replace(cloudinaryRegex, (match, baseName) => {
    const replacement = urlMap[baseName] || urlMap[baseName.toLowerCase()];
    if (replacement) {
      fileReplacements++;
      return replacement;
    } else {
      console.warn(`  ⚠️ Could not match baseName "${baseName}" in ${relFile}`);
      return match;
    }
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${relFile}: replaced ${fileReplacements} Cloudinary URL(s)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`ℹ️ No Cloudinary replacements in ${relFile}`);
  }
}

console.log(`\n🎉 Total Cloudinary URLs updated to categorized subfolder links: ${totalReplacements}`);
