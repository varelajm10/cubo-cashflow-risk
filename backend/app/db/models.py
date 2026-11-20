import datetime
import json
import logging
from typing import AsyncGenerator
from sqlalchemy import (
    Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
)
from sqlalchemy.orm import declarative_base, relationship
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from app.core.config import settings

logger = logging.getLogger("cubo.db")

Base = declarative_base()

class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    description = Column(String(255), nullable=True)
    currency = Column(String(10), default="USD")
    total_amount = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    invoices = relationship("Invoice", back_populates="portfolio", cascade="all, delete-orphan")
    simulations = relationship("SimulationRun", back_populates="portfolio", cascade="all, delete-orphan")

class Invoice(Base):
    __tablename__ = "invoices"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=False, index=True)
    invoice_number = Column(String(50), nullable=False, index=True)
    client_name = Column(String(150), nullable=False, index=True)
    client_tax_id = Column(String(50), nullable=True)
    client_tier = Column(String(20), default="BBB")  # AAA, AA, A, BBB, HIGH_RISK
    amount = Column(Float, nullable=False)
    issue_date = Column(DateTime, nullable=False)
    due_date = Column(DateTime, nullable=False)
    days_past_due = Column(Integer, default=0)
    aging_bucket = Column(String(30), default="CURRENT")  # CURRENT, 1-30, 31-60, 61-90, 90+
    base_pd = Column(Float, default=0.02)  # Base probability of default
    expected_delay_days = Column(Float, default=5.0)
    recovery_rate = Column(Float, default=0.20)
    is_collected = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="invoices")

class SimulationRun(Base):
    __tablename__ = "simulation_runs"

    id = Column(Integer, primary_key=True, index=True)
    portfolio_id = Column(Integer, ForeignKey("portfolios.id"), nullable=True, index=True)
    num_simulations = Column(Integer, default=5000)
    horizon_days = Column(Integer, default=90)
    stress_factor_pd = Column(Float, default=1.0)
    macro_delay_shift = Column(Float, default=0.0)
    
    # Quantitative Risk Metrics Results
    nominal_exposure = Column(Float, nullable=False)
    expected_collection = Column(Float, nullable=False)
    expected_loss = Column(Float, nullable=False)
    p5_final = Column(Float, nullable=False)
    p50_final = Column(Float, nullable=False)
    p95_final = Column(Float, nullable=False)
    cfar_95 = Column(Float, nullable=False)  # Cash Flow at Risk (Median - P5)
    cvar_95 = Column(Float, nullable=False)  # Conditional VaR (Expected Shortfall)
    deficit_probability = Column(Float, default=0.0)
    
    summary_json = Column(Text, nullable=True)  # JSON serialized full distribution & fan chart
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    portfolio = relationship("Portfolio", back_populates="simulations")

# Database Engine initialization with auto-fallback
def create_engine_with_fallback():
    try:
        engine = create_async_engine(settings.DATABASE_URL, echo=False, pool_pre_ping=True)
        return engine
    except Exception as e:
        logger.warning(f"Failed to initialize primary database {settings.DATABASE_URL}: {e}. Falling back to SQLite.")
        return create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False)

engine = create_engine_with_fallback()
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with async_session_factory() as session:
        try:
            yield session
        finally:
            await session.close()

async def init_db():
    global engine, async_session_factory
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("Database schemas initialized successfully.")
    except Exception as e:
        logger.warning(f"Primary DB connection failed ({e}). Re-initializing on SQLite fallback...")
        engine = create_async_engine(settings.SQLITE_FALLBACK_URL, echo=False)
        async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        logger.info("SQLite fallback database initialized successfully.")
