from datetime import datetime, time

import pytest
from sqlalchemy import delete

from app.database import engine
from app.models.farmer import Farmer
from app.models.sms import SMSSession
from app.schemas.procurement import CentreResponse, RecommendedCentre
from app.services.intent import IntentResult

TEST_PHONE = "1999888777"


@pytest.fixture(autouse=True)
async def clean_nl_farmer():
    async with engine.begin() as conn:
        await conn.execute(delete(SMSSession).where(SMSSession.phone == TEST_PHONE))
        await conn.execute(delete(Farmer).where(Farmer.phone == TEST_PHONE))
    yield
    async with engine.begin() as conn:
        await conn.execute(delete(SMSSession).where(SMSSession.phone == TEST_PHONE))
        await conn.execute(delete(Farmer).where(Farmer.phone == TEST_PHONE))


@pytest.mark.anyio
async def test_nl_unknown_message_returns_error_reply(client, monkeypatch):
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    async def unknown(text):
        return IntentResult(intent="unknown")

    monkeypatch.setattr(intent_service, "parse", unknown)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe kuch samajh nahi aaya", "sender": TEST_PHONE,
              "messageId": "nl-001"},
    )
    assert response.status_code == 200
    assert response.json()["status"] == "ok"
    assert len(sent) == 1
    assert "HELP" in sent[0][1]


@pytest.mark.anyio
async def test_nl_llm_error_returns_error_reply(client, monkeypatch):
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)
    async def fail_parse(text):
        return None

    monkeypatch.setattr(intent_service, "parse", fail_parse)

    response = await client.post(
        "/sms/incoming",
        json={"message": "gibberish ???", "sender": TEST_PHONE, "messageId": "nl-004"},
    )
    assert response.status_code == 200
    assert len(sent) == 1
    assert "HELP" in sent[0][1]


@pytest.mark.anyio
async def test_nl_disabled_is_silent(client, monkeypatch):
    class _S:
        LLM_ENABLED = False

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    response = await client.post(
        "/sms/incoming",
        json={"message": "some carrier notice", "sender": TEST_PHONE,
              "messageId": "nl-003"},
    )
    assert response.status_code == 200
    assert sent == []


@pytest.mark.anyio
async def test_nl_book_intent_unregistered_asks_register(client, monkeypatch):
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    async def book_result(text):
        return IntentResult(
            intent="book", crop="Soybean", quantity=30.0, unit="quintal",
            expected_date="2026-09-15", confidence=0.95,
            missing=[], needs_clarification=False,
        )

    monkeypatch.setattr(intent_service, "parse", book_result)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe 30 quintal soybean bechna hai",
              "sender": TEST_PHONE, "messageId": "nl-002"},
    )
    assert response.status_code == 200
    # Farmer for the test phone is deleted in the fixture, so the flow must
    # ask them to register first.
    assert len(sent) == 1
    assert "register" in sent[0][1].lower()


@pytest.mark.anyio
async def test_nl_book_all_fields_datetime_date_does_not_500(client, monkeypatch):
    # The LLM may emit expected_date as an ISO datetime (e.g.
    # "2026-09-15T10:00:00"). parse_intent_json accepts it, so _nl_begin_booking
    # must convert the date portion and degrade gracefully, never a 500.
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())
    fake_farmer = type("F", (), {"id": 1})()

    async def fake_farmer_lookup(db_, phone_):
        return fake_farmer

    monkeypatch.setattr("app.routers.sms.webhook._get_farmer", fake_farmer_lookup)

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    async def captured_flow(db, session, text, phone):
        return f"PROCEED-{text}"

    monkeypatch.setattr("app.routers.sms.webhook._handle_booking_flow", captured_flow)

    async def book_result(text):
        return IntentResult(
            intent="book", crop="Soybean", quantity=30.0, unit="quintal",
            expected_date="2026-09-15T10:00:00", confidence=0.95,
            missing=[], needs_clarification=False,
        )

    monkeypatch.setattr(intent_service, "parse", book_result)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe 30 quintal soybean bechna hai 15 September 2026",
              "sender": TEST_PHONE, "messageId": "nl-005"},
    )
    assert response.status_code == 200
    # The datetime-suffixed date normalised to DD-MM-YYYY and the flow continued.
    assert len(sent) == 1
    assert sent[0][1] == "PROCEED-15-09-2026"


@pytest.mark.anyio
async def test_nl_book_all_fields_resumes_at_bk_date(client, monkeypatch):
    # When the LLM provides crop+quantity+date up front, _nl_begin_booking must
    # resume the real booking flow at the bk_date step (set session.state), not
    # leave the session idle. Regression: it used to call _handle_booking_flow
    # without setting state, so the flow returned None -> "Could not complete".
    from app.services.intent import intent_service

    class _S:
        LLM_ENABLED = True

    monkeypatch.setattr("app.routers.sms.webhook.get_settings", lambda: _S())
    fake_farmer = type(
        "F", (), {"id": 1, "latitude": 23.26, "longitude": 77.41, "pincode": "462001"}
    )()

    async def fake_farmer_lookup(db_, phone_):
        return fake_farmer

    monkeypatch.setattr("app.routers.sms.webhook._get_farmer", fake_farmer_lookup)

    sent = []

    async def fake_send(phone, msg):
        sent.append((phone, msg))

    monkeypatch.setattr("app.routers.sms.webhook._send_reply", fake_send)

    fake_centre = CentreResponse(
        id="0b9b7f8f-8f2b-4b5a-9e3d-000000000001",
        name="Galla Mandi Bhopal",
        code="GMB",
        latitude=23.2599,
        longitude=77.4126,
        capacity=50,
        operating_start=time(9, 0),
        operating_end=time(17, 0),
        is_active=True,
        crops=[],
        created_at=datetime(2026, 9, 1),
    )

    async def fake_recommend(*args, **kwargs):
        return [
            RecommendedCentre(
                centre=fake_centre, distance_km=5.0, accepted=True,
                current_queue=0, est_wait_units=0, load_percent=0.0,
                has_slots=True, score=10.0, reasons=["Accepts Soybean"],
            )
        ]

    monkeypatch.setattr("app.routers.sms.webhook.recommendation_service.recommend", fake_recommend)

    async def book_result(text):
        return IntentResult(
            intent="book", crop="Soybean", quantity=30.0, unit="quintal",
            expected_date="2026-09-15", confidence=0.95,
            missing=[], needs_clarification=False,
        )

    monkeypatch.setattr(intent_service, "parse", book_result)

    response = await client.post(
        "/sms/incoming",
        json={"message": "Mujhe 30 quintal soybean bechna hai 15 September 2026",
              "sender": TEST_PHONE, "messageId": "nl-006"},
    )
    assert response.status_code == 200
    assert len(sent) == 1
    # The real booking flow advanced past bk_date to the centre-selection step.
    assert "select a centre" in sent[0][1].lower()
    assert "Galla Mandi Bhopal" in sent[0][1]
