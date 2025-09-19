#!/usr/bin/env node
/**
 * Asset Embedding Script for OpenNext Cloudflare Worker
 * Scans .open-next/assets/_next/static and generates asset map
 */

const fs = require('fs');
const path = require('path');

const assetsDir = '.open-next/assets/_next/static';
const assetMap = {};

function getContentType(filename) {
  const ext = path.extname(filename).toLowerCase();
  const types = {
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf',
    '.eot': 'application/vnd.ms-fontobject',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon'
  };
  return types[ext] || 'application/octet-stream';
}

function isTextFile(contentType) {
  return contentType.startsWith('text/') ||
         contentType === 'application/javascript' ||
         contentType.includes('json') ||
         contentType.includes('xml');
}

function scanAssets(dir, prefix = '') {
  if (!fs.existsSync(dir)) {
    console.error(`Assets directory not found: ${dir}`);
    return;
  }

  const files = fs.readdirSync(dir);
  console.log(`Scanning ${dir} - found ${files.length} items`);

  files.forEach(file => {
    const fullPath = path.join(dir, file);
    const relativePath = `/_next/static${prefix}/${file}`;

    if (fs.statSync(fullPath).isDirectory()) {
      console.log(`  📁 Directory: ${file}`);
      scanAssets(fullPath, `${prefix}/${file}`);
    } else {
      const stats = fs.statSync(fullPath);
      const contentType = getContentType(file);
      const content = fs.readFileSync(fullPath);

      if (isTextFile(contentType)) {
        assetMap[relativePath] = {
          content: content.toString('utf8'),
          type: contentType,
          encoding: 'utf8',
          size: stats.size
        };
        console.log(`  📄 Text file: ${file} (${stats.size} bytes) -> ${contentType}`);
      } else {
        assetMap[relativePath] = {
          content: content.toString('base64'),
          type: contentType,
          encoding: 'base64',
          size: stats.size
        };
        console.log(`  🔢 Binary file: ${file} (${stats.size} bytes) -> ${contentType}`);
      }
    }
  });
}

// Generate the asset map
console.log('🚀 Starting asset embedding...');
scanAssets(assetsDir);

// Calculate total size
const totalSize = Object.values(assetMap).reduce((sum, asset) => sum + asset.size, 0);
console.log(`\n📊 Asset Summary:`);
console.log(`   Total files: ${Object.keys(assetMap).length}`);
console.log(`   Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);

// Generate the JavaScript code
const assetMapCode = `
// Auto-generated asset map - DO NOT EDIT MANUALLY
const STATIC_ASSETS = ${JSON.stringify(assetMap, null, 2)};

async function serveStaticAsset(pathname) {
  const asset = STATIC_ASSETS[pathname];
  if (!asset) {
    return new Response('Static asset not found', { status: 404 });
  }

  const content = asset.encoding === 'base64'
    ? Uint8Array.from(atob(asset.content), c => c.charCodeAt(0))
    : asset.content;

  return new Response(content, {
    headers: {
      'content-type': asset.type,
      'cache-control': 'public, max-age=31536000, immutable',
      'content-length': asset.size.toString()
    }
  });
}
`;

// Write the asset map to a file
fs.writeFileSync('.open-next/asset-map.js', assetMapCode);
console.log(`\n✅ Asset map generated: .open-next/asset-map.js`);
console.log(`   Ready for injection into worker.js`);