import * as esbuild from 'esbuild';
import { readFileSync, writeFileSync } from 'fs';
import { execSync } from 'child_process';

// Plugin: keep url() references in CSS untouched (don't copy/hash assets)
const externalAssetsPlugin = {
  name: 'external-assets',
  setup(build) {
    build.onResolve({ filter: /\.(jpeg|jpg|png|svg|webp|gif|woff2?|ttf|eot)$/i }, (args) => {
      return { path: args.path, external: true };
    });
  },
};

// JS bundle: app.js + 19 modules -> app.bundle.js
await esbuild.build({
  entryPoints: ['app.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  sourcemap: true,
  outfile: 'app.bundle.js',
  external: ['https://*'],
});

// CSS bundle: 5 CSS files -> app.bundle.css
await esbuild.build({
  entryPoints: ['css-bundle-entry.css'],
  bundle: true,
  minify: true,
  sourcemap: true,
  outfile: 'app.bundle.css',
  plugins: [externalAssetsPlugin],
});

// Auto-bump cache busters in app.html after bundling
// Uses short git hash + timestamp to guarantee unique versions
const gitHash = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
const ts = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 12);
const version = `${ts}-${gitHash}`;

let appHtml = readFileSync('app.html', 'utf8');
const bumped = appHtml
  .replace(/(app\.bundle\.css\?v=)[^\s"']+/g, `$1${version}`)
  .replace(/(app\.bundle\.js\?v=)[^\s"']+/g, `$1${version}`)
  .replace(/(nav-floating\.js\?v=)[^\s"']+/g, `$1${version}`);

if (bumped !== appHtml) {
  writeFileSync('app.html', bumped);
  console.log(`Cache busters updated to v=${version}`);
} else {
  console.log('Cache busters already up to date');
}
