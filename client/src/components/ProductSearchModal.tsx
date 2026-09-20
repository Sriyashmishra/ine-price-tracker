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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c1017] border border-[#1c2538] rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-[#1c2538] flex items-center justify-between bg-[#090d14]">
          <div>
            <h2 className="text-base font-bold text-white font-sans">Ingest Catalog Assets</h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">Filter across 1,000 mock store items to begin price tracking</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#161f2e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Input */}
        <div className="p-4 border-b border-[#1c2538] bg-[#090d14]/70">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by SKU, brand, or name (e.g. Domus, Larkspur, Monitor)..."
              autoFocus
              className="w-full pl-10 pr-4 py-2 bg-[#121824] border border-[#222d42] rounded-lg text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition font-mono"
            />
            {loading && (
              <Loader2 className="w-4 h-4 text-emerald-400 animate-spin absolute right-3.5 top-1/2 -translate-y-1/2" />
            )}
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-mono">
              {error}
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              NO CATALOG MATCHES FOR "{query}"
            </div>
          )}

          {results.map((item, index) => {
            const isTracked = trackedProductIds.has(item.id);
            const isTracking = trackingId === item.id;

            return (
              <div
                key={`${item.id}-${item.sku || index}`}
                className="flex items-center justify-between gap-4 p-3 rounded-lg bg-[#0f141f] border border-[#1c2538] hover:border-[#27354f] transition group"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#151c2a] text-zinc-300 border border-[#232e42] font-mono">
                      {item.category}
                    </span>
                    <span className="text-xs text-zinc-400">{item.brand}</span>
                    <span className="text-xs text-zinc-400 font-mono">#{item.sku}</span>
                  </div>
                  <h3 className="font-medium text-sm text-white truncate group-hover:text-emerald-400 transition">
                    {item.name}
                  </h3>
                  <p className="text-xs text-zinc-400 line-clamp-1 mt-0.5">{item.description}</p>
                </div>

                <div className="flex items-center space-x-2 shrink-0">
                  <a
                    href={`https://demo.inelabteamdev.com/product/${item.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="View product in mock store"
                    className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-[#161f2e] transition"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>

                  {isTracked ? (
                    <span className="flex items-center space-x-1.5 px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono font-medium rounded-lg">
                      <Check className="w-3.5 h-3.5" />
                      <span>TRACKED</span>
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleTrack(item)}
                      disabled={isTracking}
                      className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition active:scale-95 disabled:opacity-50 font-mono border border-emerald-500/30"
                    >
                      {isTracking ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Plus className="w-3.5 h-3.5" />
                      )}
                      <span>TRACK</span>
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
