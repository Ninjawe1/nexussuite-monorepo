module.exports = {
  plugins: {
    tailwindcss: {},
    // Enable modern CSS features including relative color syntax used in index.css
    // See: https://github.com/csstools/postcss-plugins/tree/main/plugin-packs/postcss-preset-env
    "postcss-preset-env": {
      stage: 2,
      features: {
        "relative-color-syntax": true,
      },
    },
    autoprefixer: {},
  },
};