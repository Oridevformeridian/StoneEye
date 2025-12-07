const sharp = require('sharp');

sharp('stoneeye_1024x1024_icon.png')
  .resize(128, 128)
  .png({ quality: 90, compressionLevel: 9 })
  .toFile('src/stoneeye-icon.png')
  .then(() => {
    const fs = require('fs');
    const stats = fs.statSync('src/stoneeye-icon.png');
    console.log(`✓ Optimized icon: ${(stats.size / 1024).toFixed(1)} KB`);
  })
  .catch(err => console.error(err));
