import React, { useState, useEffect } from 'react';
import { Search, X, Check, Loader2, ExternalLink, Plus } from 'lucide-react';
import { api } from '../services/api.js';
import { CatalogSearchResult, Product } from '../types/index.js';

interface ProductSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductTracked: (product: Product) => void;
  trackedProductIds: Set<number>;
}

export const ProductSearchModal: React.FC<ProductSearchModalProps> = ({
  isOpen,
  onClose,
  onProductTracked,
  trackedProductIds,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<CatalogSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [trackingId, setTrackingId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Search catalog when query changes
  useEffect(() => {
    if (!isOpen) return;

    const timer = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const items = await api.searchCatalog(query);
        setResults(items);
      } catch (err: any) {
        setError(err.message || 'Failed to search catalog');
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query, isOpen]);

  if (!isOpen) return null;

  const handleTrack = async (item: CatalogSearchResult) => {
    setTrackingId(item.id);
    try {
      const product = await api.trackProduct(item);
      onProductTracked(product);
    } catch (err: any) {
      alert(`Error tracking product: ${err.message}`);
    } finally {
      setTrackingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-white">Search INE Mock Store</h2>
            <p className="text-xs text-slate-400">Search by product name, SKU, brand, or category</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-slate-800 bg-slate-900/50">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="e.g. Domus Slimbook, Larkspur, Vantablack..."
              autoFocus
              className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-sm text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-blue-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5 divide-y divide-slate-800/40">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              {error}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-12 text-slate-500 text-sm">
              No products found matching "{query}"
            </div>
          )}

          {results.map(item => {
            const isTracked = trackedProductIds.has(item.id);
            const isTracking = trackingId === item.id;

            return (
              <div
                key={item.id}
                className="pt-2.5 first:pt-0 flex items-center justify-between gap-4 p-3 rounded-xl hover:bg-slate-800/50 transition group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-400">{item.brand}</span>
                    <span className="text-xs text-slate-500 font-mono">#{item.sku}</span>
                  </div>
                  <h3 className="font-medium text-sm text-white truncate group-hover:text-blue-400 transition">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{item.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={`https://demo.inelabteamdev.com/product/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View product in mock store"
                    className="p-2 text-slate-400 hover:text-slate-200 rounded-lg hover:bg-slate-700/50 transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {isTracked ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-medium rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      <span>Tracking</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTrack(item)}
                      disabled={isTracking}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50"
                    >
                      {isTracking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>Track</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
