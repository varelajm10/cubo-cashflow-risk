import os
from typing import List
from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    PROJECT_NAME: str = "CUBO CashFlow Risk Engine"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Database Settings
    # Supports PostgreSQL or automatic fallback to SQLite async
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL", 
        "postgresql+asyncpg://cubo_user:cubo_password@localhost:5432/cubo_cashflow"
    )
    SQLITE_FALLBACK_URL: str = "sqlite+aiosqlite:///./cubo_cashflow.db"
    
    # CORS
    CORS_ORIGINS: List[str] = [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:8000",
        "http://127.0.0.1:8000",
        "*"
    ]
    
    # Default quantitative simulation parameters
    DEFAULT_SIMULATIONS: int = 5000
    DEFAULT_HORIZON_DAYS: int = 90
    RANDOM_SEED: int = 42

    model_config = SettingsConfigDict(
        env_file=".env", 
        case_sensitive=True,
        extra="ignore"
    )

settings = Settings()
