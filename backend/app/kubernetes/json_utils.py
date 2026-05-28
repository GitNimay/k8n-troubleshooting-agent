import json

from app.kubernetes.executor import KubectlResult


def parse_json_result(result: KubectlResult) -> tuple[dict | None, str | None]:
    if not result.success:
        return None, result.stderr or "kubectl command failed"

    try:
        return json.loads(result.stdout), None
    except json.JSONDecodeError as error:
        return None, f"Failed to parse kubectl JSON output: {error}"

