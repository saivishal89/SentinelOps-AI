"""
AI Provider abstraction — common interface for all LLM providers.

This makes the system provider-agnostic:
    response = await ai_provider.generate(prompt, api_key)

Instead of:
    if provider == "openai": ...
    elif provider == "anthropic": ...
"""
from abc import ABC, abstractmethod
from typing import Any


class AIProviderBase(ABC):
    """Abstract base class for AI providers (BYOK)."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Human-readable provider name (e.g., 'OpenAI')."""
        ...

    @abstractmethod
    async def test_connection(self, api_key: str) -> bool:
        """
        Test if the API key is valid by making a lightweight API call.
        Returns True if the key works.
        Raises an exception if the key is invalid.
        """
        ...

    @abstractmethod
    async def generate(self, prompt: str, api_key: str, **kwargs: Any) -> str:
        """
        Generate text from a prompt using the provider's API.
        Used by the AI investigation engine in Phase 2.

        Args:
            prompt: The text prompt to send
            api_key: Decrypted BYOK API key
            **kwargs: Provider-specific options (model, max_tokens, etc.)

        Returns:
            Generated text response
        """
        ...
