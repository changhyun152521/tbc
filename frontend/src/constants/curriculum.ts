/**
 * 시험 등록용 교육과정: 과목 → 대단원 → 소단원
 * id = 표시/저장용 동일 문자열 (과목명 뒤 '수학' 없음)
 */
export interface CurriculumUnit {
  id: string;
  label: string;
  smallUnits: { id: string; label: string }[];
}

export interface CurriculumSubject {
  id: string;
  label: string;
  units: CurriculumUnit[];
}

export const CURRICULUM: CurriculumSubject[] = [
  {
    id: '중1-1',
    label: '중1-1',
    units: [
      { id: '소인수분해', label: '소인수분해', smallUnits: [{ id: '소인수분해', label: '소인수분해' }, { id: '최대공약수와 최소공배수', label: '최대공약수와 최소공배수' }] },
      { id: '정수와 유리수', label: '정수와 유리수', smallUnits: [{ id: '정수와 유리수', label: '정수와 유리수' }, { id: '정수와 유리수의 계산', label: '정수와 유리수의 계산' }] },
      { id: '문자와 식', label: '문자와 식', smallUnits: [{ id: '문자의 사용과 식의 계산', label: '문자의 사용과 식의 계산' }, { id: '일차방정식', label: '일차방정식' }, { id: '일차방정식의 활용', label: '일차방정식의 활용' }] },
      { id: '좌표평면과 그래프', label: '좌표평면과 그래프', smallUnits: [{ id: '좌표평면과 그래프', label: '좌표평면과 그래프' }, { id: '정비례와 반비례', label: '정비례와 반비례' }] },
    ],
  },
  {
    id: '중1-2',
    label: '중1-2',
    units: [
      { id: '기본 도형과 작도', label: '기본 도형과 작도', smallUnits: [{ id: '기본 도형', label: '기본 도형' }, { id: '위치 관계', label: '위치 관계' }, { id: '작도와 합동', label: '작도와 합동' }] },
      { id: '평면도형의 성질', label: '평면도형의 성질', smallUnits: [{ id: '다각형', label: '다각형' }, { id: '원과 부채꼴', label: '원과 부채꼴' }] },
      { id: '입체도형의 성질', label: '입체도형의 성질', smallUnits: [{ id: '다면체와 회전체', label: '다면체와 회전체' }, { id: '입체도형의 겉넓이와 부피', label: '입체도형의 겉넓이와 부피' }] },
      { id: '자료의 정리와 해석', label: '자료의 정리와 해석', smallUnits: [{ id: '자료의 정리와 해석', label: '자료의 정리와 해석' }] },
    ],
  },
  {
    id: '중2-1',
    label: '중2-1',
    units: [
      { id: '수와 식', label: '수와 식', smallUnits: [{ id: '유리수와 순환소수', label: '유리수와 순환소수' }, { id: '식의 계산', label: '식의 계산' }] },
      { id: '부등식', label: '부등식', smallUnits: [{ id: '일차부등식', label: '일차부등식' }, { id: '일차부등식의 활용', label: '일차부등식의 활용' }] },
      { id: '방정식', label: '방정식', smallUnits: [{ id: '연립일차방정식', label: '연립일차방정식' }, { id: '연립방정식의 풀이', label: '연립방정식의 풀이' }, { id: '연립방정식의 활용', label: '연립방정식의 활용' }] },
      { id: '함수', label: '함수', smallUnits: [{ id: '일차함수와 그래프(1)', label: '일차함수와 그래프(1)' }, { id: '일차함수와 그래프(2)', label: '일차함수와 그래프(2)' }, { id: '일차함수와 일차방정식의 관계', label: '일차함수와 일차방정식의 관계' }] },
    ],
  },
  {
    id: '중2-2',
    label: '중2-2',
    units: [
      { id: '도형의 성질', label: '도형의 성질', smallUnits: [{ id: '삼각형의 성질', label: '삼각형의 성질' }, { id: '사각형의 성질', label: '사각형의 성질' }] },
      { id: '도형의 닮음', label: '도형의 닮음', smallUnits: [{ id: '도형의 닮음', label: '도형의 닮음' }, { id: '닮은 도형의 성질', label: '닮은 도형의 성질' }, { id: '피타고라스 정리', label: '피타고라스 정리' }] },
      { id: '확률', label: '확률', smallUnits: [{ id: '경우의 수와 확률', label: '경우의 수와 확률' }] },
    ],
  },
  {
    id: '중3-1',
    label: '중3-1',
    units: [
      { id: '실수와 그 계산', label: '실수와 그 계산', smallUnits: [{ id: '제곱근과 실수', label: '제곱근과 실수' }, { id: '근호를 포함한 식의 계산', label: '근호를 포함한 식의 계산' }] },
      { id: '다항식의 곱셈과 인수분해', label: '다항식의 곱셈과 인수분해', smallUnits: [{ id: '다항식의 곱셈', label: '다항식의 곱셈' }, { id: '다항식의 인수분해', label: '다항식의 인수분해' }] },
      { id: '이차방정식', label: '이차방정식', smallUnits: [{ id: '이차방정식의 풀이', label: '이차방정식의 풀이' }, { id: '이차방정식의 활용', label: '이차방정식의 활용' }] },
      { id: '이차함수', label: '이차함수', smallUnits: [{ id: '이차함수의 그래프', label: '이차함수의 그래프' }, { id: '이차함수의 활용', label: '이차함수의 활용' }] },
    ],
  },
  {
    id: '중3-2',
    label: '중3-2',
    units: [
      { id: '삼각비', label: '삼각비', smallUnits: [{ id: '삼각비', label: '삼각비' }, { id: '삼각비의 활용', label: '삼각비의 활용' }] },
      { id: '원의 성질', label: '원의 성질', smallUnits: [{ id: '원과 직선', label: '원과 직선' }, { id: '원주각', label: '원주각' }, { id: '원주각의 활용', label: '원주각의 활용' }] },
      { id: '통계', label: '통계', smallUnits: [{ id: '대푯값과 산포도', label: '대푯값과 산포도' }, { id: '상관관계', label: '상관관계' }] },
    ],
  },
  {
    id: '공통수학1',
    label: '공통수학1',
    units: [
      { id: '다항식', label: '다항식', smallUnits: [{ id: '다항식의 연산', label: '다항식의 연산' }, { id: '나머지정리', label: '나머지정리' }, { id: '인수분해', label: '인수분해' }] },
      { id: '방정식과 부등식', label: '방정식과 부등식', smallUnits: [{ id: '복소수와 이차방정식', label: '복소수와 이차방정식' }, { id: '이차방정식과 이차함수', label: '이차방정식과 이차함수' }, { id: '여러 가지 방정식과 부등식', label: '여러 가지 방정식과 부등식' }] },
      { id: '경우의 수', label: '경우의 수', smallUnits: [{ id: '합의 법칙과 곱의 법칙', label: '합의 법칙과 곱의 법칙' }, { id: '순열과 조합', label: '순열과 조합' }] },
      { id: '행렬', label: '행렬', smallUnits: [{ id: '행렬과 그 연산', label: '행렬과 그 연산' }] },
    ],
  },
  {
    id: '공통수학2',
    label: '공통수학2',
    units: [
      { id: '도형의 방정식', label: '도형의 방정식', smallUnits: [{ id: '평면좌표', label: '평면좌표' }, { id: '직선의 방정식', label: '직선의 방정식' }, { id: '원의 방정식', label: '원의 방정식' }, { id: '도형의 이동', label: '도형의 이동' }] },
      { id: '집합과 명제', label: '집합과 명제', smallUnits: [{ id: '집합', label: '집합' }, { id: '명제', label: '명제' }, { id: '함수와 그래프', label: '함수와 그래프' }] },
      { id: '함수', label: '함수', smallUnits: [{ id: '유리함수와 무리함수', label: '유리함수와 무리함수' }] },
    ],
  },
  {
    id: '대수',
    label: '대수',
    units: [
      { id: '지수함수와 로그함수', label: '지수함수와 로그함수', smallUnits: [{ id: '지수와 로그', label: '지수와 로그' }, { id: '지수함수와 로그함수', label: '지수함수와 로그함수' }] },
      { id: '삼각함수', label: '삼각함수', smallUnits: [{ id: '삼각함수', label: '삼각함수' }, { id: '사인법칙과 코사인법칙', label: '사인법칙과 코사인법칙' }] },
      { id: '수열', label: '수열', smallUnits: [{ id: '등차수열과 등비수열', label: '등차수열과 등비수열' }, { id: '수열의 합', label: '수열의 합' }, { id: '수학적 귀납법', label: '수학적 귀납법' }] },
    ],
  },
  {
    id: '미적분1',
    label: '미적분1',
    units: [
      { id: '함수의 극한과 연속', label: '함수의 극한과 연속', smallUnits: [{ id: '함수의 극한', label: '함수의 극한' }, { id: '함수의 연속', label: '함수의 연속' }] },
      { id: '미분', label: '미분', smallUnits: [{ id: '미분계수와 도함수', label: '미분계수와 도함수' }, { id: '도함수의 활용', label: '도함수의 활용' }] },
      { id: '적분', label: '적분', smallUnits: [{ id: '부정적분과 정적분', label: '부정적분과 정적분' }, { id: '정적분의 활용', label: '정적분의 활용' }] },
    ],
  },
  {
    id: '확률과통계',
    label: '확률과통계',
    units: [
      { id: '경우의 수', label: '경우의 수', smallUnits: [{ id: '순열과 조합', label: '순열과 조합' }, { id: '이항정리', label: '이항정리' }] },
      { id: '확률', label: '확률', smallUnits: [{ id: '확률의 뜻과 활용', label: '확률의 뜻과 활용' }, { id: '조건부확률', label: '조건부확률' }] },
      { id: '통계', label: '통계', smallUnits: [{ id: '확률분포', label: '확률분포' }, { id: '통계적 추정', label: '통계적 추정' }] },
    ],
  },
  {
    id: '기하',
    label: '기하',
    units: [
      { id: '이차곡선', label: '이차곡선', smallUnits: [{ id: '이차곡선', label: '이차곡선' }, { id: '이차곡선과 직선', label: '이차곡선과 직선' }] },
      { id: '벡터', label: '벡터', smallUnits: [{ id: '벡터의 연산', label: '벡터의 연산' }, { id: '평면벡터의 성분과 내적', label: '평면벡터의 성분과 내적' }] },
      { id: '공간도형', label: '공간도형', smallUnits: [{ id: '공간도형', label: '공간도형' }, { id: '공간좌표', label: '공간좌표' }] },
    ],
  },
  {
    id: '미적분(2015)',
    label: '미적분(2015)',
    units: [
      { id: '수열의 극한', label: '수열의 극한', smallUnits: [{ id: '수열의 극한', label: '수열의 극한' }, { id: '급수', label: '급수' }] },
      { id: '미분법', label: '미분법', smallUnits: [{ id: '여러 가지 함수의 미분', label: '여러 가지 함수의 미분' }, { id: '여러 가지 미분법', label: '여러 가지 미분법' }, { id: '도함수의 활용', label: '도함수의 활용' }] },
      { id: '적분법', label: '적분법', smallUnits: [{ id: '여러 가지 함수의 적분', label: '여러 가지 함수의 적분' }, { id: '정적분의 활용', label: '정적분의 활용' }] },
    ],
  },
];

