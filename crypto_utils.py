import os
import base64
import logging
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()
logger = logging.getLogger(__name__)

_ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY")

def _get_key():
    if not _ENCRYPTION_KEY:
        logger.error("ENCRYPTION_KEY is not configured in environment variables")
        return None
    try:
        key = bytes.fromhex(_ENCRYPTION_KEY)
        if len(key) != 32:
            raise ValueError(f"Key length invalid: expected 32 bytes, got {len(key)}")
        return key
    except Exception as e:
        logger.error(f"Failed to parse ENCRYPTION_KEY: {e}")
        return None

def encrypt_field(plaintext):
    if plaintext is None:
        return None
    key = _get_key()
    if not key:
        raise RuntimeError("Encryption key unavailable. Aborting write to prevent data exposure.")
    try:
        aesgcm = AESGCM(key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode('utf-8'), None)
        return base64.b64encode(nonce + ciphertext).decode('utf-8')
    except Exception as e:
        logger.error(f"Encryption operation failed: {e}")
        raise RuntimeError(f"Cryptographic failure: {e}")

def decrypt_field(stored_value):
    if stored_value is None:
        return None
    key = _get_key()
    if not key:
        return stored_value
    try:
        raw = base64.b64decode(stored_value)
        if len(raw) < 12:
            return stored_value
        nonce = raw[:12]
        ciphertext = raw[12:]
        aesgcm = AESGCM(key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext.decode('utf-8')
    except Exception:
        return stored_value

def generate_key():
    return os.urandom(32).hex()
