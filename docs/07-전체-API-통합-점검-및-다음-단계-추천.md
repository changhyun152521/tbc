# 전체 API 통합 점검 및 다음 단계 추천

> 기준 문서: docs/00-기획-설계-문서.md, 02-DB-설계-상세.md, 03-API-설계.md, 04-화면-구조-설계.md, 05·06 단계 보고서  
> 작성일: 2025-02-05  
> **빌드/실행 자동화 없음. 실행이 필요하면 아래 "직접 실행용 명령"만 참고하여 직접 실행하세요.**

---

## Part 1. 전체 API 통합 점검 보고서

### 1.1 점검 범위

- **강사용 API**: `/api/teacher/*` (반, 수업, 테스트, 점수)
- **학생용 API**: `/api/student/*` (대시보드, 수업, 테스트, 월별 통계)
- **학부모용 API**: `/api/parent/*` (자녀 대시보드, 수업, 테스트, 월별 통계)
- **공통**: `/api/auth/login`, `/api/me` (내정보)

### 1.2 권한 구조 일관성

| 영역 | 적용 방식 | 일관성 |
|------|-----------|--------|
| 강사 | `authenticate` + `requireRoles(['admin','teacher'])` | ✅ 일관됨. admin은 전체, teacher는 canAccessClass()로 담당 반만 |
| 학생 | `authenticate` + `requireRoles(['student'])` | ✅ 일관됨. 컨트롤러에서 userId→studentId 매핑 후 본인만 |
| 학부모 | `authenticate` + `requireRoles(['parent'])` | ✅ 일관됨. parentUserId→자녀 studentId 후 자녀 1명만 |
| 내정보 | `authenticate` 만 (역할 무관) | ✅ 일관됨 |

**결론**: 권한 구조는 역할별로 일관되게 적용되어 있음.

### 1.3 studentId / parentId 매핑 구조

| 역할 | 매핑 | 구현 위치 | 비고 |
|------|------|-----------|------|
| 학생 | `userId` → `Student.findOne({ userId })` → studentId | student.controller.ts | ✅ 1:1. 본인만 |
| 학부모 | `userId` → `Student.findOne({ parentUserId: userId })` → 자녀 studentId | parent.controller.ts | ✅ 1:1. 자녀 1명만 |

- **parentId**는 별도 Parent 컬렉션이 없고, `Student.parentUserId`가 학부모 User와의 연결로 사용됨. 기획 문서(학생–학부모 1:1)와 일치.
- **결론**: 매핑 구조 명확하고, 기획 문서와 일치함.

### 1.4 공통 서비스 구조

| 영역 | 서비스 구조 | 비고 |
|------|-------------|------|
| 강사 | teacherClass / teacherLesson / teacherTest (역할별 분리) | canAccessClass() 공통으로 권한 검증 |
| 학생·학부모 | studentData.service 하나에서 대시보드·수업·테스트·월별통계 제공 | 학부모는 자녀 studentId만 넣어 동일 서비스 호출 |

- 강사는 “반 단위” 접근이 많아 class/lesson/test로 나뉜 것이고, 학생/학부모는 “한 사람(본인/자녀) 기준”이라 한 서비스로 통합된 구조로 적절함.
- **결론**: 역할별로 일관된 서비스 구조. 리팩토링 필수 사항 없음.

### 1.5 에러 처리 방식

| 항목 | 현재 구현 | 비고 |
|------|-----------|------|
| 컨트롤러 | try/catch, res.status(4xx/5xx).json({ success: false, message }) | ✅ 통일 |
| validation | express-validator, validationResult로 400 + message | ✅ 통일 |
| 404 | 학생/학부모/반 없음 등 → 404 + 메시지 | ✅ 적절 |
| 403 | requireRoles 미통과 시 auth.middleware에서 403 | ✅ 적절 |
| errorHandler | success: false, message (status 500 시 기본 메시지) | ✅ 적용 |

- **문서와의 차이**: 03-API-설계.md 1.3절에는 에러 시 `{ "error": true, "message", "code" }` 형태가 나오나, **실제 구현은 전 구간 `{ success: false, message }`** 로 통일되어 있음. 프론트는 `success` 기준으로 처리하면 됨.
- **결론**: 에러 처리 방식 일관됨. 문서만 추후 `success: false` 형태로 맞추면 됨.

### 1.6 응답 포맷 통일성

| 구분 | 형식 | 적용 범위 |
|------|------|-----------|
| 성공 | `{ success: true, data?: T }` | auth, me, admin, teacher, student, parent 전부 |
| 실패 | `{ success: false, message: string }` | 전 구간 |

- 로그인 응답도 `{ success: true, data: { token, user } }` 로 래핑되어 있어, 다른 API와 동일한 패턴.
- **결론**: 응답 포맷 통일되어 있어 프론트에서 처리하기 쉬움.

