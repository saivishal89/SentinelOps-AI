import httpx
from app.ai.providers.base import AIProviderBase


class AnthropicProvider(AIProviderBase):
    """Anthropic (Claude) API provider."""

    @property
    def name(self) -> str:
        return "Anthropic"

    async def test_connection(self, api_key: str) -> bool:
        """Test Anthropic key with a minimal message request."""
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-3-haiku-20240307",
                    "max_tokens": 1,
                    "messages": [{"role": "user", "content": "hi"}],
                },
                timeout=10.0,
            )
            resp.raise_for_status()
            return True

    async def generate(self, prompt: str, api_key: str, **kwargs) -> str:
        """Generate text using Anthropic Messages API."""
        model = kwargs.get("model", "claude-3-haiku-20240307")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": api_key,
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": kwargs.get("max_tokens", 1024),
                    "messages": [{"role": "user", "content": prompt}],
                },
                timeout=60.0,
            )
            resp.raise_for_status()
            return resp.json()["content"][0]["text"]
