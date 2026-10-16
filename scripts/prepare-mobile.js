const fs = require('fs');
const path = require('path');
const { build } = require('esbuild');
const root = path.resolve(__dirname, '..');
const pkg = require(path.join(root, 'package.json'));
const htmlPath = path.join(root, 'src', 'index.html');
let html = fs.readFileSync(htmlPath, 'utf8');
html = html.replace(/<meta name="app-version" content="[^"]*">/, `<meta name="app-version" content="${pkg.version}">`);
fs.writeFileSync(htmlPath, html, 'utf8');
build({
  entryPoints: [path.join(root, 'src', 'js', 'mobile-updater-entry.js')],
  outfile: path.join(root, 'src', 'js', 'mobile-updater.bundle.js'),
  bundle: true,
  minify: true,
  format: 'iife',
  platform: 'browser',
});
