import React from 'react';
import {
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Area,
  AreaChart,
} from 'recharts';
import { PriceHistoryItem, Product } from '../types/index.js';
import { TrendingDown, TrendingUp, Minus } from 'lucide-react';

interface PriceChartProps {
  product: Product;
  history: PriceHistoryItem[];
}

export const PriceChart: React.FC<PriceChartProps> = ({ product, history }) => {
  if (history.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-8 text-center">
        <p className="text-slate-400 text-sm">No price history points recorded yet for this product.</p>
        <p className="text-xs text-slate-500 mt-1">Run an on-demand scrape to record the first price point.</p>
      </div>
    );
  }

  // Format data points for recharts
  const chartData = history.map(item => {
    const d = new Date(item.scraped_at);
    return {
      timestamp: item.scraped_at,
      dateLabel: d.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }),
      timeLabel: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
      price: item.price,
      stockStatus: item.stock_status,
      inStock: item.is_in_stock,
    };
  });

  const prices = history.map(h => h.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const currentPrice = product.current_price ?? prices[prices.length - 1];
  const firstPrice = prices[0];
  const priceDiff = currentPrice - firstPrice;

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-sm">
      {/* Chart Header & Summary Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">
              {product.category || 'Product'}
            </span>
            <span className="text-xs text-slate-400 font-mono">#{product.sku}</span>
          </div>
          <h3 className="text-lg font-bold text-white mt-1">{product.name}</h3>
          <p className="text-xs text-slate-400">Price trend across unattended scrape runs</p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Current</span>
              {priceDiff < 0 ? (
                <span className="flex items-center text-[10px] text-emerald-400 font-semibold">
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  -₹{Math.abs(priceDiff).toLocaleString('en-IN')}
                </span>
              ) : priceDiff > 0 ? (
                <span className="flex items-center text-[10px] text-rose-400 font-semibold">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  +₹{priceDiff.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="flex items-center text-[10px] text-slate-400">
                  <Minus className="w-3 h-3" />
                </span>
              )}
            </div>
            <span className="text-base font-bold text-white">₹{currentPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Lowest</span>
            <span className="text-base font-bold text-emerald-400">₹{minPrice.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 rounded-xl px-3.5 py-2">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">Highest</span>
            <span className="text-base font-bold text-amber-400">₹{maxPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="timeLabel"
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
            />
            <YAxis
              stroke="#64748b"
              fontSize={12}
              tickLine={false}
              axisLine={{ stroke: '#334155' }}
              tickFormatter={val => `₹${val}`}
              domain={['dataMin - 10', 'dataMax + 10']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-xl text-xs">
                      <p className="text-slate-400">{data.dateLabel} at {data.timeLabel}</p>
                      <p className="text-base font-bold text-blue-400 mt-1">₹{data.price.toLocaleString('en-IN')}</p>
                      <p className="text-[11px] text-slate-300 mt-0.5">
                        Stock: <span className={data.inStock ? 'text-emerald-400 font-medium' : 'text-rose-400 font-medium'}>{data.stockStatus}</span>
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey="price"
              stroke="#3b82f6"
              strokeWidth={2.5}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
