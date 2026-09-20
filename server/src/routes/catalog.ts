import { Router, Request, Response } from 'express';
import { config } from '../config.js';

export const catalogRouter = Router();

interface CatalogItem {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  description: string;
}

let cachedCatalog: CatalogItem[] = [];
let lastFetchedTime = 0;
const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Fetches all items across pages from mock store catalog and caches them in memory.
 */
async function getCatalog(): Promise<CatalogItem[]> {
  const now = Date.now();
  if (cachedCatalog.length > 0 && now - lastFetchedTime < CACHE_TTL_MS) {
    return cachedCatalog;
  }

  console.log('[Catalog] Fetching catalog from mock store...');
  const items: CatalogItem[] = [];

  try {
    // Page size is capped at 60 on the mock store
    let page = 1;
    let totalPages = 1;

    // Fetch initial page to get total pages
    const firstRes = await fetch(`${config.mockStoreBaseUrl}/api/catalog?page=1&pageSize=60`);
    if (!firstRes.ok) throw new Error(`HTTP ${firstRes.status}`);
    const firstData: any = await firstRes.json();

    totalPages = firstData.pages || 1;
    if (Array.isArray(firstData.items)) {
      items.push(...firstData.items);
    }

    // Fetch remaining pages in parallel batches
    const pageNumbers = [];
    for (let p = 2; p <= totalPages; p++) {
      pageNumbers.push(p);
    }

    const batchSize = 5;
    for (let i = 0; i < pageNumbers.length; i += batchSize) {
      const batch = pageNumbers.slice(i, i + batchSize);
      const results = await Promise.all(
        batch.map(p =>
          fetch(`${config.mockStoreBaseUrl}/api/catalog?page=${p}&pageSize=60`)
            .then(r => (r.ok ? r.json() : null))
            .catch(() => null)
        )
      );

      for (const res of results) {
        if (res && Array.isArray((res as any).items)) {
          items.push(...(res as any).items);
        }
      }
    }

    const uniqueMap = new Map<number, CatalogItem>();
    for (const item of items) {
      if (item && item.id && !uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    }
    cachedCatalog = Array.from(uniqueMap.values());
    lastFetchedTime = now;
    console.log(`[Catalog] Successfully cached ${cachedCatalog.length} unique catalog items`);
    return cachedCatalog;
  } catch (err: any) {
    console.error('[Catalog] Error fetching catalog:', err.message);
    if (cachedCatalog.length > 0) return cachedCatalog;
    throw err;
  }
}

/**
 * GET /api/catalog/search?q=query
 */
catalogRouter.get('/search', async (req: Request, res: Response) => {
  const query = (req.query.q as string || '').trim().toLowerCase();

  try {
    const catalog = await getCatalog();

    if (!query) {
      // Return top 20 items if no search term provided
      return res.json({
        total: catalog.length,
        items: catalog.slice(0, 20),
      });
    }

    // Match across name, SKU, brand, and category
    const filtered = catalog.filter(item => {
      const nameMatch = item.name.toLowerCase().includes(query);
      const skuMatch = item.sku.toLowerCase().includes(query);
      const brandMatch = item.brand.toLowerCase().includes(query);
      const catMatch = item.category.toLowerCase().includes(query);
      return nameMatch || skuMatch || brandMatch || catMatch;
    });

    return res.json({
      query,
      total: filtered.length,
      items: filtered.slice(0, 50),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to search catalog', details: err.message });
  }
});
