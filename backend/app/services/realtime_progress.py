import httpx
from loguru import logger

from app.core.config import settings


class InvestigationProgressPublisher:
    def __init__(self, investigation_id: str | None, auth_token: str | None, user_id: str | None) -> None:
        self.investigation_id = investigation_id
        self.auth_token = auth_token
        self.user_id = user_id
        self._enabled = bool(settings.insforge_base_url and investigation_id and auth_token and user_id)

    def __enter__(self) -> "InvestigationProgressPublisher":
        return self

    def __exit__(self, *_args: object) -> None:
        return None

    def publish(self, step: str, label: str, status: str) -> None:
        if not self._enabled:
            return

        url = f"{settings.insforge_base_url.rstrip('/')}/api/database/records/investigation_progress"
        payload = [
            {
                "investigation_id": self.investigation_id,
                "user_id": self.user_id,
                "step": step,
                "label": label,
                "status": status,
            }
        ]

        try:
            response = httpx.post(
                url,
                headers={
                    "Authorization": f"Bearer {self.auth_token}",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=10,
            )
            response.raise_for_status()
        except httpx.HTTPError as error:
            logger.warning("Investigation progress insert failed: {}", error)
