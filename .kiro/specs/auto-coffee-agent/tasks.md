# Tasks — CoffeePath AI Agent

## 실행 단계 분해

- [x] 1. AgentInput / AgentOutput 타입 정의 (`src/types.ts`)
  - WorkMode, WeatherStatus, MovementStatus enum 정의
  - AgentInput, AgentOutput, DecisionLogEntry 인터페이스 정의

- [x] 2. Gemini API 연동 (`src/services/geminiService.ts`)
  - decideCoffeeOrder(input: AgentInput): Promise<AgentOutput> 구현
  - responseSchema로 4개 필드 강제
  - API 오류 시 fallback 처리 (should_order=false, confidence=0)

- [x] 3. Agent 판단 로직 구현 (`src/services/geminiService.ts`)
  - 7개 규칙 프롬프트 주입
  - 불확실성 시 보수적 처리 규칙 포함

- [x] 4. AgentDashboard UI 구현 (`src/components/AgentDashboard.tsx`)
  - Context Card (입력 상태 표시)
  - Decision Output (출력 시각화)
  - Decision History (로그)
  - Notification Modal (confidence >= 0.6 시)

- [x] 5. 시나리오 테스트 버튼 구현
  - T1: Weekday Commute (정상 주문)
  - T2: Already Ordered (중복 방지)
  - T3: Remote Working (근무 형태 필터)
  - T4: Already Passed (타이밍 초과)
  - T5: Rainy Cold Day (날씨 기반 메뉴)

- [x] 6. 자동 모니터링 로직 구현
  - movementStatus = Near Office 감지 시 자동 트리거
  - isAutoMonitoring 토글로 ON/OFF 제어

- [x] 7. 실패 케이스 처리 검증
  - API 오류 fallback 테스트
  - confidence < 0.6 억제 로직 검증

- [x] 8. 평가 문서 작성
  - requirements.md (병목 정의, 수용 기준)
  - design.md (아키텍처, 판단 로직, 에러 처리)
  - steering.md (전역 규칙 8개)
  - CHECKLIST.md (자동 판정 가능 항목)
  - test-input/ (7개 케이스)
  - README.md (평가 양식 준수)
