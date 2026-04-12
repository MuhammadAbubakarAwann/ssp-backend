# Student Performance Overview API Documentation

## Overview
The Performance Overview API provides comprehensive student performance metrics including class ranking, improvement statistics, and recent academic activity (quizzes, assignments, exams).

---

## API Endpoints

### 1. Teacher/Admin - Get Student Performance Overview
**Endpoint:** `GET /api/teacher/students/:studentId/performance-overview`

**Access:** TEACHER, ADMIN roles

**Query Parameters:**
```
- semester (optional): string - Target semester (e.g., "Spring 2024")
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/teacher/students/abc123xyz/performance-overview?semester=Spring%202024" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "student": {
      "id": "abc123xyz",
      "name": "John Doe",
      "regNo": "2023-01-001",
      "semester": "Spring 2024"
    },
    "performance": {
      "averageScore": 78.45,
      "classRank": "12 out of 45",
      "percentileStanding": "Top 73.33% - Good Standing",
      "improvementRate": "8.5% ↑",
      "strongSubjects": "3 out of 5 (A or A+ grades)"
    },
    "recentActivity": {
      "quizzes": [
        {
          "subject": "Data Structures",
          "score": "90%",
          "submittedAt": "2 days ago"
        },
        {
          "subject": "Web Development",
          "score": "85%",
          "submittedAt": "1 week ago"
        },
        {
          "subject": "Database Design",
          "score": "78%",
          "submittedAt": "2 weeks ago"
        }
      ],
      "assignments": [
        {
          "subject": "Data Structures",
          "name": "Linked List Implementation",
          "score": "92%",
          "submittedAt": "3 days ago"
        },
        {
          "subject": "Web Development",
          "name": "React Component Assignment",
          "score": "88%",
          "submittedAt": "1 week ago"
        },
        {
          "subject": "Database Design",
          "name": "Normalization Exercise",
          "score": "82%",
          "submittedAt": "2 weeks ago"
        }
      ],
      "exams": [
        {
          "subject": "Data Structures",
          "type": "MID",
          "score": "42% (out of 50)",
          "submittedAt": "10 days ago"
        },
        {
          "subject": "Web Development",
          "type": "MID",
          "score": "40% (out of 50)",
          "submittedAt": "3 weeks ago"
        },
        {
          "subject": "Database Design",
          "type": "MID",
          "score": "38% (out of 50)",
          "submittedAt": "1 month ago"
        }
      ]
    }
  }
}
```

---

### 2. Student - Get My Performance Overview
**Endpoint:** `GET /api/student/performance-overview`

**Access:** STUDENT role (accessing own data)

**Query Parameters:**
```
- semester (optional): string - Target semester (e.g., "Spring 2024")
```

**Example Request:**
```bash
curl -X GET "http://localhost:3000/api/student/performance-overview?semester=Spring%202024" \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json"
```

**Response (200 OK):**
Same structure as teacher/admin response, but only returns the authenticated student's own data.

---

## Response Field Descriptions

### Performance Metrics

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `averageScore` | number | Student's average score for the semester (0-100) | 78.45 |
| `classRank` | string | Student's rank out of total class members | "12 out of 45" |
| `percentileStanding` | string | Percentile ranking and academic standing | "Top 73.33% - Good Standing" |
| `improvementRate` | string | Percentage improvement vs. previous semester (with indicator) | "8.5% ↑" or "-3.2% ↓" or "0% →" |
| `strongSubjects` | string | Count of subjects with A or A+ grades (85+) | "3 out of 5" |

### Academic Standing Levels
- **Excellent Standing:** Top 90% or above
- **Good Standing:** Top 75-89%
- **Satisfactory Standing:** Top 50-74%
- **Warning:** Top 25-49%
- **Critical:** Below top 25%

### Recent Activity - Quizzes

| Field | Type | Description |
|-------|------|-------------|
| `subject` | string | Quiz subject name |
| `score` | string | Score as percentage (0-100%) |
| `submittedAt` | string | Relative time of submission (e.g., "2 days ago") |

### Recent Activity - Assignments

| Field | Type | Description |
|-------|------|-------------|
| `subject` | string | Assignment subject name |
| `name` | string | Assignment name/title |
| `score` | string | Score as percentage (0-100%) |
| `submittedAt` | string | Relative time of submission (e.g., "1 week ago") |

### Recent Activity - Exams

