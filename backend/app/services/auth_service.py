import httpx
from fastapi import HTTPException

from app.core.config import settings


def extract_bearer_token(authorization: str | None) -> str:
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Authentication is required")

    token = authorization.removeprefix("Bearer ").strip()
    if not token:
        raise HTTPException(status_code=401, detail="Authentication token is missing")

    return token


def verify_insforge_user(token: str) -> dict:
    if not settings.insforge_base_url:
        raise HTTPException(status_code=503, detail="INSFORGE_BASE_URL is not configured")

    url = f"{settings.insforge_base_url.rstrip('/')}/api/auth/sessions/current"
    try:
        response = httpx.get(
            url,
            headers={"Authorization": f"Bearer {token}"},
            timeout=15,
        )
    except httpx.RequestError as error:
        raise HTTPException(status_code=503, detail="Could not verify InsForge session") from error

    if response.status_code == 401:
        raise HTTPException(status_code=401, detail="Invalid or expired session")
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="InsForge session verification failed")

    payload = response.json()
    user = payload.get("user")
    if not user:
        raise HTTPException(status_code=401, detail="Invalid session")

    return user