### 1.7 API URL 구조 일관성

| 접두사 | 패턴 | 예시 |
|--------|------|------|
| /api/auth | /login | 인증 |
| /api/me | /, /password, /loginId, /phone | 내정보 |
| /api/admin | /students, /teachers, /classes, /classes/:id/teachers | 관리자 |
| /api/teacher | /classes, /classes/:classId/..., /lessons/:lessonId, /tests/:testId | 강사 |
| /api/student | /dashboard, /lessons, /tests, /statistics/monthly | 학생 |
| /api/parent | /dashboard, /lessons, /tests, /statistics/monthly | 학부모 |

- 역할별로 `/api/{역할}` 또는 `/api/admin` 로 나뉘어 있고, 리소스명(classes, lessons, tests)이 일관됨.
- admin만 `:id`, teacher는 `:classId`/`:lessonId`/`:testId` 로 구분 — 리소스 의미가 드러나서 혼동 적음.
- **결론**: URL 구조 일관적이고 예측 가능함.

---

### 1.8 문제점 목록

| No | 구분 | 내용 | 심각도 | 조치 |
|----|------|------|--------|------|
| 1 | 문서 | 03-API-설계.md의 에러 응답 형식이 실제(success: false, message)와 일치하도록 명시 필요 | 낮음 | ✅ 03 문서 1.3에 에러 시 success/message만 사용 명시 반영 |
| 2 | 문서 | 03-API 설계의 학생/학부모 경로·필드명이 현재 구현(lessons, tests, statistics/monthly)과 일치함. (참고용) | 참고 | - |

- **코드 상 기능·권한·응답 구조에 대한 치명적 문제는 없음.**

---

### 1.9 개선 필요 사항

| No | 항목 | 제안 | 상태 |
|----|------|------|------|
| 1 | API 설계 문서 | 03-API-설계.md를 실제 구현에 맞게 수정: 공통 에러 응답을 `{ success: false, message }` 로 통일, 학생/학부모 경로·필드명 정리 | ✅ 03 문서 1.3 수정 반영 |
| 2 | 학부모 대시보드 | 화면 P01 "자녀 이름" 표시를 위해 대시보드 응답에 `student: { id, name, school, grade }` 포함 | ✅ 구현에 이미 포함됨(studentData.service getDashboard) |

---

### 1.10 리팩토링 제안

| 우선순위 | 제안 | 비고 |
|----------|------|------|
| 낮음 | 컨트롤러 내부의 “studentId 조회 실패 시 404” 반환 로직을 공통 헬퍼(예: resolveStudentIdForUser)로 묶기 | 중복만 줄이는 수준, 필수 아님 |
| 낮음 | 학생/학부모 응답 타입을 types/ 에 인터페이스로 정의해 두기 | 프론트 타입 연동 시 유리 |

- **즉시 필요한 대규모 리팩토링은 없음.** 현재 구조로 운영·확장 가능.

---

## Part 2. 프론트 연동 준비 점검표

### 2.1 화면–API 매핑 (기획·04-화면-구조-설계 기준)

