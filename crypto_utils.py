"""
AES-256-GCM Encryption Utility for Forensic Tool
Encrypts/decrypts sensitive fields stored in SQLite.
"""
import os
import base64
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

def _get_key():
    """Get the AES-256 key (32 bytes) from the ENCRYPTION_KEY env var (64-char hex)."""
    if not _ENCRYPTION_KEY:
        logger.warning("ENCRYPTION_KEY not set — encryption/decryption disabled, storing plaintext.")
        return None
    try:
        key = bytes.fromhex(_ENCRYPTION_KEY)
        if len(key) != 32:
            raise ValueError(f"Key must be 32 bytes (64 hex chars), got {len(key)} bytes")
        return key
    except Exception as e:
        logger.error(f"Invalid ENCRYPTION_KEY: {e}")
        return None

def encrypt_field(plaintext):
    """Encrypt a plaintext string using AES-256-GCM. Returns base64-encoded ciphertext."""
    if plaintext is None:
        return None
    key = _get_key()
    if not key:
        return plaintext  # Fallback: store as plaintext if no key
    try:
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)  # 96-bit nonce for GCM
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        # Prepend nonce to ciphertext for storage
        return base64.b64encode(nonce + ciphertext).decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption failed: {e}")
        return plaintext  # Fallback to plaintext on error

def decrypt_field(stored_value):
    """Decrypt a base64-encoded AES-256-GCM ciphertext. Returns plaintext string."""
    if stored_value is None:
        return None
    key = _get_key()
    if not key:
        return stored_value  # No key = assume plaintext
    try:
        raw = base64.b64decode(stored_value)
        nonce = raw[:12]
        ciphertext = raw[12:]
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception:
        # If decryption fails, it's likely plaintext (pre-encryption data)
        return stored_value

def generate_key():
    """Generate a new random 32-byte AES-256 key as hex string."""
    return os.urandom(32).hex()
