import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

type AllowedRoles = Array<'admin' | 'teacher' | 'student' | 'parent'>;

interface AuthGuardProps {
  children: React.ReactNode;
  allowedRoles?: AllowedRoles;
}

/**
 * 로그인 여부 및 역할 검사.
 * - 비로그인 시 /login 으로 리다이렉트
 * - allowedRoles 지정 시 해당 역할만 통과, 아니면 해당 역할 첫 대시보드로 리다이렉트
 */
export function AuthGuard({ children, allowedRoles }: AuthGuardProps) {
  const { isAuthenticated, isReady, role } = useAuth();
  const location = useLocation();

  if (!isReady) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">로딩 중...</p>
      </div>
    );
  }

  if (!isAuthenticated || !role) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    if (role === 'admin' || role === 'teacher') return <Navigate to="/admin/dashboard" replace />;
    return <Navigate to="/student/dashboard" replace />;
  }

  return <>{children}</>;
}
