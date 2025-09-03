import fs from 'fs';
const pkg          = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const manifestPath = 'extension/manifest.json';
const manifest     = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
manifest.version   = pkg.version;
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
console.log(`✅ manifest.json 已同步到版本 ${pkg.version}`);
