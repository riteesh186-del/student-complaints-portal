# Student Complaints Portal — Spring Boot + React

A beginner-friendly full-stack starter project:
- Students submit complaints and track their status.
- Admins view all complaints and update status.
- The dashboard automatically separates **Done** complaints from open/in-progress ones.
- Backend: Java + Spring Boot + Spring Data JPA
- Frontend: React + Vite (JavaScript)
- Database: MySQL

## Requirements
- JDK 17 or newer
- Maven 3.9+
- Node.js LTS + npm
- MySQL 8+

## 1. Create the database
Open MySQL Workbench and run:

```sql
CREATE DATABASE student_complaints;
```

## 2. Configure the backend
Open `backend/src/main/resources/application.properties`.
The default connection expects MySQL on `localhost:3306`, username `root`, password `root`.
Change `spring.datasource.username` and `spring.datasource.password` to match your MySQL setup.

## 3. Start the backend
In VS Code terminal:

```powershell
cd backend
mvn spring-boot:run
```

Backend API: `http://localhost:8080/api/complaints`

The tables are created automatically (`spring.jpa.hibernate.ddl-auto=update`).

## 4. Start the frontend
Open a second terminal:

```powershell
cd frontend
npm install
npm run dev
```

Open the URL Vite prints, usually `http://localhost:5173`.

## How to use
1. Open **Student Portal**, fill in the form, and submit a complaint.
2. Open **Admin Dashboard** to see all complaints.
3. Choose a status: `YET_TO_BE_REVIEWED`, `IN_PROGRESS`, or `DONE`.
4. A complaint marked `DONE` appears in the Done list automatically.

## Features
- Complaints have a category and priority; admins can filter by status and category.
- Admins can reply to a complaint (the student sees the reply) and delete complaints.
- Students see only complaints submitted from their browser, and can add others from another device with the complaint number plus the email used.
- Spam and password-guessing limits (5 complaints per hour, 5 failed admin logins per 15 minutes, per IP).

## Admin password
The admin dashboard is protected by a single shared password read from the `ADMIN_PASSWORD` environment variable. While it is empty, all admin endpoints are disabled.

```powershell
$env:ADMIN_PASSWORD = "choose-a-password"
mvn spring-boot:run
```

## Deployment (Render + Aiven MySQL)
Backend: Render Web Service (Docker, build context `backend`, Dockerfile `backend/Dockerfile`). Frontend: Render Static Site (root `frontend`, build `npm install && npm run build`, publish `dist`).

| Service | Variable | Value |
|---|---|---|
| Backend | `MYSQLHOST`, `MYSQLPORT`, `MYSQLUSER`, `MYSQLPASSWORD`, `MYSQLDATABASE` | From the Aiven MySQL service |
| Backend | `ADMIN_PASSWORD` | Admin dashboard password |
| Backend | `CORS_ALLOWED_ORIGINS` | The frontend URL, no trailing slash |
| Frontend | `VITE_API_URL` | The backend URL, no trailing slash |

## Known limitations
One shared admin password (no individual accounts), no email notifications, and the free Render backend sleeps when idle, so the first request can take up to a minute.
