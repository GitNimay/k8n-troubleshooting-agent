def normalize_confidence(value: object) -> int:
    try:
        confidence = int(value)
    except (TypeError, ValueError):
        return 0

    return max(0, min(confidence, 100))


def fallback_confidence(investigation: dict) -> int:
    confidence = 35

    if investigation.get("pods", {}).get("problematic_pods"):
        confidence += 20
    if investigation.get("logs", {}).get("logs"):
        confidence += 15
    if investigation.get("events", {}).get("findings"):
        confidence += 15
    if investigation.get("deployments", {}).get("unhealthy_deployments"):
        confidence += 10
    if investigation.get("network", {}).get("findings"):
        confidence += 10

    return min(confidence, 85)

