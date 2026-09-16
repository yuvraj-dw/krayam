import logging

import httpx
from geopy.geocoders import Nominatim

from app.schemas.location import ResolvedLocation

logger = logging.getLogger(__name__)

# Nominatim usage policy: max 1 req/sec, must set user_agent
nominatim = Nominatim(user_agent="krayam/1.0", timeout=10)

PINCODE_API_BASE = "https://aniket-thapa.github.io/india-pincode-api"


class LocationService:
    """Resolves location from pincode and/or village name.

    Strategy:
    1. Pincode → India Pincode API (free, static JSON, ~26k pincodes)
    2. Village/District → Nominatim structured query (1 req/sec)
    3. Fallback → None (caller handles)
    """

    async def resolve_pincode(self, pincode: str) -> ResolvedLocation | None:
        """Look up pincode via India Post data and return lat/lng."""
        try:
            async with httpx.AsyncClient() as client:
                resp = await client.get(f"{PINCODE_API_BASE}/pincodes/{pincode}.json", timeout=10.0)
                if resp.status_code != 200:
                    return None
                data = resp.json()

            offices = data.get("offices", [])
            # Find first delivery office with valid coordinates
            for office in offices:
                if office.get("latitude") is not None and office.get("longitude") is not None:
                    return ResolvedLocation(
                        latitude=office["latitude"],
                        longitude=office["longitude"],
                        district=data.get("district"),
                        state=data.get("state"),
                        village=office.get("officeName"),
                        source="pincode",
                    )
            # Pincode found but no coordinates available
            return None
        except Exception as e:
            logger.warning("Pincode lookup failed for %s: %s", pincode, e)
            return None

    def geocode_village(
        self, village: str, district: str | None = None, state: str | None = None
    ) -> ResolvedLocation | None:
        """Use Nominatim to geocode a village/district name. Sync (geopy is sync)."""
        try:
            query_parts = [village]
            if district:
                query_parts.append(district)
            if state:
                query_parts.append(state)
            query_parts.append("India")

            location = nominatim.geocode(
                ", ".join(query_parts),
                exactly_one=True,
                addressdetails=True,
                countrycodes="in",
            )
            if location:
                return ResolvedLocation(
                    latitude=location.latitude,
                    longitude=location.longitude,
                    district=district,
                    state=state,
                    village=village,
                    source="nominatim",
                )
            return None
        except Exception as e:
            logger.warning("Nominatim geocode failed for %s: %s", village, e)
            return None

    async def resolve(
        self,
        pincode: str | None = None,
        village: str | None = None,
        district: str | None = None,
        state: str | None = None,
    ) -> ResolvedLocation | None:
        """Best-effort location resolution with fallback chain."""
        # 1. Try pincode first (most reliable for India)
        if pincode:
            result = await self.resolve_pincode(pincode)
            if result:
                return result

        # 2. Try Nominatim with village + district
        if village:
            result = self.geocode_village(village, district, state)
            if result:
                return result

        return None


location_service = LocationService()
