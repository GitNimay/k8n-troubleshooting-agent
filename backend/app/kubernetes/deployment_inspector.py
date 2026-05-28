from app.kubernetes.executor import run_kubectl
from app.kubernetes.json_utils import parse_json_result


def inspect_deployments(context: str | None = None) -> dict:
    result = run_kubectl(["get", "deployments", "-A", "-o", "json"], context=context)
    payload, error = parse_json_result(result)
    if error:
        return {
            "healthy": False,
            "error": error,
            "unhealthy_deployments": [],
            "raw": result.to_dict(),
        }

    unhealthy_deployments = []
    for deployment in payload.get("items", []):
        metadata = deployment.get("metadata", {})
        spec = deployment.get("spec", {})
        status = deployment.get("status", {})
        desired = spec.get("replicas", 0)
        available = status.get("availableReplicas", 0)
        unavailable = status.get("unavailableReplicas", 0)
        reasons = _deployment_reasons(status, desired, available, unavailable)

        if reasons:
            unhealthy_deployments.append(
                {
                    "name": metadata.get("name", "unknown"),
                    "namespace": metadata.get("namespace", "default"),
                    "desired_replicas": desired,
                    "available_replicas": available,
                    "unavailable_replicas": unavailable,
                    "reasons": reasons,
                    "conditions": status.get("conditions", []),
                }
            )

    return {
        "healthy": len(unhealthy_deployments) == 0,
        "total_deployments": len(payload.get("items", [])),
        "unhealthy_deployments": unhealthy_deployments,
    }


def _deployment_reasons(status: dict, desired: int, available: int, unavailable: int) -> list[str]:
    reasons = []

    if desired > available:
        reasons.append("Not all desired replicas are available")

    if unavailable > 0:
        reasons.append("Deployment has unavailable replicas")

    for condition in status.get("conditions", []):
        condition_type = condition.get("type")
        condition_status = condition.get("status")
        reason = condition.get("reason")

        if condition_type == "Progressing" and reason == "ProgressDeadlineExceeded":
            reasons.append("Rollout exceeded progress deadline")
        if condition_type == "Available" and condition_status == "False":
            reasons.append("Deployment is not available")

    return reasons
