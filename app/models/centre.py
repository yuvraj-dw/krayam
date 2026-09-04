import uuid
from datetime import datetime, time

from sqlalchemy import Boolean, DateTime, ForeignKey, Numeric, String, Time, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Centre(Base):
    __tablename__ = "centres"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    code: Mapped[str] = mapped_column(String(50), unique=True, nullable=False)
    address: Mapped[str | None] = mapped_column()
    village: Mapped[str | None] = mapped_column(String(255))
    district: Mapped[str | None] = mapped_column(String(255))
    state: Mapped[str | None] = mapped_column(String(255))
    latitude: Mapped[float] = mapped_column(nullable=False)
    longitude: Mapped[float] = mapped_column(nullable=False)
    capacity: Mapped[int] = mapped_column(default=50)
    operating_start: Mapped[time] = mapped_column(Time, default=time(9, 0))
    operating_end: Mapped[time] = mapped_column(Time, default=time(17, 0))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    crops: Mapped[list["CentreCrop"]] = relationship(back_populates="centre")


class CentreCrop(Base):
    __tablename__ = "centre_crops"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    centre_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("centres.id"))
    crop_name: Mapped[str] = mapped_column(String(100), nullable=False)
    rate_per_unit: Mapped[float | None] = mapped_column(Numeric(10, 2))
    unit: Mapped[str] = mapped_column(String(20), default="quintal")
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)

    centre: Mapped["Centre"] = relationship(back_populates="crops")
