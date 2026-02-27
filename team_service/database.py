import os
from pymongo import MongoClient

DATABASE_URL = os.environ.get("DATABASE_URL")
DATABASE_NAME = os.environ.get("DATABASE_NAME")

client = MongoClient(DATABASE_URL)
db = client[DATABASE_NAME]

def get_db():
    return db