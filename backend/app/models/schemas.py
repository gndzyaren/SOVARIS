from pydantic import BaseModel, Field
from typing import Optional, List
from datetime import datetime
from enum import Enum


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class LLMSource(str, Enum):
    OLLAMA = "ollama"
    OPENAI = "openai"


class ECUImpact(BaseModel):
    ecu_name: str
    impact_type: str  # "firmware", "config", "calibration"
    safety_critical: bool
    description: str


class ValidationResult(BaseModel):
    id: str
    timestamp: datetime
    package_name: str
    package_size_kb: float
    risk_score: float = Field(ge=0.0, le=1.0)
    risk_level: RiskLevel
    llm_source: LLMSource
    affected_ecus: List[ECUImpact]
    summary: str
    recommendation: str
    rollback_safe: bool
    un_r156_compliant: bool
    context_docs_used: List[str]
    raw_analysis: str
    tokens_used: int = 0


class ValidationRequest(BaseModel):
    package_name: str
    description: Optional[str] = ""


class HistoryItem(BaseModel):
    id: str
    timestamp: datetime
    package_name: str
    risk_level: RiskLevel
    risk_score: float
    recommendation: str
    llm_source: LLMSource


class DailyStats(BaseModel):
    total_validations: int
    openai_tokens_used: int
    openai_token_limit: int
    high_risk_count: int
    avg_risk_score: float
