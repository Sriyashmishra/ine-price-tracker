import { Product, PriceHistoryItem, ScrapeLogItem, CatalogSearchResult } from '../types/index.js';

// In development, Vite proxies /api to http://localhost:4000
// In production (Vercel), VITE_API_URL or relative /api is used
const API_BASE = import.meta.env.VITE_API_URL ? `${import.meta.env.VITE_API_URL}/api` : '/api';

export const api = {
  async searchCatalog(query: string): Promise<CatalogSearchResult[]> {
    const res = await fetch(`${API_BASE}/catalog/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error(`Search failed with status ${res.status}`);
    const data = await res.json();
    return data.items || [];
  },

  async getTrackedProducts(): Promise<Product[]> {
    const res = await fetch(`${API_BASE}/products`);
    if (!res.ok) throw new Error(`Failed to fetch tracked products: ${res.status}`);
    const data = await res.json();
    return data.products || [];
  },

  async trackProduct(item: CatalogSearchResult): Promise<Product> {
    const res = await fetch(`${API_BASE}/products`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        storeProductId: item.id,
        name: item.name,
        sku: item.sku,
        brand: item.brand,
        category: item.category,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Failed to track product: ${res.status}`);
    }
    const data = await res.json();
    return data.product;
  },

  async untrackProduct(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/products/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(`Failed to untrack product: ${res.status}`);
  },

  async getProductHistory(id: string): Promise<PriceHistoryItem[]> {
    const res = await fetch(`${API_BASE}/products/${id}/history`);
    if (!res.ok) throw new Error(`Failed to fetch history: ${res.status}`);
    const data = await res.json();
    return data.history || [];
  },

  async getProductLogs(id: string): Promise<ScrapeLogItem[]> {
    const res = await fetch(`${API_BASE}/products/${id}/logs`);
    if (!res.ok) throw new Error(`Failed to fetch logs: ${res.status}`);
    const data = await res.json();
    return data.logs || [];
  },

  async triggerProductScrape(id: string): Promise<{ product: Product; result: any }> {
    const res = await fetch(`${API_BASE}/products/${id}/scrape`, { method: 'POST' });
    if (!res.ok) throw new Error(`On-demand scrape failed: ${res.status}`);
    return res.json();
  },

  async triggerBatchScrape(secret: string): Promise<any> {
    const res = await fetch(`${API_BASE}/scrape/trigger`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${secret}`,
        'Content-Type': 'application/json',
      },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || `Batch scrape failed: ${res.status}`);
    }
    return res.json();
  }
};
