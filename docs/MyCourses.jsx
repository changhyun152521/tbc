import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../api/axiosConfig';
import './MyCourses.css';

function MyCourses() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState([]);
  const [user, setUser] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 로그인 상태 확인
    const checkAuth = () => {
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userData = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      if (!token || !userData) {
        // 비회원인 경우 로그인 유도
        setLoading(false);
        return false;
      }

      try {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);

        // 모든 유저 타입 접근 가능
        // 학부모회원인 경우는 메시지만 표시
        if (parsedUser.userType === '학부모') {
          setLoading(false);
          return false; // 강좌는 로드하지 않음
        }

        return true;
      } catch (error) {
        console.error('사용자 데이터 파싱 오류:', error);
        setLoading(false);
        return false;
      }
    };

    const shouldFetch = checkAuth();
    if (shouldFetch) {
      fetchMyCourses();
    }
  }, [navigate]);

  const fetchMyCourses = async () => {
    try {
      setLoading(true);
      const response = await api.get('/courses/my-courses');
      
      if (response.data.success) {
        setCourses(response.data.data || []);
      } else {
        setError(response.data.error || '강좌를 불러오는 중 오류가 발생했습니다');
      }
    } catch (error) {
      console.error('내강좌 조회 오류:', error);
      if (error.response) {
        if (error.response.status === 401) {
          // 로그인 만료 시 사용자 정보 초기화
          localStorage.removeItem('token');
          sessionStorage.removeItem('token');
          localStorage.removeItem('user');
          sessionStorage.removeItem('user');
          setUser(null);
          setError('로그인이 만료되었습니다. 다시 로그인해주세요.');
        } else if (error.response.status === 403) {
          setError('접근 권한이 없습니다.');
        } else {
          setError(error.response.data?.error || '강좌를 불러오는 중 오류가 발생했습니다');
        }
      } else {
        setError('서버에 연결할 수 없습니다.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCourseClick = (courseId) => {
    navigate(`/my-classroom/courses/${courseId}`);
  };

  // YouTube URL에서 video ID 추출
  const getYouTubeVideoId = (url) => {
    if (!url) return null;
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
  };

  // YouTube 썸네일 URL 생성
  const getYouTubeThumbnail = (videoLink) => {
    if (!videoLink) return null;
    const videoId = getYouTubeVideoId(videoLink);
    if (videoId) {
      return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`;
    }
    return null;
  };

  // 강좌 썸네일 가져오기 (1강 유튜브 썸네일만 사용)
  const getCourseThumbnail = (course) => {
    // 1강의 videoLink가 있으면 YouTube 썸네일 사용
    if (course.lectures && Array.isArray(course.lectures) && course.lectures.length > 0) {
      // lectureNumber가 1인 강의 찾기
      const firstLecture = course.lectures.find(lecture => lecture.lectureNumber === 1) || course.lectures[0];
      if (firstLecture && firstLecture.videoLink) {
        const youtubeThumbnail = getYouTubeThumbnail(firstLecture.videoLink);
        if (youtubeThumbnail) {
          return youtubeThumbnail;
        }
      }
    }
    // YouTube 썸네일이 없으면 null 반환 (아이콘 표시)
    return null;
  };

  if (loading) {
    return (
      <div className="my-courses-page">
        <Header />
        <div className="my-courses-container">
          <div className="loading">로딩 중...</div>
        </div>
        <Footer />
      </div>
    );
  }

  // 비회원인 경우 로그인 유도 화면
  if (!user) {
    return (
      <div className="my-courses-page">
        <Header />
        <div className="my-courses-section">
          <div className="my-courses-container">
            <div className="page-header">
              <div className="page-header-icon">
                <img src="/009.png" alt="이창현수학" className="page-header-icon-img" />
              </div>
              <div className="page-title">
                <img src="/009 - 복사본.png" alt="내강좌" className="page-title-img" />
              </div>
              <p className="page-description">등록된 강좌를 확인하고 학습을 시작하세요</p>
            </div>
            <div className="login-prompt">
              <div className="login-prompt-icon">
                <i className="fas fa-lock"></i>
              </div>
              <h2>로그인이 필요합니다</h2>
              <p>강좌를 보려면 먼저 로그인해주세요.</p>
              <button 
                className="btn-login-prompt"
                onClick={() => navigate('/login')}
              >
                로그인하기
              </button>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  // 학부모회원인 경우 안내 메시지
  if (user.userType === '학부모') {
    return (
      <div className="my-courses-page">
        <Header />
        <div className="my-courses-section">
          <div className="my-courses-container">
            <div className="page-header">
              <div className="page-header-icon">
                <img src="/009.png" alt="이창현수학" className="page-header-icon-img" />
              </div>
              <div className="page-title">
                <img src="/009 - 복사본.png" alt="내강좌" className="page-title-img" />
              </div>
              <p className="page-description">등록된 강좌를 확인하고 학습을 시작하세요</p>
            </div>
            <div className="parent-message">
              <div className="parent-message-icon">
                <i className="fas fa-info-circle"></i>
              </div>
              <h2>학생회원 전용 페이지입니다</h2>
              <p className="parent-message-sub">학생 계정으로 로그인해주세요.</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="my-courses-page">
      <Header />
      <div className="my-courses-section">
        <div className="my-courses-container">
          <div className={`page-header ${courses.length > 0 ? 'has-courses' : ''}`}>
            <div className="page-header-icon">
              <img src="/009.png" alt="이창현수학" className="page-header-icon-img" />
            </div>
            <div className="page-title">
              <img src="/009 - 복사본.png" alt="내강좌" className="page-title-img" />
            </div>
            <p className="page-description">등록된 강좌를 확인하고 학습을 시작하세요</p>
          </div>
          
          {error && (
            <div className="error-message">
              {error}
            </div>
          )}

          {courses.length === 0 ? (
            <div className="no-courses-container">
              <div className="no-courses-icon">
                <i className="fas fa-book-open"></i>
              </div>
              <h2>등록된 강좌가 없습니다</h2>
              <p>관리자에게 문의하여 강좌를 등록해주세요.</p>
            </div>
          ) : (
            <>
              <div className="courses-header">
                <p className="courses-count">
                  <i className="fas fa-book-open"></i>
                  <span>총 {courses.length}개의 강좌</span>
                </p>
              </div>
              <div className="courses-grid">
                {courses.map((course) => (
                  <div 
                    key={course._id} 
                    className="course-card"
                    onClick={() => handleCourseClick(course._id)}
                  >
                    <div className="course-thumbnail">
                      {getCourseThumbnail(course) ? (
                        <img 
                          src={getCourseThumbnail(course)} 
                          alt={course.courseName}
                          onError={(e) => {
                            e.target.src = '/placeholder-image.png';
                          }}
                        />
                      ) : (
                        <div className="course-thumbnail-placeholder">
                          <i className="fas fa-video"></i>
                        </div>
                      )}
                      {course.courseStatus && (
                        <span className={`course-status-badge ${course.courseStatus === '완강' ? 'completed' : 'in-progress'}`}>
                          {course.courseStatus}
                        </span>
                      )}
                    </div>
                    <div className="course-info">
                      <div className="course-header">
                        <h3 className="course-name">{course.courseName}</h3>
                        <div className="course-instructor">
                          <img 
                            src={course.instructorId?.profileImage || '/placeholder-avatar.png'} 
                            alt={course.instructorName || course.instructorId?.name}
                            className="instructor-avatar"
                            onError={(e) => {
                              e.target.src = '/placeholder-avatar.png'; // 기본 아바타
                            }}
                          />
                          <span className="instructor-name">{course.instructorName || course.instructorId?.name || ''}T</span>
                        </div>
                      </div>
                      <div className="course-details">
                        <div className="course-detail-item">
                          <i className="fas fa-graduation-cap"></i>
                          <span>{course.grade}</span>
                        </div>
                        <div className="course-detail-item">
                          <i className="fas fa-book"></i>
                          <span>{((course.lectures && Array.isArray(course.lectures)) ? course.lectures.length : (course.courseCount ?? 0))}강</span>
                        </div>
                        {course.textbook && (
                          <div className="course-detail-item">
                            <i className="fas fa-file-alt"></i>
                            <span>{course.textbook}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default MyCourses;

