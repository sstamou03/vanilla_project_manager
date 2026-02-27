from fastapi import Depends, HTTPException, status, Path
from fastapi.security import APIKeyHeader
from jose import JWTError, jwt
import os
import schemas
from pymongo.database import Database
from database import get_db
import crud

oauth2_scheme = APIKeyHeader(name="Authorization", auto_error=False) 

SECRET_KEY = os.environ.get("SECRET_KEY")
ALGORITHM = os.environ.get("ALGORITHM")

def get_current_admin_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Operation not permitted: Requires Admin privileges"
    )
    
    if not token or not token.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated or invalid token format",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    token = token.split(" ")[1]

    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        if role != "ADMIN":
            raise credentials_exception
            
        return schemas.TokenData(username=username) 
        
    except JWTError:
        raise credentials_exception

def get_current_admin_or_team_leader(
    token: str = Depends(oauth2_scheme),
    team_id: str = Path(...), 
    db: Database = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        
        if role == "ADMIN":
            return schemas.TokenData(username=username) 
        if role == "TEAM_LEADER":
            team = crud.get_team_by_id(db, team_id)
            if team and team["leader_username"] == username:
                return schemas.TokenData(username=username) 

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: Requires Admin or Team Leader privileges for this team"
        )
            
    except JWTError:
        raise credentials_exception
    

def get_current_team_leader_only(
    token: str = Depends(oauth2_scheme),
    team_id: str = Path(...), 
    db: Database = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        
        if role == "TEAM_LEADER":
            team = crud.get_team_by_id(db, team_id) 
            if team and team["leader_username"] == username:
                return schemas.TokenData(username=username) 

        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: Requires Team Leader privileges for this specific team"
        )
            
    except JWTError:
        raise credentials_exception
    
def get_current_user_token_data(
    token: str = Depends(oauth2_scheme)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
            
        return {"username": username, "role": role} 
        
    except JWTError:
        raise credentials_exception
    
def get_current_admin_or_member(
    token: str = Depends(oauth2_scheme),
    team_id: str = Path(...), 
    db: Database = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        
        if role == "ADMIN":
            return schemas.TokenData(username=username) 

        team = crud.get_team_by_id(db, team_id) 
        
        if team and username in team.get("members", []):
            return schemas.TokenData(username=username) 
            
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Operation not permitted: You must be a member or Admin to view team details"
        )
            
    except JWTError:
        raise credentials_exception
    
def get_current_task_team_leader_only(
    token: str = Depends(oauth2_scheme),
    task_id: str = Path(...), 
    db: Database = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Operation permitted only by the leader of this task's team"
    )

    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        
        if role != "TEAM_LEADER":
            raise forbidden_exception

        task = crud.get_task_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")
        
        team = crud.get_team_by_id(db, str(task["team_id"]))
        if not team:
             raise HTTPException(status_code=404, detail="Team not found for this task")

        if team["leader_username"] == username:
            return schemas.TokenData(username=username) 
        raise forbidden_exception
            
    except JWTError:
        raise credentials_exception
    
def get_current_leader_or_assigned_user(
    token: str = Depends(oauth2_scheme),
    task_id: str = Path(..., description="The ID of the task to modify"),
    db: Database = Depends(get_db)
):
    """
    Bouncer that grants access if the user is EITHER:
    1. The Team Leader of the task's team.
    2. The User assigned to the task.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Operation permitted only by the Team Leader or the assigned user"
    )

    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        
        task = crud.get_task_by_id(db, task_id)
        if not task:
            raise HTTPException(status_code=404, detail="Task not found")

        if task["assigned_to"] == username:
            return schemas.TokenData(username=username)

        if role == "TEAM_LEADER":
            team = crud.get_team_by_id(db, str(task["team_id"]))
            if team and team["leader_username"] == username:
                return schemas.TokenData(username=username) 
        raise forbidden_exception
            
    except JWTError:
        raise credentials_exception
    
def get_current_admin_or_task_team_member(
    token: str = Depends(oauth2_scheme),
    task_id: str = Path(..., description="The ID of the task"),
    db: Database = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    forbidden_exception = HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Operation permitted only by an Admin or a member of this task's team"
    )

    if not token or not token.lower().startswith("bearer "):
        raise credentials_exception
    
    token_data = token.split(" ")[1]

    try:
        payload = jwt.decode(token_data, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        role: str = payload.get("role")
        
        if username is None or role is None:
            raise credentials_exception
        

        if role == "ADMIN":
            return schemas.TokenData(username=username)

        # 2. Find the task
        task = crud.get_task_by_id(db, task_id)
        if not task:
            print(f"DEBUG AUTH: Task {task_id} NOT FOUND in DB") 
            raise HTTPException(status_code=404, detail="Task not found")

        team_id_str = str(task["team_id"])
        team = crud.get_team_by_id(db, team_id_str)
        
        if not team:
            print(f"DEBUG AUTH: Team {team_id_str} NOT FOUND for task")
            raise HTTPException(status_code=404, detail="Task's team not found")
        
        members = team.get("members", [])
        print(f"DEBUG AUTH: Checking if {username} is in {members}")
        
        if username in members:
            return schemas.TokenData(username=username)

        print(f"DEBUG AUTH: Access Denied for {username}")
        raise forbidden_exception
            
    except JWTError:
        raise credentials_exception
    except Exception as e:
        print(f"DEBUG AUTH ERROR: {e}")
        raise HTTPException(status_code=500, detail=str(e))