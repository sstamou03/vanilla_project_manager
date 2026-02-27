# TUCello: Project Management System

This project implements a simplified Project Management System (PMS) based on a Microservices architecture (User, Team, Task) using docker and Apis in the backend. TUCello is a simplified Project Management System (PMS) inspired by tools like Jira and Trello. It is designed around a **Microservices architecture** where functions are logically divided into independent services. The primary goal is to manage users, teams, and tasks.

The entire system is containerized using **Docker** for easy local development and cloud deployment.

## Architecture & Technologies

| Service | Responsibility | Technology | Database | Port |
| :--- | :--- | :--- | :--- | :--- |
| **user-service** | Authentication, User Roles (Admin/Leader/Member) | FastAPI - Python | MySQL | 8000 |
| **team-service** | Teams, Membership, Leader Logic | FastAPI - Python | MongoDB | 8001 |
| **task-service** | Tasks, Comments, File Storage | FastAPI - Python | MongoDB | 8002 |
| **frontend** | User Interface, Routing | React/Vite, Tailwind CSS | N/A | 5173 |

**Asynchronous Role Flow (RabbitMQ):** The **team-service** sends asynchronous messages (e.g., `PROMOTE_TO_LEADER`) to the **user-service** to ensure consistency of user roles in the MySQL database.
*  Supports comments (`Comment`) and the storage of attached files (`UploadFile`). Files are stored in a persistent volume (`task_uploads`), while their URL is recorded in MongoDB.
* **UI Notifications & Visualization:**
    * **Dashboard:** Includes a **Bar Chart** for visual representation of task progress (`TODO`, `IN_PROGRESS`, `DONE`).
    * **Task/Comment Notifications:** Notifications are displayed in the UI via synchronous retrieval (**Polling**).

## Installation and Local Execution

### Prerequisites
* Docker Engine (Latest Version)
* Docker Compose (V1 or V2 plugin)

### Execution
1.  Open the terminal in the project root directory (where `docker-compose.yml` is located).
2.  Execute the command to build and start all seven services:

    ```bash
    docker-compose up --build -d
    ```
### Access URLs
* **Web UI (Frontend):** `http://localhost:5173`
* **User API (Swagger):** `http://localhost:8000/docs`

## Database Snapshot & Test Users 

The final submission includes a snapshot of the databases (MySQL and MongoDB) for testing purposes.

### 1. Snapshot Restoration Commands

The following commands must be run from the **host machine** (the terminal where `docker-compose.yml` resides) after the containers are successfully running (docker-compose ps shows all as Up).

| Database | Files Included | Restoration Command |
| :--- | :--- | :--- |
| **MySQL (Users)** | user_db_backup.sql | docker exec -i mysql_user_db mysql -u user_admin -puser_password user_service_db < user_db_backup.sql |
| **MongoDB (Teams/Tasks)** | mongo_db_backup.gz | `docker exec -i mongo_team_db mongorestore --username root --password rootpassword --archive --gzip < mongo_db_backup.gz |
| **Task Uploads (Files)** | backup_uploads/ | Copy the contents of backup_uploads/ into the ./task_service/uploads/ directory on your host. |


### 2. Test Users

The system is pre-populated with the following users (all created inactive, then manually activated/promoted for the scenario):

| Username | Role in Scenario | Password |
| :--- | :--- | :--- |
| **dumbledore** | **ADMIN** (System Admin) | 12345 |
| **minerva** | TEAM LEADER (Gryffindor) | 12345 |
| **snape** | TEAM LEADER (Potions) | 12345 |
| **harry** | MEMBER (Active User) | 12345 |
| **hermione** | MEMBER (Active User) | 12345 |
| **ron** | MEMBER (Active User) | 12345 |
| **draco** | MEMBER (Active User) | 12345 |

## UI Guidance

* **Initial Login:** Use **dumbledore** to start.
* **Admin Panel:** Visible only to dumbledore for managing users and roles.
* **Leader Access:** Log in as mcgonagall or snape to view **My Teams** and create/edit tasks.
* **Member Access:** Log in as hermione to check **My Tasks** and update status/add comments.