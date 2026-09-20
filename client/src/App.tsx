import React, { useState, useEffect, useCallback } from 'react';
import { Navbar } from './components/Navbar.js';
import { StatsCards } from './components/StatsCards.js';
import { ProductTable } from './components/ProductTable.js';
import { PriceChart } from './components/PriceChart.js';
import { ScrapeLogsModal } from './components/ScrapeLogsModal.js';
import { ProductSearchModal } from './components/ProductSearchModal.js';
import { api } from './services/api.js';
import { Product, PriceHistoryItem, ScrapeLogItem } from './types/index.js';
import { Loader2, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  // Selected product ID for chart view
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  const [priceHistory, setPriceHistory] = useState<PriceHistoryItem[]>([]);
  const [loadingHistory, setLoadingHistory] = useState<boolean>(false);

  // Selected product for logs modal
  const [logsProduct, setLogsProduct] = useState<Product | null>(null);
  const [scrapeLogs, setScrapeLogs] = useState<ScrapeLogItem[]>([]);

  // Set of product IDs currently undergoing scrape
  const [scrapingIds, setScrapingIds] = useState<Set<string>>(new Set());

  // Load tracked products
  const fetchProducts = useCallback(async () => {
    try {
      const data = await api.getTrackedProducts();
      setProducts(data);
      setSelectedProductId(prev => prev || (data.length > 0 ? data[0].id : null));
    } catch (err: any) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial fetch and 30-second background polling
  useEffect(() => {
    fetchProducts();
    const interval = setInterval(fetchProducts, 30000);
    return () => clearInterval(interval);
  }, [fetchProducts]);

  // Derived selected product
  const selectedProduct = products.find(p => p.id === selectedProductId) || (products.length > 0 ? products[0] : null);

  // Load history when selected product changes
  useEffect(() => {
    if (!selectedProduct) {
      setPriceHistory([]);
      return;
    }

    let isCurrent = true;
    setLoadingHistory(true);

    api
      .getProductHistory(selectedProduct.id)
      .then(hist => {
        if (isCurrent) setPriceHistory(hist);
      })
      .catch(console.error)
      .finally(() => {
        if (isCurrent) setLoadingHistory(false);
      });

    return () => {
      isCurrent = false;
    };
  }, [selectedProduct?.id]);

  // Handle on-demand scrape for an individual product
  const handleScrapeNow = async (product: Product) => {
    setScrapingIds(prev => new Set(prev).add(product.id));
    try {
      await api.triggerProductScrape(product.id);
      await fetchProducts();
      if (selectedProduct?.id === product.id) {
        const hist = await api.getProductHistory(product.id);
        setPriceHistory(hist);
      }
    } catch (err: any) {
      alert(`Scrape error: ${err.message}`);
    } finally {
      setScrapingIds(prev => {
        const next = new Set(prev);
        next.delete(product.id);
        return next;
      });
    }
  };

  // Handle viewing audit logs
  const handleViewLogs = async (product: Product) => {
    setLogsProduct(product);
    try {
      const logs = await api.getProductLogs(product.id);
      setScrapeLogs(logs);
    } catch (err: any) {
      console.error('Failed to fetch logs:', err);
    }
  };

  // Handle product untrack / delete
  const handleUntrack = async (product: Product) => {
    if (!window.confirm(`Stop tracking and remove history for "${product.name}"?`)) {
      return;
    }
    try {
      await api.untrackProduct(product.id);
      if (selectedProductId === product.id) {
        setSelectedProductId(null);
      }
      await fetchProducts();
    } catch (err: any) {
      alert(`Failed to delete: ${err.message}`);
    }
  };

  const trackedProductIds = new Set(products.map(p => p.store_product_id));

  return (
    <div className="min-h-screen bg-[#080a0f] text-zinc-100 flex flex-col selection:bg-emerald-500/20 selection:text-emerald-200">
      {/* Header / Navbar */}
      <Navbar
        onOpenSearch={() => setIsSearchOpen(true)}
        onRefreshProducts={fetchProducts}
        trackedCount={products.length}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Metric Cards */}
        <StatsCards products={products} />

        {/* Loading Spinner for Initial Load */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-24 text-zinc-400">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400 mb-3" />
            <p className="text-xs font-mono text-zinc-400">CONNECTING TO REPOSITORY & INGESTING TRACKED ASSETS...</p>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Price Chart Section (shown if a product is selected) */}
            {selectedProduct && (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-xs font-semibold uppercase tracking-wider text-zinc-400 font-mono">
                    Live Price History & Trends
                  </h2>
                  {loadingHistory && (
                    <span className="text-xs text-emerald-400 flex items-center space-x-1 font-mono">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Syncing timeseries...</span>
                    </span>
                  )}
                </div>
                <PriceChart product={selectedProduct} history={priceHistory} />
              </section>
            )}

            {/* Tracked Products Table */}
            <section>
              <ProductTable
                products={products}
                selectedProductId={selectedProduct?.id || null}
                onSelectProduct={p => setSelectedProductId(p.id)}
                onViewLogs={handleViewLogs}
                onScrapeNow={handleScrapeNow}
                onUntrack={handleUntrack}
                scrapingIds={scrapingIds}
              />
            </section>
          </div>
        )}
      </main>

      {/* Product Search & Track Modal */}
      <ProductSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onProductTracked={newProd => {
          fetchProducts();
          setSelectedProductId(newProd.id);
          setIsSearchOpen(false);
        }}
        trackedProductIds={trackedProductIds}
      />

      {/* Honest Scrape Logs Modal */}
      {logsProduct && (
        <ScrapeLogsModal
          isOpen={Boolean(logsProduct)}
          onClose={() => setLogsProduct(null)}
          product={logsProduct}
          logs={scrapeLogs}
        />
      )}

      {/* Footer */}
      <footer className="border-t border-[#1a2333] bg-[#0c1017]/80 backdrop-blur-md py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-zinc-400 gap-2">
          <p>
            INE Software Engineer Intern Assignment — Built by{' '}
            <span className="text-emerald-400 font-semibold">Sriyash Mishra</span>
          </p>
          <p className="text-zinc-500 font-mono text-[11px]">
            Playwright Stealth Scraper • PostgreSQL Dual Storage Engine
          </p>
        </div>
      </footer>
    </div>
  );
};
export default App;
