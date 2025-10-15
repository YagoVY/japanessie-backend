const fs = require('fs');
const path = require('path');

let CACHE = null;
let INDEX = null;

function loadCache() {
  if (CACHE) return CACHE;
  const p = path.join(process.cwd(), 'data', 'printful-catalog.json');
  if (!fs.existsSync(p)) return null;
  try {
    CACHE = JSON.parse(fs.readFileSync(p, 'utf8'));
    return CACHE;
  } catch {
    return null;
  }
}

function buildIndex() {
  if (INDEX) return INDEX;
  const cache = loadCache();
  INDEX = {
    byProductId: new Map(),               // productId -> product
    byVariantId: new Map(),               // variantId -> { productId, variant }
    byProductColorSize: new Map(),        // `${productId}|${colorNorm}|${sizeNorm}` -> variantId
    bySkuLeadingDigits: new Map(),        // leading digits -> variantId (best effort)
  };
  if (!cache?.products) return INDEX;

  for (const p of cache.products) {
    INDEX.byProductId.set(String(p.id), p);

    const variants = p.variants || [];
    for (const v of variants) {
      INDEX.byVariantId.set(String(v.id), { productId: p.id, variant: v });

      const colorNorm = String(v.color || '').toLowerCase().replace(/\s+/g, '');
      const sizeNorm  = String(v.size || '').toUpperCase().trim();
      INDEX.byProductColorSize.set(`${p.id}|${colorNorm}|${sizeNorm}`, v.id);

      const m = String(v.id).match(/^(\d{5,})$/);
      if (m) INDEX.bySkuLeadingDigits.set(m[1], v.id);
    }
  }
  return INDEX;
}

module.exports = {
  loadCache,
  buildIndex,
};
