from pymongo.database import Database
from bson import ObjectId
import schemas
from datetime import datetime
import pika
import json
import os
from fastapi import UploadFile, File
import shutil
from typing import Optional, List

def create_task_for_team(db: Database, task: schemas.TaskCreate, team_id: str, username: str):
    try:
        team_obj_id = ObjectId(team_id)
        team = db.teams.find_one({"_id": team_obj_id})

        if not team:
            print(f"CRUD Error: Team not found with id {team_id}")
            return None
    except Exception as e:
        print(f"CRUD Error: Invalid Team ID format: {e}")
        return None

    if task.assigned_to not in team.get("members", []):
        raise ValueError(f"User '{task.assigned_to}' is not a member of this team.")

    task_data = task.model_dump()
    task_data["team_id"] = team_obj_id
    task_data["created_by"] = username
    task_data["status"] = schemas.TaskStatus.TODO
    task_data["date_created"] = datetime.now()

    result = db.tasks.insert_one(task_data)
    created_task = db.tasks.find_one({"_id": result.inserted_id})
    
    return created_task

def get_team_by_id(db: Database, team_id: str):
    try:
        _id = ObjectId(team_id)
        return db.teams.find_one({"_id": _id})
    except Exception:
        return None

def get_task_by_id(db: Database, task_id: str):
    try:
        _id = ObjectId(task_id)
        return db.tasks.find_one({"_id": _id})
    except Exception:
        return None

def update_task(db: Database, task_id: str, task_update: schemas.TaskUpdate):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        return None

    task = db.tasks.find_one({"_id": obj_id})
    if not task:
        return None

    team = db.teams.find_one({"_id": task["team_id"]})
    if not team:
        raise Exception("Data inconsistency: Task's team not found.")

    if task_update.assigned_to not in team.get("members", []):
        raise ValueError(f"User '{task_update.assigned_to}' is not a member of this team.")
    
    update_data = {"$set": task_update.model_dump()}
    db.tasks.update_one({"_id": obj_id}, update_data)
    
    return db.tasks.find_one({"_id": obj_id})

def delete_task(db: Database, task_id: str):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        return False

    result = db.tasks.delete_one({"_id": obj_id})
    return result.deleted_count > 0

def get_tasks_for_team(db: Database, team_id: str, filters: dict):
    try:
        team_obj_id = ObjectId(team_id)
    except Exception:
        return []

    query = {"team_id": team_obj_id}
    
    if filters.get("status"):
        query["status"] = filters["status"]
        
    if filters.get("due_date_before"):
        query["due_date"] = {"$lte": filters["due_date_before"]}
        
    tasks_cursor = db.tasks.find(query)
    
    return [schemas.Task(**task) for task in list(tasks_cursor)]

def get_tasks_for_user(db: Database, username: str, filters: dict):
    query = {"assigned_to": username}
    
    if filters.get("status"):
        query["status"] = filters["status"]
        
    if filters.get("due_date_before"):
        query["due_date"] = {"$lte": filters["due_date_before"]}
        
    tasks_cursor = db.tasks.find(query)
    
    return [schemas.Task(**task) for task in list(tasks_cursor)]

def update_task_status(db: Database, task_id: str, status_update: schemas.TaskStatusUpdate):
    try:
        obj_id = ObjectId(task_id)
    except Exception:
        return None

    task = db.tasks.find_one({"_id": obj_id})
    if not task:
        return None
    
    update_data = {"$set": {"status": status_update.status}}
    
    db.tasks.update_one({"_id": obj_id}, update_data)
    
    return db.tasks.find_one({"_id": obj_id})

def create_comment_for_task(db: Database, task_id: str, username: str, text: str, file_url: Optional[str]):
    try:
        task_obj_id = ObjectId(task_id)
    except Exception:
        return None

    task = db.tasks.find_one({"_id": task_obj_id})
    if not task:
        return None

    comment_data = {
        "text": text,
        "file_url": file_url,
        "task_id": task_obj_id,
        "created_by": username,
        "date_created": datetime.now()
    }

    result = db.comments.insert_one(comment_data)
    
    return db.comments.find_one({"_id": result.inserted_id})

def get_comments_for_task(db: Database, task_id: str):
    try:
        task_obj_id = ObjectId(task_id)
    except Exception:
        return []

    comments_cursor = db.comments.find({"task_id": task_obj_id})
    
    return [schemas.Comment(**comment) for comment in list(comments_cursor)]

def get_my_notifications(db: Database, username: str):
    cursor = db.notifications.find({"user_id": username}).sort("date_created", -1).limit(10)
    return [schemas.Notification(**n) for n in list(cursor)]

def delete_my_notifications(db: Database, username: str):
    result = db.notifications.delete_many({"user_id": username})
    return result.deleted_count