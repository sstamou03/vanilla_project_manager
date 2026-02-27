from sqlalchemy import Boolean, Column, String, Enum
from database import Base
import enum

class UserRole(str, enum.Enum):
    ADMIN = "ADMIN"
    TEAM_LEADER = "TEAM_LEADER"
    MEMBER = "MEMBER"

class User(Base):
    __tablename__ = "users"

    username = Column(String(50), primary_key=True, unique=True, index=True)
    email = Column(String(100), unique=True, index=True, nullable=False)
    first_name = Column(String(50), nullable=False)
    last_name = Column(String(50), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), default=UserRole.MEMBER, nullable=False)
    is_active = Column(Boolean, default=False, nullable=False)