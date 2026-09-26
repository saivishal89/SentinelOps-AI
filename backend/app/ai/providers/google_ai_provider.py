import httpx
from app.ai.providers.base import AIProviderBase


class GoogleAIProvider(AIProviderBase):
    """Google AI (Gemini) API provider."""

    @property
    def name(self) -> str:
        return "Google AI"

    async def test_connection(self, api_key: str) -> bool:
        """Test Google AI key by listing available models."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                f"https://generativelanguage.googleapis.com/v1/models?key={api_key}",
                timeout=10.0,
            )
            resp.raise_for_status()
            return True

    async def generate(self, prompt: str, api_key: str, **kwargs) -> str:
        """Generate text using Gemini generateContent API."""
        model = kwargs.get("model", "gemini-1.5-flash")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                f"https://generativelanguage.googleapis.com/v1/models/{model}:generateContent?key={api_key}",
                json={
                    "contents": [{"parts": [{"text": prompt}]}],
                },
                timeout=60.0,
            )
            resp.raise_for_status()
            return resp.json()["candidates"][0]["content"]["parts"][0]["text"]
