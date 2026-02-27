from fastapi import (
    FastAPI, Depends, HTTPException, status, Path, Query, 
    File, UploadFile, Form
)
from fastapi.staticfiles import StaticFiles
from pydantic import Field
from pymongo.database import Database
from typing import List, Optional
from datetime import datetime
import schemas, dependencies, crud
from database import get_db
import os 
import uuid
import shutil

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Task Management Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"], 
    allow_headers=["*"],
)

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount(f"/{UPLOAD_DIR}", StaticFiles(directory=UPLOAD_DIR), name="uploads")



@app.post("/api/teams/{team_id}/tasks", response_model=schemas.Task, status_code=status.HTTP_201_CREATED)
def create_task(
    task: schemas.TaskCreate,
    team_id: str = Path(..., description="The ID of the team this task will belong to"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_team_leader_only) 
):
    """
    Creates a new task for a team. 
    Access permitted only for the Team Leader of that team.
    """
    try:
        created_task = crud.create_task_for_team(db, task, team_id, current_user.username)
        if not created_task:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Team not found")
        return created_task
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@app.put("/api/tasks/{task_id}", response_model=schemas.Task)
def update_task_details(
    task_update: schemas.TaskUpdate,
    task_id: str = Path(..., description="The ID of the task to update"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_task_team_leader_only)
):
    """
    Updates a task's details (title, description, assigned_to, etc.).
    Access permitted only for the Team Leader of the team this task belongs to.
    """
    try:
        updated_task = crud.update_task(db, task_id, task_update)
        if not updated_task:
            raise HTTPException(status_code=404, detail="Task not found")
        return updated_task
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred: {e}")

@app.delete("/api/tasks/{task_id}", status_code=status.HTTP_200_OK)
def delete_task_endpoint(
    task_id: str = Path(..., description="The ID of the task to delete"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_task_team_leader_only)
):
    """
    Deletes a task. 
    Access permitted only for the Team Leader of the team this task belongs to.
    """
    deleted = crud.delete_task(db, task_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Task not found or already deleted")
    return {"message": "Task deleted successfully", "task_id": task_id}

@app.get("/api/teams/{team_id}/tasks", response_model=List[schemas.Task])
def get_tasks_for_team_endpoint(
    team_id: str = Path(..., description="The ID of the team to retrieve tasks for"),
    status: Optional[schemas.TaskStatus] = Query(None, description="Filter by task status (TODO, IN_PROGRESS, DONE)"),
    due_date_before: Optional[datetime] = Query(None, description="Filter tasks due before this date (ISO format)"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_member) 
):
    """
    Retrieves a list of all tasks for a specific team, with optional filtering by status or deadline.
    """
    filters = {
        "status": status, 
        "due_date_before": due_date_before
    }
    tasks = crud.get_tasks_for_team(db, team_id, filters)
    return tasks

@app.get("/api/my-tasks", response_model=List[schemas.Task])
def get_my_tasks(
    status: Optional[schemas.TaskStatus] = Query(None, description="Filter by task status"),
    due_date_before: Optional[datetime] = Query(None, description="Filter tasks due before this date (ISO format)"),
    db: Database = Depends(get_db),
    current_user_data: dict = Depends(dependencies.get_current_user_token_data) 
):
    """
    Retrieves all tasks assigned to the currently logged-in user, with optional filtering.
    """
    username = current_user_data["username"]
    filters = {
        "status": status, 
        "due_date_before": due_date_before
    }
    tasks = crud.get_tasks_for_user(db, username, filters)
    return tasks

@app.patch("/api/tasks/{task_id}/status", response_model=schemas.Task)
def change_task_status(
    status_update: schemas.TaskStatusUpdate,
    task_id: str = Path(..., description="The ID of the task to update status for"),
    db: Database = Depends(get_db),
    # Bouncer: Admin or Team Member
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_task_team_member)
):
    """
    Updates a task's status (e.g., TODO -> IN_PROGRESS).
    Access permitted for Admins or any member of the task's team.
    """
    updated_task = crud.update_task_status(db, task_id, status_update)
    
    if not updated_task:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return updated_task



@app.post("/api/tasks/{task_id}/comments", response_model=schemas.Comment, status_code=status.HTTP_201_CREATED)
def add_comment_to_task(
    task_id: str = Path(..., description="The ID of the task to comment on"),
    text: str = Form(..., description="The text content of the comment"),
    file: Optional[UploadFile] = File(None, description="Optional file attachment"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_task_team_member)
):
    """
    Adds a new comment to a task (with optional file upload).
    Access permitted for Admins or any member of the task's team.
    """
    
    file_url = None
    if file:
        try:
            # Create a unique filename
            file_extension = os.path.splitext(file.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_extension}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            # Save the file to disk
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(file.file, buffer)
            
            # Create the URL to be stored in the DB
            file_url = f"/{UPLOAD_DIR}/{unique_filename}"
            
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Failed to upload file: {e}")
        finally:
            file.file.close() 

    new_comment = crud.create_comment_for_task(
        db=db, 
        task_id=task_id, 
        username=current_user.username,
        text=text, 
        file_url=file_url
    )
    
    if not new_comment:
        raise HTTPException(status_code=404, detail="Task not found")
        
    return new_comment

@app.get("/api/tasks/{task_id}/comments", response_model=List[schemas.Comment])
def get_comments_for_task_endpoint(
    task_id: str = Path(..., description="The ID of the task to retrieve comments for"),
    db: Database = Depends(get_db),
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_task_team_member)
):
    """
    Retrieves all comments for a specific task.
    Access permitted for Admins or any member of the task's team.
    """
    comments = crud.get_comments_for_task(db, task_id)
    return comments

@app.get("/api/tasks/{task_id}", response_model=schemas.TaskDetails)
def get_full_task_details(
    task_id: str = Path(..., description="The ID of the task to retrieve full details for"),
    db: Database = Depends(get_db),
    # Επαναχρησιμοποιούμε τον Bouncer των σχολίων (Admin or Team Member)
    current_user: schemas.TokenData = Depends(dependencies.get_current_admin_or_task_team_member)
):
    """
    Retrieves full details for a single task, including all its comments.
    Access permitted for Admins or any member of the task's team.
    """
    
    task = crud.get_task_by_id(db, task_id)
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    comments = crud.get_comments_for_task(db, task_id)

    task_details = schemas.TaskDetails(**task, comments=comments)
    
    return task_details

@app.get("/api/notifications", response_model=List[schemas.Notification])
def get_notifications(
    db: Database = Depends(get_db),
    current_user_data: dict = Depends(dependencies.get_current_user_token_data)
):
    return crud.get_my_notifications(db, current_user_data["username"])

@app.delete("/api/notifications", status_code=status.HTTP_204_NO_CONTENT)
def clear_notifications(
    db: Database = Depends(get_db),
    current_user_data: dict = Depends(dependencies.get_current_user_token_data)
):
    """Καθαρίζει τις ειδοποιήσεις του χρήστη."""
    crud.delete_my_notifications(db, current_user_data["username"])
    return