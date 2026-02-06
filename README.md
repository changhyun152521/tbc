# TBC CLASS - 더브레인코어 학습 관리 시스템

학생, 학부모, 강사, 관리자를 위한 학습 관리 시스템(LMS)입니다.

## 프로젝트 구조

```
TBC-CLASS/
├── backend/       # Express + TypeScript API 서버
├── frontend/      # React + Vite + Tailwind 프론트엔드
└── docs/          # 기획·설계 문서
```

## 기술 스택

- **백엔드**: Node.js, Express, TypeScript, MongoDB, Mongoose
- **프론트엔드**: React, TypeScript, Vite, Tailwind CSS, React Router
- **폰트**: Pretendard, Inter, ONE Mobile, NanumSquareRound

## 로컬 실행

### 사전 요구사항
- Node.js 18+
- MongoDB (로컬 또는 Atlas)

### 백엔드

```bash
cd backend
npm install
```

- **MongoDB Atlas** 사용 시: `backend/.env.example`을 `.env`로 복사 후 `MONGODB_URI` 설정
- **로컬 MongoDB** 사용 시: `.env` 없이 실행 시 기본값 `mongodb://localhost:27017/tbc-class` 사용

```bash
npm run dev
```

- API: http://localhost:3001

### 프론트엔드

```bash
cd frontend
npm install
npm run dev
```

- 웹: http://localhost:5173

## 배포 시 유의사항

- `frontend/public/fonts/` : 프로젝트에서 사용하는 글꼴 파일
- `frontend/public/images/` : 로고 및 이미지
- Vite 빌드 시 `public` 폴더 내용이 `dist` 루트로 복사되어 `/fonts/`, `/images/` 경로로 서빙됩니다.

## 라이선스

비공개 프로젝트입니다.
