from enum import Enum
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ClientTier(str, Enum):
    AAA = "AAA"
    AA = "AA"
    A = "A"
    BBB = "BBB"
    HIGH_RISK = "HIGH_RISK"

class AgingBucket(str, Enum):
    CURRENT = "CURRENT"
    PAST_DUE_30 = "1-30"
    PAST_DUE_60 = "31-60"
    PAST_DUE_90 = "61-90"
    PAST_DUE_90_PLUS = "90+"

class InvoiceItem(BaseModel):
    id: Optional[int] = None
    invoice_number: str = Field(..., description="Unique alphanumeric identifier")
    client_name: str = Field(..., description="Corporate customer denomination")
    client_tax_id: Optional[str] = Field(None, description="Tax ID / CUIT / VAT")
    client_tier: ClientTier = Field(default=ClientTier.BBB, description="Credit rating grade")
    amount: float = Field(..., gt=0, description="Nominal balance due in USD")
    days_to_due: int = Field(default=30, description="Days remaining until maturity. Negative indicates days past due")
    days_past_due: int = Field(default=0, ge=0, description="Overdue days if already past due")
    aging_bucket: AgingBucket = Field(default=AgingBucket.CURRENT, description="Aging classification bucket")
    base_pd: float = Field(default=0.02, ge=0.0, le=1.0, description="Baseline Probability of Default (0.0 to 1.0)")
    expected_delay_days: float = Field(default=5.0, ge=0.0, description="Historical payment delay average (days)")
    recovery_rate: float = Field(default=0.20, ge=0.0, le=1.0, description="Expected recovery in event of default")

    model_config = ConfigDict(from_attributes=True)

class SimulationPolicyParams(BaseModel):
    num_simulations: int = Field(default=5000, ge=100, le=50000, description="Number of Monte Carlo trajectories")
    horizon_days: int = Field(default=90, ge=15, le=180, description="Projection horizon in days")
    stress_factor_pd: float = Field(default=1.0, ge=0.1, le=5.0, description="Macroeconomic credit shock multiplier (1.0 = Baseline)")
    macro_delay_shift: float = Field(default=0.0, ge=0.0, le=90.0, description="Systemic payment delay increase in days")
    delay_dispersion: float = Field(default=0.6, ge=0.1, le=2.5, description="Shape/dispersion factor for lognormal delay")
    safety_cash_threshold: float = Field(default=0.0, ge=0.0, description="Minimum critical treasury liquidity threshold")
    discount_rate_annual: float = Field(default=0.08, ge=0.0, le=0.50, description="Annual treasury discount rate for NPV")
    random_seed: Optional[int] = Field(default=42, description="Seed for deterministic reproduction")

class SimulationRequest(BaseModel):
    portfolio_id: Optional[int] = None
    invoices: Optional[List[InvoiceItem]] = None
    params: SimulationPolicyParams = Field(default_factory=SimulationPolicyParams)

class DailyPercentilePoint(BaseModel):
    day: int
    p5: float
    p10: float
    p25: float
    p50: float  # Median trajectory
    p75: float
    p90: float
    p95: float
    mean: float
    daily_cash_p50: float  # Daily incremental cash in p50

class AgingBucketMetric(BaseModel):
    bucket: str
    count: int
    total_nominal: float
    expected_loss: float
    loss_percentage: float
    avg_days_past_due: float
    share_of_portfolio: float

class RiskKpis(BaseModel):
    total_nominal_ar: float
    expected_collection: float
    expected_loss: float
    expected_loss_pct: float
    p5_final: float
    p50_final: float
    p95_final: float
    cfar_95: float  # Cash Flow at Risk 95% = p50_final - p5_final
    cvar_95: float  # Conditional VaR (Expected Shortfall below 5th percentile)
    worst_case: float
    best_case: float
    deficit_probability: float
    npv_expected: float
    execution_time_ms: float

class SimulationResponse(BaseModel):
    kpis: RiskKpis
    fan_chart_data: List[DailyPercentilePoint]
    aging_breakdown: List[AgingBucketMetric]
    invoices_count: int
    simulations_run: int
    horizon_days: int

class DemoDataResponse(BaseModel):
    portfolio_name: str
    currency: str
    invoices: List[InvoiceItem]
    total_nominal: float
    count: int
