import io
import datetime
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Query, Response
from fastapi.responses import HTMLResponse
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.config import settings
from app.db.models import get_db, Portfolio, Invoice as InvoiceModel, SimulationRun as SimulationRunModel
from app.models.schemas import (
    InvoiceItem, 
    SimulationRequest, 
    SimulationResponse, 
    DemoDataResponse, 
    ClientTier, 
    AgingBucket,
    SimulationPolicyParams
)
from app.engine.montecarlo import MonteCarloEngine

router = APIRouter()
engine_instance = MonteCarloEngine()

def generate_corporate_demo_portfolio() -> List[InvoiceItem]:
    """Generates a realistic enterprise B2B AR portfolio across multiple industries and aging buckets."""
    clients_catalog = [
        {"name": "TechGlobal Cloud Solutions LLC", "tier": ClientTier.AAA, "base_pd": 0.005, "delay": 2.0, "rec": 0.35},
        {"name": "OmniRetail Supermarkets S.A.", "tier": ClientTier.AA, "base_pd": 0.012, "delay": 4.5, "rec": 0.30},
        {"name": "BioPharma Laboratories Corp", "tier": ClientTier.AAA, "base_pd": 0.007, "delay": 3.0, "rec": 0.40},
        {"name": "Apex Automotive Logistics Inc", "tier": ClientTier.A, "base_pd": 0.020, "delay": 7.0, "rec": 0.25},
        {"name": "Southern Steelworks Industrial", "tier": ClientTier.BBB, "base_pd": 0.045, "delay": 12.0, "rec": 0.20},
        {"name": "Telecom Iberoamericana S.A.", "tier": ClientTier.AA, "base_pd": 0.015, "delay": 5.0, "rec": 0.30},
        {"name": "Starlight Hospitality Group", "tier": ClientTier.BBB, "base_pd": 0.060, "delay": 16.0, "rec": 0.15},
        {"name": "Vanguard Solar Energy Corp", "tier": ClientTier.A, "base_pd": 0.022, "delay": 8.0, "rec": 0.25},
        {"name": "RapidFreight Intermodal Lines", "tier": ClientTier.HIGH_RISK, "base_pd": 0.160, "delay": 35.0, "rec": 0.10},
        {"name": "Consorcio Constructor Metro Sur", "tier": ClientTier.HIGH_RISK, "base_pd": 0.240, "delay": 52.0, "rec": 0.08},
    ]

    invoices: List[InvoiceItem] = []
    inv_id = 1000

    # 1. Current / Not Due (0-30 days to maturity)
    current_amounts = [420000, 310000, 580000, 215000, 890000, 640000, 390000, 720000, 260000, 1150000]
    for idx, amt in enumerate(current_amounts):
        c = clients_catalog[idx % len(clients_catalog)]
        inv_id += 1
        days_to_due = (idx + 1) * 3 + 2
        invoices.append(
            InvoiceItem(
                id=inv_id,
                invoice_number=f"INV-2026-{inv_id}",
                client_name=c["name"],
                client_tax_id=f"TAX-US-{80000 + inv_id}",
                client_tier=c["tier"],
                amount=float(amt),
                days_to_due=days_to_due,
                days_past_due=0,
                aging_bucket=AgingBucket.CURRENT,
                base_pd=c["base_pd"],
                expected_delay_days=c["delay"],
                recovery_rate=c["rec"]
            )
        )

    # 2. Aging Bucket: 1-30 Days Past Due
    past_due_30_amts = [350000, 185000, 490000, 290000, 520000, 175000, 410000]
    for idx, amt in enumerate(past_due_30_amts):
        c = clients_catalog[(idx + 2) % len(clients_catalog)]
        inv_id += 1
        dpd = 5 + (idx * 4)
        invoices.append(
            InvoiceItem(
                id=inv_id,
                invoice_number=f"INV-2026-{inv_id}",
                client_name=c["name"],
                client_tax_id=f"TAX-US-{80000 + inv_id}",
                client_tier=c["tier"],
                amount=float(amt),
                days_to_due=-dpd,
                days_past_due=dpd,
                aging_bucket=AgingBucket.PAST_DUE_30,
                base_pd=min(0.20, c["base_pd"] * 1.5),
                expected_delay_days=c["delay"] + 6.0,
                recovery_rate=c["rec"]
            )
        )

    # 3. Aging Bucket: 31-60 Days Past Due
    past_due_60_amts = [480000, 310000, 220000, 620000, 140000]
    for idx, amt in enumerate(past_due_60_amts):
        c = clients_catalog[(idx + 4) % len(clients_catalog)]
        inv_id += 1
        dpd = 32 + (idx * 6)
        invoices.append(
            InvoiceItem(
                id=inv_id,
                invoice_number=f"INV-2026-{inv_id}",
                client_name=c["name"],
                client_tax_id=f"TAX-US-{80000 + inv_id}",
                client_tier=c["tier"],
                amount=float(amt),
                days_to_due=-dpd,
                days_past_due=dpd,
                aging_bucket=AgingBucket.PAST_DUE_60,
                base_pd=min(0.35, c["base_pd"] * 2.2),
                expected_delay_days=c["delay"] + 15.0,
                recovery_rate=c["rec"] * 0.9
            )
        )

    # 4. Aging Bucket: 61-90 Days Past Due
    past_due_90_amts = [290000, 380000, 195000, 450000]
    for idx, amt in enumerate(past_due_90_amts):
        c = clients_catalog[(idx + 6) % len(clients_catalog)]
        inv_id += 1
        dpd = 62 + (idx * 8)
        invoices.append(
            InvoiceItem(
                id=inv_id,
                invoice_number=f"INV-2026-{inv_id}",
                client_name=c["name"],
                client_tax_id=f"TAX-US-{80000 + inv_id}",
                client_tier=c["tier"],
                amount=float(amt),
                days_to_due=-dpd,
                days_past_due=dpd,
                aging_bucket=AgingBucket.PAST_DUE_90,
                base_pd=min(0.50, c["base_pd"] * 3.5),
                expected_delay_days=c["delay"] + 24.0,
                recovery_rate=c["rec"] * 0.8
            )
        )

    # 5. Aging Bucket: 90+ Days Past Due (Critical Default Risk)
    past_due_90_plus_amts = [380000, 520000, 290000]
    for idx, amt in enumerate(past_due_90_plus_amts):
        c = clients_catalog[8 if idx % 2 == 0 else 9]  # High risk clients
        inv_id += 1
        dpd = 95 + (idx * 18)
        invoices.append(
            InvoiceItem(
                id=inv_id,
                invoice_number=f"INV-2026-{inv_id}",
                client_name=c["name"],
                client_tax_id=f"TAX-US-{80000 + inv_id}",
                client_tier=ClientTier.HIGH_RISK,
                amount=float(amt),
                days_to_due=-dpd,
                days_past_due=dpd,
                aging_bucket=AgingBucket.PAST_DUE_90_PLUS,
                base_pd=0.45 + (idx * 0.10),
                expected_delay_days=35.0,
                recovery_rate=0.12
            )
        )

    return invoices

