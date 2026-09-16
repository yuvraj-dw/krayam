import re


def normalize_phone(phone: str) -> str:
    """Normalize Indian phone number to 10-digit format."""
    cleaned = re.sub(r"[\s\-\(\)+]", "", phone)
    if cleaned.startswith("91") and len(cleaned) == 12:
        return cleaned[2:]
    if cleaned.startswith("0") and len(cleaned) == 11:
        return cleaned[1:]
    return cleaned


def validate_phone(phone: str) -> bool:
    """Check if phone number is a valid 10-digit Indian mobile number."""
    normalized = normalize_phone(phone)
    return bool(re.match(r"^[6-9]\d{9}$", normalized))


def format_phone_display(phone: str) -> str:
    """Format phone number for display: +91 XXXXX XXXXX."""
    normalized = normalize_phone(phone)
    return f"+91 {normalized[:5]} {normalized[5:]}"
