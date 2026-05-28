import os
import subprocess
from dataclasses import dataclass

from loguru import logger

from app.core.config import settings


@dataclass
class KubectlResult:
    command: list[str]
    success: bool
    stdout: str
    stderr: str
    return_code: int | None

    def to_dict(self) -> dict:
        return {
            "command": " ".join(self.command),
            "success": self.success,
            "stdout": self.stdout,
            "stderr": self.stderr,
            "return_code": self.return_code,
        }


def run_kubectl(
    args: list[str],
    timeout_seconds: int = 30,
    context: str | None = None,
) -> KubectlResult:
    command = ["kubectl"]
    if context:
        command.extend(["--context", context])
    command.extend(args)
    env = os.environ.copy()

    if settings.kubeconfig_path:
        env["KUBECONFIG"] = settings.kubeconfig_path

    logger.info("Running kubectl command: {}", " ".join(command))

    try:
        completed = subprocess.run(
            command,
            capture_output=True,
            text=True,
            timeout=timeout_seconds,
            check=False,
            env=env,
        )
    except FileNotFoundError:
        message = "kubectl was not found. Install kubectl or make it available in PATH."
        logger.error(message)
        return KubectlResult(command, False, "", message, None)
    except subprocess.TimeoutExpired:
        message = f"kubectl command timed out after {timeout_seconds} seconds"
        logger.error("{}: {}", message, " ".join(command))
        return KubectlResult(command, False, "", message, None)

    success = completed.returncode == 0
    if success:
        logger.info("kubectl command completed successfully")
    else:
        logger.warning("kubectl command failed: {}", completed.stderr.strip())

    return KubectlResult(
        command=command,
        success=success,
        stdout=completed.stdout,
        stderr=completed.stderr,
        return_code=completed.returncode,
    )
