"""
API Key encryption service using AES-256-GCM.

Storage format: nonce (12 bytes) || ciphertext || auth_tag (16 bytes)
The auth_tag is automatically appended by AESGCM.

SECURITY RULES:
- MASTER_ENCRYPTION_KEY lives in .env only — never in code or DB
- Plaintext keys are NEVER logged, cached, or returned after storage
- Decrypted keys are used immediately and then discarded
"""
import os
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from app.config import settings


def _get_aes_key() -> bytes:
    """Get the 32-byte AES key from the master encryption key."""
    key_hex = settings.MASTER_ENCRYPTION_KEY
    key_bytes = bytes.fromhex(key_hex)
    if len(key_bytes) != 32:
        raise ValueError(
            "MASTER_ENCRYPTION_KEY must be exactly 32 bytes (64 hex chars). "
            f"Got {len(key_bytes)} bytes."
        )
    return key_bytes


def encrypt_key(plaintext: str) -> bytes:
    """
    Encrypt a plaintext API key using AES-256-GCM.

    Returns bytes: nonce (12) || ciphertext || tag (16)
    """
    key = _get_aes_key()
    nonce = os.urandom(12)  # 96-bit random nonce
    aesgcm = AESGCM(key)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode("utf-8"), None)
    return nonce + ciphertext


def decrypt_key(encrypted: bytes) -> str:
    """
    Decrypt an AES-256-GCM encrypted API key.

    Input: nonce (12 bytes) || ciphertext || tag (16 bytes)
    Returns: plaintext string
    """
    key = _get_aes_key()
    nonce = encrypted[:12]
    ciphertext_with_tag = encrypted[12:]
    aesgcm = AESGCM(key)
    plaintext = aesgcm.decrypt(nonce, ciphertext_with_tag, None)
    return plaintext.decode("utf-8")


def get_key_hint(plaintext: str) -> str:
    """
    Get the last 4 characters of an API key for display purposes.
    Example: "sk-abc123XYZ7X91" → "7X91"
    Frontend shows: "••••••••7X91"
    """
    if len(plaintext) < 4:
        return "****"
    return plaintext[-4:]
