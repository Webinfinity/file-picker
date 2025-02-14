const path = require('path');
const MiniCssExtractPlugin = require('mini-css-extract-plugin');
const CssNano = require('cssnano');
const AutoPrefixer = require('autoprefixer');

const common = require('./common');

const root = path.resolve(__dirname, '../');
const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * @param {string} fileType less or css
 * @param {string} viewType picker or loader
 */
function getStyleLoaders(fileType, viewType) {
  const result = [];
  const miniCssExtractLoader = {
    loader: MiniCssExtractPlugin.loader,
    options: { hmr: isDevelopment },
  };
  const postCssLoader = {
    loader: 'postcss-loader',
    options: {
      plugins: isDevelopment ? [AutoPrefixer()] : [AutoPrefixer(), CssNano()],
    },
  };

  const lessLoader = {
    loader: 'less-loader',
  };

  if (viewType === 'picker') {
    result.push(miniCssExtractLoader);
  } else if (viewType === 'loader') {
    result.push('style-loader');
  }
  result.push('css-loader', postCssLoader);
  if (fileType === 'less') {
      result.push(lessLoader);
  }
  return result;
}

function getRules() {
  const rules = [
    {
      test: /\.css$/,
      use: getStyleLoaders('css', 'picker'),
    },
    {
      test: /loader\/css\/.*\.less$/,
      use: getStyleLoaders('less', 'loader'),
    },
    {
      test: /picker\/css\/.*\.less$/,
      use: getStyleLoaders('less', 'picker'),
    },
    {
      test: /\.jsx?$/,
      use: 'babel-loader',
    },
    {
      test: /\.pug$/,
      use: {
        loader: 'pug-loader',
        options: {
          pretty: isDevelopment,
        },
      },
    },
    {
      test: /\.(svg|png)$/,
      use: {
        loader: 'url-loader',
        options: {
          // TODO: enable optimizations 75 * 1024
          limit: false,
          esModule: false,
          outputPath: 'icon',
        },
      },
    },
    {
      test: /\.woff2?$/,
      loader: 'url-loader',
      options: {
        // TODO: enable optimizations 75 * 1024
        limit: false,
        // Enable a CommonJS module syntax
        // eslint-disable-next-line max-len
        // REF: https://stackoverflow.com/questions/59070216/webpack-file-loader-outputs-object-module
        esModule: false,
        outputPath: 'font',
      },
    },
  ];

  if (process.env.BUILD_LICENSE !== 'AGPL') {
    rules.push(
      {
        // eslint-disable-next-line max-len
        test: /(@kloudless\/file-picker-plupload-module\/*)|(plupload-helper\.js)/,
        use: 'null-loader',
      },
    );
  }
  return rules;
}

module.exports = {
  context: root,
  resolve: {
    extensions: ['.js', '.jsx'],
    modules: common.resolvePaths,
    alias: {
      // set these cldr alias to avoid webpack build error
      cldr$: 'cldrjs',
      cldr: 'cldrjs/dist/cldr',
    },
  },
  module: {
    rules: getRules(),
  },
  plugins: [
    new MiniCssExtractPlugin({
      filename: '[name].[hash].css',
    }),
  ],
  performance: {
    maxEntrypointSize: 10 * 1024 * 1024,
    maxAssetSize: 10 * 1024 * 1024,
  },
};
