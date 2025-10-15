const data = require('./data/printful-catalog.json');

console.log('🔍 Analyzing Printful catalog...');
console.log(`📊 Total products: ${data.products.length}`);
console.log(`📅 Fetched at: ${data.fetchedAt}`);

// Find t-shirt products
const tshirts = data.products.filter(p => 
  p.product.display_name.toLowerCase().includes('tee') || 
  p.product.display_name.toLowerCase().includes('t-shirt') || 
  p.product.display_name.toLowerCase().includes('shirt')
);

console.log(`\n👕 Found ${tshirts.length} t-shirt products:`);
tshirts.slice(0, 10).forEach(p => {
  console.log(`- ID: ${p.product.id}, Name: ${p.product.display_name}`);
});

// Look for Gildan products specifically
const gildan = data.products.filter(p => 
  p.product.display_name.toLowerCase().includes('gildan')
);

console.log(`\n🏷️  Found ${gildan.length} Gildan products:`);
gildan.forEach(p => {
  console.log(`- ID: ${p.product.id}, Name: ${p.product.display_name}`);
});

// Check if we have variants for any t-shirt
if (tshirts.length > 0) {
  const firstTshirt = tshirts[0];
  console.log(`\n📋 Sample t-shirt variants (${firstTshirt.product.display_name}):`);
  if (firstTshirt.variants && firstTshirt.variants.length > 0) {
    firstTshirt.variants.slice(0, 5).forEach(v => {
      console.log(`- Variant ID: ${v.id}, Color: ${v.color}, Size: ${v.size}`);
    });
  } else {
    console.log('No variants found in this product');
  }
}
