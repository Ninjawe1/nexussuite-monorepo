export default {
  plugins: {
    // Explicitly point to the JS config to avoid conflicts with TS/CJS files
    tailwindcss: { config: "./tailwind.config.js" },
    // Enable modern CSS features (including relative color syntax)
    "postcss-preset-env": {
      stage: 2,
      features: {
        "relative-color-syntax": true,
      },
    },
    autoprefixer: {},
  },
}
