import json


SYSTEM_PROMPT = """
You are a Senior Kubernetes SRE helping troubleshoot a live incident.
Use only the evidence provided. Correlate pod state, logs, events, deployment health, and networking.
Be specific, practical, and beginner friendly.

Return only valid JSON with this exact shape:
{
  "root_cause": "short direct root cause",
  "explanation": "why the evidence supports this root cause",
  "fix": "actionable Kubernetes-specific fix",
  "kubectl_commands": ["kubectl command 1", "kubectl command 2"],
  "prevention": "how to prevent this class of issue",
  "confidence": 0,
  "confidence_reasoning": ["evidence point 1", "evidence point 2"]
}

Rules:
- Do not invent resources that are not in the evidence.
- If evidence is insufficient, say so and lower confidence.
- Prefer kubectl commands that inspect or safely edit Kubernetes resources.
- Confidence must be an integer from 0 to 100.
""".strip()


def build_troubleshooting_messages(investigation: dict) -> list[dict[str, str]]:
    evidence = {
        "pod_status": investigation.get("pods", {}),
        "logs": investigation.get("logs", {}),
        "events": investigation.get("events", {}),
        "deployment_health": investigation.get("deployments", {}),
        "networking_findings": investigation.get("network", {}),
    }

    user_prompt = (
        "Analyze this Kubernetes investigation evidence and produce a diagnosis.\n\n"
        f"{_compact_json(evidence)}"
    )

    return [
        {"role": "system", "content": SYSTEM_PROMPT},
        {"role": "user", "content": user_prompt},
    ]


def _compact_json(payload: dict, max_chars: int = 18000) -> str:
    text = json.dumps(payload, indent=2, default=str)
    if len(text) <= max_chars:
        return text

    return text[:max_chars] + "\n...TRUNCATED..."

