from pymongo.database import Database
from bson import ObjectId
import schemas
from datetime import datetime
import pika
import json
import os

RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'rabbitmq')

# Ορίζουμε τα credentials που βάλαμε στο docker-compose.yml
credentials = pika.PlainCredentials('user', 'password')

# --- Συνάρτηση για αποστολή μηνύματος (RabbitMQ) ---
def publish_message(message_body):
    try:
        connection = pika.BlockingConnection(
            pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
        )
        channel = connection.channel()
        channel.queue_declare(queue='user_demotion_queue', durable=True)
        
        channel.basic_publish(
            exchange='',
            routing_key='user_demotion_queue',
            body=json.dumps(message_body),
            properties=pika.BasicProperties(delivery_mode=2)
        )
        print(f" [x] Sent message: {message_body}")
        connection.close()
    except pika.exceptions.AMQPConnectionError:
        print(f" [!] Failed to connect to RabbitMQ at {RABBITMQ_HOST}")
    except Exception as e:
        print(f" [!] Error publishing message: {e}")

# --- Βοηθητική Συνάρτηση Ειδοποιήσεων (ΝΕΟ) ---
def create_notification(db: Database, username: str, message: str):
    """Γράφει μια ειδοποίηση στη κοινή συλλογή notifications."""
    notif_data = {
        "user_id": username,
        "message": message,
        "is_read": False,
        "date_created": datetime.now()
    }
    db.notifications.insert_one(notif_data)

# --- 1. Δημιουργία Ομάδας ---
def create_team(db: Database, team: schemas.TeamCreate):
    team_data = team.model_dump()
    team_data["date_created"] = datetime.now()
    team_data["members"] = [team.leader_username] 
    
    result = db.teams.insert_one(team_data)
    created_team = db.teams.find_one({"_id": result.inserted_id})
    
    if created_team:
        # 1. Ειδοποίηση στον Leader (Notification UI)
        msg = f"You have been assigned as the Team Leader of '{created_team['name']}'"
        create_notification(db, team.leader_username, msg)

        # 2. Ειδοποίηση στο User Service (RabbitMQ Bonus)
        message = {"username": team.leader_username, "action": "PROMOTE_TO_LEADER"}
        publish_message(message)
            
    return created_team

# --- 2. Εύρεση Ομάδας ---
def get_team_by_id(db: Database, team_id: str):
    try:
        # Μετατρέπουμε το string ID σε ObjectId της MongoDB
        _id = ObjectId(team_id)
        return db.teams.find_one({"_id": _id})
    except Exception:
        return None # Αν το ID δεν είναι έγκυρο

# --- 3. Ενημέρωση Ομάδας (Όνομα/Περιγραφή) ---
def update_team(db: Database, team_id: str, team_update: schemas.TeamUpdate):
    try:
        _id = ObjectId(team_id)
    except Exception:
        return None

    # Φτιάχνουμε το update object
    update_data = {
        "$set": {
            "name": team_update.name,
            "description": team_update.description
        }
    }
    
    # Κάνουμε το update στη βάση
    db.teams.update_one({"_id": _id}, update_data)
    
    # Επιστρέφουμε την ενημερωμένη ομάδα
    updated_team = db.teams.find_one({"_id": _id})
    return updated_team

# --- 4. Ενημέρωση Μελών Ομάδας (ΜΕ ΕΙΔΟΠΟΙΗΣΕΙΣ) ---
def update_team_members(db: Database, team_id: str, members_update: schemas.MembersUpdate):
    try:
        _id = ObjectId(team_id)
    except Exception:
        return None
    
    # Α. Βρίσκουμε τα ΠΑΛΙΑ μέλη (πριν την αλλαγή)
    old_team = db.teams.find_one({"_id": _id})
    if not old_team:
        return None
    old_members = set(old_team.get("members", []))

    # Β. Κάνουμε το update στη βάση
    update_data = {
        "$set": {
            "members": members_update.members
        }
    }
    db.teams.update_one({"_id": _id}, update_data)
    
    # Γ. Βρίσκουμε τα ΝΕΑ μέλη (μετά την αλλαγή)
    updated_team = db.teams.find_one({"_id": _id})
    new_members = set(updated_team.get("members", []))
    
    # Δ. Υπολογίζουμε τη διαφορά (Ποιοι είναι καινούργιοι;)
    fresh_members = new_members - old_members
    
    for member in fresh_members:
        # Δεν στέλνουμε ειδοποίηση αν ο Leader πρόσθεσε τον εαυτό του (σπάνιο, αλλά για σιγουριά)
        if member != updated_team.get("leader_username"):
            msg = f"You have been added to the team '{updated_team['name']}'"
            create_notification(db, member, msg)

    return updated_team

# --- 5. Διαγραφή Ομάδας ---
def delete_team(db: Database, team_id: str):
    try:
        _id = ObjectId(team_id)
    except Exception:
        return None

    team_to_delete = db.teams.find_one({"_id": _id})
    
    if not team_to_delete:
        return None 
    
    leader_username = team_to_delete.get("leader_username")
    
    db.teams.delete_one({"_id": _id})

    deleted_tasks = db.tasks.delete_many({"team_id": _id})
    print(f" [i] Deleted team {_id} and its {deleted_tasks.deleted_count} tasks.")
    
    if leader_username:
        other_teams = db.teams.find_one({"leader_username": leader_username})
        
        if not other_teams:
            message = {"username": leader_username, "action": "DEMOTE_TO_MEMBER"}
            publish_message(message)
            
    return team_to_delete

def get_teams(db: Database, user_data: dict):
    
    if user_data['role'] == "ADMIN":
        teams_cursor = db.teams.find({})
    
    else:
        teams_cursor = db.teams.find({
            "members": user_data['username']
        })
        
    teams_list = list(teams_cursor)
    
    return [schemas.Team(**team) for team in teams_list]