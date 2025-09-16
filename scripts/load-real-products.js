#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Configuration
const PRODUCTS_DIR = path.join(__dirname, '../products');
const API_ENDPOINT = process.argv[2] || 'http://localhost:3000/api/products/load';

console.log('Loading products from:', PRODUCTS_DIR);
console.log('Target API:', API_ENDPOINT);

async function loadProducts() {
  try {
    // Read all files in the products directory
    const files = fs.readdirSync(PRODUCTS_DIR);

    // Group files by product (text + image pairs)
    const products = {};

    for (const file of files) {
      // Skip Zone.Identifier files
      if (file.includes('Zone.Identifier')) continue;

      const baseName = file.replace(/\.(txt|png)$/, '');
      const extension = path.extname(file);

      if (!products[baseName]) {
        products[baseName] = {};
      }

      if (extension === '.txt') {
        products[baseName].textFile = file;
      } else if (extension === '.png') {
        products[baseName].imageFile = file;
      }
    }

    // Prepare products array for API
    const productsToLoad = [];

    for (const [productName, files] of Object.entries(products)) {
      if (!files.textFile) {
        console.log(`Skipping ${productName} - no text file`);
        continue;
      }

      // Read text content
      const textContent = fs.readFileSync(
        path.join(PRODUCTS_DIR, files.textFile),
        'utf8'
      );

      // Read and encode image if exists
      let imageBase64 = null;
      if (files.imageFile) {
        const imageBuffer = fs.readFileSync(
          path.join(PRODUCTS_DIR, files.imageFile)
        );
        imageBase64 = `data:image/png;base64,${imageBuffer.toString('base64')}`;
      }

      productsToLoad.push({
        filename: files.textFile,
        textContent: textContent,
        imageBase64: imageBase64
      });

      console.log(`Prepared product: ${productName} (image: ${files.imageFile ? 'yes' : 'no'})`);
    }

    console.log(`\nLoading ${productsToLoad.length} products to ${API_ENDPOINT}...`);

    // Send to API
    const response = await fetch(API_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        products: productsToLoad
      })
    });

    const result = await response.json();

    if (response.ok) {
      console.log('\n✅ Success!');
      console.log('Summary:', result.summary);

      if (result.results) {
        console.log('\nLoaded products:');
        result.results.forEach(r => {
          if (r.success) {
            console.log(`  ✓ ${r.product.name} (${r.product.category})`);
          } else {
            console.log(`  ✗ ${r.filename}: ${r.error}`);
          }
        });
      }
    } else {
      console.error('\n❌ Failed:', result.error || result.message);
    }

    return result;

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    throw error;
  }
}

// Run the loader
loadProducts()
  .then(() => {
    console.log('\n✅ Product loading complete!');
    process.exit(0);
  })
  .catch((err) => {
    console.error('\n❌ Product loading failed:', err);
    process.exit(1);
  });