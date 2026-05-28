from app.kubernetes.executor import run_kubectl

FAILURE_KEYWORDS = [
    "exception",
    "error",
    "failed",
    "failure",
    "connection refused",
    "connection reset",
    "timeout",
    "timed out",
    "missing",
    "not found",
    "environment variable",
    "env var",
    "crash",
    "panic",
    "fatal",
    "startup",
    "image",
]


def collect_logs(
    problematic_pods: list[dict],
    tail_lines: int = 120,
    context: str | None = None,
) -> dict:
    collected_logs = []

    for pod in problematic_pods[:10]:
        namespace = pod.get("namespace", "default")
        name = pod.get("name")
        if not name:
            continue

        current = _collect_pod_log(namespace, name, tail_lines, context=context)
        previous = _collect_pod_log(namespace, name, tail_lines, previous=True, context=context)

        collected_logs.append(
            {
                "pod": name,
                "namespace": namespace,
                "status": pod.get("status"),
                "current": current,
                "previous": previous,
            }
        )

    return {
        "checked_pods": len(collected_logs),
        "logs": collected_logs,
    }


def _collect_pod_log(
    namespace: str,
    pod_name: str,
    tail_lines: int,
    previous: bool = False,
    context: str | None = None,
) -> dict:
    args = [
        "logs",
        pod_name,
        "-n",
        namespace,
        "--all-containers=true",
        f"--tail={tail_lines}",
    ]
    if previous:
        args.append("--previous")

    result = run_kubectl(args, timeout_seconds=45, context=context)
    if not result.success:
        return {
            "available": False,
            "error": result.stderr,
            "relevant_lines": [],
        }

    lines = result.stdout.splitlines()
    relevant_lines = _extract_relevant_lines(lines)

    return {
        "available": True,
        "line_count": len(lines),
        "relevant_lines": relevant_lines,
        "tail": lines[-20:],
    }


def _extract_relevant_lines(lines: list[str], max_lines: int = 30) -> list[str]:
    matches = []
    for line in lines:
        normalized = line.lower()
        if any(keyword in normalized for keyword in FAILURE_KEYWORDS):
            matches.append(line[:500])

    return matches[-max_lines:]
