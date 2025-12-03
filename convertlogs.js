const fs = require('fs');
const path = require('path');
const os = require('os');

function defaultLogDir() {
  // Windows: C:\Users\<user>\AppData\LocalLow\Elder Game\Project Gorgon
  return path.join(os.homedir(), 'AppData', 'LocalLow', 'Elder Game', 'Project Gorgon');
}

function findLatestPlayerLog(dir) {
  if (!fs.existsSync(dir)) return null;
  const files = fs.readdirSync(dir)
    .filter(f => /^player.*\.log$/i.test(f))
    .map(f => ({ name: f, stat: fs.statSync(path.join(dir, f)) }))
    .sort((a, b) => b.stat.mtimeMs - a.stat.mtimeMs);
  return files.length ? path.join(dir, files[0].name) : null;
}

function parseLogContent(content) {
  const lines = content.split(/\r?\n/);
  const interactions = new Map(); // id -> { id, npcName, loyalty (favor), time }
  const results = [];

  const startRe = /ProcessStartInteraction\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9.]+)\s*,\s*([^,]+?)\s*,\s*([^,\)\s]+)\s*,?/;
  const vendorRe = /ProcessVendorScreen\(\s*(\d+)\s*,\s*([^,]+?)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)\s*,/;
  const timeRe = /^\[(\d{2}:\d{2}:\d{2})\]\s*/;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) continue;
    const timeMatch = line.match(timeRe);
    const time = timeMatch ? timeMatch[1] : null;

    let m = line.match(startRe);
    if (m) {
      const id = m[1];
      const second = m[2].trim();
      const favor = parseFloat(m[3]);
      const flag = m[4].trim();
      const npcName = m[5].trim();
      interactions.set(id, { id: Number(id), npcName, favor, flag, time });
      continue;
    }

    m = line.match(vendorRe);
    if (m) {
      const id = m[1];
      const vendorName = m[2].trim();
      const loyalty = Number(m[3]);
      const balance = Number(m[4]);
      const resettimer = Number(m[5]);

      const interaction = interactions.get(id);
      const npcName = interaction ? interaction.npcName : (`unknown_${id}`);

      results.push({
        id: Number(id),
        time,
        npc: npcName,
        vendorName,
        loyaltyName: vendorName,
        loyalty,
        balance,
        resettimer,
      });
    }
  }

  return results;
}

function run(argv) {
  const suppliedPath = argv[2];
  const dir = suppliedPath ? path.dirname(suppliedPath) : defaultLogDir();

  let logFile = null;
  if (suppliedPath && fs.existsSync(suppliedPath)) logFile = suppliedPath;
  else logFile = findLatestPlayerLog(dir);

  if (!logFile) {
    console.error('No player log found in', dir);
    process.exitCode = 2;
    return;
  }

  const content = fs.readFileSync(logFile, 'utf8');
  const parsed = parseLogContent(content);

  // Output JSON to stdout
  console.log(JSON.stringify(parsed, null, 2));
}

if (require.main === module) run(process.argv);
