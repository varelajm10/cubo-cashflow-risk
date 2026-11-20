"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  fetchDemoData,
  runSimulation,
  uploadInvoiceCsv,
  getExportReportUrl,
  InvoiceItem,
  SimulationPolicyParams,
  SimulationResponse,
} from "@/lib/api";
import { KpiCards } from "@/components/KpiCards";
import { FanChart } from "@/components/FanChart";
import { PolicySliders } from "@/components/PolicySliders";
import { InvoiceTable } from "@/components/InvoiceTable";
import { AgingBreakdown } from "@/components/AgingBreakdown";
import {
  Box,
  FileText,
  RotateCcw,
  Sparkles,
  Download,
  AlertCircle,
  Cpu,
} from "lucide-react";

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [portfolioName, setPortfolioName] = useState<string>("Cargando cartera...");
  const [simulationData, setSimulationData] = useState<SimulationResponse | null>(null);
  const [isLoadingSim, setIsLoadingSim] = useState<boolean>(true);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Policy parameters
  const [params, setParams] = useState<SimulationPolicyParams>({
    num_simulations: 5000,
    horizon_days: 90,
    stress_factor_pd: 1.0,
    macro_delay_shift: 0,
    delay_dispersion: 0.6,
    safety_cash_threshold: 1000000,
    discount_rate_annual: 0.08,
  });

  // Initial load
  const loadInitialPortfolio = useCallback(async () => {
    setIsLoadingSim(true);
    setErrorMsg(null);
    try {
      const demo = await fetchDemoData();
      setInvoices(demo.invoices);
      setPortfolioName(demo.portfolio_name);

      const sim = await runSimulation(demo.invoices, params);
      setSimulationData(sim);
    } catch (err: any) {
      console.error("Initialization error", err);
      setErrorMsg("Error al conectar con el motor estocástico");
    } finally {
      setIsLoadingSim(false);
    }
  }, []);

  useEffect(() => {
    loadInitialPortfolio();
  }, [loadInitialPortfolio]);

  // Execute simulation when triggered from Sliders or parameters change
  const handleSimulate = async () => {
    if (invoices.length === 0) return;
    setIsLoadingSim(true);
    setErrorMsg(null);
    try {
      const sim = await runSimulation(invoices, params);
      setSimulationData(sim);
    } catch (err: any) {
      setErrorMsg("Error durante la simulación estocástica");
    } finally {
      setIsLoadingSim(false);
    }
  };

  // Upload CSV handler
  const handleUploadCsv = async (file: File) => {
    setIsUploading(true);
    setErrorMsg(null);
    try {
      const result = await uploadInvoiceCsv(file);
      setInvoices(result.invoices);
      setPortfolioName(result.portfolio_name);

      // Re-run simulation with newly uploaded invoices
      const sim = await runSimulation(result.invoices, params);
      setSimulationData(sim);
    } catch (err: any) {
      setErrorMsg(err.message || "Error al procesar el archivo CSV");
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportReport = () => {
    const url = getExportReportUrl(params.stress_factor_pd, params.macro_delay_shift);
    window.open(url, "_blank");
  };

  if (!isMounted) {
    return (
      <div className="min-h-screen bg-[#030712] flex items-center justify-center">
        <div className="flex items-center gap-3 text-emerald-400 font-mono text-xs">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
          Iniciando CUBO CashFlow Risk Engine...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-6 py-3.5">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 p-0.5 shadow-lg shadow-emerald-500/20">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Box className="w-5 h-5 text-emerald-400" />
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-white">
                  CUBO <span className="text-emerald-400 font-normal">CashFlow Risk</span>
                </h1>
                <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  AR Aging Monte Carlo
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Plataforma de Simulación Estocástica y Cash-Flow at Risk (CFaR) para Cuentas por Cobrar
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto">
            <button
              onClick={loadInitialPortfolio}
              disabled={isLoadingSim}
              className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-semibold rounded-xl border border-slate-800 flex items-center gap-1.5 transition disabled:opacity-50"
              title="Restaurar cartera demo corporativa"
            >
              <RotateCcw className="w-3.5 h-3.5 text-slate-400" />
              Restaurar Demo
            </button>

            <button
              onClick={handleExportReport}
              className="px-3.5 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition shadow-sm"
            >
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              Reporte de Auditoría
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-6 space-y-6">
        {errorMsg && (
          <div className="bg-rose-500/10 border border-rose-500/30 text-rose-400 px-4 py-3 rounded-xl text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Portfolio Status Subheading */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 pb-1">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">
              {portfolioName}
            </h2>
            <p className="text-xs text-slate-400">
              Proyección cuantitativa a {params.horizon_days} días sobre {invoices.length} cuentas corporativas
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs font-mono text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              FastAPI Engine Online
            </span>
            <span className="text-slate-600">|</span>
            <span className="flex items-center gap-1" suppressHydrationWarning>
              <Cpu className="w-3.5 h-3.5 text-cyan-400" />
              {params.num_simulations.toLocaleString()} iteraciones
            </span>
          </div>
        </div>

        {/* Executive KPI Cards */}
        {simulationData ? (
          <KpiCards
            kpis={simulationData.kpis}
            invoicesCount={invoices.length}
            simulationsRun={simulationData.simulations_run}
          />
        ) : (
          <div className="h-28 bg-slate-900/40 rounded-xl animate-pulse border border-slate-800" />
        )}

        {/* Central Core: Fan Chart & Policy Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {simulationData ? (
              <FanChart
                data={simulationData.fan_chart_data}
                horizonDays={simulationData.horizon_days}
              />
            ) : (
              <div className="h-[400px] bg-slate-900/40 rounded-2xl animate-pulse border border-slate-800" />
            )}

            {/* Aging Breakdown */}
            {simulationData && (
              <AgingBreakdown metrics={simulationData.aging_breakdown} />
            )}
          </div>

          <div className="space-y-6">
            <PolicySliders
              params={params}
              onChange={setParams}
              onSimulate={handleSimulate}
              isLoading={isLoadingSim}
            />

            {/* Quantitative Methodology Box */}
            <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 text-xs text-slate-400 space-y-2.5">
              <h4 className="font-bold text-slate-200 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                Metodología Cuantitativa
              </h4>
              <p>
                <strong>Cash-Flow at Risk (CFaR 95%):</strong> Mide la pérdida máxima de liquidez respecto a la mediana esperada en el percentil P5 con 95% de confianza.
              </p>
              <p>
                <strong>Distribución Lognormal de Cobranzas:</strong> Los días de demora sobre el vencimiento se muestrean como variable aleatoria continua con dispersión calibrada.
              </p>
              <p>
                <strong>Expected Shortfall (CVaR):</strong> Esperanza condicional de recaudación en la cola del 5% más adverso.
              </p>
            </div>
          </div>
        </div>

        {/* Invoices Ledger Table */}
        <InvoiceTable
          invoices={invoices}
          onUploadCsv={handleUploadCsv}
          isUploading={isUploading}
        />
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-6 text-xs text-slate-500 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-2">
          <p>
            &copy; 2026 <strong>CUBO CashFlow Risk</strong> &mdash; Quantitative Treasury & Credit Risk SaaS Architecture.
          </p>
          <div className="flex items-center gap-4">
            <span>FastAPI 3.11+</span>
            <span>NumPy Vectorized</span>
            <span>Next.js 14 App Router</span>
            <span>Tailwind CSS</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
