"use client";

import React from "react";
import { RiskKpis } from "@/lib/api";
import { 
  DollarSign, 
  TrendingDown, 
  AlertTriangle, 
  ShieldAlert, 
  Activity, 
  Layers 
} from "lucide-react";

interface KpiCardsProps {
  kpis: RiskKpis;
  invoicesCount: number;
  simulationsRun: number;
}

export const KpiCards: React.FC<KpiCardsProps> = ({ kpis, invoicesCount, simulationsRun }) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
      {/* Total Nominal AR */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-slate-700 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Exposición AR
          </span>
          <span className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
            <Layers className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-white tracking-tight">
            {formatCurrency(kpis.total_nominal_ar)}
          </p>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
            <span className="text-emerald-400 font-medium">{invoicesCount} facturas</span> activas
          </p>
        </div>
      </div>

      {/* Expected Collection P50 */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-emerald-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recaudación P50
          </span>
          <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
            <DollarSign className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-emerald-400 tracking-tight">
            {formatCurrency(kpis.p50_final)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Media estocástica: <span className="text-slate-200">{formatCurrency(kpis.expected_collection)}</span>
          </p>
        </div>
      </div>

      {/* CFaR 95% */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-rose-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-rose-400 uppercase tracking-wider">
            CFaR (95%)
          </span>
          <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
            <ShieldAlert className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-rose-400 tracking-tight">
            {formatCurrency(kpis.cfar_95)}
          </p>
          <p className="text-xs text-rose-300/80 mt-1">
            Déficit en el 5% de peores casos
          </p>
        </div>
      </div>

      {/* Expected Loss */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-amber-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Incobrabilidad
          </span>
          <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
            <AlertTriangle className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-amber-400 tracking-tight">
            {formatCurrency(kpis.expected_loss)}
          </p>
          <p className="text-xs text-amber-300/80 mt-1">
            {kpis.expected_loss_pct.toFixed(2)}% del saldo nominal
          </p>
        </div>
      </div>

      {/* CVaR 95% / Expected Shortfall */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-purple-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            CVaR (Tail Risk)
          </span>
          <span className="p-1.5 bg-purple-500/10 text-purple-400 rounded-lg">
            <TrendingDown className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-purple-300 tracking-tight">
            {formatCurrency(kpis.cvar_95)}
          </p>
          <p className="text-xs text-slate-400 mt-1">
            Media del 5% más adverso (P5: {formatCurrency(kpis.p5_final)})
          </p>
        </div>
      </div>

      {/* Monte Carlo Compute Performance */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 backdrop-blur shadow-sm hover:border-cyan-500/40 transition">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Motor Vectorizado
          </span>
          <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
            <Activity className="w-4 h-4" />
          </span>
        </div>
        <div className="mt-2">
          <p className="text-2xl font-black text-cyan-400 tracking-tight">
            {kpis.execution_time_ms.toFixed(1)} <span className="text-sm font-medium text-slate-400">ms</span>
          </p>
          <p className="text-xs text-slate-400 mt-1" suppressHydrationWarning>
            {simulationsRun.toLocaleString()} iteraciones NumPy
          </p>
        </div>
      </div>
    </div>
  );
};
