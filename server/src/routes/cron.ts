import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { scraperInstance } from '../scraper/scraper.js';
import { config } from '../config.js';

export const cronRouter = Router();

/**
 * Middleware to authenticate scheduled cron triggers (from cron-job.org or manual calls)
 */
function authenticateCron(req: Request, res: Response, next: () => void) {
  const authHeader = req.headers.authorization;
  const customHeader = req.headers['x-cron-secret'];
  const querySecret = req.query.secret;

  const providedSecret =
    authHeader?.replace(/^Bearer\s+/i, '') ||
    customHeader ||
    querySecret;

  if (!providedSecret || providedSecret !== config.cronSecret) {
    return res.status(401).json({
      error: 'Unauthorized. Provide valid cron secret in Authorization header or ?secret= query parameter.',
    });
  }

  next();
}

/**
 * POST /api/scrape/trigger - Trigger scheduled scrape across all tracked products
 */
cronRouter.post('/trigger', authenticateCron, async (_req: Request, res: Response) => {
  const startTime = Date.now();
  console.log(`[Cron] Starting scheduled batch scrape at ${new Date().toISOString()}`);

  try {
    const products = await db.getProducts();

    if (products.length === 0) {
      return res.json({
        message: 'No tracked products found to scrape.',
        totalProducts: 0,
        results: [],
        durationMs: Date.now() - startTime,
      });
    }

    const results: Array<{
      productId: string;
      name: string;
      success: boolean;
      price?: number;
      stock?: string;
      attempts: number;
      error?: string;
    }> = [];

    // Process sequentially to be gentle on free-tier RAM and CPU limits
    for (const product of products) {
      console.log(`[Cron] Scraping product ${product.name} (${product.id})...`);
      try {
        const scrapeRes = await scraperInstance.scrapeProduct(product, { headless: true });
        results.push({
          productId: product.id,
          name: product.name,
          success: scrapeRes.success,
          price: scrapeRes.data?.price,
          stock: scrapeRes.data?.stockStatus,
          attempts: scrapeRes.attempts,
          error: scrapeRes.error,
        });
      } catch (err: any) {
        results.push({
          productId: product.id,
          name: product.name,
          success: false,
          attempts: config.scraper.maxRetries,
          error: err.message,
        });
      }
    }

    const durationMs = Date.now() - startTime;
    const successCount = results.filter(r => r.success).length;

    console.log(`[Cron] Batch scrape finished: ${successCount}/${products.length} successful in ${durationMs}ms`);

    return res.json({
      message: `Batch scrape completed: ${successCount}/${products.length} succeeded.`,
      totalProducts: products.length,
      successCount,
      failureCount: products.length - successCount,
      durationMs,
      results,
    });
  } catch (err: any) {
    console.error('[Cron] Fatal error during scheduled scrape:', err);
    return res.status(500).json({ error: 'Batch scrape failed', details: err.message });
  }
});
