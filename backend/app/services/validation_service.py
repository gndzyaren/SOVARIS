import uuid
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.rag_pipeline import rag_pipeline
from app.core.llm_router import route_and_analyze, get_daily_token_usage
from app.models.schemas import (
    ValidationResult, RiskLevel, ECUImpact, HistoryItem, DailyStats
)
from app.config import settings

logger = logging.getLogger(__name__)

# In-memory history store (persists during session)
_history: list[ValidationResult] = []


def _estimate_complexity(package_name: str, description: str, file_size_kb: float) -> float:
    """
    Heuristic complexity score from package metadata.
    This decides whether to use Ollama or OpenAI.
    """
    score = 0.0
    text = (package_name + " " + description).lower()

    # Safety-critical keywords
    critical_keywords = ["brake", "abs", "ebs", "airbag", "steering", "eps", "asil-d", "asild"]
    high_keywords = ["powertrain", "engine", "transmission", "gateway", "firewall", "asil-c"]
    medium_keywords = ["adas", "camera", "radar", "lidar", "fusion", "asil-b", "calibration"]

    if any(k in text for k in critical_keywords):
        score += 0.9
    elif any(k in text for k in high_keywords):
        score += 0.65
    elif any(k in text for k in medium_keywords):
        score += 0.4
    else:
        score += 0.1

    # Large packages are more complex
    if file_size_kb > 5000:
        score = min(score + 0.2, 1.0)
    elif file_size_kb > 1000:
        score = min(score + 0.1, 1.0)

    return min(score, 1.0)


def _map_risk_level(score: float) -> RiskLevel:
    if score < 0.3:
        return RiskLevel.LOW
    elif score < 0.6:
        return RiskLevel.MEDIUM
    elif score < 0.8:
        return RiskLevel.HIGH
    return RiskLevel.CRITICAL


def validate_package(
    package_name: str,
    description: str,
    file_content: Optional[bytes] = None,
    file_size_kb: float = 0.0
) -> ValidationResult:
    """
    Main validation entry point.
    1. Retrieve RAG context
    2. Route to LLM
    3. Parse and enrich result
    4. Store in history
    """
    logger.info(f"Starting validation for: {package_name}")

    # Step 1: RAG context retrieval
    query = f"{package_name} {description} ECU firmware OTA update safety"
    context, sources = rag_pipeline.retrieve_context(query, k=5)

    # Step 2: Estimate complexity for routing decision
    complexity = _estimate_complexity(package_name, description, file_size_kb)

    # Step 3: LLM analysis
    raw_result, llm_source, tokens = route_and_analyze(
        package_name=package_name,
        description=description,
        context=context,
        complexity_hint=complexity
    )

    # Step 4: Build validated result
    risk_score = float(raw_result.get("risk_score", 0.5))
    risk_level_str = raw_result.get("risk_level", _map_risk_level(risk_score).value)

    # Normalize risk_level
    try:
        risk_level = RiskLevel(risk_level_str)
    except ValueError:
        risk_level = _map_risk_level(risk_score)

    # Parse ECU impacts
    affected_ecus = []
    for ecu in raw_result.get("affected_ecus", []):
        try:
            affected_ecus.append(ECUImpact(
                ecu_name=ecu.get("ecu_name", "Unknown ECU"),
                impact_type=ecu.get("impact_type", "firmware"),
                safety_critical=bool(ecu.get("safety_critical", False)),
                description=ecu.get("description", "")
            ))
        except Exception:
            pass

    result = ValidationResult(
        id=str(uuid.uuid4()),
        timestamp=datetime.now(),
        package_name=package_name,
        package_size_kb=file_size_kb,
        risk_score=risk_score,
        risk_level=risk_level,
        llm_source=llm_source,
        affected_ecus=affected_ecus,
        summary=raw_result.get("summary", "Analysis complete."),
        recommendation=raw_result.get("recommendation", "Review manually."),
        rollback_safe=bool(raw_result.get("rollback_safe", True)),
        un_r156_compliant=bool(raw_result.get("un_r156_compliant", False)),
        context_docs_used=sources,
        raw_analysis=str(raw_result),
        tokens_used=tokens
    )

    _history.insert(0, result)
    logger.info(f"Validation complete: {result.id} | risk={risk_level.value} | LLM={llm_source.value}")
    return result


def get_history(limit: int = 20) -> list[HistoryItem]:
    return [
        HistoryItem(
            id=v.id,
            timestamp=v.timestamp,
            package_name=v.package_name,
            risk_level=v.risk_level,
            risk_score=v.risk_score,
            recommendation=v.recommendation,
            llm_source=v.llm_source
        )
        for v in _history[:limit]
    ]


def get_validation_by_id(validation_id: str) -> Optional[ValidationResult]:
    for v in _history:
        if v.id == validation_id:
            return v
    return None


def get_daily_stats() -> DailyStats:
    from datetime import date
    today_results = [v for v in _history if v.timestamp.date() == date.today()]
    high_risk = [v for v in today_results if v.risk_level in (RiskLevel.HIGH, RiskLevel.CRITICAL)]
    avg_score = (
        sum(v.risk_score for v in today_results) / len(today_results)
        if today_results else 0.0
    )
    return DailyStats(
        total_validations=len(today_results),
        openai_tokens_used=get_daily_token_usage(),
        openai_token_limit=settings.openai_daily_token_limit,
        high_risk_count=len(high_risk),
        avg_risk_score=round(avg_score, 3)
    )
