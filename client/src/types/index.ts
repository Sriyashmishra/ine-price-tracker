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

export interface CatalogSearchResult {
  id: number;
  slug: string;
  name: string;
  brand: string;
  category: string;
  sku: string;
  description: string;
}
