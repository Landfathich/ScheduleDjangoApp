import base64

from cryptography.hazmat.primitives import serialization
from cryptography.hazmat.primitives.asymmetric import ec

# Генерируем ключи
private_key = ec.generate_private_key(ec.SECP256r1())
public_key = private_key.public_key()

# Конвертируем публичный ключ
public_bytes = public_key.public_bytes(
    encoding=serialization.Encoding.X962,
    format=serialization.PublicFormat.UncompressedPoint
)
public_key_b64 = base64.urlsafe_b64encode(public_bytes).decode().rstrip('=')

# Конвертируем приватный ключ
private_bytes = private_key.private_bytes(
    encoding=serialization.Encoding.PEM,
    format=serialization.PrivateFormat.PKCS8,
    encryption_algorithm=serialization.NoEncryption()
)
private_key_b64 = base64.urlsafe_b64encode(private_bytes).decode().rstrip('=')

print("\n=== ВСТАВЬТЕ ЭТИ КЛЮЧИ В SETTINGS.PY ===\n")
print(f"VAPID_PUBLIC_KEY = '{public_key_b64}'")
print(f"VAPID_PRIVATE_KEY = '{private_key_b64}'")
print("\nVAPID_ADMIN_EMAIL = 'admin@kodamaclass.com'")

VAPID_PUBLIC_KEY = 'BDrbhsC6alLRrm1APw93XZUdSPYJWDKj-AmhzVly3MRxrDgBU7_YI45fg3P7byiQDZpKQ0T53lPNcmBfaA02Xco'
VAPID_PRIVATE_KEY = 'LS0tLS1CRUdJTiBQUklWQVRFIEtFWS0tLS0tCk1JR0hBZ0VBTUJNR0J5cUdTTTQ5QWdFR0NDcUdTTTQ5QXdFSEJHMHdhd0lCQVFRZ0ZrVk1qcnl5Rml4ZzRZZUoKQ08wZUxSWVR3MUM0Qi9LUS9OMSs1dzdnWDNxaFJBTkNBQVE2MjRiQXVtcFMwYTV0UUQ4UGQxMlZIVWoyQ1ZneQpvL2dKb2MxWmN0ekVjYXc0QVZPLzJDT09YNE56KzI4b2tBMmFTa05FK2Q1VHpYSmdYMmdOTmwzSwotLS0tLUVORCBQUklWQVRFIEtFWS0tLS0tCg'

VAPID_ADMIN_EMAIL = 'admin@kodamaclass.com'
