import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../api/axiosConfig';
import './MyClassStatus.css';

function MyMonthlyStatistics() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  const checkAuthAndFetchData = async () => {
    try {
      // 초기화
      setClasses([]);
      setError('');
      
      // 로그인 상태 확인
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      if (!token || !userStr) {
        // 비회원인 경우 로그인 유도
        setUser(null);
        setLoading(false);
        return;
      }

      const userData = JSON.parse(userStr);

      // 학생회원이 아닌 경우는 메시지만 표시
      if (userData.userType !== '학생') {
        setUser(userData);
        setLoading(false);
        return;
      }

      // 학생회원인 경우에만 사용자 정보 설정 및 데이터 로드
      setUser(userData);
      
      // 사용자 정보 가져오기 (반 정보 포함)
      const response = await api.get(`/users/${userData._id}`);
      if (response.data.success) {
        const userInfo = response.data.data;
        
        // 반 정보가 있으면 각 반의 상세 정보 가져오기
        if (userInfo.classes && userInfo.classes.length > 0) {
          const classPromises = userInfo.classes.map(classInfo => 
            api.get(`/classes/${classInfo._id}`)
          );
          
          const classResponses = await Promise.all(classPromises);
          const classesData = classResponses
            .filter(res => res.data.success)
            .map(res => res.data.data);
          
          setClasses(classesData);
        } else {
          // 반 정보가 없는 경우 빈 배열로 설정
          setClasses([]);
        }
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setClasses([]);
      if (error.response?.status === 401) {
        // 로그인 만료 시 사용자 정보 초기화
        localStorage.removeItem('token');
        sessionStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('user');
        setUser(null);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleViewStatistics = (classId) => {
    // 월별 통계 보기 페이지로 이동
    navigate(`/my-class/${classId}/monthly-statistics`);
  };

  // 비회원인 경우 로그인 유도 화면
  if (!user) {
    return (
      <div className="my-class-status-page">
        <Header />
        <section className="my-class-status-section">
          <div className="container">
            <div className="page-header">
              <div className="page-header-icon">
                <img src="/011.png" alt="이창현수학" className="page-header-icon-img" />
              </div>
              <div className="page-title">
                <img src="/011 - 복사본.png" alt="월별통계" className="page-title-img" />
              </div>
              <p className="page-description">
                등록된 반의 월별 통계를 확인할 수 있습니다.
              </p>
            </div>
            <div className="login-prompt">
              <div className="login-prompt-icon">
                <i className="fas fa-lock"></i>
              </div>
              <h2>로그인이 필요합니다</h2>
              <p>월별 통계를 보려면 먼저 로그인해주세요.</p>
              <button 
                className="btn-login-prompt"
                onClick={() => navigate('/login')}
              >
                로그인하기
              </button>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  // 학생회원이 아닌 경우 안내 메시지
  if (user.userType !== '학생') {
    return (
      <div className="my-class-status-page">
        <Header />
        <section className="my-class-status-section">
          <div className="container">
            <div className="page-header">
              <div className="page-header-icon">
                <img src="/011.png" alt="이창현수학" className="page-header-icon-img" />
              </div>
              <div className="page-title">
                <img src="/011 - 복사본.png" alt="월별통계" className="page-title-img" />
              </div>
              <p className="page-description">
                등록된 반의 월별 통계를 확인할 수 있습니다.
              </p>
            </div>
            <div className="student-only-message">
              <div className="student-only-message-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <h2>학생회원 전용 페이지입니다</h2>
              <p className="student-only-message-sub">학생 계정으로 로그인해주세요.</p>
            </div>
          </div>
        </section>
        <Footer />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-class-status-page">
        <Header />
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>로딩 중...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="my-class-status-page">
        <Header />
        <div className="error-container">
          <p>{error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="my-class-status-page">
      <Header />
      <section className="my-class-status-section">
        <div className="container">
          <div className="page-header">
            <div className="page-header-icon">
              <img src="/011.png" alt="이창현수학" className="page-header-icon-img" />
            </div>
            <div className="page-title">
              <img src="/011 - 복사본.png" alt="월별통계" className="page-title-img" />
            </div>
            <p className="page-description">
              등록된 반의 월별 통계를 확인할 수 있습니다.
            </p>
          </div>

          {classes.length === 0 ? (
            <div className="no-classes-container">
              <div className="no-classes-icon">
                <i className="fas fa-inbox"></i>
              </div>
              <h2>등록된 반이 없습니다</h2>
              <p>관리자에게 문의하여 반을 등록해주세요.</p>
            </div>
          ) : (
            <div className="classes-grid">
              {classes.map((classItem) => (
                <div 
                  key={classItem._id} 
                  className="class-card"
                  onClick={() => handleViewStatistics(classItem._id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleViewStatistics(classItem._id);
                    }
                  }}
                >
                  <div className="class-card-header">
                    <div className="class-icon">
                      <i className="fas fa-school"></i>
                    </div>
                    <h2 className="class-name">{classItem.className}</h2>
                  </div>
                  <div className="class-card-body">
                    <div className="class-info-item">
                      <i className="fas fa-user-tie"></i>
                      <span className="class-info-label">담당강사:</span>
                      <span className="class-info-value">{classItem.instructorName}T</span>
                    </div>
                  </div>
                  <div className="class-card-footer">
                    <button
                      className="btn-view-status"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleViewStatistics(classItem._id);
                      }}
                      type="button"
                    >
                      월별 통계 보기
                      <i className="fas fa-arrow-right"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
      <Footer />
    </div>
  );
}

export default MyMonthlyStatistics;

