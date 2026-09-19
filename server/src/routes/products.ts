import { Router, Request, Response } from 'express';
import { db } from '../db/client.js';
import { scraperInstance } from '../scraper/scraper.js';
import { config } from '../config.js';

export const productsRouter = Router();

/**
 * GET /api/products - List all tracked products
 */
productsRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const products = await db.getProducts();
    return res.json({ products });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch tracked products', details: err.message });
  }
});

/**
 * POST /api/products - Track a new product
 */
productsRouter.post('/', async (req: Request, res: Response) => {
  const storeProductId = req.body.storeProductId || req.body.store_product_id;
  const { name, sku, brand, category } = req.body;

  if (!storeProductId || !name) {
    return res.status(400).json({ error: 'storeProductId and name are required' });
  }

  const numericStoreId = parseInt(storeProductId, 10);
  const targetUrl = `${config.mockStoreBaseUrl}/product/${numericStoreId}`;

  try {
    // Check if already tracked
    const existing = await db.getProductByStoreId(numericStoreId);
    if (existing) {
      return res.status(200).json({
        message: 'Product is already tracked',
        product: existing,
      });
    }

    // Insert new tracked product
    const newProduct = await db.insertProduct({
      store_product_id: numericStoreId,
      name,
      sku: sku || `SKU-${numericStoreId}`,
      brand: brand || 'Generic',
      category: category || 'General',
      url: targetUrl,
      current_price: null,
      stock_status: 'Pending Scrape',
      is_in_stock: true,
      last_scrape_status: 'PENDING',
    });

    // Fire an initial scrape asynchronously in the background
    scraperInstance.scrapeProduct(newProduct, { headless: true }).catch(err => {
      console.error(`[Scraper] Initial scrape failed for product ${newProduct.id}:`, err.message);
    });

    return res.status(201).json({
      message: 'Product tracked successfully. Initial scrape initiated.',
      product: newProduct,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to track product', details: err.message });
  }
});

/**
 * DELETE /api/products/:id - Untrack a product
 */
productsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const deleted = await db.deleteProduct(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Product not found' });
    }
    return res.json({ message: 'Product untracked successfully' });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to delete product', details: err.message });
  }
});

/**
 * GET /api/products/:id/history - Price and stock history for charts
 */
productsRouter.get('/:id/history', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const history = await db.getPriceHistory(id);
    return res.json({ history });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch price history', details: err.message });
  }
});

/**
 * GET /api/products/:id/logs - Scrape logs for honest audit viewer
 */
productsRouter.get('/:id/logs', async (req: Request, res: Response) => {
  const id = String(req.params.id);
  try {
    const logs = await db.getScrapeLogs(id);
    return res.json({ logs });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch scrape logs', details: err.message });
  }
});

/**
 * POST /api/products/:id/scrape - Manually trigger an on-demand scrape
 */
productsRouter.post('/:id/scrape', async (req: Request, res: Response) => {
  const id = String(req.params.id);

  try {
    const product = await db.getProductById(id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found' });
    }

    // Run scrape
    const result = await scraperInstance.scrapeProduct(product, { headless: true });
    const updatedProduct = await db.getProductById(id);

    return res.json({
      message: result.success ? 'Scrape succeeded' : 'Scrape completed with errors',
      result,
      product: updatedProduct,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'On-demand scrape failed', details: err.message });
  }
});
