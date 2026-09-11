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

async function syncAllCloudinaryGalleries() {
  console.log('----------------------------------------------------');
  console.log('🔄 Live Cloudinary Gallery Sync Service');
  console.log('----------------------------------------------------\n');

  const mediaMapFile = path.join(__dirname, '../data/cloudinary-media-map.json');
  const galleryConfigFile = path.join(__dirname, '../data/gallery-config.json');
  const galleryDataFile = path.join(__dirname, '../data/gallery.json');

  const mediaMap = fs.existsSync(mediaMapFile) ? JSON.parse(fs.readFileSync(mediaMapFile, 'utf8')) : {};
  const galleryConfig = fs.existsSync(galleryConfigFile) ? JSON.parse(fs.readFileSync(galleryConfigFile, 'utf8')) : { folders: [] };
  const galleryData = fs.existsSync(galleryDataFile) ? JSON.parse(fs.readFileSync(galleryDataFile, 'utf8')) : { albums: [] };

  for (const folderDef of galleryConfig.folders) {
    if (!folderDef.enabled || !folderDef.cloudinarySubfolder) continue;

    console.log(`📁 Querying Cloudinary folder: ${folderDef.cloudinarySubfolder} ...`);

    let allResources = [];
    let nextCursor = null;

    do {
      try {
        const opts = { type: 'upload', prefix: folderDef.cloudinarySubfolder, max_results: 500 };
        if (nextCursor) opts.next_cursor = nextCursor;
        const res = await cloudinary.api.resources(opts);
        if (res.resources) allResources = allResources.concat(res.resources);
        nextCursor = res.next_cursor;
      } catch (e) {
        console.error(`  ❌ Error querying Cloudinary for ${folderDef.cloudinarySubfolder}:`, e.message);
        break;
      }
    } while (nextCursor);

    console.log(`  ✨ Found ${allResources.length} live photos on Cloudinary!`);

    // Find or create matching album in gallery.json
    let album = galleryData.albums.find(a => a.id === folderDef.folderId);
    if (!album) {
      album = {
        id: folderDef.folderId,
        title: folderDef.title,
        date: folderDef.date,
        location: folderDef.location,
        category: folderDef.category,
        description: folderDef.description,
        photos: []
      };
      galleryData.albums.push(album);
    }

    const newPhotos = allResources.map(r => {
      const fileName = r.public_id.split('/').pop();
      const key = `images/${fileName}`;
      mediaMap[key] = r.secure_url;

      return {
        src: r.secure_url,
        caption: `Action Photo (${fileName})`,
        uploadedAt: r.created_at || new Date().toISOString()
      };
    });

    album.photos = newPhotos;
  }

  fs.writeFileSync(mediaMapFile, JSON.stringify(mediaMap, null, 2), 'utf8');
  fs.writeFileSync(galleryDataFile, JSON.stringify(galleryData, null, 2), 'utf8');

  console.log('\n----------------------------------------------------');
  console.log('✅ Successfully synchronized all Cloudinary gallery photos to data files!');
  console.log('----------------------------------------------------');
}

syncAllCloudinaryGalleries();
