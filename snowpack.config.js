// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
module.exports = {
  mount: {
    "src": "/",
    "assets": "/"
  },
  plugins: [
    "@snowpack/plugin-typescript"
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    open: 'none',
    port: 8000
  },
  buildOptions: {
    out: 'dist'
    /* ... */
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018'
  }
};
