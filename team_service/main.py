from fastapi import FastAPI, Depends, HTTPException, status, Path
from pymongo.database import Database
from datetime import datetime
from typing import List 

import schemas, dependencies, crud
from database import get_db

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Team Management Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

# --- Endpoint 1: Δημιουργία Ομάδας (POST /api/teams) ---
@app.post("/api/teams", response_model=schemas.Team, status_code=status.HTTP_201_CREATED)
def create_team(
    team: schemas.TeamCreate, 
    db: Database = Depends(get_db),
    admin_user: schemas.TokenData = Depends(dependencies.get_current_admin_user)
):
    try:
        created_team = crud.create_team(db, team)
        return created_team
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# --- Endpoint 2: Προβολή Λίστας Ομάδων (GET /api/teams) ---
@app.get("/api/teams", response_model=List[schemas.Team])
def get_teams(
    db: Database = Depends(get_db),
    current_user_data: dict = Depends(dependencies.get_current_user_token_data) 
):
    teams_list = crud.get_teams(db, current_user_data)
    
    return teams_list

# --- Endpoint 3: Επεξεργασία Ονόματος/Περιγραφής (PUT /api/teams/{team_id}) ---
@app.put("/api/teams/{team_id}", response_model=schemas.Team)
def update_team(
    team_update: schemas.TeamUpdate,
    team_id: str = Path(...),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_team_leader)
):
    team = crud.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    updated_team = crud.update_team(db, team_id, team_update)
    return updated_team

# --- Endpoint 4: Διαγραφή Ομάδας (DELETE /api/teams/{team_id}) ---
@app.delete("/api/teams/{team_id}", status_code=status.HTTP_200_OK)
def delete_team(
    team_id: str = Path(...),
    db: Database = Depends(get_db),
    admin_user: schemas.TokenData = Depends(dependencies.get_current_admin_user) 
):
    deleted_team = crud.delete_team(db, team_id)
    
    if not deleted_team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
    
    return {
        "message": f"Η ομάδα '{deleted_team.get('name', 'N/A')}' με ID {team_id} διαγράφτηκε επιτυχώς.",
        "deleted_team": schemas.Team(**deleted_team)
    }


# --- Endpoint 5: Προβολή Λεπτομερειών Μίας Ομάδας (GET /api/teams/{team_id}) ---
@app.get("/api/teams/{team_id}", response_model=schemas.Team)
def get_team_details(
    team_id: str = Path(...),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_member) 
):
    team = crud.get_team_by_id(db, team_id)
    
    if not team:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        
    return team 


# --- Endpoint 6: Επεξεργασία Μελών Ομάδας (PUT /api/teams/{team_id}/members) ---
@app.put("/api/teams/{team_id}/members", response_model=schemas.Team)
def update_members(
    members_update: schemas.MembersUpdate,
    team_id: str = Path(...),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_team_leader_only)
):
    team = crud.get_team_by_id(db, team_id)
    if not team:
        raise HTTPException(status_code=404, detail="Team not found")
    
    updated_team = crud.update_team_members(db, team_id, members_update)
    return updated_team