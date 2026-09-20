import React from 'react';
import { Package, ShieldCheck, CheckCircle2, Clock } from 'lucide-react';
import { Product } from '../types/index.js';

interface StatsCardsProps {
  products: Product[];
}

export const StatsCards: React.FC<StatsCardsProps> = ({ products }) => {
  const total = products.length;
  const inStock = products.filter(p => p.is_in_stock && p.current_price !== null).length;
  const successful = products.filter(p => p.last_scrape_status === 'SUCCESS').length;
  const successRate = total > 0 ? Math.round((successful / total) * 100) : 100;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {/* Total Tracked */}
      <div className="bg-[#0f141e] border border-[#1c2538] rounded-xl p-5 shadow-sm hover:border-[#28354f] transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            Tracked Assets
          </span>
          <div className="w-8 h-8 rounded-lg bg-[#161f30] text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white font-mono">{total}</span>
          <span className="text-xs text-zinc-400">monitored SKUs</span>
        </div>
      </div>

      {/* In Stock */}
      <div className="bg-[#0f141e] border border-[#1c2538] rounded-xl p-5 shadow-sm hover:border-[#28354f] transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            In-Stock Ratio
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-emerald-400 font-mono">{inStock}</span>
          <span className="text-xs text-zinc-400">available now</span>
        </div>
      </div>

      {/* Scrape Success Rate */}
      <div className="bg-[#0f141e] border border-[#1c2538] rounded-xl p-5 shadow-sm hover:border-[#28354f] transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            Unattended Health
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white font-mono">{successRate}%</span>
          <span className="text-xs text-zinc-400">retry resolution</span>
        </div>
      </div>

      {/* Scrape Schedule */}
      <div className="bg-[#0f141e] border border-[#1c2538] rounded-xl p-5 shadow-sm hover:border-[#28354f] transition">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 font-mono">
            Telemetry Loop
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-amber-400 font-mono">2-Hour</span>
          <span className="text-xs text-zinc-400">cron-job trigger</span>
        </div>
      </div>
    </div>
  );
};