@router.get("/health", tags=["System"])
async def health_check():
    return {
        "status": "healthy",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "timestamp": datetime.datetime.utcnow().isoformat()
    }

@router.get("/demo-data", response_model=DemoDataResponse, tags=["Portfolio"])
async def get_demo_data():
    invoices = generate_corporate_demo_portfolio()
    total_nominal = sum(inv.amount for inv in invoices)
    return DemoDataResponse(
        portfolio_name="Enterprise AR Corporate Portfolio Q4-2026",
        currency="USD",
        invoices=invoices,
        total_nominal=round(total_nominal, 2),
        count=len(invoices)
    )

@router.post("/simulate", response_model=SimulationResponse, tags=["Quantitative Simulation"])
async def run_simulation(
    request: SimulationRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Executes a high-speed vectorized Monte Carlo simulation (5,000 trajectories across 90 days)
    to compute stochastic cash flow distributions, percentile fan chart, and quantitative risk metrics (CFaR, CVaR).
    """
    invoices = request.invoices
    if not invoices or len(invoices) == 0:
        # Load demo portfolio if no specific invoices were sent
        invoices = generate_corporate_demo_portfolio()

    # Run Monte Carlo engine
    simulation_result = engine_instance.run_simulation(
        invoices=invoices,
        params=request.params
    )

    # Optional async persistence in database
    try:
        run_record = SimulationRunModel(
            portfolio_id=request.portfolio_id,
            num_simulations=request.params.num_simulations,
            horizon_days=request.params.horizon_days,
            stress_factor_pd=request.params.stress_factor_pd,
            macro_delay_shift=request.params.macro_delay_shift,
            nominal_exposure=simulation_result.kpis.total_nominal_ar,
            expected_collection=simulation_result.kpis.expected_collection,
            expected_loss=simulation_result.kpis.expected_loss,
            p5_final=simulation_result.kpis.p5_final,
            p50_final=simulation_result.kpis.p50_final,
            p95_final=simulation_result.kpis.p95_final,
            cfar_95=simulation_result.kpis.cfar_95,
            cvar_95=simulation_result.kpis.cvar_95,
            deficit_probability=simulation_result.kpis.deficit_probability,
            summary_json="{}"
        )
        db.add(run_record)
        await db.commit()
    except Exception as e:
        # Non-blocking if running in stateless / demo mode
        pass

    return simulation_result

@router.post("/upload-csv", response_model=DemoDataResponse, tags=["Data Ingestion"])
async def upload_csv_portfolio(file: UploadFile = File(...)):
    """
    Parses corporate CSV or Excel accounts receivable ledger, automatically standardizes fields,
    computes aging buckets, and maps baseline risk parameters.
    """
    import pandas as pd

    contents = await file.read()
    try:
        if file.filename.endswith(".csv"):
            df = pd.read_csv(io.BytesIO(contents))
        elif file.filename.endswith((".xls", ".xlsx")):
            df = pd.read_excel(io.BytesIO(contents))
        else:
            raise HTTPException(status_code=400, detail="Unsupported file format. Please upload .csv or .xlsx")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading file: {str(e)}")

    # Column name normalization
    cols = {c.lower().strip().replace(" ", "_"): c for c in df.columns}
    
    # Identify invoice number
    inv_col = next((cols[c] for c in ["invoice_number", "factura", "id", "nro", "invoice_id"] if c in cols), None)
    client_col = next((cols[c] for c in ["client_name", "cliente", "razon_social", "customer", "customer_name"] if c in cols), None)
    amount_col = next((cols[c] for c in ["amount", "monto", "importe", "total", "saldo"] if c in cols), None)
    days_due_col = next((cols[c] for c in ["days_to_due", "dias_a_vencer", "plazo_dias", "days_remaining"] if c in cols), None)
    past_due_col = next((cols[c] for c in ["days_past_due", "dias_mora", "mora", "past_due"] if c in cols), None)
    tier_col = next((cols[c] for c in ["client_tier", "tier", "rating", "calificacion"] if c in cols), None)

    if not client_col or not amount_col:
        raise HTTPException(
            status_code=422, 
            detail=f"CSV must contain at least 'client_name' and 'amount' columns. Detected: {list(df.columns)}"
        )

    invoices: List[InvoiceItem] = []
    for idx, row in df.iterrows():
        try:
            amt = float(row[amount_col])
            if amt <= 0:
                continue
        except (ValueError, TypeError):
            continue

        c_name = str(row[client_col]).strip() if pd.notna(row[client_col]) else f"Client #{idx + 1}"
        inv_num = str(row[inv_col]).strip() if inv_col and pd.notna(row[inv_col]) else f"INV-{1000 + idx}"
        
        # Determine overdue days and remaining days
        dpd = 0
        if past_due_col and pd.notna(row[past_due_col]):
            try:
                dpd = max(0, int(row[past_due_col]))
            except ValueError:
                dpd = 0
        
        dtd = 30
        if days_due_col and pd.notna(row[days_due_col]):
            try:
                dtd = int(row[days_due_col])
            except ValueError:
                dtd = 30 if dpd == 0 else -dpd
        elif dpd > 0:
            dtd = -dpd

        # Classify Aging Bucket
        if dpd <= 0 and dtd >= 0:
            bucket = AgingBucket.CURRENT
            base_pd = 0.015
            expected_delay = 4.0
        elif 1 <= dpd <= 30:
            bucket = AgingBucket.PAST_DUE_30
            base_pd = 0.04
            expected_delay = 8.0
        elif 31 <= dpd <= 60:
            bucket = AgingBucket.PAST_DUE_60
            base_pd = 0.09
            expected_delay = 18.0
        elif 61 <= dpd <= 90:
            bucket = AgingBucket.PAST_DUE_90
            base_pd = 0.18
            expected_delay = 28.0
        else:
            bucket = AgingBucket.PAST_DUE_90_PLUS
            base_pd = 0.40
            expected_delay = 45.0

        tier = ClientTier.BBB
        if tier_col and pd.notna(row[tier_col]):
            val = str(row[tier_col]).upper().strip()
            if "AAA" in val:
                tier = ClientTier.AAA
                base_pd *= 0.4
            elif "AA" in val:
                tier = ClientTier.AA
                base_pd *= 0.6
            elif "A" in val:
                tier = ClientTier.A
                base_pd *= 0.8
            elif "HIGH" in val or "RISK" in val or "D" in val or "C" in val:
                tier = ClientTier.HIGH_RISK
                base_pd = max(0.25, base_pd * 1.8)

        invoices.append(
            InvoiceItem(
                id=idx + 1,
                invoice_number=inv_num,
                client_name=c_name,
                client_tier=tier,
                amount=round(amt, 2),
                days_to_due=dtd,
                days_past_due=dpd,
                aging_bucket=bucket,
                base_pd=round(min(0.90, base_pd), 4),
                expected_delay_days=expected_delay,
                recovery_rate=0.20
            )
        )

    total_nominal = sum(inv.amount for inv in invoices)
    return DemoDataResponse(
        portfolio_name=file.filename,
        currency="USD",
        invoices=invoices,
        total_nominal=round(total_nominal, 2),
        count=len(invoices)
    )

@router.get("/export-report", response_class=HTMLResponse, tags=["Reporting"])
async def export_audit_report(
    stress_factor: float = Query(default=1.0, description="PD stress multiplier"),
    delay_shift: float = Query(default=0.0, description="Macro delay shift in days")
):
    """
    Renders an institutional, print-ready executive Treasury Risk Report (HTML / Printable PDF).
    """
    invoices = generate_corporate_demo_portfolio()
    params = SimulationPolicyParams(
        num_simulations=5000,
        horizon_days=90,
        stress_factor_pd=stress_factor,
        macro_delay_shift=delay_shift
    )
    sim = engine_instance.run_simulation(invoices, params)
    kpis = sim.kpis

    rows_html = "".join([
        f"""
        <tr class="border-b border-gray-200">
            <td class="py-2 px-3 font-semibold">{b.bucket}</td>
            <td class="py-2 px-3 text-right">{b.count}</td>
            <td class="py-2 px-3 text-right">${b.total_nominal:,.2f}</td>
            <td class="py-2 px-3 text-right">{b.share_of_portfolio:.1f}%</td>
            <td class="py-2 px-3 text-right font-medium text-red-600">${b.expected_loss:,.2f} ({b.loss_percentage:.1f}%)</td>
            <td class="py-2 px-3 text-right">{b.avg_days_past_due:.1f} d</td>
        </tr>
        """ for b in sim.aging_breakdown
    ])

    html_content = f"""
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <title>CUBO CashFlow Risk - Informe Cuantitativo de Tesorería</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <style>
            @media print {{
                body {{ -webkit-print-color-adjust: exact; }}
                .no-print {{ display: none; }}
            }}
        </style>
    </head>
    <body class="bg-gray-50 text-gray-900 p-8 font-sans max-w-5xl mx-auto">
        <div class="no-print mb-6 flex justify-between items-center bg-slate-900 text-white p-4 rounded-lg">
            <span class="text-sm font-medium">Informe Ejecutivo de Riesgo y Liquidez Estocástica</span>
            <button onclick="window.print()" class="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded text-sm font-semibold transition">
                Imprimir / Guardar como PDF
            </button>
        </div>

        <header class="border-b-2 border-slate-900 pb-4 mb-6 flex justify-between items-end">
            <div>
                <h1 class="text-3xl font-extrabold tracking-tight text-slate-950">CUBO CashFlow Risk</h1>
                <p class="text-sm text-slate-600">Simulación Estocástica de Flujo de Fondos & Riesgo de Crédito (AR Aging)</p>
            </div>
            <div class="text-right text-xs text-slate-500">
                <p><strong>Emisión:</strong> {datetime.datetime.utcnow().strftime('%d/%m/%Y %H:%M UTC')}</p>
                <p><strong>Horizonte:</strong> 90 Días | <strong>Iteraciones:</strong> 5.000 Monte Carlo</p>
            </div>
        </header>

        <!-- Executive Summary Grid -->
        <section class="grid grid-cols-4 gap-4 mb-8">
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="text-xs uppercase font-bold text-gray-500">Exposición Nominal AR</div>
                <div class="text-2xl font-black text-slate-900 mt-1">${kpis.total_nominal_ar:,.0f}</div>
                <div class="text-xs text-gray-500 mt-1">{sim.invoices_count} facturas activas</div>
            </div>
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="text-xs uppercase font-bold text-gray-500">Recaudación Esperada (P50)</div>
                <div class="text-2xl font-black text-emerald-600 mt-1">${kpis.p50_final:,.0f}</div>
                <div class="text-xs text-gray-500 mt-1">Media: ${kpis.expected_collection:,.0f}</div>
            </div>
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="text-xs uppercase font-bold text-red-600">Cash Flow at Risk (95%)</div>
                <div class="text-2xl font-black text-red-600 mt-1">${kpis.cfar_95:,.0f}</div>
                <div class="text-xs text-gray-500 mt-1">Déficit en el 5% de peores casos</div>
            </div>
            <div class="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
                <div class="text-xs uppercase font-bold text-gray-500">Incobrabilidad Esperada</div>
                <div class="text-2xl font-black text-amber-600 mt-1">${kpis.expected_loss:,.0f}</div>
                <div class="text-xs text-gray-500 mt-1">{kpis.expected_loss_pct:.2f}% de la cartera</div>
            </div>
        </section>

        <!-- Tail Risk Section -->
        <section class="bg-slate-100 p-5 rounded-lg border border-slate-300 mb-8">
            <h2 class="text-sm font-bold uppercase text-slate-800 mb-3 tracking-wider">Métricas Cuantitativas de Estrés y Tail Risk</h2>
            <div class="grid grid-cols-3 gap-6 text-sm">
                <div>
                    <span class="text-slate-600">Peor Escenario P5 (95% confianza):</span>
                    <p class="text-lg font-bold text-slate-950">${kpis.p5_final:,.0f}</p>
                </div>
                <div>
                    <span class="text-slate-600">Expected Shortfall (CVaR 95%):</span>
                    <p class="text-lg font-bold text-red-700">${kpis.cvar_95:,.0f}</p>
                </div>
                <div>
                    <span class="text-slate-600">Valor Actual Neto Esperado (NPV):</span>
                    <p class="text-lg font-bold text-slate-950">${kpis.npv_expected:,.0f}</p>
                </div>
            </div>
            <div class="mt-3 pt-3 border-t border-slate-200 text-xs text-slate-600 flex justify-between">
                <span>Multiplicador de Estrés PD: <strong>{params.stress_factor_pd}x</strong></span>
                <span>Desplazamiento Sistémico de Mora: <strong>+{params.macro_delay_shift} días</strong></span>
                <span>Tiempo de Cómputo Vectorizado: <strong>{kpis.execution_time_ms} ms</strong></span>
            </div>
        </section>

        <!-- AR Aging Breakdown Table -->
        <section class="mb-8">
            <h2 class="text-sm font-bold uppercase text-slate-800 mb-3 tracking-wider">Desglose por Antigüedad de Deuda (AR Aging Buckets)</h2>
            <table class="w-full text-xs text-left border-collapse border border-gray-200 bg-white shadow-sm rounded-lg overflow-hidden">
                <thead class="bg-slate-800 text-white uppercase text-[11px]">
                    <tr>
                        <th class="py-2.5 px-3">Bucket de Mora</th>
                        <th class="py-2.5 px-3 text-right">Cant.</th>
                        <th class="py-2.5 px-3 text-right">Saldo Nominal</th>
                        <th class="py-2.5 px-3 text-right">% Cartera</th>
                        <th class="py-2.5 px-3 text-right">Incobrabilidad Proyectada</th>
                        <th class="py-2.5 px-3 text-right">Mora Media</th>
                    </tr>
                </thead>
                <tbody>
                    {rows_html}
                </tbody>
            </table>
        </section>

        <footer class="mt-12 pt-4 border-t border-gray-300 text-[11px] text-gray-500 flex justify-between items-center">
            <div>
                <strong>CUBO CashFlow Risk Platform</strong> &copy; 2026 | Arquitectura Cuantitativa FinTech B2B
            </div>
            <div>
                Clasificación: Confidencial / Comité de Riesgo de Tesorería
            </div>
        </footer>
    </body>
    </html>
    """
    return HTMLResponse(content=html_content)
