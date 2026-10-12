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

## Important demo note
This starter project does not yet include login or role-based authorization. The Admin Dashboard is a demo interface, not a secured admin area. Before deploying publicly, add authentication/authorization (for example, Spring Security), validate access on the backend, and use environment variables for database credentials.
