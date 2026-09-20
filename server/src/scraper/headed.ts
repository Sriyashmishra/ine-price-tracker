import { StoreScraper } from './scraper.js';
import { db } from '../db/client.js';
import { config } from '../config.js';

async function runHeadedDemo() {
  console.log('\n========================================================================');
  console.log('       INE Product Price Tracker — Observable Headed Scraper Run        ');
  console.log('========================================================================\n');
  console.log('Starting visible browser window for 2–4 min screen recording submission.\n');

  const scraper = new StoreScraper();

  // Pick target IDs from CLI or use 5 diverse items for a comprehensive 2.5-minute showcase
  const cliArgs = process.argv.slice(2).map(arg => parseInt(arg, 10)).filter(n => !isNaN(n));
  const targetStoreIds = cliArgs.length > 0 ? cliArgs : [95, 12, 139, 303, 102];

  console.log(`Target Product IDs to Scrape: [${targetStoreIds.join(', ')}]`);
  console.log(`Database Mode: ${db.isUsingSupabase() ? 'Supabase PostgreSQL' : 'Local Memory Store'}`);
  console.log(`Pacing: Snappy, natural human timing (~1.5 to 2.5 minutes)`);
  console.log(`Expected Run Duration: ~2 minutes (meets assignment specification)\n`);

  const resultsSummary: Array<{ id: number; name: string; price: string; stock: string; attempts: number; durationMs: number; status: string }> = [];

  try {
    for (let i = 0; i < targetStoreIds.length; i++) {
      const storeId = targetStoreIds[i];
      const targetUrl = `${config.mockStoreBaseUrl}/product/${storeId}`;

      console.log(`\n------------------------------------------------------------------------`);
      console.log(`[Item ${i + 1}/${targetStoreIds.length}] Preparing scrape for Product #${storeId}`);
      console.log(`URL: ${targetUrl}`);
      console.log(`------------------------------------------------------------------------`);

      // Find or create product record
      let product = await db.getProductByStoreId(storeId);
      if (!product) {
        product = await db.insertProduct({
          store_product_id: storeId,
          name: `Catalog Product #${storeId}`,
          url: targetUrl,
          sku: `SKU-${storeId}`,
          brand: 'MockStore',
          category: 'Hardware',
          current_price: null,
          stock_status: 'Pending',
          is_in_stock: true,
          last_scrape_status: 'PENDING',
        });
      }

      const result = await scraper.scrapeProduct(product, {
        headless: false,   // VISIBLE BROWSER WINDOW
        slowMo: 0,         // Natural human pacing controlled by scraper movement steps
        onProgress: (msg: string) => {
          const time = new Date().toLocaleTimeString();
          console.log(`  [${time}] ${msg}`);
        },
      });

      if (result.success && result.data) {
        console.log(`\n  ✅ SUCCESS on Item #${storeId}:`);
        console.log(`     Price:        ₹${result.data.price.toLocaleString('en-IN')}`);
        console.log(`     Stock Status: ${result.data.stockStatus} (In Stock: ${result.data.isInStock})`);
        console.log(`     Attempts:     ${result.attempts}`);
        console.log(`     Latency:      ${result.totalDurationMs}ms`);

        resultsSummary.push({
          id: storeId,
          name: product.name,
          price: `₹${result.data.price.toLocaleString('en-IN')}`,
          stock: result.data.stockStatus,
          attempts: result.attempts,
          durationMs: result.totalDurationMs,
          status: 'SUCCESS',
        });
      } else {
        console.log(`\n  ❌ FAILED on Item #${storeId} (Logged Honestly):`);
        console.log(`     Error:        ${result.error}`);
        console.log(`     Attempts:     ${result.attempts}`);

        resultsSummary.push({
          id: storeId,
          name: product.name,
          price: 'N/A',
          stock: 'N/A',
          attempts: result.attempts,
          durationMs: result.totalDurationMs,
          status: 'FAILED',
        });
      }

      // 2-second visual pause between products for the viewer
      if (i < targetStoreIds.length - 1) {
        console.log('\n  Pausing 2 seconds before next product navigation...');
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    console.log('\n========================================================================');
    console.log('                     HEADED SCRAPE RUN SUMMARY                          ');
    console.log('========================================================================');
    console.table(resultsSummary);
    console.log('========================================================================\n');

    console.log('Holding browser window open for 4 seconds for video review...');
    await new Promise(r => setTimeout(r, 4000));
  } catch (err: any) {
    console.error('Fatal error during headed run:', err.message);
  } finally {
    await scraper.close();
    console.log('Browser closed cleanly. Headed recording session ended.\n');
  }
}

runHeadedDemo();
