import React from 'react';
import { X, CheckCircle2, AlertCircle, RefreshCw, Clock } from 'lucide-react';
import { ScrapeLogItem, Product } from '../types/index.js';

interface ScrapeLogsModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product;
  logs: ScrapeLogItem[];
}

export const ScrapeLogsModal: React.FC<ScrapeLogsModalProps> = ({
  isOpen,
  onClose,
  product,
  logs,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#0c1017] border border-[#1c2538] rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-[#1c2538] flex items-center justify-between bg-[#090d14]">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-[#141a26] text-emerald-400 border border-emerald-500/20 font-mono">
                TELEMETRY AUDIT
              </span>
              <span className="text-xs text-zinc-400 font-mono">#{product.sku}</span>
            </div>
            <h2 className="text-base font-bold text-white mt-1 font-sans">
              Execution Ledger: {product.name}
            </h2>
            <p className="text-xs text-zinc-400 font-mono mt-0.5">
              Chronological ledger of unattended and manual telemetry runs
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-[#161f2e] transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Logs Table */}
        <div className="flex-1 overflow-y-auto p-5">
          {logs.length === 0 ? (
            <div className="text-center py-12 text-zinc-500 text-xs font-mono">
              NO AUDIT ENTRIES RECORDED FOR THIS ASSET YET.
            </div>
          ) : (
            <div className="space-y-3">
              {logs.map(log => {
                const date = new Date(log.created_at);
                const isSuccess = log.status === 'SUCCESS';
                const isRetried = log.status === 'RETRIED';

                return (
                  <div
                    key={log.id}
                    className={`p-4 rounded-xl border transition ${
                      isSuccess
                        ? 'bg-[#101622] border-[#1c2538] hover:border-emerald-500/35'
                        : isRetried
                        ? 'bg-[#181510] border-amber-500/20 hover:border-amber-500/40'
                        : 'bg-[#1a0f12] border-rose-500/20 hover:border-rose-500/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      {/* Status Tag */}
                      <div className="flex items-center space-x-3">
                        {isSuccess && (
                          <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shrink-0">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        {isRetried && (
                          <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center shrink-0">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                        )}
                        {!isSuccess && !isRetried && (
                          <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
                            <AlertCircle className="w-4 h-4" />
                          </div>
                        )}

                        <div>
                          <div className="flex items-center space-x-2">
                            <span
                              className={`text-xs font-bold uppercase tracking-wider font-mono ${
                                isSuccess
                                  ? 'text-emerald-400'
                                  : isRetried
                                  ? 'text-amber-400'
                                  : 'text-rose-400'
                              }`}
                            >
                              {log.status}
                            </span>
                            <span className="text-xs text-zinc-400 font-mono">
                              (Attempt {log.attempt_number})
                            </span>
                          </div>
                          <span className="text-[11px] text-zinc-400 flex items-center space-x-1 mt-0.5 font-mono">
                            <Clock className="w-3 h-3 inline" />
                            <span>
                              {date.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' })} at{' '}
                              {date.toLocaleTimeString('en-IN')}
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Right Details */}
                      <div className="text-right">
                        {isSuccess && log.extracted_price && (
                          <div>
                            <span className="text-sm font-bold text-white font-mono">
                              ₹{log.extracted_price.toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-zinc-400 block font-mono">
                              {log.extracted_stock || 'In Stock'}
                            </span>
                          </div>
                        )}
                        {log.duration_ms !== undefined && (
                          <span className="text-[11px] font-mono text-zinc-400 block mt-0.5">
                            {log.duration_ms}ms latency
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Error Description (if any) */}
                    {log.error_message && (
                      <div className="mt-2.5 pt-2 border-t border-[#231518] text-xs font-mono text-rose-300 bg-rose-950/20 p-2.5 rounded-lg border border-rose-900/30">
                        Diagnostics: {log.error_message}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
