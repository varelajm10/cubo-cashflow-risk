import time
import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple
from app.models.schemas import (
    InvoiceItem, 
    SimulationPolicyParams, 
    SimulationResponse, 
    RiskKpis, 
    DailyPercentilePoint, 
    AgingBucketMetric,
    AgingBucket
)

class MonteCarloEngine:
    """
    High-Performance Vectorized Monte Carlo Simulation Engine for AR Aging Cash Flow & Credit Risk.
    Executes N stochastic trajectories across a T-day horizon using NumPy matrix operations.
    """

    def __init__(self, seed: int = 42):
        self.seed = seed
        self.rng = np.random.default_rng(seed)

    def run_simulation(
        self, 
        invoices: List[InvoiceItem], 
        params: SimulationPolicyParams
    ) -> SimulationResponse:
        start_time = time.perf_counter()
        
        n_sims = params.num_simulations
        horizon = params.horizon_days
        n_invoices = len(invoices)

        if n_invoices == 0:
            return self._empty_response(params)

        # 1. Vectorize Invoice Attributes
        amounts = np.array([inv.amount for inv in invoices], dtype=np.float64)
        days_to_due = np.array([inv.days_to_due for inv in invoices], dtype=np.float64)
        base_pds = np.array([inv.base_pd for inv in invoices], dtype=np.float64)
        delays = np.array([inv.expected_delay_days for inv in invoices], dtype=np.float64)
        recoveries = np.array([inv.recovery_rate for inv in invoices], dtype=np.float64)
        
        total_nominal_ar = float(np.sum(amounts))

        # 2. Apply Macro Stress to Probability of Default (PD)
        # Stressed PD is clipped to a maximum of 99.9%
        stressed_pds = np.clip(base_pds * params.stress_factor_pd, 0.0001, 0.999)

        # 3. Simulate Default Events across (N_sims, N_invoices)
        # Matrix shape: (N_sims, N_invoices)
        uniform_random = self.rng.random(size=(n_sims, n_invoices))
        is_default = uniform_random < stressed_pds[np.newaxis, :]  # boolean matrix

        # 4. Simulate Payment Timings (Stochastic Delays)
        # Stressed Mean Delay = expected_delay_days + macro_delay_shift
        adjusted_mean_delays = np.maximum(0.5, delays + params.macro_delay_shift)
        
        # Log-normal distribution parameters for delays:
        # If X ~ Lognormal(mu_log, sigma_log), then E[X] = exp(mu_log + sigma_log^2 / 2)
        sigma_log = params.delay_dispersion
        mu_log = np.log(adjusted_mean_delays) - 0.5 * (sigma_log ** 2)
        
        # Generate random delays for all simulations and invoices
        stochastic_delays = self.rng.lognormal(
            mean=mu_log[np.newaxis, :], 
            sigma=sigma_log, 
            size=(n_sims, n_invoices)
        )

        # Payment Day:
        # If invoice is already past due (days_to_due <= 0), payment starts from day 1 + delay
        # If not past due (days_to_due > 0), payment is days_to_due + delay
        effective_base_days = np.where(days_to_due <= 0, 1.0, days_to_due)
        raw_payment_days = np.floor(effective_base_days[np.newaxis, :] + stochastic_delays).astype(np.int32)
        raw_payment_days = np.maximum(1, raw_payment_days)

        # Defaults: for defaulted invoices, recovery cash is recovered late in recovery cycle (e.g. day horizon - 5)
        recovery_days = np.full((n_sims, n_invoices), fill_value=max(1, horizon - 5), dtype=np.int32)
        
        # Actual cash paid per invoice per simulation
        # Non-default pays 100% amount; default pays amount * recovery_rate
        cash_paid = np.where(
            is_default, 
            amounts[np.newaxis, :] * recoveries[np.newaxis, :], 
            amounts[np.newaxis, :]
        )
        
        actual_payment_days = np.where(is_default, recovery_days, raw_payment_days)

        # 5. Build Daily Cash Flow Matrix (N_sims, horizon)
        # Daily index from 0 to horizon-1 corresponds to Day 1 to Day H
        daily_cash_matrix = np.zeros((n_sims, horizon), dtype=np.float64)

        # Vectorized accumulation using flat index or iterating over invoices
        # Iterating over invoices (typically 50-500) with vectorization over 5000 simulations is lightning fast (<30ms)
        for i in range(n_invoices):
            pay_days_i = actual_payment_days[:, i] - 1  # 0-indexed day
            valid_mask = (pay_days_i >= 0) & (pay_days_i < horizon)
            
            sim_indices = np.where(valid_mask)[0]
            target_days = pay_days_i[valid_mask]
            paid_amounts = cash_paid[valid_mask, i]
            
            np.add.at(daily_cash_matrix, (sim_indices, target_days), paid_amounts)

        # 6. Cumulative Cash Trajectories (N_sims, horizon)
        cumulative_cash_matrix = np.cumsum(daily_cash_matrix, axis=1)

        # 7. Compute Vectorized Percentile Bands for Fan Chart
        # Percentiles: P5, P10, P25, P50 (median), P75, P90, P95
        percentiles = [5, 10, 25, 50, 75, 90, 95]
        percentile_curves = np.percentile(cumulative_cash_matrix, percentiles, axis=0)
        mean_curve = np.mean(cumulative_cash_matrix, axis=0)
        
        # Daily median cash increment
        daily_cash_median = np.median(daily_cash_matrix, axis=0)

        # Build fan chart points
        fan_chart_data: List[DailyPercentilePoint] = []
        for d in range(horizon):
            fan_chart_data.append(
                DailyPercentilePoint(
                    day=d + 1,
                    p5=round(float(percentile_curves[0, d]), 2),
                    p10=round(float(percentile_curves[1, d]), 2),
                    p25=round(float(percentile_curves[2, d]), 2),
                    p50=round(float(percentile_curves[3, d]), 2),
                    p75=round(float(percentile_curves[4, d]), 2),
                    p90=round(float(percentile_curves[5, d]), 2),
                    p95=round(float(percentile_curves[6, d]), 2),
                    mean=round(float(mean_curve[d]), 2),
                    daily_cash_p50=round(float(daily_cash_median[d]), 2),
                )
            )

        # 8. Terminal Metrics (Day = horizon)
        terminal_cash = cumulative_cash_matrix[:, -1]
        p5_final = float(np.percentile(terminal_cash, 5))
        p50_final = float(np.percentile(terminal_cash, 50))
        p95_final = float(np.percentile(terminal_cash, 95))
        expected_collection = float(np.mean(terminal_cash))
        expected_loss = max(0.0, total_nominal_ar - expected_collection)
        expected_loss_pct = (expected_loss / total_nominal_ar * 100.0) if total_nominal_ar > 0 else 0.0

        # Cash Flow at Risk (CFaR 95%):
        # Difference between expected/median cash and the 5th percentile adverse scenario
        cfar_95 = max(0.0, p50_final - p5_final)

        # Conditional VaR (CVaR 95% / Expected Shortfall):
        # Average cash collection in the worst 5% tail scenarios
        worst_5_pct_tail = terminal_cash[terminal_cash <= p5_final]
        cvar_95 = float(np.mean(worst_5_pct_tail)) if len(worst_5_pct_tail) > 0 else p5_final

        # Safety cash deficit probability
        if params.safety_cash_threshold > 0:
            deficit_count = np.sum(terminal_cash < params.safety_cash_threshold)
            deficit_probability = float(deficit_count / n_sims)
        else:
            deficit_probability = 0.0

        # Net Present Value (NPV) calculation
        # Daily discount factor = (1 + r_annual)^(1/365) - 1
        daily_rate = (1.0 + params.discount_rate_annual) ** (1.0 / 365.0) - 1.0
        discount_weights = 1.0 / ((1.0 + daily_rate) ** np.arange(1, horizon + 1))
        discounted_cash_flows = np.dot(daily_cash_matrix, discount_weights)
        npv_expected = float(np.mean(discounted_cash_flows))

        # 9. Aging Bucket Breakdown Analysis
        aging_breakdown = self._compute_aging_breakdown(invoices, stressed_pds, total_nominal_ar)

        exec_time_ms = (time.perf_counter() - start_time) * 1000.0

        kpis = RiskKpis(
            total_nominal_ar=round(total_nominal_ar, 2),
            expected_collection=round(expected_collection, 2),
            expected_loss=round(expected_loss, 2),
            expected_loss_pct=round(expected_loss_pct, 2),
            p5_final=round(p5_final, 2),
            p50_final=round(p50_final, 2),
            p95_final=round(p95_final, 2),
            cfar_95=round(cfar_95, 2),
            cvar_95=round(cvar_95, 2),
            worst_case=round(float(np.min(terminal_cash)), 2),
            best_case=round(float(np.max(terminal_cash)), 2),
            deficit_probability=round(deficit_probability * 100.0, 2),
            npv_expected=round(npv_expected, 2),
            execution_time_ms=round(exec_time_ms, 2)
        )

        return SimulationResponse(
            kpis=kpis,
            fan_chart_data=fan_chart_data,
            aging_breakdown=aging_breakdown,
            invoices_count=n_invoices,
            simulations_run=n_sims,
            horizon_days=horizon
        )

    def _compute_aging_breakdown(
        self, 
        invoices: List[InvoiceItem], 
        stressed_pds: np.ndarray,
        total_nominal: float
    ) -> List[AgingBucketMetric]:
        buckets_order = [
            AgingBucket.CURRENT.value,
            AgingBucket.PAST_DUE_30.value,
            AgingBucket.PAST_DUE_60.value,
            AgingBucket.PAST_DUE_90.value,
            AgingBucket.PAST_DUE_90_PLUS.value
        ]

        bucket_data = {
            b: {"count": 0, "nominal": 0.0, "expected_loss": 0.0, "days_past_due_sum": 0.0} 
            for b in buckets_order
        }

        for idx, inv in enumerate(invoices):
            b_val = inv.aging_bucket.value if hasattr(inv.aging_bucket, 'value') else str(inv.aging_bucket)
            if b_val not in bucket_data:
                b_val = AgingBucket.CURRENT.value
            
            bucket_data[b_val]["count"] += 1
            bucket_data[b_val]["nominal"] += inv.amount
            bucket_data[b_val]["days_past_due_sum"] += inv.days_past_due
            
            # Loss = Amount * Stressed_PD * (1 - Recovery)
            loss_i = inv.amount * stressed_pds[idx] * (1.0 - inv.recovery_rate)
            bucket_data[b_val]["expected_loss"] += loss_i

        metrics = []
        for b in buckets_order:
            d = bucket_data[b]
            nom = d["nominal"]
            loss = d["expected_loss"]
            cnt = d["count"]
            loss_pct = (loss / nom * 100.0) if nom > 0 else 0.0
            avg_dpd = (d["days_past_due_sum"] / cnt) if cnt > 0 else 0.0
            share = (nom / total_nominal * 100.0) if total_nominal > 0 else 0.0

            metrics.append(
                AgingBucketMetric(
                    bucket=b,
                    count=cnt,
                    total_nominal=round(nom, 2),
                    expected_loss=round(loss, 2),
                    loss_percentage=round(loss_pct, 2),
                    avg_days_past_due=round(avg_dpd, 1),
                    share_of_portfolio=round(share, 2)
                )
            )

        return metrics

    def _empty_response(self, params: SimulationPolicyParams) -> SimulationResponse:
        zero_kpis = RiskKpis(
            total_nominal_ar=0.0,
            expected_collection=0.0,
            expected_loss=0.0,
            expected_loss_pct=0.0,
            p5_final=0.0,
            p50_final=0.0,
            p95_final=0.0,
            cfar_95=0.0,
            cvar_95=0.0,
            worst_case=0.0,
            best_case=0.0,
            deficit_probability=0.0,
            npv_expected=0.0,
            execution_time_ms=0.0
        )
        return SimulationResponse(
            kpis=zero_kpis,
            fan_chart_data=[],
            aging_breakdown=[],
            invoices_count=0,
            simulations_run=params.num_simulations,
            horizon_days=params.horizon_days
        )
