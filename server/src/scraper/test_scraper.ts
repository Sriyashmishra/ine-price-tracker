import { StoreScraper } from './scraper.js';
import { db } from '../db/client.js';

async function testHeadless() {
  console.log('Running test scrape (headless)...');
  const scraper = new StoreScraper();

  const testProduct = await db.insertProduct({
    store_product_id: 95,
    name: 'Domus Slimbook Mini',
    url: 'https://demo.inelabteamdev.com/product/95',
    sku: 'DOM-10095',
    brand: 'Domus',
    category: 'Laptops',
    current_price: null,
    stock_status: 'Pending',
    is_in_stock: true,
  });

  const res = await scraper.scrapeProduct(testProduct, { headless: true });
  console.log('Test result:', res);

  const logs = await db.getScrapeLogs(testProduct.id);
  console.log('Recorded logs:', logs);

  await scraper.close();
}

testHeadless().catch(console.error);
