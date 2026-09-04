from datetime import date

from app.services.sms_format import (
    format_currency,
    format_date,
    parse_date,
    parse_int_selection,
    parse_positive_float,
)


def test_parse_date_valid_dash():
    assert parse_date("15-09-2026") == date(2026, 9, 15)


def test_parse_date_valid_slash():
    assert parse_date("15/09/2026") == date(2026, 9, 15)


def test_parse_date_invalid():
    assert parse_date("32-01-2026") is None
    assert parse_date("not-a-date") is None
    assert parse_date("2026-09-15") is None  # ISO order not accepted


def test_parse_positive_float():
    assert parse_positive_float("12") == 12.0
    assert parse_positive_float(" 7.5 ") == 7.5
    assert parse_positive_float("0") is None
    assert parse_positive_float("-3") is None
    assert parse_positive_float("abc") is None


def test_parse_int_selection():
    assert parse_int_selection("1") == 1
    assert parse_int_selection("3") == 3
    assert parse_int_selection(" 2 ") == 2
    assert parse_int_selection("0") is None
    assert parse_int_selection("1.5") is None  # not integer only
    assert parse_int_selection("abc") is None


def test_format_date():
    assert format_date(date(2026, 9, 15)) == "15-09-2026"
    assert format_date(None) == ""


def test_format_currency_indian_grouping():
    assert format_currency(171250) == "1,71,250"
    assert format_currency(12345678) == "1,23,45,678"
    assert format_currency(999) == "999"
    assert format_currency(1234) == "1,234"