| 화면 ID | 화면명 | 필요한 API | 현재 구현 | 바로 사용 가능 |
|---------|--------|------------|-----------|----------------|
| C01 | 로그인 | POST /api/auth/login | ✅ | ✅ |
| A01~A11 | 관리자 전반 | /api/admin/*, GET /api/me | ✅ (admin API 존재) | ✅ |
| T01 | 강사 홈 | 담당 반 요약 등 | GET /api/teacher/classes 등으로 대체 가능 | ✅ |
| T02~T13 | 강사 반/수업/과제/테스트 | /api/teacher/* | ✅ | ✅ |
| S01 | 학생 홈 | 대시보드 | GET /api/student/dashboard | ✅ |
| S02 | 내 진도 | 진도·수업 목록 | GET /api/student/lessons | ✅ |
| S03 | 내 과제 | 과제 완료 여부 | lessons 응답의 homework, homeworkDone | ✅ |
| S04 | 내 테스트 결과 | 테스트·점수 | GET /api/student/tests | ✅ |
| S05 | 내정보 | PUT /api/me/* | ✅ | ✅ |
| P01 | 학부모 홈 | 자녀 대시보드 + 자녀 이름 | GET /api/parent/dashboard | ✅ (data.student에 id, name, school, grade 포함) |
| P02~P04 | 자녀 진도/과제/테스트 | /api/parent/lessons, tests | ✅ | ✅ |
| P05 | 내정보 | PUT /api/me/* | ✅ | ✅ |

### 2.2 바로 사용 가능 여부

- **전체**: 학생·강사·학부모·관리자 화면에 필요한 **핵심 API는 모두 구현되어 있어**, 프론트는 **지금 기준으로 연동 가능**하다고 보면 됨.
- **학부모 홈(P01) “자녀 이름”**: `GET /api/parent/dashboard` 응답의 `data.student`에 이미 `{ id, name, school, grade }` 가 포함되어 있어, 별도 API 없이 바로 표시 가능.

- **추가 API 없이** 현재 API만으로 화면 요구사항을 만족 가능.

### 2.3 추가 필요 API 목록 (선택)

| No | API | 용도 | 우선순위 |
|----|-----|------|----------|
| 1 | - | 학부모 자녀 정보: 대시보드 응답에 이미 `student: { id, name, school, grade }` 포함됨. 별도 API 불필요 | - |
| 2 | GET /api/admin/dashboard | A01 관리자 대시보드(학생 수, 반 수, 강사 수 등) | 03-API-설계에 있으나 미구현. 다음 단계에서 구현 시 프론트 연동 용이 |

- **필수**로 보이는 추가 API는 없음. 2번은 “다음 단계(관리자/보고서)”에서 함께 설계하면 됨.

### 2.4 응답 포맷이 화면 요구사항과 맞는지

- **공통**: 모든 성공 응답이 `{ success: true, data }` 이므로, 프론트는 `data`만 쓰면 됨.
- **학생 대시보드**: 소속 반, 최근 수업, 최근 테스트, 과제 요약, 출결 요약 — 화면 S01 요구와 일치.
- **학생 수업/테스트**: lessons(날짜 필터), tests(점수·평균) — S02, S03, S04와 일치.
- **학부모**: 자녀 기준으로 동일 구조 — P02, P03, P04와 일치.
- **월별 통계**: 출결, 과제 이행률, 테스트 평균 — 기획의 “기간별 요약/리포트”에 활용 가능.

**결론**: 응답 포맷은 화면 요구사항과 정확히 맞고, 프론트 연동에 무리 없음.

---

## Part 3. 다음 개발 단계 추천 보고

### 3.1 후보

1. **관리자(Admin) 기능 확장**
2. **보고서 기능 확장**

### 3.2 추천: **관리자(Admin) 기능 확장** 우선

**추천 요약**: 다음 단계는 **관리자 기능 확장**을 먼저 진행하는 것을 추천합니다.

### 3.3 근거

| 기준 | 관리자 기능 확장 | 보고서 기능 확장 |
|------|------------------|------------------|
| **의존성** | 이미 admin 학생/강사/반 CRUD가 있어, “대시보드·통계 요약”만 추가하면 됨. 보고서는 “어떤 데이터를 보여줄지”가 관리자 화면·정책과 연결됨. | 보고서는 “학생/강사/관리자 데이터가 정리된 상태”에 기대함. 관리자 대시보드·통계가 있으면 “어떤 보고서를 낼지” 정의하기 쉬움. |
| **개발 난이도** | GET /api/admin/dashboard (집계 쿼리), 기존 목록 API 보완 수준. 상대적으로 단순. | PDF 생성, 레이아웃, 권한별 출력 범위 등 설계·구현이 더 무거움. |
| **운영상 우선순위** | 학원 운영 시 “관리자 대시보드(현황 한눈에 보기)”가 일상적 필요. 학생/강사/학부모 API는 이미 있으므로, 운영 측면에서 관리자 화면 완성도가 다음으로 중요. | 보고서는 “기간이 정해진 상담·정산” 등에 쓰이므로, 관리자 화면이 갖춰진 뒤에 요구사항이 구체화되기 쉬움. |

- **정리**: 관리자 기능(대시보드·필요 시 간단 통계)을 먼저 넣으면, 의존성·난이도·운영 우선순위 모두 만족하고, 이후 보고서 기능을 설계할 때도 “무엇을 보고서로 뽑을지”가 명확해짐.

### 3.4 관리자 확장 시 권장 작업 (참고)

- GET /api/admin/dashboard  
  - 응답 예: `{ studentCount, classCount, teacherCount, recentActivity? }`  
  - 03-API-설계 3.4절과 04 화면 A01(관리자 대시보드)에 대응.
- 필요 시 학생/강사/반 목록 API에 `total` 또는 간단 집계 필드 보강 (프론트 대시보드 카드용).

---

## Part 4. 직접 실행용 명령 (참고)

빌드·실행은 아래만 참고하여 **사용자가 직접** 터미널에서 실행하세요. (자동 실행하지 않음.)

```text
cd "C:\Users\이창현\Desktop\TBC-CLASS\backend"
npm install
npm run build
npm run dev
```

---

이상으로 전체 API 통합 점검, 프론트 연동 점검, 다음 단계 추천을 마칩니다.
