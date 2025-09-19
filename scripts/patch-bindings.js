#!/usr/bin/env node
/**
 * Binding Patch Script for OpenNext Cloudflare Worker
 * Patches the server handler to properly expose Cloudflare Workers bindings
 */

const fs = require('fs');
const path = require('path');

console.log('🔧 Patching server handler with Cloudflare bindings...');

// Path to the server handler
const handlerPath = '.open-next/server-functions/default/handler.mjs';

if (!fs.existsSync(handlerPath)) {
  console.error('❌ Server handler not found. Make sure OpenNext build completed successfully.');
  process.exit(1);
}

let handlerContent = fs.readFileSync(handlerPath, 'utf8');

// Find the handler function export
const handlerExportMatch = handlerContent.match(/async function handler\([^)]*\)/);
if (!handlerExportMatch) {
  console.error('❌ Could not find handler function in server handler');
  process.exit(1);
}

// Look for the existing handler function signature
const existingHandlerMatch = handlerContent.match(/(async function handler\([^)]*\)[^{]*\{)/);
if (!existingHandlerMatch) {
  console.error('❌ Could not find handler function body start');
  process.exit(1);
}

// Check if already patched
if (handlerContent.includes('// CLOUDFLARE_BINDINGS_PATCH')) {
  console.log('✅ Handler already patched with Cloudflare bindings');
  return;
}

// Create the binding setup code
const bindingSetupCode = `
  // CLOUDFLARE_BINDINGS_PATCH - Set up Cloudflare Workers bindings in process.env
  // This ensures Next.js API routes can access the bindings properly
  if (env && typeof env === 'object') {
    // Set up the bindings in process.env for Next.js compatibility
    if (env.AI && !process.env.AI) {
      process.env.AI = env.AI;
    }
    if (env.DB && !process.env.DB) {
      process.env.DB = env.DB;
    }
    if (env.CAMPAIGN_STORAGE && !process.env.CAMPAIGN_STORAGE) {
      process.env.CAMPAIGN_STORAGE = env.CAMPAIGN_STORAGE;
    }
    if (env.BUCKET && !process.env.BUCKET) {
      process.env.BUCKET = env.BUCKET;
    }

    // Also set environment variables
    Object.keys(env).forEach(key => {
      if (typeof env[key] === 'string' && !process.env[key]) {
        process.env[key] = env[key];
      }
    });
  }
`;

// Insert the binding setup code at the beginning of the handler function
const functionStart = existingHandlerMatch[1];
const newFunctionStart = functionStart + bindingSetupCode;

handlerContent = handlerContent.replace(existingHandlerMatch[1], newFunctionStart);

// Write the patched handler
fs.writeFileSync(handlerPath, handlerContent);

console.log('✅ Server handler patched successfully!');
console.log('   🔗 Added Cloudflare Workers binding setup');
console.log('   📝 Next.js API routes can now access AI, DB, and CAMPAIGN_STORAGE');