"use client";

import React, { useState, useMemo } from "react";
import { InvoiceItem } from "@/lib/api";
import { 
  Search, 
  Filter, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Upload,
  ArrowUpDown
} from "lucide-react";

interface InvoiceTableProps {
  invoices: InvoiceItem[];
  onUploadCsv: (file: File) => void;
  isUploading: boolean;
}

export const InvoiceTable: React.FC<InvoiceTableProps> = ({
  invoices,
  onUploadCsv,
  isUploading,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [bucketFilter, setBucketFilter] = useState<string>("ALL");
  const [tierFilter, setTierFilter] = useState<string>("ALL");
  const [sortField, setSortField] = useState<"amount" | "days" | "pd">("amount");
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(val);
  };

  const filteredInvoices = useMemo(() => {
    return invoices
      .filter((inv) => {
        const matchesSearch =
          inv.client_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          inv.invoice_number.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesBucket = bucketFilter === "ALL" || inv.aging_bucket === bucketFilter;
        const matchesTier = tierFilter === "ALL" || inv.client_tier === tierFilter;
        return matchesSearch && matchesBucket && matchesTier;
      })
      .sort((a, b) => {
        let diff = 0;
        if (sortField === "amount") diff = a.amount - b.amount;
        if (sortField === "days") diff = a.days_past_due - b.days_past_due;
        if (sortField === "pd") diff = a.base_pd - b.base_pd;
        return sortAsc ? diff : -diff;
      });
  }, [invoices, searchTerm, bucketFilter, tierFilter, sortField, sortAsc]);

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case "AAA":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "AA":
        return "bg-teal-500/15 text-teal-400 border-teal-500/30";
      case "A":
        return "bg-cyan-500/15 text-cyan-400 border-cyan-500/30";
      case "BBB":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      default:
        return "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold";
    }
  };

  const getBucketBadge = (bucket: string) => {
    switch (bucket) {
      case "CURRENT":
        return "bg-emerald-500/15 text-emerald-400 border-emerald-500/30";
      case "1-30":
        return "bg-blue-500/15 text-blue-400 border-blue-500/30";
      case "31-60":
        return "bg-amber-500/15 text-amber-400 border-amber-500/30";
      case "61-90":
        return "bg-orange-500/15 text-orange-400 border-orange-500/30";
      default:
        return "bg-rose-500/15 text-rose-400 border-rose-500/30 font-bold";
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onUploadCsv(e.target.files[0]);
    }
  };

  const toggleSort = (field: "amount" | "days" | "pd") => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 backdrop-blur shadow-lg">
      {/* Header and Controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            Cartera de Facturas y Registro de Crédito B2B
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Mostrando {filteredInvoices.length} de {invoices.length} facturas activas.
          </p>
        </div>

        <div className="flex items-center gap-2 self-stretch md:self-auto">
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".csv,.xlsx,.xls"
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition disabled:opacity-50"
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            {isUploading ? "Cargando..." : "Importar Ledger CSV/Excel"}
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {/* Search */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por cliente o factura..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Bucket Filter */}
        <select
          value={bucketFilter}
          onChange={(e) => setBucketFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Todos los tramos de mora</option>
          <option value="CURRENT">Al día (CURRENT)</option>
          <option value="1-30">1 a 30 días de mora</option>
          <option value="31-60">31 a 60 días de mora</option>
          <option value="61-90">61 a 90 días de mora</option>
          <option value="90+">90+ días (Crítico)</option>
        </select>

        {/* Tier Filter */}
        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value)}
          className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-none focus:border-emerald-500"
        >
          <option value="ALL">Todos los ratings crediticios</option>
          <option value="AAA">Rating AAA (Prime)</option>
          <option value="AA">Rating AA (Alto)</option>
          <option value="A">Rating A (Grado inversión)</option>
          <option value="BBB">Rating BBB (Moderado)</option>
          <option value="HIGH_RISK">High Risk (Mora / Distress)</option>
        </select>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-slate-800 max-h-[440px] overflow-y-auto">
        <table className="w-full text-xs text-left text-slate-300">
          <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] tracking-wider sticky top-0 z-10 border-b border-slate-800">
            <tr>
              <th className="py-2.5 px-3">Factura</th>
              <th className="py-2.5 px-3">Cliente Corporativo</th>
              <th className="py-2.5 px-3">Rating</th>
              <th className="py-2.5 px-3">Estado / Mora</th>
              <th
                onClick={() => toggleSort("pd")}
                className="py-2.5 px-3 cursor-pointer hover:text-white"
              >
                <div className="flex items-center gap-1">
                  PD Base <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
              <th
                onClick={() => toggleSort("amount")}
                className="py-2.5 px-3 text-right cursor-pointer hover:text-white"
              >
                <div className="flex items-center justify-end gap-1">
                  Monto Nominal <ArrowUpDown className="w-3 h-3" />
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-950/40 font-mono">
            {filteredInvoices.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-8 text-slate-500 font-sans">
                  No se encontraron facturas con los filtros seleccionados.
                </td>
              </tr>
            ) : (
              filteredInvoices.map((inv) => (
                <tr
                  key={inv.invoice_number}
                  className="hover:bg-slate-900/60 transition group"
                >
                  <td className="py-2.5 px-3 font-semibold text-slate-300">
                    {inv.invoice_number}
                  </td>
                  <td className="py-2.5 px-3 font-sans font-medium text-white max-w-[220px] truncate">
                    {inv.client_name}
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getTierBadge(
                        inv.client_tier
                      )}`}
                    >
                      {inv.client_tier}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] border ${getBucketBadge(
                          inv.aging_bucket
                        )}`}
                      >
                        {inv.aging_bucket}
                      </span>
                      <span className="text-[11px] text-slate-400 font-sans">
                        {inv.days_past_due > 0
                          ? `+${inv.days_past_due}d mora`
                          : `Vence en ${inv.days_to_due}d`}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">
                    {(inv.base_pd * 100).toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-bold text-emerald-400">
                    {formatCurrency(inv.amount)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};
