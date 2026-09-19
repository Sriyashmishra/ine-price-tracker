-- Supabase Schema for INE Product Price Tracker

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Products Table
CREATE TABLE IF NOT EXISTS products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    store_product_id INT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    slug TEXT,
    brand TEXT,
    category TEXT,
    sku TEXT,
    url TEXT NOT NULL,
    current_price NUMERIC(10, 2),
    stock_status TEXT DEFAULT 'Unknown',
    is_in_stock BOOLEAN DEFAULT TRUE,
    last_scraped_at TIMESTAMPTZ,
    last_scrape_status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Price History Table (Time series data)
CREATE TABLE IF NOT EXISTS price_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    price NUMERIC(10, 2) NOT NULL,
    stock_status TEXT NOT NULL,
    is_in_stock BOOLEAN DEFAULT TRUE,
    scraped_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Scrape Logs Table (Honest logging for every attempt)
CREATE TABLE IF NOT EXISTS scrape_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    product_id UUID REFERENCES products(id) ON DELETE CASCADE,
    store_product_id INT,
    status TEXT NOT NULL CHECK (status IN ('SUCCESS', 'RETRIED', 'FAILED')),
    attempt_number INT DEFAULT 1,
    duration_ms INT,
    error_message TEXT,
    extracted_price NUMERIC(10, 2),
    extracted_stock TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_products_store_id ON products(store_product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_product_id ON price_history(product_id, scraped_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_product_id ON scrape_logs(product_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_created_at ON scrape_logs(created_at DESC);

-- Helper trigger to update updated_at automatically
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_products_updated_at ON products;
CREATE TRIGGER trg_products_updated_at
BEFORE UPDATE ON products
FOR EACH ROW
EXECUTE PROCEDURE update_updated_at_column();
