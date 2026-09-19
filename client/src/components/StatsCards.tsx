import React from 'react';
import { Package, TrendingUp, CheckCircle, Clock } from 'lucide-react';
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
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Tracked Items
          </span>
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center">
            <Package className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{total}</span>
          <span className="text-xs text-slate-400">products</span>
        </div>
      </div>

      {/* In Stock */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            In Stock
          </span>
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
            <CheckCircle className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{inStock}</span>
          <span className="text-xs text-slate-400">available now</span>
        </div>
      </div>

      {/* Scrape Success Rate */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Health & Accuracy
          </span>
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
            <TrendingUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">{successRate}%</span>
          <span className="text-xs text-slate-400">unattended reliability</span>
        </div>
      </div>

      {/* Scrape Schedule */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Scrape Schedule
          </span>
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline space-x-2">
          <span className="text-2xl font-bold text-white">Every 2h</span>
          <span className="text-xs text-slate-400">via cron-job.org</span>
        </div>
      </div>
    </div>
  );
};
