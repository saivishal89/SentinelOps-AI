import httpx
from app.ai.providers.base import AIProviderBase


class OpenAIProvider(AIProviderBase):
    """OpenAI API provider (GPT-4, GPT-4o, etc.)."""

    @property
    def name(self) -> str:
        return "OpenAI"

    async def test_connection(self, api_key: str) -> bool:
        """Test OpenAI key by listing available models."""
        async with httpx.AsyncClient() as client:
            resp = await client.get(
                "https://api.openai.com/v1/models",
                headers={"Authorization": f"Bearer {api_key}"},
                timeout=10.0,
            )
            resp.raise_for_status()
            return True

    async def generate(self, prompt: str, api_key: str, **kwargs) -> str:
        """Generate text using OpenAI Chat Completions API."""
        model = kwargs.get("model", "gpt-4o-mini")
        async with httpx.AsyncClient() as client:
            resp = await client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={"Authorization": f"Bearer {api_key}"},
                json={
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": kwargs.get("max_tokens", 1024),
                },
                timeout=60.0,
            )
            resp.raise_for_status()
            return resp.json()["choices"][0]["message"]["content"]
