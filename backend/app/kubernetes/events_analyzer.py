from app.kubernetes.executor import run_kubectl
from app.kubernetes.json_utils import parse_json_result

IMPORTANT_REASONS = {
    "FailedScheduling",
    "BackOff",
    "FailedMount",
    "FailedPull",
    "ErrImagePull",
    "Unhealthy",
}


def analyze_events(context: str | None = None) -> dict:
    result = run_kubectl(["get", "events", "-A", "-o", "json"], context=context)
    payload, error = parse_json_result(result)
    if error:
        return {
            "healthy": False,
            "error": error,
            "findings": [],
            "raw": result.to_dict(),
        }

    findings = []
    for event in payload.get("items", []):
        reason = event.get("reason", "")
        message = event.get("message", "")
        if reason not in IMPORTANT_REASONS and not _message_mentions_issue(message):
            continue

        involved_object = event.get("involvedObject", {})
        metadata = event.get("metadata", {})
        findings.append(
            {
                "namespace": metadata.get("namespace", involved_object.get("namespace", "default")),
                "reason": reason,
                "type": event.get("type"),
                "object_kind": involved_object.get("kind"),
                "object_name": involved_object.get("name"),
                "message": message[:500],
                "count": event.get("count", 1),
                "last_seen": event.get("lastTimestamp") or event.get("eventTime"),
            }
        )

    return {
        "healthy": len(findings) == 0,
        "total_events": len(payload.get("items", [])),
        "findings": findings[-50:],
    }


def _message_mentions_issue(message: str) -> bool:
    normalized = message.lower()
    return any(
        keyword in normalized
        for keyword in [
            "failed",
            "back-off",
            "backoff",
            "unhealthy",
            "errimagepull",
            "failedmount",
            "failedscheduling",
        ]
    )
