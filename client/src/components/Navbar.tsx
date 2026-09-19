import React, { useState } from 'react';
import { Search, RefreshCw } from 'lucide-react';
import { api } from '../services/api.js';

interface NavbarProps {
  onOpenSearch: () => void;
  onRefreshProducts: () => void;
  trackedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({
  onOpenSearch,
  onRefreshProducts,
  trackedCount,
}) => {
  const [isTriggeringBatch, setIsTriggeringBatch] = useState(false);
  const [batchMsg, setBatchMsg] = useState<string | null>(null);

  const handleTriggerBatch = async () => {
    setIsTriggeringBatch(true);
    setBatchMsg(null);
    try {
      const secret = 'ine_secure_cron_secret_key_2026';
      const result = await api.triggerBatchScrape(secret);
      setBatchMsg(`Scraped ${result.successCount}/${result.totalProducts} items`);
      onRefreshProducts();
      setTimeout(() => setBatchMsg(null), 4000);
    } catch (err: any) {
      setBatchMsg(`Trigger error: ${err.message}`);
      setTimeout(() => setBatchMsg(null), 5000);
    } finally {
      setIsTriggeringBatch(false);
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center shadow-md shadow-blue-500/20 text-white font-bold text-lg">
            INE
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">Price Tracker</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-full">
                Auto Scraper
              </span>
            </div>
            <p className="text-xs text-slate-400">INE Mock Store Resilience Engine</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {batchMsg && (
            <span className="text-xs bg-slate-800 border border-slate-700 text-slate-300 px-3 py-1.5 rounded-lg">
              {batchMsg}
            </span>
          )}

          <button
            type="button"
            onClick={handleTriggerBatch}
            disabled={isTriggeringBatch || trackedCount === 0}
            title="Simulate scheduled cron trigger across all tracked products"
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringBatch ? 'animate-spin text-blue-400' : ''}`} />
            <span>{isTriggeringBatch ? 'Scraping All...' : 'Run Scheduled Scrape'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center space-x-2 px-4 py-2 text-sm font-semibold bg-gradient-to-r from-blue-600 to-blue-500 hover:from-blue-500 hover:to-blue-400 text-white rounded-lg shadow-md shadow-blue-600/25 transition active:scale-[0.98]"
          >
            <Search className="w-4 h-4" />
            <span>Search & Track Product</span>
          </button>
        </div>
      </div>
    </header>
  );
};
