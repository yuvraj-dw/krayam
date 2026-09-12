import base64
import hashlib
import hmac
import html
import json
import re
from typing import Any

import qrcode
import qrcode.image.svg

from app.config import get_settings
from app.exceptions import ValidationError
from app.models.booking import Booking
from app.models.farmer import Farmer
from app.models.payment import Payment
from app.models.procurement import Procurement
from app.schemas.qr import QRCodeResponse, QRTheme

DEFAULT_THEME = QRTheme(primary_color="#1b5e20", background_color="#ffffff")


class QRService:
    def __init__(self) -> None:
        self.settings = get_settings()

    def _get_signing_key(self) -> bytes:
        return self.settings.JWT_SECRET_KEY.encode("utf-8")

    def create_signature(self, payload_bytes: bytes) -> str:
        """Generates an HMAC-SHA256 hex digest for binary/JSON payload."""
        return hmac.new(self._get_signing_key(), payload_bytes, hashlib.sha256).hexdigest()

    def verify_signature(self, payload_bytes: bytes, signature: str) -> bool:
        """Verifies signature in constant time using hmac.compare_digest."""
        expected = self.create_signature(payload_bytes)
        return hmac.compare_digest(expected, signature)

    def generate_svg_qr(
        self,
        data: str,
        primary_color: str = "#1b5e20",
        background_color: str = "#ffffff",
    ) -> str:
        """
        Generates pure vector SVG markup representing the QR code.
        Applies custom theme fill color to the SVG path element and includes
        a background rect.
        """
        qr = qrcode.QRCode(
            version=None,
            error_correction=qrcode.constants.ERROR_CORRECT_M,
            box_size=10,
            border=2,
            image_factory=qrcode.image.svg.SvgPathImage,
        )
        qr.add_data(data)
        qr.make(fit=True)

        img = qr.make_image()
        svg_xml = img.to_string().decode("utf-8")

        # Replace default black fill with themed primary color
        svg_xml = re.sub(r'fill="#000000"', f'fill="{primary_color}"', svg_xml)

        # Inject background rect if background_color is specified
        if background_color and "<svg" in svg_xml:
            # Extract viewBox or dimensions to size the background rect
            vb_match = re.search(r'viewBox="([^"]+)"', svg_xml)
            if vb_match:
                vb_parts = vb_match.group(1).split()
                if len(vb_parts) == 4:
                    width, height = vb_parts[2], vb_parts[3]
                    bg_rect = f'<rect width="{width}" height="{height}" fill="{background_color}"/>'
                    svg_xml = re.sub(r'(<svg[^>]*>)', rf"\1{bg_rect}", svg_xml, count=1)

        return svg_xml

    def _build_data_url(self, svg_markup: str) -> str:
        encoded = base64.b64encode(svg_markup.encode("utf-8")).decode("ascii")
        return f"data:image/svg+xml;base64,{encoded}"

    def generate_gate_pass_qr(self, booking: Booking, farmer: Farmer) -> QRCodeResponse:
        """
        Creates a signed gate pass QR code for a booking.
        """
        payload_data: dict[str, Any] = {
            "type": "GATE_PASS",
            "booking_id": booking.booking_id,
            "farmer_id": str(farmer.id),
            "farmer_name": farmer.name,
            "farmer_phone": farmer.phone,
            "centre_id": str(booking.centre_id) if booking.centre_id else None,
            "slot_date": str(booking.expected_date),
            "crop": booking.crop,
            "quantity": float(booking.quantity),
            "unit": booking.unit,
        }

        # Canonical JSON encoding for signing
        payload_bytes = json.dumps(payload_data, sort_keys=True, separators=(",", ":")).encode("utf-8")
        signature = self.create_signature(payload_bytes)

        full_payload = {
            **payload_data,
            "sig": signature,
        }
        qr_data = json.dumps(full_payload, separators=(",", ":"))

        svg = self.generate_svg_qr(
            qr_data,
            primary_color=DEFAULT_THEME.primary_color,
            background_color=DEFAULT_THEME.background_color,
        )
        data_url = self._build_data_url(svg)

        return QRCodeResponse(
            type="GATE_PASS",
            reference_id=booking.booking_id,
            qr_data=qr_data,
            svg=svg,
            data_url=data_url,
            theme=DEFAULT_THEME,
        )

    def generate_procurement_receipt_qr(
        self,
        procurement: Procurement,
        booking: Booking,
        farmer: Farmer,
        payment: Payment | None = None,
    ) -> QRCodeResponse:
        """
        Creates a signed receipt QR code for a completed procurement and optional payment.
        """
        payload_data: dict[str, Any] = {
            "type": "PROCUREMENT_RECEIPT",
            "procurement_id": procurement.procurement_id,
            "booking_id": booking.booking_id,
            "farmer_id": str(farmer.id),
            "farmer_name": farmer.name,
            "accepted_quantity": float(procurement.accepted_quantity),
            "unit": procurement.unit,
            "payment_id": payment.payment_id if payment else None,
            "amount": float(payment.amount) if payment else None,
            "status": (payment.status.value if hasattr(payment.status, "value") else str(payment.status))
            if payment
            else "pending_payment",
        }

        payload_bytes = json.dumps(payload_data, sort_keys=True, separators=(",", ":")).encode("utf-8")
        signature = self.create_signature(payload_bytes)

        full_payload = {
            **payload_data,
            "sig": signature,
        }
        qr_data = json.dumps(full_payload, separators=(",", ":"))

        svg = self.generate_svg_qr(
            qr_data,
            primary_color=DEFAULT_THEME.primary_color,
            background_color=DEFAULT_THEME.background_color,
        )
        data_url = self._build_data_url(svg)

        return QRCodeResponse(
            type="PROCUREMENT_RECEIPT",
            reference_id=procurement.procurement_id,
            qr_data=qr_data,
            svg=svg,
            data_url=data_url,
            theme=DEFAULT_THEME,
        )

    def verify_and_decode_qr(self, qr_payload: str) -> dict[str, Any]:
        """
        Parses JSON payload, extracts 'sig', checks HMAC signature against the rest of the payload.
        Raises ValidationError if invalid or signature mismatch.
        """
        try:
            data = json.loads(qr_payload)
        except Exception as e:
            raise ValidationError(f"Invalid QR code format: not valid JSON ({e})") from e

        if not isinstance(data, dict):
            raise ValidationError("Invalid QR payload structure: expected JSON object")

        signature = data.get("sig")
        if not signature:
            raise ValidationError("Invalid QR code: missing cryptographic signature")

        # Reconstruct canonical payload without signature
        content = {k: v for k, v in data.items() if k != "sig"}
        payload_bytes = json.dumps(content, sort_keys=True, separators=(",", ":")).encode("utf-8")

        if not self.verify_signature(payload_bytes, signature):
            raise ValidationError("QR code signature verification failed: payload has been tampered with")

        return data

    def render_public_pass_html(
        self,
        booking: Booking,
        farmer: Farmer,
        centre_name: str,
    ) -> str:
        """
        Renders a responsive, standalone HTML page in Emerald Green theme
        displaying the digital gate pass with centered vector SVG QR.
        """
        qr_res = self.generate_gate_pass_qr(booking, farmer)

        safe_booking_id = html.escape(booking.booking_id)
        safe_farmer_name = html.escape(farmer.name)
        safe_phone = html.escape(farmer.phone)
        safe_crop = html.escape(booking.crop.title())
        safe_centre = html.escape(centre_name)
        safe_date = html.escape(str(booking.expected_date))
        safe_qty = f"{float(booking.quantity):.1f} {booking.unit}"
        safe_status = (
            booking.status.value.upper()
            if hasattr(booking.status, "value")
            else str(booking.status).upper()
        )

        return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Krayam Digital Gate Pass - {safe_booking_id}</title>
  <style>
    :root {{
      --primary: #1b5e20;
      --primary-dark: #0d3b10;
      --accent: #2e7d32;
      --bg: #f4fbf5;
      --card-bg: #ffffff;
      --text: #1f2937;
      --text-muted: #6b7280;
      --border: #e5e7eb;
    }}
    * {{
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }}
    body {{
      background: var(--bg);
      color: var(--text);
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
      padding: 1rem;
    }}
    .pass-card {{
      background: var(--card-bg);
      border-radius: 16px;
      box-shadow: 0 10px 25px rgba(27, 94, 32, 0.08), 0 4px 6px rgba(0, 0, 0, 0.04);
      width: 100%;
      max-width: 420px;
      overflow: hidden;
      border: 1px solid #d1fae5;
    }}
    .pass-header {{
      background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
      color: white;
      padding: 1.5rem;
      text-align: center;
    }}
    .pass-header h1 {{
      font-size: 1.35rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .pass-header p {{
      font-size: 0.85rem;
      opacity: 0.9;
      margin-top: 0.25rem;
    }}
    .qr-container {{
      background: white;
      padding: 1.5rem;
      display: flex;
      justify-content: center;
      align-items: center;
      border-bottom: 1px dashed #cbd5e1;
    }}
    .qr-box {{
      width: 220px;
      height: 220px;
      border: 2px solid #e2e8f0;
      border-radius: 12px;
      padding: 10px;
      display: flex;
      justify-content: center;
      align-items: center;
    }}
    .qr-box svg {{
      width: 100%;
      height: 100%;
    }}
    .pass-details {{
      padding: 1.25rem 1.5rem;
    }}
    .detail-row {{
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 0.6rem 0;
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.95rem;
    }}
    .detail-row:last-child {{
      border-bottom: none;
    }}
    .detail-label {{
      color: var(--text-muted);
      font-size: 0.85rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }}
    .detail-value {{
      font-weight: 600;
      color: var(--text);
      text-align: right;
    }}
    .status-badge {{
      display: inline-block;
      background: #ecfdf5;
      color: #065f46;
      border: 1px solid #a7f3d0;
      padding: 0.25rem 0.6rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 700;
      letter-spacing: 0.5px;
    }}
    .pass-footer {{
      background: #f8fafc;
      padding: 1rem;
      text-align: center;
      font-size: 0.75rem;
      color: var(--text-muted);
      border-top: 1px solid var(--border);
    }}
  </style>
</head>
<body>
  <div class="pass-card">
    <div class="pass-header">
      <h1>KRAYAM GATE PASS</h1>
      <p>Official Verification Token</p>
    </div>

    <div class="qr-container">
      <div class="qr-box">
        {qr_res.svg}
      </div>
    </div>

    <div class="pass-details">
      <div class="detail-row">
        <span class="detail-label">Status</span>
        <span class="status-badge">{safe_status}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Booking ID</span>
        <span class="detail-value">{safe_booking_id}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Farmer</span>
        <span class="detail-value">{safe_farmer_name}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Phone</span>
        <span class="detail-value">{safe_phone}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Crop & Quantity</span>
        <span class="detail-value">{safe_crop} ({safe_qty})</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Procurement Centre</span>
        <span class="detail-value">{safe_centre}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Scheduled Date</span>
        <span class="detail-value">{safe_date}</span>
      </div>
    </div>

    <div class="pass-footer">
      Show this QR pass to the security guard or operator at the centre gate.
    </div>
  </div>
</body>
</html>"""


qr_service = QRService()
