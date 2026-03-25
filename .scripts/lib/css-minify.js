const fs = require('fs');
const path = require('path');

function minifyCSS(rootDir) {
  console.log('\nMinifying CSS...');
  const filesToMinify = [
    { src: 'style.css', dest: 'style.min.css' },
    { src: 'app.css', dest: 'app.min.css' },
    { src: 'nav-floating.css', dest: 'nav-floating.min.css' },
  ];
  try {
    const CleanCSS = require('clean-css');
    for (const { src, dest } of filesToMinify) {
      const srcPath = path.join(rootDir, src);
      if (!fs.existsSync(srcPath)) continue;
      const cssSource = fs.readFileSync(srcPath, 'utf8');
      const minified = new CleanCSS({ level: 2 }).minify(cssSource);
      if (minified.errors.length > 0) {
        console.error(`  ${src} minification errors:`, minified.errors);
      } else {
        fs.writeFileSync(path.join(rootDir, dest), minified.styles);
        const savings = ((1 - minified.styles.length / cssSource.length) * 100).toFixed(1);
        console.log(`  ${src} (${cssSource.length}B) → ${dest} (${minified.styles.length}B) — ${savings}% smaller`);
      }
    }
  } catch (e) {
    console.log('  Skipped CSS minification (install clean-css first). Copying style.css as fallback.');
    const cssPath = path.join(rootDir, 'style.css');
    if (fs.existsSync(cssPath)) {
      fs.copyFileSync(cssPath, path.join(rootDir, 'style.min.css'));
    }
  }
}

module.exports = { minifyCSS };
