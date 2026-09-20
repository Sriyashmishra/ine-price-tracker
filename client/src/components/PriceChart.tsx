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
      <div className="bg-[#0e131d] border border-[#1c2538] rounded-xl p-8 text-center">
        <p className="text-zinc-400 text-xs font-mono">NO HISTORICAL PRICE POINTS FOR THIS SKU YET</p>
        <p className="text-[11px] text-zinc-500 mt-1">Execute an on-demand telemetry scrape to record the first price quote.</p>
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
    <div className="bg-[#0e131d] border border-[#1c2538] rounded-xl p-6 shadow-md">
      {/* Chart Header & Summary Pills */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#141a26] text-emerald-300 border border-emerald-500/25 font-mono">
              {product.category || 'ASSET'}
            </span>
            <span className="text-xs text-zinc-400 font-mono">#{product.sku}</span>
          </div>
          <h3 className="text-base font-bold text-white mt-1.5 font-sans tracking-tight">{product.name}</h3>
          <p className="text-xs text-zinc-400 font-mono">Time-series price trajectory across unattended scrape runs</p>
        </div>

        {/* Stats Row */}
        <div className="flex items-center gap-2.5">
          <div className="bg-[#131924] border border-[#212b3e] rounded-lg px-3.5 py-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">Current</span>
              {priceDiff < 0 ? (
                <span className="flex items-center text-[10px] text-emerald-400 font-semibold font-mono">
                  <TrendingDown className="w-3 h-3 mr-0.5" />
                  -₹{Math.abs(priceDiff).toLocaleString('en-IN')}
                </span>
              ) : priceDiff > 0 ? (
                <span className="flex items-center text-[10px] text-rose-400 font-semibold font-mono">
                  <TrendingUp className="w-3 h-3 mr-0.5" />
                  +₹{priceDiff.toLocaleString('en-IN')}
                </span>
              ) : (
                <span className="flex items-center text-[10px] text-zinc-400">
                  <Minus className="w-3 h-3" />
                </span>
              )}
            </div>
            <span className="text-sm font-bold text-white font-mono">₹{currentPrice.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-[#131924] border border-[#212b3e] rounded-lg px-3.5 py-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">Lowest</span>
            <span className="text-sm font-bold text-emerald-400 font-mono">₹{minPrice.toLocaleString('en-IN')}</span>
          </div>

          <div className="bg-[#131924] border border-[#212b3e] rounded-lg px-3.5 py-2">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block font-mono">Highest</span>
            <span className="text-sm font-bold text-amber-400 font-mono">₹{maxPrice.toLocaleString('en-IN')}</span>
          </div>
        </div>
      </div>

      {/* Chart Area */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
            <defs>
              <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#1c2538" opacity={0.7} />
            <XAxis
              dataKey="timeLabel"
              stroke="#526079"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: '#1c2538' }}
            />
            <YAxis
              stroke="#526079"
              fontSize={11}
              fontFamily="monospace"
              tickLine={false}
              axisLine={{ stroke: '#1c2538' }}
              tickFormatter={val => `₹${val.toLocaleString('en-IN')}`}
              domain={['dataMin - 100', 'dataMax + 100']}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const data = payload[0].payload;
                  return (
                    <div className="bg-[#0b0f17] border border-[#232f46] p-3 rounded-lg shadow-2xl text-xs font-mono">
                      <p className="text-zinc-400 text-[11px]">{data.dateLabel} at {data.timeLabel}</p>
                      <p className="text-sm font-bold text-emerald-400 mt-1">₹{data.price.toLocaleString('en-IN')}</p>
                      <p className="text-[10px] text-zinc-300 mt-0.5">
                        Stock: <span className={data.inStock ? 'text-emerald-400' : 'text-rose-400'}>{data.stockStatus}</span>
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
              stroke="#10b981"
              strokeWidth={2.2}
              fillOpacity={1}
              fill="url(#priceGradient)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
