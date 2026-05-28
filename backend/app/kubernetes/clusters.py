import os

from app.core.config import settings
from app.kubernetes.executor import run_kubectl
from app.kubernetes.json_utils import parse_json_result


class KubernetesAccessError(Exception):
    def __init__(self, message: str, details: list[str] | None = None) -> None:
        super().__init__(message)
        self.message = message
        self.details = details or []


def list_kubeconfig_contexts() -> dict:
    _ensure_kubeconfig_path_exists()

    view_result = run_kubectl(["config", "view", "-o", "json"], timeout_seconds=10)
    payload, error = parse_json_result(view_result)
    if error or payload is None:
        raise KubernetesAccessError(
            "Unable to read Kubernetes contexts from kubeconfig.",
            [
                "Verify KUBECONFIG_PATH points to a readable kubeconfig file.",
                "Verify kubectl is installed and available inside the backend container.",
                _clean_error(error or view_result.stderr),
            ],
        )

    current_context = _current_context()
    contexts = []
    for item in payload.get("contexts", []):
        context = item.get("context", {})
        name = item.get("name")
        if not name:
            continue

        contexts.append(
            {
                "name": name,
                "cluster": context.get("cluster", "unknown"),
                "user": context.get("user", "unknown"),
                "namespace": context.get("namespace", "default"),
                "current": name == current_context,
            }
        )

    return {
        "status": "success",
        "current_context": current_context,
        "clusters": contexts,
    }


def validate_context(context: str | None) -> str | None:
    if not context:
        return None

    contexts = list_kubeconfig_contexts()["clusters"]
    known_contexts = {item["name"] for item in contexts}
    if context not in known_contexts:
        raise KubernetesAccessError(
            f"Kubernetes context '{context}' was not found in kubeconfig.",
            [
                "Refresh the cluster list and choose one of the available contexts.",
                "If the cluster is in WSL, make sure the backend can read the same kubeconfig file.",
            ],
        )

    return context


def preflight_cluster_access(context: str | None = None) -> None:
    _ensure_kubeconfig_path_exists()
    result = run_kubectl(["cluster-info"], timeout_seconds=15, context=context)
    if result.success:
        return

    raise KubernetesAccessError(
        "Unable to connect to Kubernetes cluster.",
        [
            "Verify the selected kubeconfig context is correct.",
            "Verify the cluster is running and reachable from the backend container.",
            "Verify kubectl permissions for pods, logs, events, deployments, services, and endpoints.",
            _clean_error(result.stderr),
        ],
    )


def _ensure_kubeconfig_path_exists() -> None:
    if not settings.kubeconfig_path:
        return

    if os.path.exists(settings.kubeconfig_path):
        return

    raise KubernetesAccessError(
        "Configured kubeconfig file was not found.",
        [
            f"KUBECONFIG_PATH is set to: {settings.kubeconfig_path}",
            "Use a path that exists inside the backend environment.",
            "For Docker, mount the kubeconfig file into the container and point KUBECONFIG_PATH to the mounted path.",
        ],
    )


def _current_context() -> str | None:
    result = run_kubectl(["config", "current-context"], timeout_seconds=10)
    if not result.success:
        return None
    return result.stdout.strip() or None


def _clean_error(value: str | None) -> str:
    if not value:
        return "kubectl did not return a detailed error."
    return value.strip().splitlines()[-1][:500]
