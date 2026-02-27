from pydantic import BaseModel, Field, ConfigDict 
from datetime import datetime
from typing import Optional
from pydantic_core import CoreSchema, core_schema
from bson import ObjectId

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

class Team(BaseModel):
    id: PyObjectId = Field(default_factory=PyObjectId, alias="_id")
    name: str
    description: str
    leader_username: str
    members: list[str] = []
    date_created: datetime = Field(default_factory=datetime.now)

    class Config:
        populate_by_name = True
        json_encoders = {ObjectId: str}
        from_attributes = True 

class TeamCreate(BaseModel):
    name: str
    description: str
    leader_username: str

class TokenData(BaseModel):
    username: Optional[str] = None

class TeamUpdate(BaseModel):
    name: str
    description: str

class MembersUpdate(BaseModel):
    members: list[str]
