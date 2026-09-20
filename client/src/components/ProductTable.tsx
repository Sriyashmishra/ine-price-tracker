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
      <div className="bg-[#0e131d] border border-[#1c2538] rounded-xl p-12 text-center shadow-sm">
        <div className="w-12 h-12 rounded-xl bg-[#151d2c] text-emerald-400 border border-emerald-500/20 mx-auto flex items-center justify-center mb-3">
          <LineChart className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-semibold text-white font-mono uppercase tracking-wider">No Monitored Assets</h3>
        <p className="text-xs text-zinc-400 max-w-sm mx-auto mt-1 mb-4">
          Click "Search & Track Product" to ingest SKUs from the mock storefront and activate surveillance.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-[#0e131d] border border-[#1c2538] rounded-xl overflow-hidden shadow-md">
      <div className="p-4 sm:p-5 border-b border-[#1c2538] flex items-center justify-between bg-[#0b0f17]">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-wider text-white font-mono">Monitored Inventory</h2>
          <p className="text-xs text-zinc-400 mt-0.5">Real-time telemetry and periodic quote resolution</p>
        </div>
        <span className="text-[11px] font-mono font-medium px-2.5 py-1 bg-[#141a26] border border-[#232c3f] text-emerald-400 rounded-md">
          {products.length} SKUs TRACKED
        </span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-[#1c2538] bg-[#090d14] text-[10px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
              <th className="py-3 px-4 sm:px-6">Product & Identifiers</th>
              <th className="py-3 px-4">Current Quote</th>
              <th className="py-3 px-4">Inventory Status</th>
              <th className="py-3 px-4">Last Telemetry</th>
              <th className="py-3 px-4">Engine State</th>
              <th className="py-3 px-4 sm:px-6 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#182030] text-xs">
            {products.map(product => {
              const isSelected = selectedProductId === product.id;
              const isScraping = scrapingIds.has(product.id);

              const lastScrapedDate = product.last_scraped_at
                ? new Date(product.last_scraped_at)
                : null;

              return (
                <tr
                  key={product.id}
                  className={`hover:bg-[#121926]/70 transition group ${
                    isSelected ? 'bg-[#131c2b] border-l-2 border-l-emerald-400' : ''
                  }`}
                >
                  {/* Product Info */}
                  <td className="py-3.5 px-4 sm:px-6">
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#141a26] text-zinc-300 border border-[#232c3f] font-mono">
                        {product.category || 'ITEM'}
                      </span>
                      <span className="text-[11px] text-zinc-400 font-mono">#{product.sku}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => onSelectProduct(product)}
                      className="font-medium text-white group-hover:text-emerald-400 transition text-left mt-1 block truncate max-w-xs sm:max-w-md text-sm"
                    >
                      {product.name}
                    </button>
                    <a
                      href={product.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] text-zinc-400 hover:text-emerald-400 inline-flex items-center space-x-1 mt-0.5 transition font-mono"
                    >
                      <span>STORE URL</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </td>

                  {/* Price */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {product.current_price !== null ? (
                      <span className="font-mono font-bold text-sm text-white">
                        ₹{product.current_price.toLocaleString('en-IN')}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-400 italic font-mono">Resolving...</span>
                    )}
                  </td>

                  {/* Stock Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {product.is_in_stock ? (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        <span>{product.stock_status || 'In Stock'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-rose-500/10 text-rose-300 border border-rose-500/25">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>Out of Stock</span>
                      </span>
                    )}
                  </td>

                  {/* Last Scraped */}
                  <td className="py-3.5 px-4 whitespace-nowrap text-xs text-zinc-400 font-mono">
                    {lastScrapedDate ? (
                      <div>
                        <span className="text-zinc-200">
                          {lastScrapedDate.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })}
                        </span>
                        <span className="text-zinc-400 block text-[10px]">
                          {lastScrapedDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <span className="italic text-zinc-400">Never</span>
                    )}
                  </td>

                  {/* Scrape Status */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    {product.last_scrape_status === 'SUCCESS' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-emerald-400 font-mono">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolved</span>
                      </span>
                    )}
                    {product.last_scrape_status === 'FAILED' && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-rose-400 font-mono">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Failed</span>
                      </span>
                    )}
                    {(!product.last_scrape_status || product.last_scrape_status === 'PENDING') && (
                      <span className="inline-flex items-center space-x-1 text-xs font-semibold text-amber-400 font-mono">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                        <span>Pending</span>
                      </span>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 sm:px-6 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end space-x-1.5">
                      <button
                        type="button"
                        onClick={() => onSelectProduct(product)}
                        title="View Price Trend Chart"
                        className={`p-2 rounded-lg text-xs font-medium border transition ${
                          isSelected
                            ? 'bg-emerald-600 text-white border-emerald-500 shadow-sm'
                            : 'bg-[#141b27] text-zinc-300 border-[#222d42] hover:bg-[#1a2333] hover:text-white'
                        }`}
                      >
                        <LineChart className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onViewLogs(product)}
                        title="View Scrape Audit Logs"
                        className="p-2 rounded-lg text-xs font-medium bg-[#141b27] text-zinc-300 border-[#222d42] hover:bg-[#1a2333] hover:text-white transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </button>

                      <button
                        type="button"
                        onClick={() => onScrapeNow(product)}
                        disabled={isScraping}
                        title="Scrape This Product Now"
                        className="p-2 rounded-lg text-xs font-medium bg-[#141b27] text-cyan-400 border-[#222d42] hover:bg-[#1a2333] transition disabled:opacity-50"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${isScraping ? 'animate-spin' : ''}`} />
                      </button>

                      <button
                        type="button"
                        onClick={() => onUntrack(product)}
                        title="Untrack Product"
                        className="p-2 rounded-lg text-xs font-medium bg-[#141b27] text-zinc-400 border-[#222d42] hover:text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition"
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
