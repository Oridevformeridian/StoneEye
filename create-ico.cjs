const fs = require('fs');
const { execSync } = require('child_process');

// Run png-to-ico and capture binary output
const result = execSync('npx png-to-ico stoneeye_1024x1024_icon.png --sizes 16,32,48,64,128,256', {
  encoding: 'buffer',
  maxBuffer: 10 * 1024 * 1024
});

// Write the binary data to the file
fs.writeFileSync('electron/icon.ico', result);

console.log('✓ Created electron/icon.ico (' + result.length + ' bytes)');
