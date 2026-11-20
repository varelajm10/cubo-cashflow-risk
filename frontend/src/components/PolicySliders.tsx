"use client";

import React from "react";
import { SimulationPolicyParams } from "@/lib/api";
import { Sliders, RefreshCw, Zap, Shield, Flame, Activity } from "lucide-react";

interface PolicySlidersProps {
  params: SimulationPolicyParams;
  onChange: (newParams: SimulationPolicyParams) => void;
  onSimulate: () => void;
  isLoading: boolean;
}

export const PolicySliders: React.FC<PolicySlidersProps> = ({
  params,
  onChange,
  onSimulate,
  isLoading,
}) => {
  const updateField = <K extends keyof SimulationPolicyParams>(
    key: K,
    value: SimulationPolicyParams[K]
  ) => {
    onChange({ ...params, [key]: value });
  };

  const applyPreset = (preset: "baseline" | "moderate" | "severe") => {
    if (preset === "baseline") {
      onChange({
        ...params,
        stress_factor_pd: 1.0,
        macro_delay_shift: 0,
        delay_dispersion: 0.6,
      });
    } else if (preset === "moderate") {
      onChange({
        ...params,
        stress_factor_pd: 1.5,
        macro_delay_shift: 10,
        delay_dispersion: 0.8,
      });
    } else if (preset === "severe") {
      onChange({
        ...params,
        stress_factor_pd: 2.2,
        macro_delay_shift: 25,
        delay_dispersion: 1.1,
      });
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg">
      <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <Sliders className="w-4 h-4 text-emerald-400" />
          Políticas de Estrés Cuantitativo
        </h3>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
          NumPy Engine
        </span>
      </div>

      {/* Quick Stress Presets */}
      <div className="mb-5">
        <label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
          Escenarios de Mercado Predefinidos
        </label>
        <div className="grid grid-cols-3 gap-2">
          <button
            type="button"
            onClick={() => applyPreset("baseline")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              params.stress_factor_pd === 1.0 && params.macro_delay_shift === 0
                ? "bg-emerald-500/15 border-emerald-500/50 text-emerald-300"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            Base Normal
          </button>
          <button
            type="button"
            onClick={() => applyPreset("moderate")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              params.stress_factor_pd === 1.5
                ? "bg-amber-500/15 border-amber-500/50 text-amber-300"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            Estrés Moderado
          </button>
          <button
            type="button"
            onClick={() => applyPreset("severe")}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
              params.stress_factor_pd === 2.2
                ? "bg-rose-500/15 border-rose-500/50 text-rose-300"
                : "bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700"
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            Crisis Severa
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {/* Slider 1: PD Stress Factor */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Shock de Default (PD Stress):</span>
            <span className="font-mono font-bold text-amber-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              {params.stress_factor_pd.toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min="0.5"
            max="3.5"
            step="0.1"
            value={params.stress_factor_pd}
            onChange={(e) => updateField("stress_factor_pd", parseFloat(e.target.value))}
            className="w-full accent-amber-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0.5x (Expansión)</span>
            <span>1.0x (Baseline)</span>
            <span>3.5x (Recesión profunda)</span>
          </div>
        </div>

        {/* Slider 2: Systemic Delay Shift */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-slate-300 font-medium">Corrimiento Sistémico de Cobro:</span>
            <span className="font-mono font-bold text-cyan-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
              +{params.macro_delay_shift} días
            </span>
          </div>
          <input
            type="range"
            min="0"
            max="45"
            step="1"
            value={params.macro_delay_shift}
            onChange={(e) => updateField("macro_delay_shift", parseInt(e.target.value))}
            className="w-full accent-cyan-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
          />
          <div className="flex justify-between text-[10px] text-slate-500 mt-1">
            <span>0 días (A tiempo)</span>
            <span>+15 días</span>
            <span>+45 días (Restricción de crédito)</span>
          </div>
        </div>

        {/* Horizon & Simulations Grid */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          {/* Horizon Selection */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Horizonte (Días)
            </label>
            <select
              value={params.horizon_days}
              onChange={(e) => updateField("horizon_days", parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={30}>30 Días (Corto plazo)</option>
              <option value={60}>60 Días (Bimestral)</option>
              <option value={90}>90 Días (Trimestre estándar)</option>
              <option value={120}>120 Días (Cuatrimestral)</option>
            </select>
          </div>

          {/* Simulations Count */}
          <div>
            <label className="text-[11px] font-medium text-slate-400 block mb-1">
              Iteraciones Monte Carlo
            </label>
            <select
              value={params.num_simulations}
              onChange={(e) => updateField("num_simulations", parseInt(e.target.value))}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-1.5 px-2.5 text-xs text-white focus:outline-none focus:border-emerald-500"
            >
              <option value={1000}>1.000 (Rápido)</option>
              <option value={5000}>5.000 (Recomendado)</option>
              <option value={10000}>10.000 (Alta precisión)</option>
            </select>
          </div>
        </div>

        {/* Discount Rate */}
        <div>
          <div className="flex justify-between items-center text-xs mb-1">
            <span className="text-slate-400">Tasa de Descuento de Fondeo (NPV):</span>
            <span className="font-mono text-xs text-slate-300">
              {(params.discount_rate_annual * 100).toFixed(1)}% anual
            </span>
          </div>
          <input
            type="range"
            min="0.02"
            max="0.25"
            step="0.01"
            value={params.discount_rate_annual}
            onChange={(e) => updateField("discount_rate_annual", parseFloat(e.target.value))}
            className="w-full accent-emerald-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
          />
        </div>
      </div>

      {/* Trigger Simulation Button */}
      <div className="mt-5 pt-4 border-t border-slate-800">
        <button
          type="button"
          onClick={onSimulate}
          disabled={isLoading}
          className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center gap-2 text-sm disabled:opacity-50"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              Simulando 5.000 Escenarios...
            </>
          ) : (
            <>
              <Activity className="w-4 h-4" />
              Re-ejecutar Simulación Monte Carlo
            </>
          )}
        </button>
      </div>
    </div>
  );
};
