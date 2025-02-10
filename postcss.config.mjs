/** @type {import('postcss-load-config').Config} */
export default {
  plugins: {
    'postcss-import': {},
    'postcss-nesting': {
      noIsPseudoSelector: true
    },
    autoprefixer: {},
  },
};