/** 과목 선택 옵션 (value = id = 저장값) */
export function getSubjectOptions(): { value: string; label: string }[] {
  return CURRICULUM.map((s) => ({ value: s.id, label: s.label }));
}

/** 특정 과목의 대단원 옵션 */
export function getBigUnitOptions(subjectId: string): { value: string; label: string }[] {
  const subject = CURRICULUM.find((s) => s.id === subjectId);
  if (!subject) return [];
  return subject.units.map((u) => ({ value: u.id, label: u.label }));
}

/** 특정 과목·대단원의 소단원 옵션 */
export function getSmallUnitOptions(
  subjectId: string,
  bigUnitId: string
): { value: string; label: string }[] {
  const subject = CURRICULUM.find((s) => s.id === subjectId);
  if (!subject) return [];
  const unit = subject.units.find((u) => u.id === bigUnitId);
  if (!unit) return [];
  return unit.smallUnits.map((s) => ({ value: s.id, label: s.label }));
}

/** 저장된 ID → 표시 라벨 */
export function getSubjectLabel(id: string): string {
  const s = CURRICULUM.find((x) => x.id === id);
  return s?.label ?? id;
}

export function getBigUnitLabel(subjectId: string, bigUnitId: string): string {
  const subject = CURRICULUM.find((s) => s.id === subjectId);
  const unit = subject?.units.find((u) => u.id === bigUnitId);
  return unit?.label ?? bigUnitId;
}

export function getSmallUnitLabel(
  subjectId: string,
  bigUnitId: string,
  smallUnitId: string
): string {
  const subject = CURRICULUM.find((s) => s.id === subjectId);
  const unit = subject?.units.find((u) => u.id === bigUnitId);
  const small = unit?.smallUnits.find((s) => s.id === smallUnitId);
  return small?.label ?? smallUnitId;
}
