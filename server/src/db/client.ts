import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { config } from '../config.js';

export interface Product {
  id: string;
  store_product_id: number;
  name: string;
  slug?: string;
  brand?: string;
  category?: string;
  sku?: string;
  url: string;
  current_price: number | null;
  stock_status: string;
  is_in_stock: boolean;
  last_scraped_at?: string;
  last_scrape_status?: 'SUCCESS' | 'RETRIED' | 'FAILED' | 'PENDING';
  created_at: string;
  updated_at: string;
}

export interface PriceHistoryItem {
  id: string;
  product_id: string;
  price: number;
  stock_status: string;
  is_in_stock: boolean;
  scraped_at: string;
}

export interface ScrapeLogItem {
  id: string;
  product_id?: string;
  store_product_id?: number;
  status: 'SUCCESS' | 'RETRIED' | 'FAILED';
  attempt_number: number;
  duration_ms?: number;
  error_message?: string;
  extracted_price?: number;
  extracted_stock?: string;
  created_at: string;
}

// In-memory fallback if Supabase credentials are not yet supplied
class InMemoryDb {
  private products: Map<string, Product> = new Map();
  private priceHistory: PriceHistoryItem[] = [];
  private scrapeLogs: ScrapeLogItem[] = [];

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  async getProductById(id: string): Promise<Product | null> {
    return this.products.get(id) || null;
  }

  async getProductByStoreId(storeId: number): Promise<Product | null> {
    for (const p of this.products.values()) {
      if (p.store_product_id === storeId) return p;
    }
    return null;
  }

  async insertProduct(p: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    const id = `prod-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...p,
      id,
      created_at: now,
      updated_at: now,
    };
    this.products.set(id, newProduct);
    return newProduct;
  }

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    const existing = this.products.get(id);
    if (!existing) return null;
    const updated: Product = {
      ...existing,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    this.products.set(id, updated);
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    this.priceHistory = this.priceHistory.filter(h => h.product_id !== id);
    this.scrapeLogs = this.scrapeLogs.filter(l => l.product_id !== id);
    return this.products.delete(id);
  }

  async addPriceHistory(item: Omit<PriceHistoryItem, 'id' | 'scraped_at'>): Promise<PriceHistoryItem> {
    const historyItem: PriceHistoryItem = {
      ...item,
      id: `hist-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      scraped_at: new Date().toISOString(),
    };
    this.priceHistory.push(historyItem);
    return historyItem;
  }

  async getPriceHistory(productId: string): Promise<PriceHistoryItem[]> {
    return this.priceHistory
      .filter(h => h.product_id === productId)
      .sort((a, b) => new Date(a.scraped_at).getTime() - new Date(b.scraped_at).getTime());
  }

  async addScrapeLog(item: Omit<ScrapeLogItem, 'id' | 'created_at'>): Promise<ScrapeLogItem> {
    const logItem: ScrapeLogItem = {
      ...item,
      id: `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      created_at: new Date().toISOString(),
    };
    this.scrapeLogs.unshift(logItem); // latest first
    return logItem;
  }

  async getScrapeLogs(productId?: string): Promise<ScrapeLogItem[]> {
    if (productId) {
      return this.scrapeLogs.filter(l => l.product_id === productId);
    }
    return this.scrapeLogs;
  }
}

const memoryDb = new InMemoryDb();

let supabase: SupabaseClient | null = null;
const isSupabaseConfigured = Boolean(
  config.supabaseUrl &&
  config.supabaseKey &&
  !config.supabaseUrl.includes('your-project-ref')
);

if (isSupabaseConfigured) {
  try {
    supabase = createClient(config.supabaseUrl, config.supabaseKey);
    console.log('[Database] Initialized Supabase client successfully');
  } catch (err) {
    console.warn('[Database] Failed to initialize Supabase client, using fallback:', err);
  }
} else {
  console.log('[Database] Supabase credentials not found/placeholder. Using fast in-memory DB fallback for local runs.');
}

export const db = {
  isUsingSupabase: () => Boolean(supabase),

  async getProducts(): Promise<Product[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    }
    return memoryDb.getProducts();
  },

  async getProductById(id: string): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .single();
      if (error && error.code !== 'PGRST116') throw error;
      return data || null;
    }
    return memoryDb.getProductById(id);
  },

  async getProductByStoreId(storeProductId: number): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('store_product_id', storeProductId)
        .maybeSingle();
      if (error) throw error;
      return data || null;
    }
    return memoryDb.getProductByStoreId(storeProductId);
  },

  async insertProduct(p: Omit<Product, 'id' | 'created_at' | 'updated_at'>): Promise<Product> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .insert([p])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return memoryDb.insertProduct(p);
  },

  async updateProduct(id: string, updates: Partial<Product>): Promise<Product | null> {
    if (supabase) {
      const { data, error } = await supabase
        .from('products')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return memoryDb.updateProduct(id, updates);
  },

  async deleteProduct(id: string): Promise<boolean> {
    if (supabase) {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) throw error;
      return true;
    }
    return memoryDb.deleteProduct(id);
  },

  async addPriceHistory(item: Omit<PriceHistoryItem, 'id' | 'scraped_at'>): Promise<PriceHistoryItem> {
    if (supabase) {
      const { data, error } = await supabase
        .from('price_history')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return memoryDb.addPriceHistory(item);
  },

  async getPriceHistory(productId: string): Promise<PriceHistoryItem[]> {
    if (supabase) {
      const { data, error } = await supabase
        .from('price_history')
        .select('*')
        .eq('product_id', productId)
        .order('scraped_at', { ascending: true });
      if (error) throw error;
      return data || [];
    }
    return memoryDb.getPriceHistory(productId);
  },

  async addScrapeLog(item: Omit<ScrapeLogItem, 'id' | 'created_at'>): Promise<ScrapeLogItem> {
    if (supabase) {
      const { data, error } = await supabase
        .from('scrape_logs')
        .insert([item])
        .select()
        .single();
      if (error) throw error;
      return data;
    }
    return memoryDb.addScrapeLog(item);
  },

  async getScrapeLogs(productId?: string): Promise<ScrapeLogItem[]> {
    if (supabase) {
      let query = supabase.from('scrape_logs').select('*').order('created_at', { ascending: false });
      if (productId) {
        query = query.eq('product_id', productId);
      }
      const { data, error } = await query.limit(100);
      if (error) throw error;
      return data || [];
    }
    return memoryDb.getScrapeLogs(productId);
  }
};
