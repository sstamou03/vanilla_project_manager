from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from typing import List 
from fastapi.middleware.cors import CORSMiddleware
from typing import List

from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
import secrets 

import crud, models, schemas, auth, dependencies
from database import engine, get_db

models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="User Management Service (Full)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- Endpoint 1: Sign Up ---
@app.post("/signup", response_model=schemas.UserDisplay, status_code=status.HTTP_201_CREATED)
def signup_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=user.username)
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    db_user_email = crud.get_user_by_email(db, email=user.email)
    if db_user_email:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    new_user = crud.create_user(db=db, user=user)
    return new_user



# --- Endpoint 2: Login  ---
@app.post("/login", response_model=schemas.Token)
def login_for_access_token(db: Session = Depends(get_db), form_data: OAuth2PasswordRequestForm = Depends()):
    user = crud.get_user_by_username(db, username=form_data.username)
    
    if not user or not auth.verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Account is inactive. Please contact an admin for activation."
        )
        
    access_token = auth.create_access_token(
        data={"sub": user.username, "role": user.role.value}
    )
    return {"access_token": access_token, "token_type": "bearer"}

# --- Endpoint 3: Google Login ---
@app.post("/google-login")
def google_login(token_data: schemas.GoogleToken, db: Session = Depends(get_db)):
    try:
        # 1. Επαλήθευση του Token με την Google
        idinfo = id_token.verify_oauth2_token(
            token_data.token, 
            google_requests.Request(), 
            "226876483945-lmo4uv1mc6993nn9o1pm5duhoju5hkba.apps.googleusercontent.com" 
        )

        email = idinfo['email']
        first_name = idinfo.get('given_name', 'Google')
        last_name = idinfo.get('family_name', 'User')
        
        user = crud.get_user_by_email(db, email=email)
        
        if not user:
            random_username = email.split("@")[0] 
            if crud.get_user_by_username(db, random_username):
                random_username += secrets.token_hex(2)

            user_in = schemas.UserCreate(
                username=random_username,
                email=email,
                first_name=first_name,
                last_name=last_name,
                password=secrets.token_urlsafe(16)
            )
            user = crud.create_user(db, user_in)
            
            
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="Account created successfully via Google. Please wait for Admin approval to login."
            )
        
        if not user.is_active:
             raise HTTPException(
                 status_code=status.HTTP_400_BAD_REQUEST, 
                 detail="Account is inactive. Please contact an admin."
             )

        access_token = auth.create_access_token(data={"sub": user.username, "role": user.role.value})
        
        return {
            "access_token": access_token, 
            "token_type": "bearer", 
            "username": user.username, 
            "role": user.role.value
        }

    except ValueError:
        raise HTTPException(status_code=401, detail="Invalid Google Token")


# --- Endpoint 4: Προβολή στοιχείων "μου" ---
@app.get("/users/me", response_model=schemas.UserDisplay)
def read_users_me(current_user: models.User = Depends(dependencies.get_current_user)):
    return current_user

@app.put("/users/updateme", response_model=schemas.UserDisplay)
def update_me(
    user_update: schemas.UserUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(dependencies.get_current_user)
):
    return crud.update_user_profile(db, current_user, user_update)

# --- ADMIN Endpoints ---

@app.get("/admin/users", response_model=List[schemas.UserDisplay], dependencies=[Depends(dependencies.get_current_admin_user)])
def read_all_users(skip: int = 0, limit: int = 100, db: Session = Depends(get_db)):
    users = crud.get_users(db, skip=skip, limit=limit)
    return users

@app.put("/admin/users/{username}/activate", response_model=schemas.UserDisplay, dependencies=[Depends(dependencies.get_current_admin_user)])
def activate_user_account(username: str, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=username)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if db_user.is_active:
        raise HTTPException(status_code=400, detail="User is already active")
    
    return crud.activate_user(db=db, db_user=db_user)

@app.put("/admin/users/{username}/deactivate", response_model=schemas.UserDisplay, dependencies=[Depends(dependencies.get_current_admin_user)])
def deactivate_user_account(username: str, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=username)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
    if not db_user.is_active:
        raise HTTPException(status_code=400, detail="User is already inactive")
    
    return crud.deactivate_user(db=db, db_user=db_user)

@app.put("/admin/users/{username}/role", response_model=schemas.UserDisplay, dependencies=[Depends(dependencies.get_current_admin_user)])
def change_user_role(username: str, role_update: schemas.RoleUpdate, db: Session = Depends(get_db)):
    db_user = crud.get_user_by_username(db, username=username)
    if not db_user:
        raise HTTPException(status_code=404, detail="User not found")
        
    return crud.update_user_role(db=db, db_user=db_user, role=role_update.role)

@app.delete("/admin/users/{username}", status_code=status.HTTP_200_OK)
def delete_user_account(
    username: str, 
    db: Session = Depends(get_db),
    admin_user: models.User = Depends(dependencies.get_current_admin_user)
):
    if username == admin_user.username:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Cannot delete your own Admin account.")

    user_to_delete = crud.get_user_by_username(db, username=username)
    if not user_to_delete:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found.")

    if user_to_delete.role != models.UserRole.MEMBER:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Cannot delete user '{username}' because they have an important role ({user_to_delete.role}). Please demote them to 'MEMBER' first."
        )

    success = crud.delete_user(db, db_user=user_to_delete)
    
    if not success:
        raise HTTPException(status_code=500, detail="Error deleting user.")
    
    return {"message": f"User '{username}' (Role: MEMBER) was successfully deleted."}

@app.get("/users", response_model=List[schemas.UserList])
def read_all_users(
    db: Session = Depends(get_db), 
    current_user: schemas.User = Depends(auth.get_current_user) # <--- ΑΥΤΟ ΕΙΝΑΙ ΤΟ ΚΛΕΙΔΙ
):

    users = crud.get_all_users(db)
    return users