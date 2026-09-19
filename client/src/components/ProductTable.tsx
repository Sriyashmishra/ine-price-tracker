import React from 'react';
import { RefreshCw, Trash2, LineChart, FileText, ExternalLink, AlertCircle, CheckCircle2 } from 'lucide-react';
import { Product } from '../types/index.js';

interface ProductTableProps {
  products: Product[];
  selectedProductId: string | null;
  onSelectProduct: (product: Product) => void;
  onViewLogs: (product: Product) => void;
  onScrapeNow: (product: Product) => void;
  onUntrack: (product: Product) => void;
  scrapingIds: Set<string>;
}

export const ProductTable: React.FC<ProductTableProps> = ({
  products,
  selectedProductId,
  onSelectProduct,
  onViewLogs,
  onScrapeNow,
  onUntrack,
  scrapingIds,
}) => {
  if (products.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-2xl bg-blue-500/10 text-blue-400 mx-auto flex items-center justify-center mb-3">
          <LineChart className="w-6 h-6" />
        </div>
        <h3 className="text-base font-bold text-white">No Products Tracked Yet</h3>
        <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1 mb-4">
          Click "Search & Track Product" above to search INE's mock storefront and monitor prices on schedule.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-sm">
      <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-white">Tracked Products</h2>
          <p className="text-xs text-slate-400">Monitoring prices & stock automatically on a 2-hour schedule</p>
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 bg-slate-800 border border-slate-700 text-slate-300 rounded-lg">
          {products.length} Active
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800/80 bg-slate-950/40 text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              <th className="py-3 px-4 sm:px-6">Product</th>
              <th className="py-3 px-4">Price</th>
              <th className="py-3 px-4">Stock Status</th>
              <th className="py-3 px-4">Last Scraped</th>
              <th className="py-3 px-4">Health</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/40 text-sm">
            {products.map(product => {
              const isSelected = selectedProductId === product.id;
              const isScraping = scrapingIds.has(product.id);

              const lastScrapedDate = product.last_scraped_at
                ? new Date(product.last_scraped_at)
                : null;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-slate-800/40 transition group ${
                    isSelected ? 'bg-blue-600/10 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  {/* Product Info */}
                  <td className="py-4 px-4 sm:px-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700/60">
                        {product.category || 'Item'}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">#{product.sku}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="font-semibold text-white group-hover:text-blue-400 transition text-left mt-0.5 block truncate max-w-xs sm:max-w-md"
                    >
                      {product.name}
                    </button>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] text-slate-400 hover:text-slate-300 inline-flex items-center space-x-1 mt-0.5"
                    >
                      <span>Store Listing</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </td>

                  {/* Price */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {product.current_price !== null ? (
                      <span className="font-bold text-base text-white">
                        ₹{product.current_price.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400 italic">Pending scrape...</span>
                    )}
                  </td>

                  {/* Stock Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {product.is_in_stock ? (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{product.stock_status || 'In Stock'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-xs font-medium bg-rose-500/10 text-rose-400 border border-rose-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Out of Stock</span>
                      </span>
                    )}
                  </td>

                  {/* Last Scraped */}
                  <td className="py-4 px-4 whitespace-nowrap text-xs text-slate-400">
                    {lastScrapedDate ? (
                      <div>
                        <span className="text-slate-200">
                          {lastScrapedDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-slate-400 block text-[11px]">
                          {lastScrapedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-slate-400">Never</span>
                    )}
                  </td>

                  {/* Scrape Status */}
                  <td className="py-4 px-4 whitespace-nowrap">
                    {product.last_scrape_status === 'SUCCESS' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Healthy</span>
                      </span>
                    )}
                    {product.last_scrape_status === 'FAILED' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-400">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                    {(!product.last_scrape_status || product.last_scrape_status === 'PENDING') && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-4 px-4 sm:px-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        title="View Price Trend Chart"
                        className={`p-2 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-blue-600 text-white border-blue-500'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                        }`}
                      >
                        <LineChart className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewLogs(product)}
                        title="View Scrape Audit Logs"
                        className="p-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700 hover:bg-slate-700 transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onScrapeNow(product)}
                        disabled={isScraping}
                        title="Scrape This Product Now"
                        className="p-2 rounded-lg text-xs font-medium bg-slate-800 text-blue-400 border border-slate-700 hover:bg-slate-700 transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onUntrack(product)}
                        title="Untrack Product"
                        className="p-2 rounded-lg text-xs font-medium bg-slate-800 text-slate-400 border border-slate-700 hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
