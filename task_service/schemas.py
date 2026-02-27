from pydantic import BaseModel, Field
from datetime import datetime
from typing import Optional, List
from pydantic_core import CoreSchema, core_schema
from bson import ObjectId
import enum

class PyObjectId(ObjectId):
    @classmethod
    def __get_pydantic_core_schema__(
        cls, source_type: type, handler: callable
    ) -> CoreSchema:
        return core_schema.json_or_python_schema(
            json_schema=core_schema.str_schema(),
            python_schema=core_schema.is_instance_schema(ObjectId),
            serialization=core_schema.plain_serializer_function_ser_schema(
                lambda x: str(x)
            ),
        )

class TaskStatus(str, enum.Enum):
    TODO = "TODO"
    IN_PROGRESS = "IN_PROGRESS"
    DONE = "DONE"

class TaskPriority(str, enum.Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"

class TaskBase(BaseModel):
    title: str = Field(..., description="Title")
    description: str = Field(..., description="Description")
    priority: TaskPriority = Field(..., description="Priority")
    due_date: Optional[datetime] = Field(None, description="Due date")

class TaskCreate(TaskBase):
    assigned_to: str = Field(..., description="Username of the user to whom the task is assigned")
class Task(TaskBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    team_id: PyObjectId 
    created_by: str = Field(..., description="Username of the user who created the task")
    assigned_to: str
    status: TaskStatus = Field(default=TaskStatus.TODO, description="Status")
    date_created: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        from_attributes = True 

class TokenData(BaseModel):
    username: Optional[str] = None

class TaskUpdate(TaskBase):
    assigned_to: str = Field(..., description="Username of the user to whom the task is assigned")

class TaskStatusUpdate(BaseModel):
    status: TaskStatus

class CommentBase(BaseModel):
    text: str

class CommentCreate(CommentBase):
    pass

class Comment(CommentBase):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    task_id: PyObjectId
    created_by: str
    date_created: datetime = Field(default_factory=datetime.now)
    file_url: Optional[str] = None

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        from_attributes = True


class TaskDetails(Task):
    comments: List[Comment] = []

class Notification(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    user_id: str
    message: str
    is_read: bool = False
    date_created: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}