"""
AI Provider registry — lookup providers by name.

Usage:
    from app.ai.providers import get_provider
    provider = get_provider("openai")
    await provider.test_connection(api_key)
    response = await provider.generate("Hello", api_key)
"""
from app.ai.providers.base import AIProviderBase
from app.ai.providers.openai_provider import OpenAIProvider
from app.ai.providers.anthropic_provider import AnthropicProvider
from app.ai.providers.google_ai_provider import GoogleAIProvider

_PROVIDERS: dict[str, AIProviderBase] = {
    "openai": OpenAIProvider(),
    "anthropic": AnthropicProvider(),
    "google_ai": GoogleAIProvider(),
}


def get_provider(name: str) -> AIProviderBase:
    """Get an AI provider by name. Raises ValueError if not found."""
    provider = _PROVIDERS.get(name)
    if not provider:
        raise ValueError(
            f"Unknown AI provider: {name}. "
            f"Available: {list(_PROVIDERS.keys())}"
        )
    return provider


def list_providers() -> list[str]:
    """List all registered AI provider names."""
    return list(_PROVIDERS.keys())
