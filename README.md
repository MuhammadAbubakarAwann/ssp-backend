# spps-backend

Express backend project using PostgreSQL with Prisma ORM.

## Prerequisites

- Node.js 18+
- PostgreSQL running locally or remotely

## Setup

1. Install dependencies:

```bash
npm install
```

2. Create environment variables:

```bash
copy .env.example .env
```

3. Update `DATABASE_URL` in `.env` with your PostgreSQL credentials.

4. Generate Prisma client:

```bash
npm run prisma:generate
```

5. Fast development sync (recommended during active development):

```bash
npm run prisma:push
```

If you want versioned SQL migrations, use:

```bash
npm run prisma:migrate -- --name init
```

## Run

Development mode:

```bash
npm run dev
```

Production mode:

```bash
npm start
```

## API Endpoints

- `GET /` health message
- `GET /users` list all users
- `POST /users` create a user

## Teacher APIs

All teacher endpoints require:

- `Authorization: Bearer <access_token>`
- Logged-in user role: `TEACHER`

Base path: ` /api/teacher `

1. Create class

`POST /api/teacher/classes`

```json
{
  "name": "BSCS-6A",
  "subject": "CS-601",
  "section": "A",
  "semester": "Spring 2026"
}
```

2. List teacher classes

`GET /api/teacher/classes`

3. Add one student row

`POST /api/teacher/classes/:classId/students`

```json
{
  "name": "Ali Raza",
  "regNo": "SP23-BCS-001",
  "quiz1": 10,
  "quiz2": 9,
  "quiz3": 8,
  "quiz4": 10,
  "quiz5": 9,
  "quiz6": 8,
  "assignment1": 9,
  "assignment2": 8,
  "assignment3": 10,
  "assignment4": 9,
  "assignment5": 10,
  "midsPercentage": 82,
  "attendancePercentage": 91
}
```

4. Add many students from JSON

`POST /api/teacher/classes/:classId/students/bulk`

```json
{
  "students": [
    {
      "name": "Ali Raza",
      "regNo": "SP23-BCS-001",
      "quiz1": 10,
      "assignment1": 9,
      "midsPercentage": 82,
      "attendancePercentage": 91
    },
    {
      "name": "Sara Khan",
      "regNo": "SP23-BCS-002",
      "quiz1": 8,
      "assignment1": 10,
      "midsPercentage": 88,
      "attendancePercentage": 94
    }
  ]
}
```

5. Upload Excel

`POST /api/teacher/classes/:classId/students/upload-excel`

- Content type: `multipart/form-data`
- File field name: `file`
- First sheet is read
- Row 1 must contain these headers exactly:

`Name`, `Reg-No`, `quiz 1`, `quiz 2`, `quiz 3`, `quiz 4`, `quiz 5`, `quiz 6`, `assignment 1`, `assignment 2`, `assignment 3`, `assignment 4`, `assignment 5`, `Mids percentage`, `attendance percentage`

6. List students of a class

`GET /api/teacher/classes/:classId/students`

Example request body for `POST /users`:

```json
{
  "email": "user@example.com",
  "name": "Muhammad"
}
```
