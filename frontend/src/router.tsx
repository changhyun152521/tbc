import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AuthGuard } from './components/AuthGuard';
import AdminLayout from './layouts/AdminLayout';
import StudentLayout from './layouts/StudentLayout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import StudentManagement from './pages/StudentManagement';
import TeacherManagement from './pages/TeacherManagement';
import ClassManagement from './pages/ClassManagement';
import ClassDetail from './pages/ClassDetail';
import LessonManagement from './pages/LessonManagement';
import LessonDetail from './pages/LessonDetail';
import ClassroomPage from './pages/ClassroomPage';
import TestManagement from './pages/TestManagement';
import ClassroomTestPage from './pages/ClassroomTestPage';
import StudentDashboard from './pages/StudentDashboard';
import LessonHistory from './pages/LessonHistory';
import TestScores from './pages/TestScores';
import MonthlyStatistics from './pages/MonthlyStatistics';
import StudentProfile from './pages/StudentProfile';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <Login />,
  },
  {
    path: '/admin',
    element: (
      <AuthGuard allowedRoles={['admin', 'teacher']}>
        <AdminLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/admin/dashboard" replace /> },
      { path: 'dashboard', element: <AdminDashboard /> },
      { path: 'students', element: <StudentManagement /> },
      { path: 'teachers', element: <TeacherManagement /> },
      { path: 'classes', element: <ClassManagement /> },
      { path: 'classes/:id', element: <ClassDetail /> },
      { path: 'lessons', element: <LessonManagement /> },
      { path: 'lessons/classroom/:classId', element: <ClassroomPage /> },
      { path: 'lessons/:id', element: <LessonDetail /> },
      { path: 'tests', element: <TestManagement /> },
      { path: 'tests/classroom/:classId', element: <ClassroomTestPage /> },
    ],
  },
  {
    path: '/student',
    element: (
      <AuthGuard allowedRoles={['student', 'parent']}>
        <StudentLayout />
      </AuthGuard>
    ),
    children: [
      { index: true, element: <Navigate to="/student/dashboard" replace /> },
      { path: 'dashboard', element: <StudentDashboard /> },
      { path: 'lessons', element: <LessonHistory /> },
      { path: 'tests', element: <TestScores /> },
      { path: 'statistics', element: <MonthlyStatistics /> },
      { path: 'profile', element: <StudentProfile /> },
    ],
  },
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '*', element: <Navigate to="/login" replace /> },
]);
