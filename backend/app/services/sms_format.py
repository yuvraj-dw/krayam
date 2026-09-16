"""Pure helpers for formatting SMS replies and parsing SMS input.

Kept network/db-free so the parsing and formatting rules can be unit-tested
without touching the database or SMS Gate.
"""

import re
from datetime import date, datetime


def parse_date(value: str) -> date | None:
    """Parse a DD-MM-YYYY (or DD/MM/YYYY) date. Returns None if invalid."""
    value = value.strip().replace("/", "-")
    try:
        return datetime.strptime(value, "%d-%m-%Y").date()
    except ValueError:
        return None


def parse_positive_float(value: str) -> float | None:
    """Parse a positive number (quantity). Returns None if invalid."""
    try:
        num = float(value.strip())
    except (TypeError, ValueError):
        return None
    if num <= 0:
        return None
    return num


def parse_int_selection(value: str) -> int | None:
    """Parse a 1-based list selection number. Returns None if invalid."""
    value = value.strip()
    if not re.fullmatch(r"\d{1,3}", value):
        return None
    num = int(value)
    if num < 1:
        return None
    return num


def format_date(d: date | None) -> str:
    """DD-MM-YYYY for display, or empty string when None."""
    return d.strftime("%d-%m-%Y") if d else ""


def format_currency(amount: float) -> str:
    """Indian numbering-group formatting, e.g. 171250 -> '1,71,250'."""
    if amount is None:
        return "0"
    amount = round(amount)
    neg = amount < 0
    amount = abs(amount)
    s = str(int(amount))
    if len(s) <= 3:
        out = s
    else:
        last3 = s[-3:]
        rest = s[:-3]
        # group remaining from the right in pairs
        groups: list[str] = []
        while rest:
            groups.insert(0, rest[-2:])
            rest = rest[:-2]
        out = ",".join(groups + [last3])
    return ("-" if neg else "") + out
