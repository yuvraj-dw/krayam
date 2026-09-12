from pydantic import BaseModel, Field


class QRTheme(BaseModel):
    primary_color: str = "#1b5e20"
    background_color: str = "#ffffff"


class QRCodeResponse(BaseModel):
    type: str  # "GATE_PASS" | "PROCUREMENT_RECEIPT"
    reference_id: str
    qr_data: str
    svg: str
    data_url: str
    theme: QRTheme = Field(default_factory=QRTheme)


class QRScanCheckInRequest(BaseModel):
    qr_payload: str
