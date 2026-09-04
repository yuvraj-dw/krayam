from app.services.mandi import rank_markets

# Base point: Bhopal (462047)
BASE_LAT, BASE_LNG = 23.13, 77.49


def _m(name, lat, lng, mtype="marketplace", d=None, s=None):
    return {"name": name, "latitude": lat, "longitude": lng,
            "type": mtype, "district": d, "state": s}


def test_sorts_by_distance():
    markets = [
        _m("Far", 25.0, 78.0),      # ~220 km
        _m("Near", 23.3, 77.5),     # ~22 km
        _m("Closest", 23.15, 77.5),
    ]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, radius_km=300)
    names = [r.name for r in ranked]
    assert names == ["Closest", "Near", "Far"]


def test_filters_beyond_radius():
    markets = [
        _m("Close", 23.2, 77.5),
        _m("TooFar", 28.0, 77.0),   # ~550 km away
    ]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, radius_km=100)
    assert [r.name for r in ranked] == ["Close"]


def test_prefers_marketplace_type():
    markets = [
        _m("Residential Mandi", 23.15, 77.5, mtype="residential"),
        _m("Real Market", 23.25, 77.55, mtype="marketplace"),
    ]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, radius_km=100)
    # marketplace should rank ahead even though slightly farther
    assert ranked[0].name == "Real Market"


def test_dedupes_same_market():
    markets = [
        _m("Galla Mandi", 23.25, 77.42),
        _m("Galla Mandi", 23.25, 77.42),  # duplicate
        _m("Other", 23.3, 77.5),
    ]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, radius_km=200)
    names = [r.name for r in ranked]
    assert names.count("Galla Mandi") == 1
    assert len(ranked) == 2


def test_respects_limit():
    markets = [_m(f"M{i}", 23.1 + i * 0.01, 77.5) for i in range(5)]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, limit=3, radius_km=50)
    assert len(ranked) == 3


def test_ignores_rows_without_coordinates_or_name():
    markets = [
        {"name": "", "latitude": 23.2, "longitude": 77.5, "type": "marketplace"},
        {"name": "NoCoords", "latitude": None, "longitude": None, "type": "marketplace"},
        _m("Valid", 23.2, 77.5),
    ]
    ranked = rank_markets(markets, BASE_LAT, BASE_LNG, radius_km=50)
    assert [r.name for r in ranked] == ["Valid"]
