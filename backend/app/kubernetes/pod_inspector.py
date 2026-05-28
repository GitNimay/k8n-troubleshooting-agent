from datetime import UTC, datetime

from app.kubernetes.executor import run_kubectl
from app.kubernetes.json_utils import parse_json_result

UNHEALTHY_REASONS = {
    "CrashLoopBackOff",
    "ImagePullBackOff",
    "ErrImagePull",
    "Pending",
    "Error",
    "Failed",
    "OOMKilled",
}

STUCK_CONTAINER_CREATING_AFTER_SECONDS = 300


def inspect_pods(context: str | None = None) -> dict:
    result = run_kubectl(["get", "pods", "-A", "-o", "json"], context=context)
    payload, error = parse_json_result(result)
    if error:
        return {
            "healthy": False,
            "error": error,
            "problematic_pods": [],
            "raw": result.to_dict(),
        }

    items = payload.get("items", [])
    problematic_pods = []

    for pod in items:
        metadata = pod.get("metadata", {})
        status = pod.get("status", {})
        namespace = metadata.get("namespace", "default")
        name = metadata.get("name", "unknown")
        phase = status.get("phase", "Unknown")
        reasons = _collect_pod_reasons(status)

        if phase in UNHEALTHY_REASONS:
            reasons.add(phase)

        unhealthy_reasons = sorted(reasons.intersection(UNHEALTHY_REASONS))
        if "ContainerCreating" in reasons and _is_stuck_container_creating(metadata):
            unhealthy_reasons.append("ContainerCreating")

        if unhealthy_reasons:
            problematic_pods.append(
                {
                    "name": name,
                    "namespace": namespace,
                    "status": unhealthy_reasons[0],
                    "reasons": unhealthy_reasons,
                    "phase": phase,
                }
            )

    return {
        "healthy": len(problematic_pods) == 0,
        "total_pods": len(items),
        "problematic_pods": problematic_pods,
    }


def _collect_pod_reasons(status: dict) -> set[str]:
    reasons: set[str] = set()
    status_groups = [
        *status.get("initContainerStatuses", []),
        *status.get("containerStatuses", []),
    ]

    for container_status in status_groups:
        state = container_status.get("state", {})
        last_state = container_status.get("lastState", {})

        waiting_reason = state.get("waiting", {}).get("reason")
        terminated_reason = state.get("terminated", {}).get("reason")
        last_terminated_reason = last_state.get("terminated", {}).get("reason")

        for reason in [waiting_reason, terminated_reason, last_terminated_reason]:
            if reason:
                reasons.add(reason)

    return reasons


def _is_stuck_container_creating(metadata: dict) -> bool:
    created_at = metadata.get("creationTimestamp")
    if not created_at:
        return True

    try:
        created = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
    except ValueError:
        return True

    age_seconds = (datetime.now(UTC) - created).total_seconds()
    return age_seconds >= STUCK_CONTAINER_CREATING_AFTER_SECONDS
