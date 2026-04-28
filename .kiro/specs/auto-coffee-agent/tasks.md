# Tasks — CoffeePath AI Agent

## 실행 단계 분해

- [x] 1. AgentInput / AgentOutput / UserPreferences 타입 정의 (`src/types.ts`)
  - WorkMode, WeatherStatus, MovementStatus enum 정의
  - AgentInput, AgentOutput, DecisionLogEntry 인터페이스 정의
  - UserPreferences 인터페이스 정의 (DrinkTemperature, DrinkCategory, SugarLevel)

- [x] 2. Gemini API 연동 (`src/services/geminiService.ts`)
  - decideCoffeeOrder(input: AgentInput): Promise<AgentOutput> 구현
  - responseSchema로 4개 필드 강제
  - API 오류 시 fallback 처리 (should_order=false, confidence=0)
  - buildPreferencesSection(): 사용자 기호를 프롬프트에 주입

- [x] 3. 사용자 음료 기호 온보딩 구현 (`src/components/AgentDashboard.tsx`)
  - PreferencesSetup 컴포넌트 (온보딩 + 수정 화면 공용)
  - 온도 / 음료 종류 / 당도 / 추가 요청 선택 UI
  - localStorage 저장/로드 (coffeepath.userPreferences)
  - 첫 실행 시 온보딩 표시, 이후 스킵

- [x] 4. 팝업 쿨다운 구현 (`src/components/AgentDashboard.tsx`)
  - getTimeSlot(): 시간대 판별 (아침/점심/저녁/새벽)
  - hasShownPopupThisSlot(): 쿨다운 체크
  - markPopupShown(): 쿨다운 기록
  - localStorage 키: coffeepath.popupCooldown

- [x] 5. 재주문 확인 팝업 구현 (`src/components/AgentDashboard.tsx`)
  - todayOrdered=true 상태에서 Near Office 진입 시 재주문 확인 팝업
  - isReorder 플래그로 팝업 문구 분기
  - "이미 주문하셨어요" 안내 배너 표시

- [x] 6. Auto-trigger 로직 수정
  - todayOrdered 조건 제거 (재주문 허용)
  - 팝업 쿨다운 체크 추가 (같은 시간대 1회 제한)
  - Near Office 진입 시 항상 판단 실행

- [x] 7. AgentDashboard UI 구현
  - 기호 배너 (현재 설정 요약 + 수정 버튼)
  - Context Card, Decision Output, Decision History
  - Notification Modal (일반/재주문 분기)

- [x] 8. 시나리오 테스트 버튼 구현 (T1~T5)

- [x] 9. 평가 문서 작성
  - requirements.md (병목 정의, 온보딩, 재주문, 쿨다운, 수용 기준)
  - design.md (아키텍처, 데이터 모델, 판단 로직)
  - steering.md (전역 규칙 9개, 판단 우선순위)
  - CHECKLIST.md (자동 판정 가능 항목)
  - test-input/ (7개 케이스)
  - README.md (평가 양식 준수)
