"use client";

import React from "react";
import { AgingBucketMetric } from "@/lib/api";
import { Clock, AlertCircle } from "lucide-react";

interface AgingBreakdownProps {
  metrics: AgingBucketMetric[];
}

export const AgingBreakdown: React.FC<AgingBreakdownProps> = ({ metrics }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const getBucketColor = (bucket: string) => {
    switch (bucket) {
      case "CURRENT":
        return {
          badge: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
          bar: "bg-emerald-500",
        };
      case "1-30":
        return {
          badge: "bg-blue-500/15 text-blue-400 border-blue-500/30",
          bar: "bg-blue-500",
        };
      case "31-60":
        return {
          badge: "bg-amber-500/15 text-amber-400 border-amber-500/30",
          bar: "bg-amber-500",
        };
      case "61-90":
        return {
          badge: "bg-orange-500/15 text-orange-400 border-orange-500/30",
          bar: "bg-orange-500",
        };
      default:
        return {
          badge: "bg-rose-500/15 text-rose-400 border-rose-500/30",
          bar: "bg-rose-500",
        };
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-emerald-400" />
            Estructura de Antigüedad de Deuda (AR Aging)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Exposición nominal y pérdida esperada estocástica clasificada por mora.
          </p>
        </div>
      </div>

      <div className="space-y-4">
        {metrics.map((m) => {
          const style = getBucketColor(m.bucket);
          return (
            <div
              key={m.bucket}
              className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 hover:border-slate-700 transition"
            >
              <div className="flex justify-between items-center mb-1.5 text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className={`font-mono font-bold px-2 py-0.5 rounded border text-[11px] ${style.badge}`}
                  >
                    {m.bucket === "CURRENT" ? "Al día (Current)" : `${m.bucket} días`}
                  </span>
                  <span className="text-slate-400">({m.count} facturas)</span>
                </div>
                <div className="text-right">
                  <span className="font-bold text-white text-sm">
                    {formatCurrency(m.total_nominal)}
                  </span>
                  <span className="text-slate-400 text-[11px] ml-1.5">
                    ({m.share_of_portfolio.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Progress bar of portfolio share */}
              <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden my-2">
                <div
                  className={`h-full rounded-full ${style.bar}`}
                  style={{ width: `${Math.min(100, Math.max(2, m.share_of_portfolio))}%` }}
                />
              </div>

              <div className="flex justify-between items-center text-[11px] text-slate-400 pt-1 border-t border-slate-900">
                <span className="flex items-center gap-1">
                  Mora media: <strong className="text-slate-300">{m.avg_days_past_due.toFixed(0)} días</strong>
                </span>
                <span className="text-rose-400 font-semibold flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  Pérdida Esperada: {formatCurrency(m.expected_loss)} ({m.loss_percentage.toFixed(1)}%)
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
