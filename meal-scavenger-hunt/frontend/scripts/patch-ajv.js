#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Path to the problematic file
const problematicFile = path.join(
  __dirname,
  '..',
  'node_modules',
  'fork-ts-checker-webpack-plugin',
  'node_modules',
  'ajv-keywords',
  'keywords',
  '_formatLimit.js'
);

console.log('Patching ajv-keywords _formatLimit.js...');

try {
  if (fs.existsSync(problematicFile)) {
    let content = fs.readFileSync(problematicFile, 'utf8');

    // Patch to handle undefined formats object
    content = content.replace(
      'var format = formats[name];',
      'var format = formats && formats[name];'
    );

    // Patch the assignment line
    content = content.replace(
      'format = formats[name] = { validate: format };',
      'if (formats) { format = formats[name] = { validate: format }; }'
    );

    // Add safety check before using format
    content = content.replace(
      'if (compare(format(value), value2)) {',
      'if (format && compare(format(value), value2)) {'
    );

    // Patch the function at the start to return early if formats is undefined
    content = content.replace(
      'function extendFormats(ajv, name, compare) {',
      'function extendFormats(ajv, name, compare) {\n  if (!ajv || !ajv._formats) return;'
    );

    content = content.replace(
      'var formats = ajv._formats;',
      'var formats = ajv && ajv._formats;'
    );

    fs.writeFileSync(problematicFile, content, 'utf8');
    console.log('✅ Successfully patched ajv-keywords!');
  } else {
    console.log('⚠️  File not found, skipping patch (might not be needed)');
  }
} catch (error) {
  console.error('❌ Error patching file:', error.message);
  // Don't fail the build
  process.exit(0);
}
