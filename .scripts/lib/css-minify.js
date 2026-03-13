const fs = require('fs');
const path = require('path');

function minifyCSS(rootDir) {
  console.log('\nMinifying CSS...');
  try {
    const CleanCSS = require('clean-css');
    const cssSource = fs.readFileSync(path.join(rootDir, 'style.css'), 'utf8');
    const minified = new CleanCSS({ level: 2 }).minify(cssSource);
    if (minified.errors.length > 0) {
      console.error('  CSS minification errors:', minified.errors);
    } else {
      fs.writeFileSync(path.join(rootDir, 'style.min.css'), minified.styles);
      const savings = ((1 - minified.styles.length / cssSource.length) * 100).toFixed(1);
      console.log(`  style.css (${cssSource.length}B) → style.min.css (${minified.styles.length}B) — ${savings}% smaller`);
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
