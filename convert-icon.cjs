const fs = require('fs');
const png2icons = require('png2icons');

const input = fs.readFileSync('stoneeye_1024x1024_icon.png');

// Create ICNS for macOS
const icns = png2icons.createICNS(input, png2icons.BICUBIC, 0);
fs.writeFileSync('build/icon.icns', icns);

console.log('✓ Created build/icon.icns');
