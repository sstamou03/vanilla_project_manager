import pika
import time
import json
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from database import DATABASE_URL, Base, get_db 
from models import User, UserRole 
if not DATABASE_URL:
    print("FATAL: DATABASE_URL environment variable not set.")
    exit(1)

print("Subscriber waiting for database...")
time.sleep(10) 

try:
    engine = create_engine(DATABASE_URL)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
    print("Subscriber connected to MySQL.")
except Exception as e:
    print(f"Failed to connect to MySQL: {e}")
    exit(1)

RABBITMQ_HOST = os.environ.get('RABBITMQ_HOST', 'rabbitmq')

credentials = pika.PlainCredentials('user', 'password')

def callback(ch, method, properties, body):
    print(f" [x] Received message: {body.decode()}")
    try:
        message = json.loads(body.decode())
        action = message.get("action")
        username = message.get("username")

        if not username:
            print(" [!] No username in message.")
            ch.basic_ack(delivery_tag=method.delivery_tag)
            return

        db = SessionLocal()
        try:
            user = db.query(User).filter(User.username == username).first()
            
            if not user:
                print(f" [!] User '{username}' not found.")
                
            elif action == "PROMOTE_TO_LEADER":
                if user.role == UserRole.MEMBER:
                    user.role = UserRole.TEAM_LEADER
                    db.commit()
                    print(f" Successfully promoted user '{username}' to TEAM_LEADER.")
                else:
                    print(f" [i] User '{username}' is already a '{user.role}'. No promotion needed.")

            elif action == "DEMOTE_TO_MEMBER":
                if user.role == UserRole.TEAM_LEADER:
                    user.role = UserRole.MEMBER
                    db.commit()
                    print(f" Successfully demoted user '{username}' to MEMBER.")
                else:
                    print(f" [i] User '{username}' role is '{user.role}'. No demotion needed.")
            
            else:
                print(f" [!] Unknown action: {action}")

        finally:
            db.close()
            
        ch.basic_ack(delivery_tag=method.delivery_tag)
        
    except json.JSONDecodeError:
        print(" Failed to decode JSON message.")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=False)
    except Exception as e:
        print(f" Error processing message: {e}")
        ch.basic_nack(delivery_tag=method.delivery_tag, requeue=True)

def start_subscriber():
    connection = None
    while True:
        try:
            print(f"Attempting to connect to RabbitMQ at {RABBITMQ_HOST}...")
            connection = pika.BlockingConnection(
                pika.ConnectionParameters(host=RABBITMQ_HOST, credentials=credentials)
            )
            channel = connection.channel()
            channel.queue_declare(queue='user_demotion_queue', durable=True)
            
            print(' Waiting for messages. To exit press CTRL+C')
            
            channel.basic_consume(queue='user_demotion_queue', on_message_callback=callback)
            channel.start_consuming()
            
        except pika.exceptions.AMQPConnectionError:
            print(f"Connection to RabbitMQ failed. Retrying in 5 seconds...")
            if connection and not connection.is_closed:
                connection.close()
            time.sleep(5)
        except KeyboardInterrupt:
            print("Subscriber shutting down.")
            if connection and not connection.is_closed:
                connection.close()
            break
        except Exception as e:
            print(f"An unexpected error occurred: {e}. Restarting subscriber...")
            if connection and not connection.is_closed:
                connection.close()
            time.sleep(5)

if __name__ == '__main__':
    start_subscriber()