import time

import httpx
from loguru import logger

from app.core.config import settings

OPENROUTER_CHAT_COMPLETIONS_URL = "https://openrouter.ai/api/v1/chat/completions"


class LLMClientError(Exception):
    pass


def create_chat_completion(messages: list[dict[str, str]]) -> str:
    if not settings.openrouter_api_key:
        raise LLMClientError("OPENROUTER_API_KEY is not configured")

    model = settings.openrouter_model or "openai/gpt-4o-mini"
    headers = {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type": "application/json",
        "HTTP-Referer": "http://localhost:3000",
        "X-Title": "AI Kubernetes Agent",
    }
    payload = {
        "model": model,
        "messages": messages,
        "temperature": 0.1,
        "response_format": {"type": "json_object"},
    }

    last_error = "OpenRouter request failed"
    for attempt in range(1, 4):
        try:
            with httpx.Client(timeout=60) as client:
                response = client.post(
                    OPENROUTER_CHAT_COMPLETIONS_URL,
                    headers=headers,
                    json=payload,
                )
                response.raise_for_status()
                data = response.json()

            content = data.get("choices", [{}])[0].get("message", {}).get("content")
            if not content:
                raise LLMClientError("OpenRouter returned an empty response")

            return content
        except httpx.HTTPStatusError as error:
            status_code = error.response.status_code
            provider_message = _extract_openrouter_error(error.response)
            last_error = f"OpenRouter returned HTTP {status_code}"
            if provider_message:
                last_error = f"{last_error}: {provider_message}"
            logger.warning("{} on attempt {}", last_error, attempt)
        except (httpx.RequestError, ValueError, LLMClientError) as error:
            last_error = str(error)
            logger.warning("OpenRouter request attempt {} failed: {}", attempt, last_error)

        if attempt < 3:
            time.sleep(attempt)

    raise LLMClientError(last_error)


def _extract_openrouter_error(response: httpx.Response) -> str | None:
    try:
        payload = response.json()
    except ValueError:
        return response.text[:500] if response.text else None

    error = payload.get("error")
    if not isinstance(error, dict):
        return None

    metadata = error.get("metadata")
    if isinstance(metadata, dict) and metadata.get("raw"):
        return str(metadata["raw"])[:500]

    message = error.get("message")
    return str(message)[:500] if message else None
