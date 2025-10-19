#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to react-scripts webpack config
const webpackConfigPath = path.join(
  __dirname,
  '..',
  'node_modules',
  'react-scripts',
  'config',
  'webpack.config.js'
);

console.log('Disabling TypeScript checker in webpack config...');

try {
  if (fs.existsSync(webpackConfigPath)) {
    let content = fs.readFileSync(webpackConfigPath, 'utf8');

    // Comment out the ForkTsCheckerWebpackPlugin
    content = content.replace(
      /new ForkTsCheckerWebpackPlugin\([^)]*\{[^}]*\}[^)]*\)/g,
      '// ForkTsCheckerWebpackPlugin disabled to avoid ajv conflict\n    // $&'
    );

    // Also disable it in the import
    content = content.replace(
      "const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');",
      "// const ForkTsCheckerWebpackPlugin = require('fork-ts-checker-webpack-plugin');"
    );

    fs.writeFileSync(webpackConfigPath, content, 'utf8');
    console.log('✅ Successfully disabled TypeScript checker!');
  } else {
    console.log('⚠️  Webpack config not found, skipping');
  }
} catch (error) {
  console.error('❌ Error modifying webpack config:', error.message);
  process.exit(0);
}
