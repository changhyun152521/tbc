# TBC CLASS — API 설계 (1단계 MVP)

> 1단계 MVP 기능 기준 | REST API | 역할별 접근 권한·Req/Res 구조  
> 문서 버전: 1.0 | 작성일: 2025-02-05

---

## 목차

1. [공통 규칙](#1-공통-규칙)
2. [인증·내정보 API](#2-인증내정보-api)
3. [관리자 전용 API](#3-관리자-전용-api)
4. [강사 전용/공용 API](#4-강사-전용공용-api)
5. [학생 전용 API](#5-학생-전용-api)
6. [학부모 전용 API](#6-학부모-전용-api)
7. [Request/Response 구조 제안](#7-requestresponse-구조-제안)

---

## 1. 공통 규칙

### 1.1 Base URL

- 예: `https://api.example.com/api` 또는 `http://localhost:5000/api`
- 프리픽스: `/api` 권장.

### 1.2 인증

- **보호된 API**: `Authorization: Bearer <JWT>` 헤더 필수.
- **미인증/만료**: `401 Unauthorized`.
- **역할 불일치**: `403 Forbidden`.

### 1.3 공통 응답 형식 (실제 구현 기준)

- **성공**: HTTP 2xx. body는 `{ "success": true, "data": ... }` 형태로 통일.
- **에러**: HTTP 4xx/5xx. body는 아래 형식으로만 통일. `error`, `code` 등 다른 필드는 사용하지 않음.

```json
{
  "success": false,
  "message": "에러 메시지"
}
```

### 1.4 역할 표기

- `admin`: 관리자만
- `teacher`: 강사만 (담당 반만 접근하는 API는 서비스 레이어에서 필터)
- `student`: 학생만 (본인 데이터만)
- `parent`: 학부모만 (연결 자녀 1명 데이터만)

---

## 2. 인증·내정보 API (실제 구현 기준)

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| POST | /api/auth/login | 로그인 | (비인증) | Body: `{ loginId, password }` | `{ success: true, data: { token, user: { id, role, name } } }` |
| GET | /api/me | 현재 로그인 사용자 정보 | admin, teacher, student, parent | - | `{ success: true, data: { id, role, name, loginId, phone?, ... } }` |
| PUT | /api/me/password | 비밀번호 변경 | 전 역할 | Body: `{ currentPassword, newPassword }` | `{ success: true }` 또는 message |
| PUT | /api/me/loginId | 로그인 ID 변경 | 전 역할 | Body: `{ newLoginId }` | `{ success: true }` 또는 message |
| PUT | /api/me/phone | 전화번호 변경 | 전 역할 | Body: `{ newPhone }` | `{ success: true }` 또는 message |

- **login**: 성공 시 JWT 발급. 실패 시 401. 응답은 항상 `success`, `data` 래핑.
- **me**: 본인 User 정보. student/parent의 연결 Student/자녀 정보는 학생·학부모 전용 API에서 조회.

---

## 3. 관리자 전용 API

### 3.1 학생 관리

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| GET | /admin/students | 학생 목록 (검색·필터 가능) | Query: `search?, classId?, grade?` | `[{ id, name, school, grade, classId, className?, studentPhone?, parentPhone?, loginId? }, ...]` |
| GET | /admin/students/:id | 학생 상세 | - | 학생 상세 + User(loginId만 노출 등) + 반·학부모 연결 정보 |
| POST | /admin/students | 학생 계정 생성 (학부모 계정 동시 생성) | Body: 아래 참조 | `{ student: {...}, parent: {...} }` 또는 생성된 id 반환 |
| PUT | /admin/students/:id | 학생 정보 수정 (학생·학부모 ID/비밀번호 직접 설정 포함) | Body: 아래 참조 | 수정된 학생/학부모 정보 |

**POST /admin/students Request Body (필수·선택 반영)**

- 필수: `name`, `school`, `grade`, `studentPhone`, `parentPhone`
- 선택: `studentLoginId`, `studentPassword`, `parentLoginId`, `parentPassword`  
  미입력 시 각각 전화번호로 ID/비밀번호 자동 생성(앱 로직).

**PUT /admin/students/:id Request Body**

- 학생: `name`, `school`, `grade`, `studentPhone`, `classId`, `studentLoginId`, `studentPassword` (변경 시만)
- 학부모: `parentPhone`, `parentLoginId`, `parentPassword` (변경 시만)

### 3.2 강사 관리

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| GET | /admin/teachers | 강사 목록 | - | `[{ id, name, loginId, createdAt }, ...]` |
| GET | /admin/teachers/:id | 강사 상세 | - | 강사 정보 + 담당 반 목록 |
| POST | /admin/teachers | 강사 계정 생성 | Body: `{ name, loginId, password }` | `{ id, name, loginId }` |
| PUT | /admin/teachers/:id | 강사 정보 수정 | Body: `{ name?, loginId?, password? }` | 수정된 강사 정보 |

### 3.3 반(Class) 관리

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| GET | /admin/classes | 반 목록 | - | `[{ id, name, description, studentCount?, teacherCount? }, ...]` |
| GET | /admin/classes/:id | 반 상세 (강사 목록, 학생 목록 포함) | - | 반 정보 + teachers[], students[] |
| POST | /admin/classes | 반 생성 | Body: `{ name, description? }` | `{ id, name, description }` |
| PUT | /admin/classes/:id | 반 수정 | Body: `{ name?, description? }` | 수정된 반 정보 |
| DELETE | /admin/classes/:id | 반 삭제 | - | 204 또는 성공 메시지 |
| PUT | /admin/classes/:id/teachers | 반–강사 지정 (N:M) | Body: `{ teacherIds: string[] }` | 반의 강사 목록 반영 후 반환 |
| PUT | /admin/students/:studentId/class | 학생 반 배정 | Body: `{ classId }` | 200 또는 학생 정보 |

### 3.4 관리자 대시보드

| Method | Path | 설명 | Request | Response |
|--------|------|------|---------|----------|
| GET | /admin/dashboard | 학원 요약 | - | `{ studentCount, classCount, teacherCount, recentActivity? }` |

---

## 4. 강사 전용/공용 API

- 강사는 “담당 반”만 접근. 목록/상세/생성/수정 시 서비스 레이어에서 classTeachers 기준 필터 또는 검증.

### 4.1 반·수업 (강사: 담당 반만)

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /classes | 반 목록 (관리자: 전체, 강사: 담당만) | admin, teacher | - | `[{ id, name, description }, ...]` |
| GET | /classes/:id | 반 상세 (강사: 담당 반만) | admin, teacher | - | 반 정보 + 학생 목록(요약) |
| GET | /classes/:id/lessons | 반의 수업(Lesson) 목록 | admin, teacher | Query: `from?, to?` (기간) | `[{ id, title, lessonDate, courseId, courseName? }, ...]` |
| POST | /classes/:id/lessons | 수업 생성 (강사: 담당 반만) | admin, teacher | Body: `{ title, lessonDate, courseId, order? }` | `{ id, title, lessonDate, courseId }` |
| PUT | /lessons/:id | 수업 수정 | admin, teacher | Body: `{ title?, lessonDate?, courseId?, order? }` | 수정된 수업 |
| DELETE | /lessons/:id | 수업 삭제 | admin, teacher | - | 204 |

### 4.2 진도 (Progress)

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /classes/:classId/lessons/:lessonId/progress | 해당 수업의 진도 목록(학생별) | admin, teacher | - | `[{ studentId, studentName, content, completedAt }, ...]` |
| POST | /progress | 진도 기록 생성/갱신 | admin, teacher | Body: `{ studentId, lessonId, content?, completedAt? }` | `{ id, studentId, lessonId, content, completedAt }` |
| PUT | /progress/:id | 진도 수정 | admin, teacher | Body: `{ content?, completedAt? }` | 수정된 진도 |

### 4.3 과제 (Assignment)

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /classes/:id/assignments | 반의 과제 목록 | admin, teacher | - | `[{ id, title, lessonId?, dueDate, completionCount? }, ...]` |
| POST | /classes/:id/assignments | 과제 생성 | admin, teacher | Body: `{ title, lessonId?, dueDate? }` | `{ id, title, lessonId, dueDate }` |
| PUT | /assignments/:id | 과제 수정 | admin, teacher | Body: `{ title?, lessonId?, dueDate? }` | 수정된 과제 |
| DELETE | /assignments/:id | 과제 삭제 | admin, teacher | - | 204 |
| GET | /assignments/:id/completions | 과제별 완료 현황(학생별) | admin, teacher | - | `[{ studentId, studentName, completed, completedAt }, ...]` |
| PUT | /assignments/:id/completions | 과제 완료 체크 (한 학생) | admin, teacher | Body: `{ studentId, completed }` | `{ studentId, assignmentId, completed, completedAt }` |

### 4.4 테스트 (Test) · 점수

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /classes/:id/tests | 반의 테스트 목록 | admin, teacher | - | `[{ id, title, testDate, maxScore }, ...]` |
| POST | /classes/:id/tests | 테스트 생성 | admin, teacher | Body: `{ title, testDate, courseId?, maxScore? }` | `{ id, title, testDate, maxScore }` |
| PUT | /tests/:id | 테스트 수정 | admin, teacher | Body: `{ title?, testDate?, courseId?, maxScore? }` | 수정된 테스트 |
| DELETE | /tests/:id | 테스트 삭제 | admin, teacher | - | 204 |
| GET | /tests/:id/scores | 테스트별 점수 목록(학생별) | admin, teacher | - | `[{ studentId, studentName, score }, ...]` |
| POST | /tests/:id/scores | 점수 입력/수정 (한 학생) | admin, teacher | Body: `{ studentId, score }` | `{ id, studentId, testId, score }` |
| PUT | /test-scores/:id | 점수 수정 | admin, teacher | Body: `{ score }` | 수정된 점수 |

### 4.5 강사 대시보드

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /teacher/dashboard | 담당 반 요약·오늘/이번 주 할 일 | teacher | - | `{ classes: [...], todayLessons?, upcomingAssignments? }` |

### 4.6 과목(Course) 마스터 (관리자·강사 공용)

| Method | Path | 설명 | 허용 역할 | Request | Response |
|--------|------|------|-----------|---------|----------|
| GET | /courses | 과목 목록 | admin, teacher | - | `[{ id, name, level }, ...]` |
| POST | /admin/courses | 과목 생성 (관리자만) | admin | Body: `{ name, level? }` | `{ id, name, level }` |

- MVP에서 과목이 고정값이면 GET만 제공하고, POST는 2단계에서 추가해도 됨.

---

## 5. 학생 전용 API (실제 구현 기준)

- 모든 API는 “본인(studentId = 로그인 사용자에 연결된 Student._id)” 데이터만.
- Base: `/api/student`. 응답은 모두 `{ success: true, data: ... }` 래핑.

| Method | Path | 설명 | Request | Response (data) |
|--------|------|------|---------|-----------------|
| GET | /api/student/dashboard | 내 대시보드 요약 | - | `{ student: { id, name, school, grade }, class, recentLessons, recentTests, homeworkSummary, attendanceSummary }` |
| GET | /api/student/lessons | 본인 반 수업·진도·과제 현황 | Query: `from?, to?` (ISO 날짜) | `{ lessons: [{ _id, date, period, progress, homework, homeworkDone, attendanceStatus }, ...] }` |
| GET | /api/student/tests | 본인 테스트 현황 (점수·평균) | - | `{ tests: [{ _id, date, testType, myScore, average }, ...] }` |
| GET | /api/student/statistics/monthly | 월별 통계 | Query: `year`, `month` (필수) | `{ year, month, attendance: { total, attended, rate }, homework: { total, done, rate }, testAverage, testCount }` |

- 내정보 수정: `PUT /api/me/password`, `PUT /api/me/loginId`, `PUT /api/me/phone` (2장).

---

## 6. 학부모 전용 API (실제 구현 기준)

- 모든 API는 “연결된 자녀 1명(Student.parentUserId = 로그인 User._id)” 데이터만.
- Base: `/api/parent`. 응답은 모두 `{ success: true, data: ... }` 래핑.

| Method | Path | 설명 | Request | Response (data) |
|--------|------|------|---------|-----------------|
| GET | /api/parent/dashboard | 자녀 대시보드 요약 | - | `{ student: { id, name, school, grade }, class, recentLessons, recentTests, homeworkSummary, attendanceSummary }` |
| GET | /api/parent/lessons | 자녀 진도·과제 현황 | Query: `from?, to?` (ISO 날짜) | `{ lessons: [...] }` (학생용과 동일 구조) |
| GET | /api/parent/tests | 자녀 테스트 현황 | - | `{ tests: [{ _id, date, testType, myScore, average }, ...] }` |
| GET | /api/parent/statistics/monthly | 자녀 월별 통계 | Query: `year`, `month` (필수) | `{ year, month, attendance, homework, testAverage, testCount }` (학생용과 동일 구조) |

- 자녀 기본 정보는 대시보드의 `student` 필드로 제공. 별도 GET /parent/child 없음.
- 내정보 수정: `PUT /api/me/password`, `PUT /api/me/loginId`, `PUT /api/me/phone` (2장).

---

## 7. Request/Response 구조 제안

### 7.1 공통

- **날짜**: ISO 8601 문자열 (예: `"2025-02-05T00:00:00.000Z"`).
- **ID**: MongoDB ObjectId를 문자열로 (예: `"507f1f77bcf86cd799439011"`).
- **페이지네이션** (목록 API에서 필요 시):  
  Query: `page`, `limit`.  
  Response: `{ items: [...], total, page, limit }`.

### 7.2 로그인 응답 예시 (실제 구현)

```json
{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "role": "student",
      "name": "홍길동"
    }
  }
}
```

### 7.3 학생 목록 항목 예시 (관리자)

```json
{
  "id": "507f1f77bcf86cd799439011",
  "name": "홍길동",
  "school": "OO중학교",
  "grade": "중2",
  "classId": "507f1f77bcf86cd799439012",
  "className": "수학 A반",
  "studentPhone": "010-1234-5678",
  "parentPhone": "010-8765-4321",
  "loginId": "01012345678"
}
```

### 7.4 대시보드 응답 예시 (학생/학부모 실제 구현)

```json
{
  "success": true,
  "data": {
    "student": { "id": "...", "name": "홍길동", "school": "OO중", "grade": "중1" },
    "class": { "_id": "...", "name": "중1 수학 A반", "description": "" },
    "recentLessons": [
      { "_id": "...", "date": "2025-02-10", "period": "1교시", "progress": "1단원", "homework": "p.10", "homeworkDone": false, "attendanceStatus": "출석" }
    ],
    "recentTests": [
      { "_id": "...", "date": "2025-02-15", "testType": "weeklyTest", "myScore": 85 }
    ],
    "homeworkSummary": { "total": 5, "done": 3, "rate": 60 },
    "attendanceSummary": { "total": 10, "attended": 10, "rate": 100 }
  }
}
```

- 학생 대시보드: `student`는 본인, 학부모 대시보드: `student`는 연결된 자녀 1명.

---

## 문서 이력

| 버전 | 일자 | 변경 내용 |
|------|------|-----------|
| 1.0 | 2025-02-05 | 초안 (MVP REST 엔드포인트, 역할별 권한, Req/Res) |
| 1.1 | 2025-02-05 | 1.3 에러 응답 형식 명시(success/message만 사용, error/code 미사용) |
