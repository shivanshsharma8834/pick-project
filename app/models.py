# file: app/models.py
from sqlalchemy import Column, Integer, String, JSON, Boolean
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, index=True)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    purchase_history = Column(JSON, default=[])
    last_viewed_product_id = Column(Integer, nullable=True)