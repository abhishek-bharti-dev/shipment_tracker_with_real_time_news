from sqlalchemy import Column, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
import uuid

from database import Base

class Port(Base):
    __tablename__ = "ports"

    port_id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    port_code = Column(String)
    port_name = Column(String)
    country_code = Column(String)
    lat_lon = Column(Text)  # Stored as JSON array [lat, lon]

    # Relationships
    incidents = relationship("Incident", back_populates="affected_port")
    delays = relationship("Delay", back_populates="port") 