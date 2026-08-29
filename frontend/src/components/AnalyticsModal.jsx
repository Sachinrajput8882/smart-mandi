import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { X, BarChart3, Users, Scale, CheckCircle2, TrendingUp, Wheat } from 'lucide-react';

export default function AnalyticsModal({ isOpen, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isOpen) return;
    const fetchStats = async () => {
      try {
        setLoading(true);
        const res = await api.getAnalytics();
        setData(res.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 max-w-2xl w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 text-white px-6 py-5 flex items-center justify-between">
          <div className="flex items-center space-x-2.5">
            <BarChart3 className="w-6 h-6 text-emerald-300" />
            <div>
              <h3 className="font-bold text-lg">Mandi Procurement Analytics</h3>
              <p className="text-xs text-emerald-200">Daily MSP Procurement Dashboard</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {loading || !data ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Loading Mandi analytics data...
            </div>
          ) : (
            <>
              {/* Primary Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold uppercase">
                    <Users className="w-4 h-4 text-emerald-600" />
                    <span>Total Farmers</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-2">
                    {data.totalFarmers}
                  </div>
                  <span className="text-[11px] text-emerald-700 mt-1 block font-medium">
                    {data.farmersToday} scheduled today
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold uppercase">
                    <Scale className="w-4 h-4 text-blue-600" />
                    <span>Procured (Qtl)</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-slate-900 mt-2">
                    {data.totalQuintalsProcured}
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                    of {data.totalQuintalsRegistered} Qtl registered
                  </span>
                </div>

                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 col-span-2 sm:col-span-1">
                  <div className="flex items-center space-x-1.5 text-xs text-slate-500 font-semibold uppercase">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Served Ratio</span>
                  </div>
                  <div className="text-3xl font-black font-mono text-emerald-700 mt-2">
                    {data.totalFarmers > 0
                      ? Math.round((data.doneCount / data.totalFarmers) * 100)
                      : 0}%
                  </div>
                  <span className="text-[11px] text-slate-500 mt-1 block font-medium">
                    {data.doneCount} of {data.totalFarmers} completed
                  </span>
                </div>
              </div>

              {/* Crop Breakdown */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center space-x-1.5">
                  <Wheat className="w-4 h-4 text-emerald-600" />
                  <span>Crop Distribution (Quintals)</span>
                </h4>
                <div className="space-y-2.5">
                  {Object.entries(data.cropBreakdown || {}).map(([crop, qty]) => {
                    const pct = data.totalQuintalsRegistered > 0
                      ? Math.round((qty / data.totalQuintalsRegistered) * 100)
                      : 0;
                    return (
                      <div key={crop} className="space-y-1">
                        <div className="flex justify-between text-xs font-semibold text-slate-700">
                          <span>{crop}</span>
                          <span className="font-mono">{qty} Qtl ({pct}%)</span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                          <div
                            className="bg-emerald-600 h-2.5 rounded-full transition-all duration-500"
                            style={{ width: `${pct}%` }}
                          ></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Queue Status Flow Summary */}
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-wrap justify-between gap-3 text-center text-xs">
                <div>
                  <span className="text-slate-400 block font-medium">Waiting</span>
                  <strong className="text-lg font-mono text-amber-600">{data.waitingCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Called</span>
                  <strong className="text-lg font-mono text-blue-600">{data.calledCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Processing</span>
                  <strong className="text-lg font-mono text-orange-600">{data.processingCount}</strong>
                </div>
                <div>
                  <span className="text-slate-400 block font-medium">Completed</span>
                  <strong className="text-lg font-mono text-emerald-600">{data.doneCount}</strong>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="bg-slate-50 px-6 py-4 border-t border-slate-200 text-right">
          <button
            onClick={onClose}
            className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
