from app.utils.security import hash_password, verify_password


def test_hash_password_produces_valid_format():
    hashed = hash_password("MySecurePass123")
    assert hashed.startswith("pbkdf2_sha256$100000$")
    parts = hashed.split("$")
    assert len(parts) == 4
    assert len(parts[2]) == 32  # 16-byte hex salt


def test_verify_password_correct():
    password = "FarmerSecret@2026"
    hashed = hash_password(password)
    assert verify_password(password, hashed) is True


def test_verify_password_incorrect():
    hashed = hash_password("FarmerSecret@2026")
    assert verify_password("WrongPassword", hashed) is False


def test_verify_password_corrupted_hash():
    assert verify_password("password", "invalid_hash_string") is False
    assert verify_password("password", "") is False
    assert verify_password("password", None) is False
