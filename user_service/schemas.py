from pydantic import BaseModel, EmailStr, ConfigDict
from models import UserRole
from typing import Optional

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    password: str

class UserDisplay(BaseModel):
    username: str
    email: EmailStr
    first_name: str
    last_name: str
    role: UserRole
    is_active: bool

    model_config = ConfigDict(from_attributes=True) 

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class RoleUpdate(BaseModel):
    role : UserRole

class GoogleToken(BaseModel):
    token: str

class UserUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    password: Optional[str] = None

class UserList(BaseModel):
    username: str
    email: str
    first_name: str
    last_name: str
    
    class Config:
        from_attributes = True

class User(UserDisplay):
    pass