import logging
import json
import re
from datetime import date
from typing import Tuple

import ollama
from openai import OpenAI

from app.config import settings
from app.models.schemas import LLMSource

logger = logging.getLogger(__name__)

# In-memory daily token counter (resets on restart — sufficient for dev)
_daily_tokens: dict[str, int] = {}


def _get_today_tokens() -> int:
    today = str(date.today())
    return _daily_tokens.get(today, 0)


def _add_tokens(count: int):
    today = str(date.today())
    _daily_tokens[today] = _daily_tokens.get(today, 0) + count


def get_daily_token_usage() -> int:
    return _get_today_tokens()


SYSTEM_PROMPT = """You are SOVARIS, an expert AI system for validating automotive OTA (Over-The-Air) software updates.
You have deep knowledge of UN Regulation 156, AUTOSAR, ASIL safety levels, and automotive cybersecurity.

Given an OTA package description and relevant technical context, analyze the update and respond ONLY with a valid JSON object.

Your JSON must follow this exact schema:
{
  "risk_score": <float 0.0-1.0>,
  "risk_level": <"low"|"medium"|"high"|"critical">,
  "affected_ecus": [
    {
      "ecu_name": <string>,
      "impact_type": <"firmware"|"config"|"calibration">,
      "safety_critical": <boolean>,
      "description": <string, max 20 words>
    }
  ],
  "summary": <string, 2-3 sentences>,
  "recommendation": <string, 1-2 sentences, actionable>,
  "rollback_safe": <boolean>,
  "un_r156_compliant": <boolean>
}

Risk score guidelines:
- 0.0-0.3: Low risk (infotainment, UI, maps)
- 0.3-0.6: Medium risk (ADAS calibration, sensor params)
- 0.6-0.8: High risk (powertrain, gateway, ASIL C)
- 0.8-1.0: Critical (braking, steering, airbag, ASIL D)

Respond ONLY with the JSON object. No markdown, no explanation, no preamble."""


def _build_user_prompt(package_name: str, description: str, context: str) -> str:
    return f"""OTA PACKAGE: {package_name}
DESCRIPTION: {description}

RELEVANT TECHNICAL CONTEXT FROM KNOWLEDGE BASE:
{context}

Analyze this OTA update and return the JSON validation report."""


def _parse_llm_response(raw: str) -> dict:
    """Extract JSON from LLM response, handling markdown fences."""
    cleaned = re.sub(r"```(?:json)?", "", raw).strip().rstrip("`").strip()
    # Find the first { ... } block
    match = re.search(r"\{.*\}", cleaned, re.DOTALL)
    if match:
        return json.loads(match.group())
    return json.loads(cleaned)


def _call_ollama(package_name: str, description: str, context: str) -> Tuple[dict, int]:
    user_msg = _build_user_prompt(package_name, description, context)
    response = ollama.chat(
        model=settings.ollama_model,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        options={"temperature": 0.1}
    )
    raw = response["message"]["content"]
    tokens = response.get("eval_count", 0) + response.get("prompt_eval_count", 0)
    return _parse_llm_response(raw), tokens


def _call_openai(package_name: str, description: str, context: str) -> Tuple[dict, int]:
    client = OpenAI(api_key=settings.openai_api_key)
    user_msg = _build_user_prompt(package_name, description, context)
    response = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_msg},
        ],
        temperature=0.1,
        max_tokens=800,
        response_format={"type": "json_object"}
    )
    raw = response.choices[0].message.content
    tokens = response.usage.total_tokens if response.usage else 0
    _add_tokens(tokens)
    return _parse_llm_response(raw), tokens


def route_and_analyze(
    package_name: str,
    description: str,
    context: str,
    complexity_hint: float = 0.5
) -> Tuple[dict, LLMSource, int]:
    """
    Smart router: use Ollama for simple cases, OpenAI for complex ones.
    complexity_hint: 0-1 float derived from package metadata (size, ECU count, etc.)

    Returns (parsed_result_dict, llm_source, tokens_used)
    """
    use_openai = (
        complexity_hint >= settings.complexity_threshold
        and settings.openai_api_key
        and settings.openai_api_key != "sk-your-key-here"
        and _get_today_tokens() < settings.openai_daily_token_limit
    )

    if use_openai:
        try:
            logger.info(f"Routing to OpenAI (complexity={complexity_hint:.2f})")
            result, tokens = _call_openai(package_name, description, context)
            return result, LLMSource.OPENAI, tokens
        except Exception as e:
            logger.warning(f"OpenAI failed ({e}), falling back to Ollama")

    # Ollama path
    try:
        logger.info(f"Routing to Ollama (complexity={complexity_hint:.2f})")
        result, tokens = _call_ollama(package_name, description, context)
        return result, LLMSource.OLLAMA, tokens
    except Exception as e:
        logger.error(f"Ollama failed: {e}")
        # Return safe default
        return {
            "risk_score": 0.5,
            "risk_level": "medium",
            "affected_ecus": [],
            "summary": "Analysis unavailable — LLM connection failed. Manual review required.",
            "recommendation": "Ensure Ollama is running: ollama serve",
            "rollback_safe": True,
            "un_r156_compliant": False
        }, LLMSource.OLLAMA, 0
