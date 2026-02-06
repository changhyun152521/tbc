import { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import api from '../api/axiosConfig';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import './MonthlyStatisticsDetail.css';

function MyMonthlyStatisticsDetail() {
  const navigate = useNavigate();
  const { classId } = useParams();
  const [loading, setLoading] = useState(true);
  const [classData, setClassData] = useState(null);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [monthlyData, setMonthlyData] = useState([]);
  const [error, setError] = useState('');
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportData, setReportData] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  useEffect(() => {
    checkAuthAndFetchData();
  }, []);

  useEffect(() => {
    if (classId && selectedYear && selectedMonth) {
      fetchMonthlyData();
    }
  }, [classId, selectedYear, selectedMonth]);

  const checkAuthAndFetchData = async () => {
    try {
      // 초기화
      setMonthlyData([]);
      setError('');
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      if (!token || !userStr) {
        alert('로그인이 필요합니다.');
        navigate('/login');
        return;
      }

      const userData = JSON.parse(userStr);
      
      if (userData.userType !== '학생') {
        alert('학생회원만 접근할 수 있는 페이지입니다.');
        navigate('/');
        return;
      }

      // 반 정보 가져오기
      const classResponse = await api.get(`/classes/${classId}`);
      if (classResponse.data.success) {
        setClassData(classResponse.data.data);
      }
    } catch (error) {
      console.error('데이터 가져오기 오류:', error);
      setError('데이터를 불러오는 중 오류가 발생했습니다.');
      setMonthlyData([]);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
      }
    } finally {
      // fetchMonthlyData가 실행될 때까지 loading을 유지하지 않음
      // fetchMonthlyData에서 자체적으로 loading을 관리
    }
  };

  const fetchMonthlyData = async () => {
    try {
      // 초기화
      setMonthlyData([]);
      setError('');
      setLoading(true);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      const userData = JSON.parse(userStr);
      
      // 선택한 월의 첫날과 마지막날 계산
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const daysInMonth = endDate.getDate();

      // 해당 월의 모든 날짜에 대해 데이터 가져오기
      const datePromises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        // 로컬 시간대 기준으로 날짜 문자열 생성 (YYYY-MM-DD 형식)
        const year = selectedYear;
        const month = String(selectedMonth).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        datePromises.push(
          api.get(`/student-records/my-records?classId=${classId}&date=${dateStr}`)
            .then(response => {
              if (response.data.success) {
                return {
                  date: dateStr,
                  day: day,
                  data: response.data.data,
                };
              }
              return {
                date: dateStr,
                day: day,
                data: null,
              };
            })
            .catch((error) => {
              console.error(`[${dateStr}] 데이터 가져오기 실패:`, error);
              return {
                date: dateStr,
                day: day,
                data: null,
              };
            })
        );
      }

      const results = await Promise.all(datePromises);
      setMonthlyData(results);
    } catch (error) {
      console.error('월별 데이터 가져오기 오류:', error);
      setError('월별 데이터를 불러오는 중 오류가 발생했습니다.');
      setMonthlyData([]);
      if (error.response?.status === 401) {
        alert('로그인이 필요합니다.');
        navigate('/login');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatScore = (scoreStr) => {
    if (!scoreStr || scoreStr === '') return '-';
    
    // 이미 숫자 형식인 경우 (백분율)
    if (typeof scoreStr === 'number') {
      return `${scoreStr}점`;
    }
    
    // 문자열 형식인 경우
    if (typeof scoreStr === 'string') {
      // "맞은개수/총문항수" 형식인 경우
      if (scoreStr.includes('/')) {
        const [correct, total] = scoreStr.split('/').map(Number);
        if (total > 0 && !isNaN(correct) && !isNaN(total)) {
          const percentage = Math.round((correct / total) * 100);
          return `${percentage}점`;
        }
      } else {
        // 이미 숫자 문자열인 경우 (예: "100")
        const num = Number(scoreStr);
        if (!isNaN(num)) {
          return `${num}점`;
        }
      }
    }
    
    return scoreStr;
  };

  const getDayOfWeek = (dateStr) => {
    const date = new Date(dateStr);
    const days = ['일', '월', '화', '수', '목', '금', '토'];
    return days[date.getDay()];
  };

  // 리뷰TEST 점수를 백분율로 변환
  const convertDailyTestScoreToPercentage = (scoreStr) => {
    if (!scoreStr || scoreStr === '') return null;
    if (typeof scoreStr === 'string' && scoreStr.includes('/')) {
      const [correct, total] = scoreStr.split('/').map(Number);
      if (total > 0 && !isNaN(correct) && !isNaN(total)) {
        return Math.round((correct / total) * 100);
      }
    }
    return null;
  };

  // 월별보고서 생성
  const handleGenerateReport = async () => {
    try {
      setReportLoading(true);
      setShowReportModal(true);
      
      const token = localStorage.getItem('token') || sessionStorage.getItem('token');
      const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
      
      if (!userStr) {
        console.error('[보고서 생성] 사용자 정보가 없습니다.');
        alert('로그인이 필요합니다.');
        return;
      }
      
      const userData = JSON.parse(userStr);
      const studentId = userData._id;
      
      // 학생 이름 가져오기 - 여러 필드 확인
      let studentName = '학생';
      if (userData.name && userData.name.trim()) {
        studentName = userData.name.trim();
      } else if (userData.userId && userData.userId.trim()) {
        studentName = userData.userId.trim();
      }
      
      console.log('[보고서 생성] 사용자 정보:', { 
        name: userData.name, 
        userId: userData.userId, 
        studentName,
        fullUserData: userData 
      });
      
      // 선택한 월의 첫날과 마지막날 계산
      const startDate = new Date(selectedYear, selectedMonth - 1, 1);
      const endDate = new Date(selectedYear, selectedMonth, 0);
      const daysInMonth = endDate.getDate();
      
      // 해당 월의 모든 날짜에 대해 리뷰테스트 데이터와 class-records 가져오기
      const reportDataPromises = [];
      for (let day = 1; day <= daysInMonth; day++) {
        const year = selectedYear;
        const month = String(selectedMonth).padStart(2, '0');
        const dayStr = String(day).padStart(2, '0');
        const dateStr = `${year}-${month}-${dayStr}`;
        
        reportDataPromises.push(
          Promise.all([
            // 학생 기록 가져오기
            api.get(`/student-records/my-records?classId=${classId}&date=${dateStr}`)
              .then(response => response.data.success ? response.data.data : null)
              .catch(() => null),
            // 교실관리 기록 가져오기 (과목, 대단원, 소단원 정보)
            api.get(`/class-records/my-class-records?classId=${classId}&date=${dateStr}`)
              .then(response => {
                if (response.data.success && response.data.data && response.data.data.length > 0) {
                  // 최신 수정된 데이터를 가져오기 위해 updatedAt 기준으로 정렬
                  const sortedRecords = [...response.data.data].sort((a, b) => {
                    const dateA = new Date(a.updatedAt || a.createdAt || 0);
                    const dateB = new Date(b.updatedAt || b.createdAt || 0);
                    return dateB - dateA; // 최신순
                  });
                  const latestRecord = sortedRecords[0];
                  
                  // 디버깅: ClassRecord 정보 확인
                  console.log(`[${dateStr}] ClassRecord 조회:`, {
                    totalRecords: response.data.data.length,
                    selectedRecord: {
                      id: latestRecord._id,
                      subject: latestRecord.subject,
                      mainUnit: latestRecord.mainUnit,
                      subUnit: latestRecord.subUnit,
                      updatedAt: latestRecord.updatedAt,
                      createdAt: latestRecord.createdAt,
                    },
                    allRecords: response.data.data.map(r => ({
                      id: r._id,
                      subject: r.subject,
                      mainUnit: r.mainUnit,
                      subUnit: r.subUnit,
                      updatedAt: r.updatedAt,
                    })),
                  });
                  
                  return latestRecord;
                } else {
                  console.warn(`[${dateStr}] ClassRecord가 없습니다.`, {
                    success: response.data?.success,
                    dataLength: response.data?.data?.length || 0,
                  });
                }
                return null;
              })
              .catch((error) => {
                console.error(`[${dateStr}] 교실관리 기록 가져오기 오류:`, error);
                return null;
              }),
            // 반 전체 학생들의 리뷰테스트 점수 가져오기 (상위 퍼센트 계산용)
            api.get(`/student-records/my-class-records?classId=${classId}&date=${dateStr}`)
              .then(response => {
                if (response.data.success) {
                  return response.data.data || [];
                }
                return [];
              })
              .catch(() => [])
          ]).then(([studentRecordData, classRecord, allStudentRecords]) => {
            const studentRecord = studentRecordData?.studentRecord;
            const dailyTestScore = studentRecord?.dailyTestScore;
            
            // 디버깅: 데이터 확인
            if (dailyTestScore) {
              if (!classRecord) {
                console.warn(`[${dateStr}] 리뷰테스트는 있지만 교실관리 기록이 없습니다.`);
              } else if (!classRecord.subject || !classRecord.mainUnit || !classRecord.subUnit) {
                console.warn(`[${dateStr}] 교실관리 기록은 있지만 과목 정보가 비어있습니다.`, {
                  classRecord: {
                    id: classRecord._id,
                    subject: classRecord.subject,
                    mainUnit: classRecord.mainUnit,
                    subUnit: classRecord.subUnit,
                    updatedAt: classRecord.updatedAt,
                    createdAt: classRecord.createdAt,
                  },
                });
              } else {
                console.log(`[${dateStr}] 데이터 정상:`, {
                  subject: classRecord.subject,
                  mainUnit: classRecord.mainUnit,
                  subUnit: classRecord.subUnit,
                  dailyTestScore: dailyTestScore,
                });
              }
            }
            
            // 리뷰테스트 점수가 있는 경우만 포함
            if (!dailyTestScore) {
              return null;
            }
            
            // 점수 파싱 (맞은개수/총문항수 형식)
            let correct = 0;
            let total = 0;
            if (typeof dailyTestScore === 'string' && dailyTestScore.includes('/')) {
              const [correctNum, totalNum] = dailyTestScore.split('/').map(Number);
              correct = correctNum || 0;
              total = totalNum || 0;
            } else {
              // 숫자만 있는 경우는 총 문항 수를 알 수 없으므로 제외
              return null;
            }
            
            // 반 전체 학생들의 점수로 상위 퍼센트 계산
            const allScores = allStudentRecords
              .filter(r => r.dailyTestScore && typeof r.dailyTestScore === 'string' && r.dailyTestScore.includes('/'))
              .map(r => {
                const [c, t] = r.dailyTestScore.split('/').map(Number);
                return t > 0 ? (c / t) * 100 : 0;
              })
              .sort((a, b) => b - a); // 내림차순 정렬
            
            const myScore = total > 0 ? (correct / total) * 100 : 0;
            const rank = allScores.findIndex(score => score <= myScore);
            const percentile = allScores.length > 0 
              ? Math.round(((allScores.length - rank) / allScores.length) * 100)
              : 100;
            
            // 과목 정보가 있는 경우에만 사용 (빈 문자열이 아닌 경우)
            const subject = (classRecord?.subject && classRecord.subject.trim() !== '') 
              ? classRecord.subject.trim() 
              : '';
            const mainUnit = (classRecord?.mainUnit && classRecord.mainUnit.trim() !== '') 
              ? classRecord.mainUnit.trim() 
              : '';
            const subUnit = (classRecord?.subUnit && classRecord.subUnit.trim() !== '') 
              ? classRecord.subUnit.trim() 
              : '';
            
            return {
              date: dateStr,
              day: day,
              subject: subject,
              mainUnit: mainUnit,
              subUnit: subUnit,
              correct: correct,
              total: total,
              percentage: Math.round(myScore),
              percentile: percentile,
            };
          })
        );
      }
      
      const results = await Promise.all(reportDataPromises);
      const validResults = results.filter(r => r !== null);
      
      // 소단원별로 그룹화
      const subUnitStats = {};
      let totalCorrect = 0;
      let totalQuestions = 0;
      
      validResults.forEach(result => {
        const key = `${result.subject}-${result.mainUnit}-${result.subUnit}`;
        if (!subUnitStats[key]) {
          subUnitStats[key] = {
            subject: result.subject,
            mainUnit: result.mainUnit,
            subUnit: result.subUnit,
            correct: 0,
            total: 0,
            count: 0,
            percentiles: [],
          };
        }
        subUnitStats[key].correct += result.correct;
        subUnitStats[key].total += result.total;
        subUnitStats[key].count += 1;
        subUnitStats[key].percentiles.push(result.percentile);
        totalCorrect += result.correct;
        totalQuestions += result.total;
      });
      
      // 소단원별 통계 계산
      const subUnitList = Object.values(subUnitStats).map(stat => ({
        ...stat,
        percentage: stat.total > 0 ? Math.round((stat.correct / stat.total) * 100) : 0,
        avgPercentile: stat.percentiles.length > 0 
          ? Math.round(stat.percentiles.reduce((a, b) => a + b, 0) / stat.percentiles.length)
          : 0,
      }));
      
      // 과목, 대단원, 소단원 정렬 순서 정의
      const subjectOrder = {
        '중1-1': 1, '중1-2': 2, '중2-1': 3, '중2-2': 4, '중3-1': 5, '중3-2': 6,
        '공통수학1': 7, '공통수학2': 8, '대수': 9, '미적분1': 10, '미적분2': 11,
        '확률과통계': 12, '기하': 13
      };
      
      const mainUnitOrder = {
        '중1-1': {
          '수와 연산': 1, '정수와 유리수': 2, '문자와 식': 3, '좌표평면과 그래프': 4
        },
        '중1-2': {
          '기본 도형과 작도': 1, '평면도형의 성질': 2, '입체도형의 성질': 3, '자료의 정리와 해석': 4
        },
        '중2-1': {
          '수와 식': 1, '부등식': 2, '방정식': 3, '함수': 4
        },
        '중2-2': {
          '도형의 성질': 1, '도형의 닮음': 2, '확률': 3
        },
        '중3-1': {
          '실수와 그 계산': 1, '다항식의 곱셈과 인수분해': 2, '이차방정식': 3, '이차함수': 4
        },
        '중3-2': {
          '삼각비': 1, '원의 성질': 2, '통계': 3
        },
        '공통수학1': {
          '다항식': 1, '방정식과 부등식': 2, '경우의 수': 3, '행렬': 4
        },
        '공통수학2': {
          '도형의 방정식': 1, '집합과 명제': 2, '함수와 그래프': 3
        },
        '대수': {
          '지수함수와 로그함수': 1, '삼각함수': 2, '수열': 3
        },
        '미적분1': {
          '함수의 극한과 연속': 1, '미분': 2, '적분': 3
        },
        '미적분2': {
          '수열의극한': 1, '미분법': 2, '적분법': 3
        },
        '확률과통계': {
          '순열과 조합': 1, '확률': 2, '통계': 3
        },
        '기하': {
          '이차곡선': 1, '공간도형과 공간좌표': 2, '벡터': 3
        }
      };
      
      const subUnitOrder = {
        '중1-1': {
          '수와 연산': { '소인수분해': 1, '최대공약수와 최소공배수': 2 },
          '정수와 유리수': { '정수와 유리수': 1, '정수와 유리수의 계산': 2 },
          '문자와 식': { '문자의 사용과 식의 계산': 1, '일차방정식': 2, '일차방정식의 활용': 3 },
          '좌표평면과 그래프': { '좌표평면과 그래프': 1, '정비례와 반비례': 2 }
        },
        '중1-2': {
          '기본 도형과 작도': { '기본 도형': 1, '위치 관계': 2, '작도와 합동': 3 },
          '평면도형의 성질': { '다각형': 1, '원과 부채꼴': 2 },
          '입체도형의 성질': { '다면체와 회전체': 1, '입체도형의 겉넓이와 부피': 2 },
          '자료의 정리와 해석': { '자료의 정리와 해석': 1 }
        },
        '중2-1': {
          '수와 식': { '유리수와 순환소수': 1, '식의 계산': 2 },
          '부등식': { '일차부등식': 1, '일차부등식의 활용': 2 },
          '방정식': { '연립일차방정식': 1, '연립방정식의 풀이': 2, '연립방정식의 활용': 3 },
          '함수': { '일차함수와 그래프(1)': 1, '일차함수와 그래프(2)': 2, '일차함수와 일차방정식의 관계': 3 }
        },
        '중2-2': {
          '도형의 성질': { '삼각형의 성질': 1, '사각형의 성질': 2 },
          '도형의 닮음': { '도형의 닮음': 1, '닮은 도형의 성질': 2, '피타고라스 정리': 3 },
          '확률': { '경우의 수와 확률': 1 }
        },
        '중3-1': {
          '실수와 그 계산': { '제곱근과 실수': 1, '근호를 포함한 식의 계산': 2 },
          '다항식의 곱셈과 인수분해': { '다항식의 곱셈': 1, '다항식의 인수분해': 2 },
          '이차방정식': { '이차방정식의 풀이': 1, '이차방정식의 활용': 2 },
          '이차함수': { '이차함수의 그래프': 1, '이차함수의 활용': 2 }
        },
        '중3-2': {
          '삼각비': { '삼각비': 1, '삼각비의 활용': 2 },
          '원의 성질': { '원과 직선': 1, '원주각': 2, '원주각의 활용': 3 },
          '통계': { '대푯값과 산포도': 1, '상관관계': 2 }
        },
        '공통수학1': {
          '다항식': { '다항식의 연산': 1, '나머지정리': 2, '인수분해': 3 },
          '방정식과 부등식': { '복소수와 이차방정식': 1, '이차방정식과 이차함수': 2, '여러 가지 방정식과 부등식': 3 },
          '경우의 수': { '합의 법칙과 곱의 법칙': 1, '순열과 조합': 2 },
          '행렬': { '행렬과 그 연산': 1 }
        },
        '공통수학2': {
          '도형의 방정식': { '평면좌표': 1, '직선의 방정식': 2, '원의 방정식': 3, '도형의 이동': 4 },
          '집합과 명제': { '집합': 1, '명제': 2 },
          '함수와 그래프': { '함수': 1, '유무리함수': 2 }
        },
        '대수': {
          '지수함수와 로그함수': { '지수와 로그': 1, '지수함수와 로그함수': 2 },
          '삼각함수': { '삼각함수': 1, '사인법칙과 코사인법칙': 2 },
          '수열': { '등차수열과 등비수열': 1, '수열의 합': 2, '수학적 귀납법': 3 }
        },
        '미적분1': {
          '함수의 극한과 연속': { '함수의 극한': 1, '함수의 연속': 2 },
          '미분': { '미분계수와 도함수': 1, '도함수의 활용': 2 },
          '적분': { '부정적분과 정적분': 1, '정적분의 활용': 2 }
        },
        '미적분2': {
          '수열의극한': { '수열의 극한': 1, '급수': 2 },
          '미분법': { '지수함수와 로그함수의 미분': 1, '삼각함수의 미분': 2, '여러가지 미분법': 3, '도함수의 활용': 4 },
          '적분법': { '여러가지 함수의 적분': 1, '치환적분과 부분적분법': 2, '정적분의 활용': 3 }
        },
        '확률과통계': {
          '순열과 조합': { '순열': 1, '조합': 2 },
          '확률': { '확률의 뜻과 활용': 1, '조건부확률': 2 },
          '통계': { '확률분포': 1, '통계적추정': 2 }
        },
        '기하': {
          '이차곡선': { '포물선, 타원, 쌍곡선': 1, '이차곡선의 접선': 2 },
          '공간도형과 공간좌표': { '직선과 평면의 위치관계': 1, '삼수선 정리': 2, '정사영': 3, '좌표공간의 거리 및 내분점': 4, '구의 방정식': 5 },
          '벡터': { '백터의 덧셈, 뺄셈, 실수배': 1, '내적 계산': 2, '평면의 방정식': 3 }
        }
      };
      
      // 정렬 함수
      const sortSubUnits = (a, b) => {
        const subjectA = subjectOrder[a.subject] || 999;
        const subjectB = subjectOrder[b.subject] || 999;
        
        if (subjectA !== subjectB) {
          return subjectA - subjectB;
        }
        
        const mainUnitOrderMap = mainUnitOrder[a.subject] || {};
        const mainUnitA = mainUnitOrderMap[a.mainUnit] || 999;
        const mainUnitB = mainUnitOrderMap[b.mainUnit] || 999;
        
        if (mainUnitA !== mainUnitB) {
          return mainUnitA - mainUnitB;
        }
        
        const subUnitOrderMap = subUnitOrder[a.subject]?.[a.mainUnit] || {};
        const subUnitA = subUnitOrderMap[a.subUnit] || 999;
        const subUnitB = subUnitOrderMap[b.subUnit] || 999;
        
        return subUnitA - subUnitB;
      };
      
      // 정답률 70% 이상인 단원 (강점 단원) - 정답률 높은 순으로 정렬
      const strongUnitsList = subUnitList
        .filter(unit => unit.percentage >= 70)
        .sort((a, b) => b.percentage - a.percentage);
      
      // 정답률 70% 미만인 단원 (취약 단원) - 정답률 낮은 순으로 정렬
      const weakUnitsList = subUnitList
        .filter(unit => unit.percentage < 70)
        .sort((a, b) => a.percentage - b.percentage)
        .slice(0, 5);
      
      // 모든 소단원 리스트 (과목/대단원/소단원 순서로 정렬)
      const allSubUnitsList = [...subUnitList].sort(sortSubUnits);
      
      // 전체 평균 상위 퍼센트
      const allPercentiles = validResults.map(r => r.percentile);
      const avgPercentile = allPercentiles.length > 0
        ? Math.round(allPercentiles.reduce((a, b) => a + b, 0) / allPercentiles.length)
        : 0;
      
      setReportData({
        year: selectedYear,
        month: selectedMonth,
        className: classData?.className || '',
        studentName: studentName,
        totalCorrect,
        totalQuestions,
        totalPercentage: totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0,
        avgPercentile,
        subUnitList: allSubUnitsList, // 모든 소단원 (정답률 낮은 순으로 정렬)
        weakUnits: weakUnitsList, // 정답률 70% 미만인 모든 단원
        strongUnits: strongUnitsList, // 정답률 70% 이상인 모든 단원
      });
    } catch (error) {
      console.error('보고서 생성 오류:', error);
      alert('보고서 생성 중 오류가 발생했습니다.');
      setShowReportModal(false);
    } finally {
      setReportLoading(false);
    }
  };

  // 월별 데이터를 그래프 형식으로 변환
  const getChartData = () => {
    const chartData = monthlyData
      .filter(item => item.data?.studentRecord?.dailyTestScore) // 리뷰TEST 데이터가 있는 날짜만
      .map(item => {
        const record = item.data?.studentRecord;
        const myScore = convertDailyTestScoreToPercentage(record?.dailyTestScore);
        const classAverage = item.data?.classAverage;
        const classMaxScore = item.data?.classMaxScore;
        
        return {
          date: item.date,
          myScore: myScore,
          classAverage: classAverage !== null && classAverage !== undefined && !isNaN(Number(classAverage)) ? Number(classAverage) : null,
          maxScore: classMaxScore !== null && classMaxScore !== undefined && !isNaN(Number(classMaxScore)) ? Number(classMaxScore) : null,
        };
      })
      .sort((a, b) => new Date(a.date) - new Date(b.date)); // 날짜순 정렬
    
    return chartData;
  };

  if (loading && !monthlyData.length) {
    return (
      <div className="monthly-statistics-detail-page">
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
      <div className="monthly-statistics-detail-page">
        <Header />
        <div className="error-container">
          <p>{error}</p>
        </div>
        <Footer />
      </div>
    );
  }

  // 연도 선택 옵션 (최근 5년)
  const currentYear = new Date().getFullYear();
  const yearOptions = [];
  for (let i = 0; i < 5; i++) {
    yearOptions.push(currentYear - i);
  }

  // 월 선택 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="monthly-statistics-detail-page">
      <Header />
      <section className="monthly-statistics-detail-section">
        <div className="container">
          <div className="page-header">
            <button
              className="btn-back"
              onClick={() => navigate('/my-class/statistics')}
            >
              목록으로
            </button>
            <div className="page-header-content">
              <div className="page-header-icon">
                <i className="fas fa-chart-bar"></i>
              </div>
              <h1 className="page-title">{classData?.className || '월별통계'}</h1>
              <p className="page-description">
                {(() => {
                  try {
                    const userStr = localStorage.getItem('user') || sessionStorage.getItem('user');
                    if (userStr) {
                      const userData = JSON.parse(userStr);
                      const studentName = userData.name || '학생';
                      return `${studentName}학생의 월별 통계를 확인할 수 있습니다.`;
                    }
                  } catch (e) {
                    console.error('사용자 정보 파싱 오류:', e);
                  }
                  return '월별 통계를 확인할 수 있습니다.';
                })()}
              </p>
            </div>
          </div>

          {/* 연도/월 선택 */}
          <div className="month-selector-container">
            <div className="month-selector">
              <label htmlFor="year-select">연도:</label>
              <select
                id="year-select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(Number(e.target.value))}
                className="month-select"
              >
                {yearOptions.map(year => (
                  <option key={year} value={year}>{year}년</option>
                ))}
              </select>
              <label htmlFor="month-select">월:</label>
              <select
                id="month-select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(Number(e.target.value))}
                className="month-select"
              >
                {monthOptions.map(month => (
                  <option key={month} value={month}>{month}월</option>
                ))}
              </select>
            </div>
            <div className="month-selector-actions">
              <button
                className="btn-report"
                onClick={handleGenerateReport}
                disabled={reportLoading}
              >
                {reportLoading ? '보고서 생성 중...' : '월별보고서 확인하기'}
                <i className="fas fa-file-alt"></i>
              </button>
            </div>
            <p className="month-selector-hint">표를 좌우로 스와이프하여 모든 정보를 확인하세요</p>
          </div>

          {/* 월별 통계 테이블 */}
          <div className="monthly-table-container">
            <table className="monthly-table">
              <thead>
                <tr>
                  <th>날짜</th>
                  <th>출결</th>
                  <th>과제</th>
                  <th>리뷰TEST</th>
                  <th>반평균</th>
                  <th>최고점</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData
                  .filter(item => item.data?.studentRecord) // 데이터가 있는 날짜만 필터링
                  .map((item) => {
                    const record = item.data?.studentRecord;
                    const classStats = item.data?.classAverage;
                    const classMaxScore = item.data?.classMaxScore;
                    
                    // 디버깅: 각 날짜별 데이터 확인
                    if (record) {
                    }
                    
                    // 리뷰TEST 점수 포맷팅 (항상 "점" 포함)
                    const dailyScore = record?.dailyTestScore ? formatScore(record.dailyTestScore) : '-';
                    
                    // 반평균: null/undefined가 아니고 유효한 숫자인 경우만 표시
                    // 0도 유효한 값이므로 체크에 포함
                    const classAvg = (classStats !== null && classStats !== undefined && classStats !== '' && !isNaN(Number(classStats))) 
                      ? `${classStats}점` 
                      : '-';
                    
                    // 최고점: null/undefined가 아니고 유효한 숫자인 경우만 표시
                    // 0도 유효한 값이므로 체크에 포함
                    const classMax = (classMaxScore !== null && classMaxScore !== undefined && classMaxScore !== '' && !isNaN(Number(classMaxScore))) 
                      ? `${classMaxScore}점` 
                      : '-';

                    return (
                      <tr key={item.date} className="has-data">
                        <td>{item.day}일({getDayOfWeek(item.date)})</td>
                        <td>
                          {record?.attendance ? (
                            <span className="status-badge status-present">출석</span>
                          ) : (
                            <span className="status-badge status-absent">결석</span>
                          )}
                        </td>
                        <td>
                          {record?.assignment ? (
                            <span className="status-badge status-complete">완료</span>
                          ) : (
                            <span className="status-badge status-incomplete">미완료</span>
                          )}
                        </td>
                        <td className="score-cell">{dailyScore}</td>
                        <td className="score-cell">{classAvg}</td>
                        <td className="score-cell">{classMax}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* 리뷰TEST 점수 추이 그래프 */}
          {getChartData().length > 0 && (
            <div className="trend-chart-container">
              <h2 className="chart-title">리뷰TEST 점수 추이</h2>
              <p className="chart-hint">
                <span>좌우 스와이프로 전체 정보 확인</span>
                <span>점수 터치 시 상세 정보 표시</span>
              </p>
              <div className="chart-legend">
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#ef4444' }}></span>
                  <span>내 점수</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#42a5f5' }}></span>
                  <span>반평균</span>
                </div>
                <div className="legend-item">
                  <span className="legend-color" style={{ backgroundColor: '#f59e0b' }}></span>
                  <span>최고점</span>
                </div>
              </div>
              <div className="chart-wrapper">
                <ChartComponent data={getChartData()} />
              </div>
            </div>
          )}

          {/* 실전TEST 별도 섹션 */}
          {monthlyData.some(item => item.data?.studentRecord?.monthlyEvaluationScore) && (
            <div className="monthly-evaluation-section">
              <h2 className="section-title">실전TEST</h2>
              <div className="monthly-table-container">
                <table className="monthly-table">
                  <thead>
                    <tr>
                      <th>날짜</th>
                      <th>내점수</th>
                      <th>반평균</th>
                      <th>최고점</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData
                      .filter(item => item.data?.studentRecord?.monthlyEvaluationScore) // 실전TEST 데이터가 있는 날짜만 필터링
                      .map((item) => {
                        const record = item.data?.studentRecord;
                        const monthlyScore = record?.monthlyEvaluationScore ? formatScore(record.monthlyEvaluationScore) : '-';
                        const monthlyAvg = item.data?.monthlyAverage !== null && item.data?.monthlyAverage !== undefined 
                          ? `${item.data.monthlyAverage}점` : '-';
                        const monthlyMax = item.data?.monthlyMax !== null && item.data?.monthlyMax !== undefined 
                          ? `${item.data.monthlyMax}점` : '-';

                        return (
                          <tr key={item.date} className="has-data">
                            <td>{item.day}일({getDayOfWeek(item.date)})</td>
                            <td className="score-cell">{monthlyScore}</td>
                            <td className="score-cell">{monthlyAvg}</td>
                            <td className="score-cell">{monthlyMax}</td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </section>
      
      {/* 월별보고서 모달 */}
      {showReportModal && (
        <MonthlyReportModal
          reportData={reportData}
          loading={reportLoading}
          onClose={() => setShowReportModal(false)}
        />
      )}
      
      <Footer />
    </div>
  );
}

// 월별보고서 모달 컴포넌트
function MonthlyReportModal({ reportData, loading, onClose }) {
  const modalContentRef = useRef(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  // PDF 다운로드 함수
  const handleDownloadPDF = async () => {
    if (!reportData || !modalContentRef.current) return;
    
    try {
      setIsGeneratingPDF(true);
      
      // 모달의 실제 크기 계산 (스크롤 포함)
      const element = modalContentRef.current;
      
      // 모달 body와 header 영역 찾기
      const modalBody = element.querySelector('.report-modal-body');
      const modalHeader = element.querySelector('.report-modal-header');
      const modal = element.closest('.report-modal');
      const closeButton = element.querySelector('.report-modal-close');
      
      // PC 기준 최소 너비 (900px, 모달의 max-width)
      const minWidth = 900;
      
      // 원래 스타일 저장
      const originalBodyHeight = modalBody ? modalBody.style.height : '';
      const originalBodyOverflow = modalBody ? modalBody.style.overflow : '';
      const originalBodyMaxHeight = modalBody ? modalBody.style.maxHeight : '';
      const originalModalMaxHeight = modal ? modal.style.maxHeight : '';
      const originalModalOverflow = modal ? modal.style.overflow : '';
      const originalCloseButtonDisplay = closeButton ? closeButton.style.display : '';
      
      // 닫기 버튼 숨기기
      if (closeButton) {
        closeButton.style.display = 'none';
      }
      
      // 스크롤을 최상단으로 이동
      if (modalBody) {
        modalBody.scrollTop = 0;
      }
      if (modal) {
        modal.scrollTop = 0;
      }
      
      // 실제 내용 높이 계산 - body의 전체 스크롤 높이 사용
      let totalHeight = 0;
      if (modalHeader) {
        totalHeight += modalHeader.offsetHeight;
      }
      if (modalBody) {
        // body의 전체 스크롤 높이 사용 (보이지 않는 부분 포함)
        totalHeight += modalBody.scrollHeight;
      }
      
      // 실제 너비는 모달의 최대 너비 또는 내용 너비 중 큰 값
      const contentWidth = Math.max(element.scrollWidth, minWidth);
      
      // 모달과 body를 임시로 전체 높이로 확장 (스크롤 없이 모든 내용 표시)
      if (modal) {
        modal.style.maxHeight = 'none';
        modal.style.overflow = 'visible';
      }
      if (modalBody) {
        modalBody.style.height = 'auto';
        modalBody.style.maxHeight = 'none';
        modalBody.style.overflow = 'visible';
      }
      
      // 약간의 지연을 주어 스타일 변경이 적용되도록 함
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // 모달 header와 body 내용만 캔버스로 변환 (footer 제외)
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        width: contentWidth,
        height: totalHeight,
        windowWidth: contentWidth,
        windowHeight: totalHeight,
        scrollX: 0,
        scrollY: -window.scrollY,
        allowTaint: true,
        removeContainer: false,
        onclone: (clonedDoc) => {
          // 복제된 문서에서도 모든 스타일 확장
          const clonedModal = clonedDoc.querySelector('.report-modal');
          const clonedBody = clonedDoc.querySelector('.report-modal-body');
          const clonedElement = clonedDoc.querySelector('[class*="report-modal"]');
          const clonedCloseButton = clonedDoc.querySelector('.report-modal-close');
          
          // 복제된 문서에서도 닫기 버튼 숨기기
          if (clonedCloseButton) {
            clonedCloseButton.style.display = 'none';
          }
          
          if (clonedModal) {
            clonedModal.style.maxHeight = 'none';
            clonedModal.style.overflow = 'visible';
            clonedModal.scrollTop = 0;
            clonedModal.scrollLeft = 0;
          }
          if (clonedBody) {
            clonedBody.style.height = 'auto';
            clonedBody.style.maxHeight = 'none';
            clonedBody.style.overflow = 'visible';
            clonedBody.scrollTop = 0;
          }
          if (clonedElement) {
            clonedElement.scrollTop = 0;
            clonedElement.scrollLeft = 0;
          }
        },
      });
      
      // 원래 스타일 복원
      if (modal) {
        modal.style.maxHeight = originalModalMaxHeight;
        modal.style.overflow = originalModalOverflow;
      }
      if (modalBody) {
        modalBody.style.height = originalBodyHeight;
        modalBody.style.maxHeight = originalBodyMaxHeight;
        modalBody.style.overflow = originalBodyOverflow;
      }
      // 닫기 버튼 다시 보이기
      if (closeButton) {
        closeButton.style.display = originalCloseButtonDisplay || '';
      }
      
      const imgData = canvas.toDataURL('image/png', 1.0);
      
      // PDF 생성
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = canvas.width;
      const imgHeight = canvas.height;
      const ratio = Math.min((pdfWidth - 10) / imgWidth, (pdfHeight - 10) / imgHeight);
      const imgScaledWidth = imgWidth * ratio;
      const imgScaledHeight = imgHeight * ratio;
      
      // 페이지가 여러 개 필요한 경우 처리
      const totalPages = Math.ceil(imgScaledHeight / pdfHeight);
      
      for (let i = 0; i < totalPages; i++) {
        if (i > 0) {
          pdf.addPage();
        }
        
        const yPosition = -(i * pdfHeight) + 5;
        pdf.addImage(imgData, 'PNG', 5, yPosition, imgScaledWidth, imgScaledHeight, undefined, 'FAST');
      }
      
      // 파일명 생성
      const fileName = `${reportData.year}년_${reportData.month}월_${reportData.studentName || '학생'}_보고서.pdf`;
      
      // PDF 다운로드
      pdf.save(fileName);
    } catch (error) {
      console.error('PDF 생성 오류:', error);
      alert('PDF 생성 중 오류가 발생했습니다.');
    } finally {
      setIsGeneratingPDF(false);
    }
  };
  if (loading) {
    return (
      <div className="report-modal-overlay" onClick={onClose}>
        <div className="report-modal" onClick={(e) => e.stopPropagation()}>
          <div className="report-modal-header">
            <h2>월별보고서</h2>
            <button className="report-modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="report-modal-body">
            <div className="report-loading">
              <div className="loading-spinner"></div>
              <p>보고서를 생성하는 중입니다...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!reportData) {
    return (
      <div className="report-modal-overlay" onClick={onClose}>
        <div className="report-modal" onClick={(e) => e.stopPropagation()}>
          <div className="report-modal-header">
            <h2>월별보고서</h2>
            <button className="report-modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="report-modal-body">
            <div className="report-empty">
              <p>해당 월에 리뷰테스트 데이터가 없습니다.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="report-modal-overlay" onClick={onClose}>
      <div className="report-modal" onClick={(e) => e.stopPropagation()}>
        <div ref={modalContentRef}>
          <div className="report-modal-header">
            <h2>{reportData.year}년 {reportData.month}월 {reportData.studentName || '학생'} 보고서</h2>
            <button className="report-modal-close" onClick={onClose}>
              <i className="fas fa-times"></i>
            </button>
          </div>
          <div className="report-pdf-hint">
            <i className="fas fa-info-circle"></i>
            <span>모바일에서는 PDF로 다운로드하여 보시면 더 편리하게 확인하실 수 있습니다.</span>
          </div>
          <div className="report-modal-body">
          <div className="report-summary">
            <div className="report-summary-card">
              <div className="report-summary-icon">
                <i className="fas fa-users"></i>
              </div>
              <div className="report-summary-content">
                <div className="report-summary-label">반명</div>
                <div className="report-summary-value">{reportData.className}</div>
              </div>
            </div>
            <div className="report-summary-card">
              <div className="report-summary-icon">
                <i className="fas fa-list-check"></i>
              </div>
              <div className="report-summary-content">
                <div className="report-summary-label">전체 푼 문제 수</div>
                <div className="report-summary-value">{reportData.totalQuestions}<span className="report-summary-unit">문제</span></div>
              </div>
            </div>
            <div className="report-summary-card">
              <div className="report-summary-icon">
                <i className="fas fa-check-circle"></i>
              </div>
              <div className="report-summary-content">
                <div className="report-summary-label">전체 맞은 문제 수</div>
                <div className="report-summary-value">{reportData.totalCorrect}<span className="report-summary-unit">문제</span></div>
              </div>
            </div>
            <div className="report-summary-card report-summary-card-highlight">
              <div className="report-summary-icon">
                <i className="fas fa-percent"></i>
              </div>
              <div className="report-summary-content">
                <div className="report-summary-label">전체 정답률</div>
                <div className="report-summary-value">{reportData.totalPercentage}<span className="report-summary-unit">%</span></div>
              </div>
            </div>
          </div>
          
          <div className="report-section">
            <h3 className="report-section-title">
              <i className="fas fa-list"></i>
              소단원별 상세 통계
            </h3>
            <div className="report-table-swipe-hint">
              <i className="fas fa-arrows-alt-h"></i>
              표를 좌우로 스와이프하여 전체 정보를 확인하세요
            </div>
            <div className="report-subunit-table-container">
              <table className="report-subunit-table">
                <thead>
                  <tr>
                    <th className="col-subject">과목</th>
                    <th className="col-main-unit">대단원</th>
                    <th className="col-sub-unit">소단원</th>
                    <th className="col-total">전체</th>
                    <th className="col-correct">맞은</th>
                    <th className="col-percentage">정답률</th>
                    <th className="col-percentile">반 내 상위</th>
                  </tr>
                </thead>
                <tbody>
                  {reportData.subUnitList.map((unit, index) => (
                    <tr key={index}>
                      <td className="col-subject">{unit.subject || '-'}</td>
                      <td className="col-main-unit">{unit.mainUnit || '-'}</td>
                      <td className="col-sub-unit">{unit.subUnit || '-'}</td>
                      <td className="col-total">{unit.total}</td>
                      <td className="col-correct">{unit.correct}</td>
                      <td className="col-percentage">
                        <span className={`report-percentage ${unit.percentage < 60 ? 'low' : unit.percentage < 80 ? 'medium' : 'high'}`}>
                          {unit.percentage}%
                        </span>
                      </td>
                      <td className="col-percentile">상위 {unit.avgPercentile}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          
          {reportData.strongUnits && reportData.strongUnits.length > 0 && (
            <div className="report-section">
              <h3 className="report-section-title">
                <i className="fas fa-check-circle"></i>
                강점 단원
              </h3>
              <div className="report-table-swipe-hint">
                <i className="fas fa-arrows-alt-h"></i>
                표를 좌우로 스와이프하여 전체 정보를 확인하세요
              </div>
              <div className="report-units-table-container">
                <table className="report-units-table report-units-table-strong">
                  <thead>
                    <tr>
                      <th className="col-rank">순위</th>
                      <th className="col-unit">단원</th>
                      <th className="col-score">정답률</th>
                      <th className="col-problems">맞은 문제</th>
                      <th className="col-percentile">반 내 상위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.strongUnits.map((unit, index) => (
                      <tr key={index}>
                        <td className="col-rank">{index + 1}</td>
                        <td className="col-unit">{unit.subject}/{unit.mainUnit}/{unit.subUnit}</td>
                        <td className="col-score">
                          <span className="report-score-badge report-score-high">{unit.percentage}%</span>
                        </td>
                        <td className="col-problems">{unit.correct}/{unit.total}</td>
                        <td className="col-percentile">상위 {unit.avgPercentile}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {reportData.weakUnits && reportData.weakUnits.length > 0 && (
            <div className="report-section">
              <h3 className="report-section-title">
                <i className="fas fa-exclamation-circle"></i>
                취약 단원
              </h3>
              <div className="report-table-swipe-hint">
                <i className="fas fa-arrows-alt-h"></i>
                표를 좌우로 스와이프하여 전체 정보를 확인하세요
              </div>
              <div className="report-units-table-container">
                <table className="report-units-table report-units-table-weak">
                  <thead>
                    <tr>
                      <th className="col-rank">순위</th>
                      <th className="col-unit">단원</th>
                      <th className="col-score">정답률</th>
                      <th className="col-problems">맞은 문제</th>
                      <th className="col-percentile">반 내 상위</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reportData.weakUnits.slice(0, 5).map((unit, index) => (
                      <tr key={index}>
                        <td className="col-rank">{index + 1}</td>
                        <td className="col-unit">{unit.subject}/{unit.mainUnit}/{unit.subUnit}</td>
                        <td className="col-score">
                          <span className="report-score-badge report-score-low">{unit.percentage}%</span>
                        </td>
                        <td className="col-problems">{unit.correct}/{unit.total}</td>
                        <td className="col-percentile">상위 {unit.avgPercentile}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          </div>
        </div>
        <div className="report-modal-footer">
          <button 
            className="btn-report-download" 
            onClick={handleDownloadPDF}
            disabled={isGeneratingPDF}
          >
            {isGeneratingPDF ? (
              <>
                <i className="fas fa-spinner fa-spin"></i>
                PDF 생성 중...
              </>
            ) : (
              <>
                <i className="fas fa-download"></i>
                PDF 다운로드
              </>
            )}
          </button>
          <button className="btn-report-close" onClick={onClose}>
            닫기
          </button>
        </div>
      </div>
    </div>
  );
}

// 그래프 컴포넌트
function ChartComponent({ data }) {
  const [hoveredIndex, setHoveredIndex] = useState(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });
  const chartWrapperRef = useRef(null);
  const svgRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, scrollLeft: 0 });
  const [touchStartPos, setTouchStartPos] = useState({ x: 0, y: 0, time: 0 });
  const [isTouchTooltip, setIsTouchTooltip] = useState(false);
  const [touchStartIndex, setTouchStartIndex] = useState(null); // 터치 시작한 데이터 포인트 인덱스
  const [dragDirection, setDragDirection] = useState(null); // 'horizontal' 또는 'vertical'

  if (!data || data.length === 0) return null;

  // 날짜순 정렬 (오래된 것부터)
  const sortedData = [...data].sort((a, b) => new Date(a.date) - new Date(b.date));

  // 유효한 점수만 필터링
  const validScores = sortedData.flatMap(d => [
    d.myScore !== null && d.myScore !== undefined ? d.myScore : null,
    d.classAverage !== null && d.classAverage !== undefined ? d.classAverage : null,
    d.maxScore !== null && d.maxScore !== undefined ? d.maxScore : null
  ]).filter(score => score !== null);

  if (validScores.length === 0) return null;

  const maxScore = Math.max(...validScores);
  const minScore = Math.min(...validScores);
  const scoreRange = maxScore - minScore || 100;
  const padding = Math.max(5, scoreRange * 0.1); // 최소 5점 패딩
  const chartMax = Math.min(100, Math.ceil(maxScore + padding));
  const chartMin = Math.max(0, Math.floor(minScore - padding));

  const chartHeight = 300;
  const topPadding = 20; // 상단 여유 공간
  const minBarWidth = 80; // 최소 바 너비
  const chartContentWidth = Math.max(600, sortedData.length * minBarWidth);
  const sidePadding = 100; // 양쪽 여유 공간
  const chartWidth = chartContentWidth + (sidePadding * 2);
  const xStep = sortedData.length > 1 ? chartContentWidth / (sortedData.length - 1) : 0;
  const yStep = (chartHeight - topPadding) / (chartMax - chartMin || 100);

  const getY = (score) => {
    if (score === null || score === undefined) return null;
    return (chartHeight - topPadding) - ((score - chartMin) * yStep) + topPadding;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = daysOfWeek[date.getDay()];
    return `${month}/${day} (${dayOfWeek})`;
  };

  const formatFullDate = (dateString) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const daysOfWeek = ['일', '월', '화', '수', '목', '금', '토'];
    const dayOfWeek = daysOfWeek[date.getDay()];
    return `${year}.${month}.${day} (${dayOfWeek})`;
  };

  const handleMouseEnter = (index, event) => {
    setHoveredIndex(index);
    if (chartWrapperRef.current && svgRef.current) {
      const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
      const svgRect = svgRef.current.getBoundingClientRect();
      const x = event.clientX - wrapperRect.left;
      const y = event.clientY - wrapperRect.top;
      setTooltipPosition({ x, y });
    }
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  // 드래그 시작 (마우스)
  const handleMouseDown = (e) => {
    if (chartWrapperRef.current && e.button === 0) {
      setIsDragging(true);
      setHoveredIndex(null);
      setDragStart({
        x: e.pageX - chartWrapperRef.current.offsetLeft,
        scrollLeft: chartWrapperRef.current.scrollLeft,
      });
      chartWrapperRef.current.style.cursor = 'grabbing';
      chartWrapperRef.current.style.userSelect = 'none';
    }
  };

  // 드래그 중 (마우스)
  const handleMouseMove = (e) => {
    if (!isDragging || !chartWrapperRef.current) return;
    e.preventDefault();
    const x = e.pageX - chartWrapperRef.current.offsetLeft;
    const walk = (x - dragStart.x) * 2;
    chartWrapperRef.current.scrollLeft = dragStart.scrollLeft - walk;
  };

  // 드래그 종료 (마우스)
  const handleMouseUp = () => {
    if (chartWrapperRef.current) {
      setIsDragging(false);
      chartWrapperRef.current.style.cursor = 'grab';
      chartWrapperRef.current.style.userSelect = '';
    }
  };

  // 드래그 시작 (터치)
  const handleTouchStart = (e) => {
    // hover-area나 circle에서 발생한 터치는 각각의 onTouchStart에서 처리
    const target = e.target;
    if (target.closest('.hover-area-mobile') || target.closest('.hover-area-pc') || 
        target.tagName === 'circle' || target.closest('circle')) {
      return;
    }
    
    // 차트 영역 내 다른 곳을 터치하면 툴팁 사라지기
    if (chartWrapperRef.current && e.touches.length === 1) {
      const touch = e.touches[0];
      const startX = touch.pageX;
      const startY = touch.pageY;
      const startTime = Date.now();
      
      setTouchStartPos({ x: startX, y: startY, time: startTime });
      setIsDragging(false);
      setIsTouchTooltip(false);
      setHoveredIndex(null); // 기존 툴팁 숨기기
      setTouchStartIndex(null);
      setDragDirection(null); // 드래그 방향 초기화
      // 위아래 드래그를 위해 기본 동작을 방해하지 않음 (e.preventDefault() 호출 안 함)
      // 기본 스크롤이 자연스럽게 동작하도록 함
    }
  };

  // 드래그 중 (터치)
  const handleTouchMove = (e) => {
    if (!chartWrapperRef.current || e.touches.length !== 1) return;
    
    // 이미 위아래 드래그로 판단되었으면 아무것도 하지 않고 기본 스크롤 허용
    if (dragDirection === 'vertical') {
      return;
    }
    
    const touch = e.touches[0];
    const deltaX = Math.abs(touch.pageX - touchStartPos.x);
    const deltaY = Math.abs(touch.pageY - touchStartPos.y);
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    
    // 10px 이상 움직이면 드래그로 간주
    if (moveDistance > 10) {
      // 드래그 방향이 아직 결정되지 않았으면 방향 판단
      if (!dragDirection) {
        // 위아래 드래그가 좌우 드래그보다 더 크면 세로 드래그
        if (deltaY > deltaX) {
          setDragDirection('vertical');
          // 위아래 드래그로 판단되면 여기서 종료하여 기본 스크롤이 동작하도록 함
          setHoveredIndex(null);
          setIsTouchTooltip(false);
          return;
        } else {
          setDragDirection('horizontal');
        }
      }
      
      if (dragDirection === 'horizontal') {
        // 좌우 드래그: 차트 스크롤
        setIsDragging(true);
        setHoveredIndex(null); // 툴팁 숨기기
        setIsTouchTooltip(false);
        e.preventDefault(); // 기본 스크롤 방지
        const x = touch.pageX - chartWrapperRef.current.offsetLeft;
        const walk = (x - touchStartPos.x) * 2;
        chartWrapperRef.current.scrollLeft = chartWrapperRef.current.scrollLeft - walk;
      }
    }
  };

  // 드래그 종료 (터치)
  const handleTouchEnd = (e) => {
    // hover-area나 circle에서 발생한 터치는 각각의 onTouchEnd에서 처리
    const target = e.target;
    if (target.tagName === 'circle' || target.closest('circle') || target.closest('.hover-area-pc') || target.closest('.hover-area-mobile')) {
      return;
    }
    
    // 드래그가 아니었으면 툴팁 사라지기
    if (!isDragging && touchStartIndex === null) {
      setHoveredIndex(null);
      setIsTouchTooltip(false);
    }
    
    setIsDragging(false);
    setTouchStartPos({ x: 0, y: 0, time: 0 });
    setTouchStartIndex(null);
    setDragDirection(null);
  };

  // 화면 밖 또는 차트 내 다른 영역 터치 시 툴팁 사라지기 (모바일 전용)
  useEffect(() => {
    if (!isTouchTooltip) return;
    
    const handleOutsideTouch = (e) => {
      if (!chartWrapperRef.current) return;
      
      const target = e.target;
      // 차트 영역 밖을 터치한 경우
      const isOutsideChart = !chartWrapperRef.current.contains(target);
      
      // 다른 hover-area를 터치한 경우
      const touchedHoverArea = target.closest('.hover-area-mobile');
      const currentHoverArea = hoveredIndex !== null ? 
        document.querySelector(`.hover-area-mobile[data-index="${hoveredIndex}"]`) : null;
      const isOtherHoverArea = touchedHoverArea && touchedHoverArea !== currentHoverArea;
      
      // 차트 내 다른 영역(rect, line, path 등)을 터치한 경우
      const isOtherChartElement = chartWrapperRef.current.contains(target) && 
                                  !touchedHoverArea && 
                                  target.tagName !== 'circle' &&
                                  !target.closest('circle');
      
      if (isOutsideChart || isOtherHoverArea || isOtherChartElement) {
        setHoveredIndex(null);
        setIsTouchTooltip(false);
      }
    };
    
    // 터치 이벤트 리스너 추가
    document.addEventListener('touchstart', handleOutsideTouch);
    
    return () => {
      document.removeEventListener('touchstart', handleOutsideTouch);
    };
  }, [isTouchTooltip, hoveredIndex]);

  // 마우스가 래퍼 밖으로 나갔을 때
  const handleMouseLeaveWrapper = () => {
    if (isDragging && chartWrapperRef.current) {
      setIsDragging(false);
      chartWrapperRef.current.style.cursor = 'grab';
      chartWrapperRef.current.style.userSelect = '';
    }
    setHoveredIndex(null);
  };

  // 컴포넌트 마운트 시 스크롤을 오른쪽 끝(최신 데이터)으로 이동
  useEffect(() => {
    if (chartWrapperRef.current) {
      setTimeout(() => {
        if (chartWrapperRef.current) {
          chartWrapperRef.current.scrollLeft = chartWrapperRef.current.scrollWidth;
        }
      }, 100);
    }
  }, [sortedData]);

  // 내 점수 라인 경로
  const myScorePath = sortedData
    .map((d, i) => {
      const y = getY(d.myScore);
      if (y === null) return null;
      const x = sidePadding + (i * xStep);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(p => p !== null)
    .join(' ');

  // 반평균 라인 경로
  const averagePath = sortedData
    .map((d, i) => {
      const y = getY(d.classAverage);
      if (y === null) return null;
      const x = sidePadding + (i * xStep);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(p => p !== null)
    .join(' ');

  // 최고점 라인 경로
  const maxScorePath = sortedData
    .map((d, i) => {
      const y = getY(d.maxScore);
      if (y === null) return null;
      const x = sidePadding + (i * xStep);
      return `${i === 0 ? 'M' : 'L'} ${x} ${y}`;
    })
    .filter(p => p !== null)
    .join(' ');

  return (
    <div className="chart-container">
      <div 
        className="chart-svg-wrapper" 
        ref={chartWrapperRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeaveWrapper}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{ cursor: isDragging ? 'grabbing' : 'grab', touchAction: 'pan-x pan-y' }}
      >
        {hoveredIndex !== null && sortedData[hoveredIndex] && !isDragging && (
          <div
            className={`chart-tooltip ${isTouchTooltip ? 'chart-tooltip-mobile' : ''}`}
            style={{
              left: `${tooltipPosition.x}px`,
              top: `${tooltipPosition.y - 120}px`,
            }}
          >
            <div className="tooltip-date">
              {formatFullDate(sortedData[hoveredIndex].date)}
            </div>
            <div className="tooltip-scores">
              {sortedData[hoveredIndex].myScore !== null && sortedData[hoveredIndex].myScore !== undefined && (
                <div className="tooltip-item tooltip-my-score">
                  <span className="tooltip-label">내 점수</span>
                  <span className="tooltip-value">{sortedData[hoveredIndex].myScore}점</span>
                </div>
              )}
              {sortedData[hoveredIndex].classAverage !== null && sortedData[hoveredIndex].classAverage !== undefined && (
                <div className="tooltip-item tooltip-average">
                  <span className="tooltip-label">반평균</span>
                  <span className="tooltip-value">{sortedData[hoveredIndex].classAverage}점</span>
                </div>
              )}
              {sortedData[hoveredIndex].maxScore !== null && sortedData[hoveredIndex].maxScore !== undefined && (
                <div className="tooltip-item tooltip-max">
                  <span className="tooltip-label">최고점</span>
                  <span className="tooltip-value">{sortedData[hoveredIndex].maxScore}점</span>
                </div>
              )}
            </div>
          </div>
        )}
        <svg
          ref={svgRef}
          width={chartWidth}
          height={chartHeight + 60}
          className="chart-svg"
          onMouseLeave={handleMouseLeave}
        >
          {/* Y축 그리드 라인 */}
          {[0, 25, 50, 75, 100].map((value) => {
            if (value < chartMin || value > chartMax) return null;
            const y = getY(value);
            if (y === null) return null;
            return (
              <g key={value}>
                <line
                  x1={sidePadding}
                  y1={y}
                  x2={chartWidth - sidePadding}
                  y2={y}
                  stroke="#e5e7eb"
                  strokeWidth="1"
                  strokeDasharray="4,4"
                  opacity="0.5"
                />
              </g>
            );
          })}

          {/* 내 점수 라인 (빨간색, 굵게) */}
          {myScorePath && (
            <path
              d={myScorePath}
              fill="none"
              stroke="#ef4444"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 반평균 라인 (파란색) */}
          {averagePath && (
            <path
              d={averagePath}
              fill="none"
              stroke="#42a5f5"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeDasharray="5,5"
            />
          )}

          {/* 최고점 라인 (주황색) */}
          {maxScorePath && (
            <path
              d={maxScorePath}
              fill="none"
              stroke="#f59e0b"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* 데이터 포인트 및 호버 영역 */}
          {sortedData.map((d, i) => {
            const x = sidePadding + (i * xStep);
            const myY = getY(d.myScore);
            const avgY = getY(d.classAverage);
            const maxY = getY(d.maxScore);

            return (
              <g key={i}>
                {/* 호버 영역 (보이지 않지만 클릭 가능) - PC 및 모바일용 */}
                <rect
                  x={x - 40}
                  y={topPadding}
                  width="80"
                  height={chartHeight - topPadding}
                  fill="transparent"
                  data-index={i}
                  onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                  onMouseLeave={handleMouseLeave}
                  onTouchStart={(e) => {
                    e.stopPropagation();
                    if (chartWrapperRef.current && e.touches.length === 1) {
                      const touch = e.touches[0];
                      setTouchStartPos({ x: touch.pageX, y: touch.pageY, time: Date.now() });
                      setTouchStartIndex(i);
                      setIsDragging(false);
                    }
                  }}
                  onTouchEnd={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    // 드래그가 아니었으면 정보 표시
                    if (!isDragging && touchStartIndex === i && chartWrapperRef.current && svgRef.current) {
                      const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                      const touch = e.changedTouches[0];
                      const xPos = touch.clientX - wrapperRect.left;
                      const yPos = touch.clientY - wrapperRect.top;
                      setHoveredIndex(i);
                      setIsTouchTooltip(true);
                      setTooltipPosition({ x: xPos, y: yPos });
                    }
                    setTouchStartIndex(null);
                  }}
                  style={{ cursor: 'pointer', pointerEvents: 'auto' }}
                  className="hover-area-pc hover-area-mobile"
                />

                {/* 내 점수 포인트 */}
                {myY !== null && (
                  <circle
                    cx={x}
                    cy={myY}
                    r="6"
                    fill="#ef4444"
                    stroke="white"
                    strokeWidth="2"
                    onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (chartWrapperRef.current && e.touches.length === 1) {
                        const touch = e.touches[0];
                        setTouchStartPos({ x: touch.pageX, y: touch.pageY, time: Date.now() });
                        setTouchStartIndex(i);
                        setIsDragging(false);
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // 드래그가 아니었으면 정보 표시
                      if (!isDragging && touchStartIndex === i && chartWrapperRef.current && svgRef.current) {
                        const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                        const touch = e.changedTouches[0];
                        const xPos = touch.clientX - wrapperRect.left;
                        const yPos = touch.clientY - wrapperRect.top;
                        setHoveredIndex(i);
                        setIsTouchTooltip(true);
                        setTooltipPosition({ x: xPos, y: yPos });
                      }
                      setTouchStartIndex(null);
                    }}
                    style={{ cursor: isDragging ? 'grabbing' : 'pointer', pointerEvents: isDragging ? 'none' : 'auto' }}
                  />
                )}

                {/* 반평균 포인트 */}
                {avgY !== null && (
                  <circle
                    cx={x}
                    cy={avgY}
                    r="5"
                    fill="#42a5f5"
                    stroke="white"
                    strokeWidth="2"
                    onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (chartWrapperRef.current && e.touches.length === 1) {
                        const touch = e.touches[0];
                        setTouchStartPos({ x: touch.pageX, y: touch.pageY, time: Date.now() });
                        setTouchStartIndex(i);
                        setIsDragging(false);
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // 드래그가 아니었으면 정보 표시
                      if (!isDragging && touchStartIndex === i && chartWrapperRef.current && svgRef.current) {
                        const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                        const touch = e.changedTouches[0];
                        const xPos = touch.clientX - wrapperRect.left;
                        const yPos = touch.clientY - wrapperRect.top;
                        setHoveredIndex(i);
                        setIsTouchTooltip(true);
                        setTooltipPosition({ x: xPos, y: yPos });
                      }
                      setTouchStartIndex(null);
                    }}
                    style={{ cursor: isDragging ? 'grabbing' : 'pointer', pointerEvents: isDragging ? 'none' : 'auto' }}
                  />
                )}

                {/* 최고점 포인트 */}
                {maxY !== null && (
                  <circle
                    cx={x}
                    cy={maxY}
                    r="5"
                    fill="#f59e0b"
                    stroke="white"
                    strokeWidth="2"
                    onMouseEnter={(e) => !isDragging && handleMouseEnter(i, e)}
                    onMouseLeave={handleMouseLeave}
                    onTouchStart={(e) => {
                      e.stopPropagation();
                      if (chartWrapperRef.current && e.touches.length === 1) {
                        const touch = e.touches[0];
                        setTouchStartPos({ x: touch.pageX, y: touch.pageY, time: Date.now() });
                        setTouchStartIndex(i);
                        setIsDragging(false);
                      }
                    }}
                    onTouchEnd={(e) => {
                      e.stopPropagation();
                      e.preventDefault();
                      // 드래그가 아니었으면 정보 표시
                      if (!isDragging && touchStartIndex === i && chartWrapperRef.current && svgRef.current) {
                        const wrapperRect = chartWrapperRef.current.getBoundingClientRect();
                        const touch = e.changedTouches[0];
                        const xPos = touch.clientX - wrapperRect.left;
                        const yPos = touch.clientY - wrapperRect.top;
                        setHoveredIndex(i);
                        setIsTouchTooltip(true);
                        setTooltipPosition({ x: xPos, y: yPos });
                      }
                      setTouchStartIndex(null);
                    }}
                    style={{ cursor: isDragging ? 'grabbing' : 'pointer', pointerEvents: isDragging ? 'none' : 'auto' }}
                  />
                )}

                {/* X축 라벨 (날짜) */}
                <text
                  x={x}
                  y={chartHeight + 25}
                  textAnchor="middle"
                  fontSize="11"
                  fill="#6b7280"
                  fontWeight="500"
                >
                  {formatDate(d.date).split(' ')[0]}
                </text>
                <text
                  x={x}
                  y={chartHeight + 40}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#9ca3af"
                  fontWeight="400"
                >
                  {formatDate(d.date).split(' ')[1]}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}

export default MyMonthlyStatisticsDetail;