| Field | Type | Description |
|-------|------|-------------|
| `subject` | string | Exam subject name |
| `type` | string | Exam type: MID, FINAL, or QUIZ |
| `score` | string | Score as percentage out of the total marks |
| `submittedAt` | string | Relative time of exam (e.g., "10 days ago") |

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "semester is required for this student because class semester is missing"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Unauthorized access"
}
```

### 404 Not Found
```json
{
  "success": false,
  "message": "Student not found"
}
```

### 403 Forbidden (Student accessing another student's data)
```json
{
  "success": false,
  "message": "Student not found in your classes"
}
```

---

## Authorization Rules

| Role | Access | Notes |
|------|--------|-------|
| TEACHER | Own class students | Teachers can only view their own class students' data |
| ADMIN | All students | Administrators can view any student's data |
| STUDENT | Self only | Students can only view their own performance data |

---

## Data Calculation Details

### Average Score
- Calculated from all prediction entries for the student in the semester
- Persisted in the database as `semesterAvgScore` field

### Class Rank
- Rank is calculated based on average semester scores
- Stored in database as `classRank` field for each enrollment

### Percentile Standing
- Formula: `((classSize - classRank) / classSize) × 100`
- Percentile determines the standing level (Excellent/Good/Satisfactory/Warning/Critical)

### Improvement Rate
- Formula: `((currentSemesterAvg - previousSemesterAvg) / previousSemesterAvg) × 100`
- Shows direction with arrow indicators: ↑ (improving), ↓ (declining), → (stable)

### Strong Subjects
- Subjects where average predicted score is ≥ 85 (A or A+ grade)
- Counted out of total enrolled subjects in the semester

### Recent Activity
- **Quizzes:** Top 3 most recent quiz submissions
- **Assignments:** Top 3 most recent assignment submissions
- **Exams:** Top 3 most recent exam results (all types: MID, FINAL, QUIZ)
- Time is displayed as relative format (e.g., "2 days ago", "1 month ago")

---

## Time Format Examples

| Relative Time | Actual Time Range |
|---------------|-------------------|
| Just now | Less than 1 minute |
| 5 mins ago | 1-59 minutes ago |
| 2 hours ago | 1-23 hours ago |
| 3 days ago | 1-6 days ago |
| 2 weeks ago | 1-4 weeks ago |
| 1 month ago | 1-11 months ago |
| 1 year ago | 12+ months ago |

---

## Example Usage Scenarios

### Scenario 1: Teacher viewing a student's performance
```bash
# Teacher with ID 1 viewing student abc123xyz's Spring 2024 performance
GET /api/teacher/students/abc123xyz/performance-overview?semester=Spring%202024
Authorization: Bearer <teacher_token>
```

### Scenario 2: Student checking their own performance
```bash
# Student viewing their own performance for current semester
GET /api/student/performance-overview?semester=Spring%202024
Authorization: Bearer <student_token>
```

### Scenario 3: Admin auditing student performance
```bash
# Admin viewing any student's performance data
GET /api/teacher/students/xyz789abc/performance-overview?semester=Spring%202024
Authorization: Bearer <admin_token>
```

---

## Integration Notes

1. **Semester Requirement:** Always provide the semester parameter if the student is enrolled in multiple semesters, otherwise the system will use the semester from the student's first enrollment.

2. **Real-time Updates:** Recent activity is fetched from the Quiz, Assignment, and Exam tables:
   - **Quizzes:** From `Quiz` model with `submittedAt` timestamp
   - **Assignments:** From `Assignment` model with `submittedAt` timestamp
   - **Exams:** From `Exam` model with `submittedAt` timestamp

3. **Performance Analytics:** Rank and percentile calculations are based on the `classRank` field which is automatically calculated when prediction runs are saved.

4. **Error Handling:** All error responses include a `success: false` flag and descriptive error messages for debugging.

---

## Database Models Used

- **StudentRecord:** Stores aggregate scores and analytics
- **Quiz:** Individual quiz submission records
- **Assignment:** Individual assignment submission records
- **Exam:** Individual exam result records
- **PredictionEntry:** ML prediction data for trend analysis
- **User:** Authentication and role information

---

## Performance Considerations

- Queries are indexed on:
  - `studentRecord.regNo` (for lookup)
  - `studentRecord.classId` (for enrollments)
  - `Quiz.studentRecordId`, `Quiz.submittedAt`
  - `Assignment.studentRecordId`, `Assignment.submittedAt`
  - `Exam.studentRecordId`, `Exam.submittedAt`

- Recent activity queries limit results to top 3 items (ordered by submission time descending)

- Semester-level aggregation ensures efficient filtering

---

## Related APIs

- `GET /api/teacher/students/:studentId/details` - Get basic student details
- `GET /api/teacher/students/:studentId/subject-performance` - Get per-subject performance
- `GET /api/student/details` - Student self-access to basic details
- `GET /api/student/subject-performance` - Student self-access to subject performance
