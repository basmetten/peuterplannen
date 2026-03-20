import * as esbuild from 'esbuild';

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
