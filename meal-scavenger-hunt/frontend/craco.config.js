module.exports = {
  typescript: {
    enableTypeChecking: false, // Disable TypeScript checking to avoid fork-ts-checker-webpack-plugin
  },
  webpack: {
    configure: (webpackConfig) => {
      // Remove fork-ts-checker-webpack-plugin to avoid ajv conflict
      webpackConfig.plugins = webpackConfig.plugins.filter(
        plugin => plugin.constructor.name !== 'ForkTsCheckerWebpackPlugin'
      );

      // Fix ajv dependency conflict
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        ajv: require.resolve('ajv'),
      };

      // Ignore source map warnings
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      return webpackConfig;
    },
  },
};
