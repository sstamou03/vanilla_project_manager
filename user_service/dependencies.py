from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import JWTError, jwt
import os
import auth, crud, models, schemas
from database import get_db

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

SECRET = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM") 

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)):
    
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="No valid token", 
        headers={"WWW-Authenticate": "Bearer"}
    )

    try:
        payload = jwt.decode(token, SECRET, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        
        if username is None:
            raise credentials_exception
        
        token_data = schemas.TokenData(username=username)
    
    except JWTError:
        raise credentials_exception
    
    user = crud.get_user_by_username(db, username=token_data.username)
    
    if user is None:
        raise credentials_exception
    
    return user


def get_current_admin_user(current_user: models.User = Depends(get_current_user)):
    if current_user.role != models.UserRole.ADMIN:
        raise HTTPException (
            status_code = status.HTTP_403_FORBIDDEN,
            detail="Requires Admin privilages"
        )

    return current_user