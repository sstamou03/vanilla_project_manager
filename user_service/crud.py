from sqlalchemy.orm import Session
import models, schemas
from auth import get_password_hash

def get_user_by_username(db: Session, username: str):
    return db.query(models.User).filter(models.User.username == username).first()

def get_user_by_email(db: Session, email: str):
    return db.query(models.User).filter(models.User.email == email).first()

def create_user(db: Session, user: schemas.UserCreate):
    hashed_password = get_password_hash(user.password) 
    
    db_user = models.User(
        username=user.username,
        email=user.email,
        first_name=user.first_name,
        last_name=user.last_name,
        hashed_password=hashed_password,
        role=models.UserRole.MEMBER, 
        is_active=False
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def get_users(db: Session, skip: int=0, limit: int=100):
    return db.query(models.User).offset(skip).limit(limit).all()

def activate_user(db: Session, db_user: models.User):
    db_user.is_active= True
    db.commit()
    db.refresh(db_user)
    return db_user

def deactivate_user(db: Session, db_user: models.User):
    db_user.is_active = False
    db.commit()
    db.refresh(db_user)
    return db_user

def update_user_role(db: Session, db_user: models.User, role: models.UserRole):
    db_user.role = role
    db.commit()
    db.refresh(db_user)
    return db_user

def delete_user(db: Session, db_user: models.User):
    try:
        db.delete(db_user)
        db.commit()
        return True 
    except Exception:
        db.rollback() 
        return False 
    
def update_user_profile(db: Session, db_user: models.User, user_update: schemas.UserUpdate):
    if user_update.first_name:
        db_user.first_name = user_update.first_name
    if user_update.last_name:
        db_user.last_name = user_update.last_name
    if user_update.password:
        db_user.hashed_password = get_password_hash(user_update.password)
    
    db.commit()
    db.refresh(db_user)
    return db_user

def get_all_users(db: Session):
    return db.query(models.User).all()