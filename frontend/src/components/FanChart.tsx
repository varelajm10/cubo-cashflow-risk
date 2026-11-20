"use client";

import React, { useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Area,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import { DailyPercentilePoint } from "@/lib/api";
import { TrendingUp, BarChart3, HelpCircle } from "lucide-react";

interface FanChartProps {
  data: DailyPercentilePoint[];
  horizonDays: number;
}

export const FanChart: React.FC<FanChartProps> = ({ data, horizonDays }) => {
  const [viewMode, setViewMode] = useState<"cumulative" | "daily">("cumulative");

  const formatCurrency = (val: number) => {
    if (val >= 1_000_000) {
      return `$${(val / 1_000_000).toFixed(2)}M`;
    }
    if (val >= 1_000) {
      return `$${(val / 1_000).toFixed(0)}k`;
    }
    return `$${val}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const d = payload[0].payload as DailyPercentilePoint;
      return (
        <div className="bg-slate-900/95 border border-slate-700/80 rounded-xl p-3.5 shadow-2xl backdrop-blur text-xs min-w-[210px]">
          <div className="font-bold text-slate-200 border-b border-slate-800 pb-1.5 mb-2 flex justify-between items-center">
            <span>Día {d.day} de proyección</span>
            <span className="text-[10px] text-slate-400 bg-slate-800 px-1.5 py-0.5 rounded">T+{d.day}</span>
          </div>

          {viewMode === "cumulative" ? (
            <div className="space-y-1.5 font-mono">
              <div className="flex justify-between items-center text-cyan-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  P95 (Optimista):
                </span>
                <span className="font-bold">${d.p95.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  P75 (Percentil 75):
                </span>
                <span className="font-semibold">${d.p75.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded font-bold">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  P50 (Mediana):
                </span>
                <span>${d.p50.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-amber-300">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  P25 (Percentil 25):
                </span>
                <span className="font-semibold">${d.p25.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center text-rose-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                  P5 (Escenario Adverso):
                </span>
                <span className="font-bold">${d.p5.toLocaleString()}</span>
              </div>
              <div className="border-t border-slate-800 pt-1 flex justify-between text-slate-400 text-[11px]">
                <span>Media global:</span>
                <span>${d.mean.toLocaleString()}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-1 font-mono">
              <div className="text-emerald-400 flex justify-between">
                <span>Ingreso P50 del día:</span>
                <span className="font-bold">${d.daily_cash_p50.toLocaleString()}</span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-emerald-400" />
              Abanico Estocástico de Flujo de Fondos (Fan Chart)
            </h3>
            <span className="bg-emerald-500/10 text-emerald-400 text-xs px-2.5 py-0.5 rounded-full font-medium border border-emerald-500/20">
              5.000 Trayectorias Monte Carlo
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Intervalos de confianza acumulados a {horizonDays} días con dispersión de atraso y riesgo de default por cliente.
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl border border-slate-800 self-end sm:self-auto">
          <button
            onClick={() => setViewMode("cumulative")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === "cumulative"
                ? "bg-slate-800 text-emerald-400 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            Flujo Acumulado
          </button>
          <button
            onClick={() => setViewMode("daily")}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition flex items-center gap-1.5 ${
              viewMode === "daily"
                ? "bg-slate-800 text-emerald-400 shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Cobro Diario (P50)
          </button>
        </div>
      </div>

      <div className="h-[360px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
            <defs>
              {/* Outer band gradient (P5 to P95) */}
              <linearGradient id="fanBand95" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.03} />
              </linearGradient>
              {/* Inner band gradient (P25 to P75) */}
              <linearGradient id="fanBand75" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#059669" stopOpacity={0.45} />
                <stop offset="95%" stopColor="#059669" stopOpacity={0.12} />
              </linearGradient>
              {/* Daily bars */}
              <linearGradient id="dailyBar" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#34d399" stopOpacity={0.8} />
                <stop offset="100%" stopColor="#059669" stopOpacity={0.3} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />

            <XAxis
              dataKey="day"
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={(d) => `Día ${d}`}
            />
            <YAxis
              stroke="#64748b"
              fontSize={11}
              tickLine={false}
              axisLine={{ stroke: "#334155" }}
              tickFormatter={formatCurrency}
            />

            <Tooltip content={<CustomTooltip />} />

            {viewMode === "cumulative" ? (
              <>
                {/* Confidence Area Bands */}
                <Area
                  type="monotone"
                  dataKey="p95"
                  stroke="#06b6d4"
                  strokeWidth={1}
                  strokeDasharray="4 4"
                  fill="url(#fanBand95)"
                  name="P95 (Percentil 95)"
                />
                <Area
                  type="monotone"
                  dataKey="p75"
                  stroke="#34d399"
                  strokeWidth={1}
                  strokeDasharray="2 2"
                  fill="url(#fanBand75)"
                  name="P75 (Percentil 75)"
                />
                {/* Median Solid Line */}
                <Line
                  type="monotone"
                  dataKey="p50"
                  stroke="#10b981"
                  strokeWidth={3}
                  dot={false}
                  name="P50 (Mediana Esperada)"
                />
                {/* P25 Line */}
                <Line
                  type="monotone"
                  dataKey="p25"
                  stroke="#fbbf24"
                  strokeWidth={1}
                  strokeDasharray="3 3"
                  dot={false}
                  name="P25 (Percentil 25)"
                />
                {/* P5 Line (Worst Case Tail) */}
                <Line
                  type="monotone"
                  dataKey="p5"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  dot={false}
                  name="P5 (Escenario Adverso CFaR)"
                />
              </>
            ) : (
              <Area
                type="monotone"
                dataKey="daily_cash_p50"
                stroke="#10b981"
                fill="url(#dailyBar)"
                name="Ingreso Diario P50"
              />
            )}
          </ComposedChart>
        </ResponsiveContainer>
      </div>

      {/* Legend & Key Indicators */}
      <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4 text-xs">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded"></span>
            <span className="text-slate-300 font-medium">P50 Mediana (Base)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-rose-500 rounded"></span>
            <span className="text-slate-300 font-medium">P5 Tail Risk (CFaR 95%)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-cyan-400 border-b border-dashed"></span>
            <span className="text-slate-400">P95 Escenario Favorable</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 bg-emerald-500/20 border border-emerald-500/40 rounded-sm"></span>
            <span className="text-slate-400">Banda Intercuartil P25-P75</span>
          </div>
        </div>

        <div className="text-slate-500 flex items-center gap-1">
          <HelpCircle className="w-3.5 h-3.5" />
          <span>CFaR = Distancia P50 - P5 al día {horizonDays}</span>
        </div>
      </div>
    </div>
  );
};
