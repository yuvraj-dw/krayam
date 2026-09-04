import pytest


@pytest.mark.anyio
async def test_parse_returns_none_when_disabled(monkeypatch):
    class _S:
        LLM_ENABLED = False
        LLM_API_KEY = ""
        LLM_MODEL = "gemini-3-flash-preview"
        LLM_BASE_URL = "http://unused"
        LLM_TIMEOUT_SECONDS = 1.0

    monkeypatch.setattr("app.services.intent.get_settings", lambda: _S())
    from app.services.intent import intent_service

    result = await intent_service.parse("Mujhe 30 quintal gehun bechna hai")
    assert result is None


def test_parse_intent_json_valid():
    from app.services.intent import parse_intent_json

    raw = (
        '{"intent": "book", "crop": "Soybean", "quantity": 30.0, '
        '"unit": "quintal", "expected_date": "2026-09-15", '
        '"confidence": 0.98, "missing": [], "needs_clarification": false}'
    )
    r = parse_intent_json(raw)
    assert r is not None
    assert r.intent == "book"
    assert r.crop == "Soybean"
    assert r.quantity == 30.0
    assert r.expected_date == "2026-09-15"


def test_parse_intent_json_malformed_returns_none():
    from app.services.intent import parse_intent_json

    assert parse_intent_json("not json {") is None
    assert parse_intent_json("") is None
