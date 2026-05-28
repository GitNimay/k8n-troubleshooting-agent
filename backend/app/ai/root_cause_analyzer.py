import json
import re

from loguru import logger

from app.ai.confidence_engine import fallback_confidence, normalize_confidence
from app.ai.fix_recommendation_engine import normalize_kubectl_commands
from app.ai.llm_client import LLMClientError, create_chat_completion
from app.ai.prompt_builder import build_troubleshooting_messages


def analyze_root_cause(investigation: dict) -> dict:
    messages = build_troubleshooting_messages(investigation)

    try:
        content = create_chat_completion(messages)
        diagnosis = _parse_diagnosis(content)
        return _normalize_diagnosis(diagnosis, investigation)
    except LLMClientError as error:
        logger.error("AI diagnosis failed: {}", error)
        return _fallback_diagnosis(investigation, str(error))


def _parse_diagnosis(content: str) -> dict:
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        match = re.search(r"\{.*\}", content, flags=re.DOTALL)
        if not match:
            raise LLMClientError("AI response was not valid JSON")
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError as error:
            raise LLMClientError(f"AI response JSON could not be parsed: {error}") from error


def _normalize_diagnosis(diagnosis: dict, investigation: dict) -> dict:
    if not isinstance(diagnosis, dict):
        raise LLMClientError("AI response JSON was not an object")

    kubectl_commands = normalize_kubectl_commands(diagnosis.get("kubectl_commands"))
    confidence = normalize_confidence(diagnosis.get("confidence"))

    if confidence == 0:
        confidence = fallback_confidence(investigation)

    return {
        "root_cause": str(diagnosis.get("root_cause") or "Insufficient evidence to determine a single root cause."),
        "explanation": str(diagnosis.get("explanation") or "The collected evidence did not contain a clear failure signature."),
        "fix": str(diagnosis.get("fix") or "Review the problematic Kubernetes resources and recent deployment changes."),
        "kubectl_commands": kubectl_commands,
        "prevention": str(diagnosis.get("prevention") or "Add health checks, deployment validation, and alerting for this failure mode."),
        "confidence": confidence,
        "confidence_reasoning": _normalize_reasoning(diagnosis.get("confidence_reasoning")),
    }


def _normalize_reasoning(reasoning: object) -> list[str]:
    if isinstance(reasoning, str):
        return [reasoning]

    if not isinstance(reasoning, list):
        return []

    return [str(item) for item in reasoning if item][:5]


def _fallback_diagnosis(investigation: dict, error: str) -> dict:
    is_rate_limited = "HTTP 429" in error or "rate-limited" in error.lower()
    fix = (
        "The selected OpenRouter model is currently rate-limited. Wait a minute and retry, "
        "or set OPENROUTER_MODEL to another available model such as openai/gpt-4o-mini."
        if is_rate_limited
        else "Verify OPENROUTER_API_KEY, OPENROUTER_MODEL, and network access to OpenRouter, then retry the investigation."
    )
    prevention = (
        "Use a paid or BYOK OpenRouter model for demos and incident response so free-model upstream throttling does not block diagnosis."
        if is_rate_limited
        else "Add backend configuration checks for required AI environment variables before incident response use."
    )

    return {
        "root_cause": "AI diagnosis unavailable",
        "explanation": (
            "Kubernetes evidence was collected, but the AI reasoning step could not complete. "
            f"Reason: {error}"
        ),
        "fix": fix,
        "kubectl_commands": [
            "kubectl get pods -A",
            "kubectl get events -A",
            "kubectl get deployments -A",
        ],
        "prevention": prevention,
        "confidence": fallback_confidence(investigation),
        "confidence_reasoning": [
            "Confidence is based on collected Kubernetes evidence only because the LLM call failed.",
        ],
    }
