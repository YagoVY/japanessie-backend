#!/usr/bin/env node

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API = axios.create({
  baseURL: 'https://api.printful.com',
  headers: { Authorization: `Bearer ${process.env.PRINTFUL_API_KEY}` },
  timeout: 20000,
});

async function listCatalogProducts({ search = '', limit = 100 }) {
  const out = [];
  let page = 1;
  while (true) {
    const { data } = await API.get('/catalog/products', {
      params: { search, limit, page },
      validateStatus: () => true,
    });
    if (data?.code !== 200) {
      throw new Error(`catalog/products failed: ${JSON.stringify(data)}`);
    }
    const products = data.result?.products || [];
    out.push(...products);
    const pagination = data.result?.pagination || {};
    if (page >= (pagination.pageCount || 1)) break;
    page += 1;
  }
  return out;
}

async function getCatalogProduct(productId) {
  const { data } = await API.get(`/catalog/products/${productId}`, {
    validateStatus: () => true,
  });
  if (data?.code !== 200) {
    throw new Error(`catalog/products/${productId} failed: ${JSON.stringify(data)}`);
  }
  return data.result;
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function main() {
  const search = process.env.CATALOG_SEARCH || ''; // e.g. "gildan 64000"
  const outDir = path.join(process.cwd(), 'data');
  const outPath = path.join(outDir, 'printful-catalog.json');

  if (!process.env.PRINTFUL_API_KEY) {
    throw new Error('Missing PRINTFUL_API_KEY in .env');
  }

  console.log(`🔎 Listing catalog products (search="${search || '*'}") ...`);
  const products = await listCatalogProducts({ search, limit: 100 });
  console.log(`✅ Found ${products.length} products`);

  // Fetch each product's full detail (variants, files, techniques, print areas)
  const full = [];
  for (let i = 0; i < products.length; i++) {
    const p = products[i];
    console.log(`   [${i + 1}/${products.length}] Product ${p.id}: ${p.display_name}`);
    const detail = await getCatalogProduct(p.id);
    full.push(detail);

    // be nice to API
    await sleep(200);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);
  fs.writeFileSync(outPath, JSON.stringify({
    fetchedAt: new Date().toISOString(),
    search,
    products: full,
  }, null, 2));

  console.log(`💾 Saved full catalog to ${outPath}`);
}

main().catch(err => {
  console.error('❌ dump-catalog failed:', err.message);
  process.exit(1);
});
