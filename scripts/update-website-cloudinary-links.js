const fs = require('fs');
const path = require('path');

const mapFile = path.join(__dirname, '../data/cloudinary-media-map.json');
if (!fs.existsSync(mapFile)) {
  console.error('❌ Map file not found:', mapFile);
  process.exit(1);
}

const rawMap = JSON.parse(fs.readFileSync(mapFile, 'utf8'));

// Build case-insensitive lookup
const map = {};
for (const [key, value] of Object.entries(rawMap)) {
  map[key] = value;
  map[key.toLowerCase()] = value;
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
  'data/upcoming-events.json'
];

let totalReplacements = 0;

for (const relFile of filesToUpdate) {
  const fullPath = path.join(__dirname, '..', relFile);
  if (!fs.existsSync(fullPath)) {
    console.log(`⚠️ Skipping missing file: ${relFile}`);
    continue;
  }

  let content = fs.readFileSync(fullPath, 'utf8');
  let fileReplacements = 0;

  // Replace each images/ path in the file
  content = content.replace(/["'](images\/[^"']+)["']/g, (match, imgPath) => {
    const normPath = imgPath.replace(/\\/g, '/');
    const cloudUrl = map[normPath] || map[normPath.toLowerCase()];
    if (cloudUrl) {
      fileReplacements++;
      return `"${cloudUrl}"`;
    } else {
      console.warn(`  ⚠️ No Cloudinary mapping for: ${imgPath} in ${relFile}`);
      return match;
    }
  });

  if (fileReplacements > 0) {
    fs.writeFileSync(fullPath, content, 'utf8');
    console.log(`✅ Updated ${relFile}: replaced ${fileReplacements} image path(s)`);
    totalReplacements += fileReplacements;
  } else {
    console.log(`ℹ️ No images/ matches found in ${relFile}`);
  }
}

console.log(`\n🎉 Total replacements made: ${totalReplacements}`);
