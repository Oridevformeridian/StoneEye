const fs = require('fs');
const path = require('path');
const os = require('os');
// Use the modern parser from src/utils/logParser.js
const { parseLogContent } = require('./src/utils/logParser');

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
  // Use the unified parser
  const parsed = parseLogContent(content, logFile);

  // Output JSON to stdout
  console.log(JSON.stringify(parsed, null, 2));
}

if (require.main === module) run(process.argv);
