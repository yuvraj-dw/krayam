"""Find nearby agricultural markets/APMC mandis for a pincode.

Uses the (already-available) India Pincode API to resolve a pincode to
coordinates, then Nominatim/OpenStreetMap to locate real markets around those
coordinates, ranked by straight-line distance. Free tier: both APIs are free
and need no key; Nominatim asks for a courteous User-Agent and 1 req/sec.
"""

import logging
from dataclasses import dataclass

import httpx

from app.services.centre import haversine_km
from app.services.location import location_service

logger = logging.getLogger(__name__)

NOMINATIM_URL = "https://nominatim.openstreetmap.org/search"
RADIUS_KM = 100.0
MAX_RESULTS = 5
USER_AGENT = "krayam/1.0 (demo)"

# OpenStreetMap types that represent a real market/mandi.
_MARKET_TYPES = {"marketplace", "market", "farm", "wholesale"}


@dataclass
class NearbyMarket:
    name: str
    district: str | None
    state: str | None
    latitude: float
    longitude: float
    distance_km: float
    type: str


def rank_markets(
    markets: list[dict],
    base_lat: float,
    base_lng: float,
    limit: int = MAX_RESULTS,
    radius_km: float = RADIUS_KM,
) -> list[NearbyMarket]:
    """Filter, dedupe and distance-rank raw market rows.

    `markets` are Nominatim result dicts ({name, latitude, longitude, type}).
    Pure function so it can be unit-tested without network access.
    """
    seen: set[tuple[str, str]] = set()
    ranked: list[NearbyMarket] = []
    for m in markets:
        lat, lng = m.get("latitude"), m.get("longitude")
        name = (m.get("name") or "").strip()
        if not name or lat is None or lng is None:
            continue
        dist = haversine_km(base_lat, base_lng, float(lat), float(lng))
        if dist > radius_km:
            continue
        key = (name.lower(), f"{float(lat):.3f},{float(lng):.3f}")
        if key in seen:
            continue
        seen.add(key)
        ranked.append(
            NearbyMarket(
                name=name,
                district=m.get("district"),
                state=m.get("state"),
                latitude=float(lat),
                longitude=float(lng),
                distance_km=round(dist, 1),
                type=m.get("type", "") or "",
            )
        )
    ranked.sort(key=lambda r: (r.type not in _MARKET_TYPES, r.distance_km))
    return ranked[:limit]


class MandiService:
    async def _search(self, client: httpx.AsyncClient, q: str) -> list[dict]:
        """Run one Nominatim freeform search and normalise rows."""
        try:
            resp = await client.get(
                NOMINATIM_URL,
                params={"q": q, "format": "json", "limit": 15, "countrycodes": "in"},
                timeout=12.0,
            )
            if resp.status_code != 200:
                return []
            rows = []
            for row in resp.json():
                display = row.get("display_name") or ""
                rows.append(
                    {
                        "name": display.split(",")[0].strip(),
                        "latitude": float(row["lat"]),
                        "longitude": float(row["lon"]),
                        "type": row.get("type", ""),
                        "district": row.get("address", {}).get("county")
                        or row.get("address", {}).get("state_district"),
                        "state": row.get("address", {}).get("state"),
                    }
                )
            return rows
        except Exception as e:  # noqa: BLE001
            logger.warning("Nominatim market search failed for %r: %s", q, e)
            return []

    async def find_markets_near(
        self, pincode: str, limit: int = MAX_RESULTS
    ) -> tuple[list[NearbyMarket], str | None]:
        """Return markets near a pincode plus a friendly area name (or None)."""
        resolved = await location_service.resolve_pincode(pincode)
        if not resolved:
            return [], None

        area = f"{resolved.district or ''} {resolved.state or ''}".strip() or "India"
        queries = [
            f"mandi {area}",
            f"APMC market {area}",
            f"agriculture market {area}",
        ]
        rows: list[dict] = []
        async with httpx.AsyncClient(headers={"User-Agent": USER_AGENT}) as client:
            for q in queries:
                rows.extend(await self._search(client, q))
        if not rows:
            return [], area
        return rank_markets(
            rows,
            resolved.latitude,
            resolved.longitude,
            limit=limit,
        ), area


mandi_service = MandiService()
