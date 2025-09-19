#!/usr/bin/env node
/**
 * Worker Patching Script for Static Asset Serving
 * Applies static asset handling to the OpenNext generated worker.js
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Patching worker.js with static asset serving...');

// Read the generated worker.js
const workerPath = '.open-next/worker.js';
if (!fs.existsSync(workerPath)) {
  console.error('❌ worker.js not found. Make sure OpenNext build completed successfully.');
  process.exit(1);
}

let workerContent = fs.readFileSync(workerPath, 'utf8');

// Read the asset map
const assetMapPath = '.open-next/asset-map.js';
if (!fs.existsSync(assetMapPath)) {
  console.error('❌ asset-map.js not found. Run embed-assets.js first.');
  process.exit(1);
}

const assetMapContent = fs.readFileSync(assetMapPath, 'utf8');

// Extract the STATIC_ASSETS object and serveStaticAsset function
const assetMapMatch = assetMapContent.match(/const STATIC_ASSETS = \{[\s\S]*?\n\};/);
const serveFunctionMatch = assetMapContent.match(/async function serveStaticAsset\([\s\S]*?\n\}/);

if (!assetMapMatch || !serveFunctionMatch) {
  console.error('❌ Could not extract STATIC_ASSETS or serveStaticAsset from asset-map.js');
  process.exit(1);
}

const staticAssetsCode = `// Auto-generated static asset map for serving _next/static files
${assetMapMatch[0]}

${serveFunctionMatch[0]}`;

// Find the insertion point (after imports but before export default)
const insertionPoint = workerContent.indexOf('export default {');
if (insertionPoint === -1) {
  console.error('❌ Could not find insertion point in worker.js');
  process.exit(1);
}

// Insert the static assets code
const beforeInsert = workerContent.substring(0, insertionPoint);
const afterInsert = workerContent.substring(insertionPoint);

workerContent = beforeInsert + staticAssetsCode + '\n\n' + afterInsert;

// Add the static asset serving logic to the fetch handler
// Find the URL pathname checking section
const urlPathnameMatch = workerContent.match(/(const url = new URL\(request\.url\);[\s\S]*?)(\s+\/\/ - `Request`s are handled by the Next server)/);

if (!urlPathnameMatch) {
  console.error('❌ Could not find URL pathname section in worker.js');
  process.exit(1);
}

const beforeUrlLogic = urlPathnameMatch[1];
const afterUrlLogic = urlPathnameMatch[2];

// Add static asset serving logic
const staticAssetLogic = `
            // Serve static assets from embedded map
            if (url.pathname.startsWith('/_next/static/')) {
                return await serveStaticAsset(url.pathname);
            }
`;

const newUrlLogic = beforeUrlLogic + staticAssetLogic + afterUrlLogic;
workerContent = workerContent.replace(urlPathnameMatch[0], newUrlLogic);

// Write the patched worker.js
fs.writeFileSync(workerPath, workerContent);

// Count the assets
const assetCount = (assetMapMatch[0].match(/"_next\/static\//g) || []).length;
console.log(`✅ Worker patched successfully!`);
console.log(`   📦 Embedded ${assetCount} static assets`);
console.log(`   🔧 Added static asset serving logic`);
console.log(`   📝 Ready for deployment`);