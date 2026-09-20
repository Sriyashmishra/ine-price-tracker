import React, { useState } from 'react';
import { Search, RefreshCw, Activity } from 'lucide-react';
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
    <header className="bg-[#0c1017]/90 backdrop-blur-md border-b border-[#1c2436] sticky top-0 z-30 shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center space-x-3.5">
          <div className="w-9 h-9 rounded-lg bg-[#141b27] border border-[#232f46] flex items-center justify-center text-emerald-400 font-extrabold text-sm tracking-wider shadow-inner">
            <Activity className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-base tracking-tight text-white font-sans">
                INE <span className="text-emerald-400 font-semibold">PRICETRACK</span>
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-mono font-medium bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse mr-1.5" />
                TELEMETRY ACTIVE
              </span>
            </div>
            <p className="text-[11px] text-zinc-400 font-normal">Resilient Autonomous Price & Stock Surveillance</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          {batchMsg && (
            <span className="text-xs bg-[#141b27] border border-[#232f46] text-emerald-300 px-3 py-1.5 rounded-lg shadow-sm font-mono text-[11px]">
              {batchMsg}
            </span>
          )}

          <button
            type="button"
            onClick={handleTriggerBatch}
            disabled={isTriggeringBatch || trackedCount === 0}
            title="Simulate scheduled cron trigger across all tracked products"
            className="flex items-center space-x-2 px-3.5 py-2 text-xs font-medium bg-[#131924] hover:bg-[#1c2436] text-zinc-200 border border-[#232f46] rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isTriggeringBatch ? 'animate-spin text-emerald-400' : 'text-zinc-400'}`} />
            <span>{isTriggeringBatch ? 'Batch Running...' : 'Trigger Cron Scrape'}</span>
          </button>

          <button
            type="button"
            onClick={onOpenSearch}
            className="flex items-center space-x-2 px-4 py-2 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-lg shadow-emerald-950/40 transition active:scale-[0.98] border border-emerald-500/30"
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search & Track Product</span>
          </button>
        </div>
      </div>
    </header>
  );
};
