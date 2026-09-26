import pytest
from app.services.key_manager import encrypt_key, decrypt_key, get_key_hint


def test_encrypt_decrypt_roundtrip():
    original_key = "sk-proj-1234567890abcdefghijklmnopqrstuvwxyz"
    encrypted = encrypt_key(original_key)

    assert isinstance(encrypted, bytes)
    assert encrypted != original_key.encode("utf-8")
    # Minimum length = 12 (nonce) + len(key) + 16 (tag)
    assert len(encrypted) >= 12 + len(original_key) + 16

    decrypted = decrypt_key(encrypted)
    assert decrypted == original_key


def test_encryption_uses_unique_nonce():
    key = "sk-test-secret-key-12345"
    encrypted_1 = encrypt_key(key)
    encrypted_2 = encrypt_key(key)

    # Same plaintext should produce different ciphertexts due to random nonce
    assert encrypted_1 != encrypted_2
    assert decrypt_key(encrypted_1) == key
    assert decrypt_key(encrypted_2) == key


def test_decrypt_corrupted_ciphertext_fails():
    key = "sk-test-secret-key-12345"
    encrypted = bytearray(encrypt_key(key))
    # Corrupt last byte
    encrypted[-1] ^= 0xFF

    with pytest.raises(Exception):
        decrypt_key(bytes(encrypted))


def test_get_key_hint():
    assert get_key_hint("sk-ant-api03-abcdef1234") == "1234"
    assert get_key_hint("abc") == "****"
    assert get_key_hint("1234") == "1234"
