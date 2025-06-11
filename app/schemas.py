# file: app/schemas.py
from pydantic import BaseModel, EmailStr
from typing import List, Optional, Any

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    name: str

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    purchase_history: List[Any] = []
    last_viewed_product_id: Optional[int] = None
    class Config:
        from_attributes = True # Changed from orm_mode for Pydantic v2