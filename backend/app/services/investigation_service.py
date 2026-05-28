from loguru import logger

from app.kubernetes.deployment_inspector import inspect_deployments
from app.kubernetes.events_analyzer import analyze_events
from app.kubernetes.logs_collector import collect_logs
from app.kubernetes.network_inspector import inspect_network
from app.kubernetes.pod_inspector import inspect_pods


def run_investigation(progress_callback=None, context: str | None = None) -> dict:
    logger.info("Starting Kubernetes investigation")

    _publish(progress_callback, "checking_pods", "Checking Pods", "running")
    pods = inspect_pods(context=context)
    _publish(progress_callback, "checking_pods", "Checking Pods", "completed")

    _publish(progress_callback, "reading_logs", "Reading Logs", "running")
    logs = collect_logs(pods.get("problematic_pods", []), context=context)
    _publish(progress_callback, "reading_logs", "Reading Logs", "completed")

    _publish(progress_callback, "analyzing_events", "Analyzing Events", "running")
    events = analyze_events(context=context)
    _publish(progress_callback, "analyzing_events", "Analyzing Events", "completed")

    _publish(progress_callback, "inspecting_deployments", "Inspecting Deployments", "running")
    deployments = inspect_deployments(context=context)
    _publish(progress_callback, "inspecting_deployments", "Inspecting Deployments", "completed")

    _publish(progress_callback, "checking_networking", "Checking Networking", "running")
    network = inspect_network(context=context)
    _publish(progress_callback, "checking_networking", "Checking Networking", "completed")

    logger.info("Kubernetes investigation completed")

    return {
        "pods": pods,
        "logs": logs,
        "events": events,
        "deployments": deployments,
        "network": network,
        "context": context,
    }


def has_critical_findings(investigation: dict) -> bool:
    return any(
        [
            bool(investigation.get("pods", {}).get("problematic_pods")),
            bool(investigation.get("events", {}).get("findings")),
            bool(investigation.get("deployments", {}).get("unhealthy_deployments")),
            bool(investigation.get("network", {}).get("findings")),
        ]
    )


def build_healthy_diagnosis(context: str | None = None) -> dict:
    suffix = f" in context '{context}'" if context else ""
    return {
        "root_cause": "No critical Kubernetes issues detected",
        "explanation": f"Pods, recent events, deployments, and service endpoints did not show critical failure signals{suffix}.",
        "fix": "No immediate fix is required. Continue monitoring the cluster and investigate only if users are affected.",
        "kubectl_commands": [
            "kubectl get pods -A",
            "kubectl get events -A",
            "kubectl get deployments -A",
            "kubectl get svc -A",
        ],
        "prevention": "Keep readiness probes, resource requests, alerts, and deployment checks in place so failures are caught early.",
        "confidence": 82,
        "confidence_reasoning": [
            "No problematic pods were detected.",
            "No critical event, deployment, or service endpoint findings were detected.",
        ],
    }


def _publish(progress_callback, step: str, label: str, status: str) -> None:
    if progress_callback:
        progress_callback(step, label, status)
