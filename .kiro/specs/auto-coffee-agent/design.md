# Design — CoffeePath AI Agent

## 1. 시스템 아키텍처

```
┌─────────────────────────────────────────────────────┐
│                   AgentDashboard (UI)                │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐   │
│  │ Scenario     │    │ Context Card             │   │
│  │ Selector     │───▶│ (movementStatus, weather,│   │
│  │ (T1~T5)      │    │  workMode, todayOrdered) │   │
│  └──────────────┘    └──────────┬───────────────┘   │
│                                 │ AgentInput         │
│                                 ▼                    │
│                    ┌────────────────────────┐        │
│                    │  decideCoffeeOrder()   │        │
│                    │  (geminiService.ts)    │        │
│                    └────────────┬───────────┘        │
│                                 │ AgentOutput        │
│                                 ▼                    │
│  ┌──────────────────────────────────────────────┐   │
│  │ 후처리 로직                                   │   │
│  │ confidence >= 0.6 → Notification Modal 표시  │   │
│  │ confidence < 0.6  → 주문 억제                │   │
│  │ API 오류          → fallback (false, 0)      │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

## 2. 데이터 모델

### 2.1 입력 스키마 (AgentInput)
```typescript
interface AgentInput {
  currentLocation: { lat: number; lng: number };
  currentTime: string;                    // "HH:MM:SS"
  movementStatus: MovementStatus;         // Moving | Stationary | Near Office | Passed Office
  weather: WeatherStatus;                 // Sunny | Rainy | Cold | Cloudy
  workMode: WorkMode;                     // Office | Remote | OOO
  todayOrdered: boolean;
  lastOrderTime?: string;
  lastOrderMenu?: string;
}
```

### 2.2 출력 스키마 (AgentOutput)
```typescript
interface AgentOutput {
  should_order: boolean;    // 주문 여부
  menu: string;             // 구체적 음료명 (예: "Iced Americano")
  confidence: number;       // 0.0 ~ 1.0
  reason: string;           // 판단 근거 (항상 비어있지 않음)
}
```

## 3. 핵심 판단 로직

### 3.1 주문 결정 트리
```
입력 수신
  │
  ├─ workMode ≠ Office → should_order=false ("Not office day")
  │
  ├─ movementStatus = Passed Office → should_order=false ("Too late")
  │
  ├─ todayOrdered = true → should_order=false ("Already ordered")
  │
  ├─ movementStatus ≠ Near Office → should_order=false ("Not near office yet")
  │
  └─ 모든 조건 통과 → 메뉴 선택
       ├─ weather = Sunny/Cloudy → Iced 계열
       └─ weather = Cold/Rainy   → Hot 계열
```

### 3.2 신뢰도 기반 자동화 제어
```
confidence >= 0.6 → Notification Modal 표시 (사용자 확인 후 주문)
confidence < 0.6  → 주문 억제, 로그에만 기록
```

### 3.3 실패 케이스 처리 (FR-06, FR-07)
```typescript
// API 오류 시 안전 fallback
catch (error) {
  return {
    should_order: false,
    menu: "",
    confidence: 0,
    reason: "Error: " + error.message
  };
}
```

## 4. Gemini API 연동

### 4.1 모델 설정
- 모델: `gemini-2.0-flash-exp` (또는 `gemini-1.5-flash`)
- 응답 형식: `responseMimeType: "application/json"`
- 스키마 강제: `responseSchema` 사용 → 4개 필드 항상 보장

### 4.2 프롬프트 구조
```
시스템 역할: AI Coffee Ordering Agent
컨텍스트: 7개 입력 필드 주입
규칙: 7개 명시적 규칙 (주문 조건, 메뉴 선택, 불확실성 처리)
출력: JSON 스키마 강제
```

### 4.3 병목 가치 반영 (requirements.md → design.md 일관성)

| requirements.md 가치 | design.md 반영 |
|---------------------|----------------|
| 타이밍 민감성 (Near Office 창) | movementStatus 체크 최우선 |
| 실패 비용 (중복 주문) | todayOrdered 플래그 + 하루 1회 제한 |
| 암묵 규칙 (더우면 아이스) | weather → menu 매핑 로직 |
| 불확실성 시 보수적 처리 | confidence < 0.6 억제 + API 오류 fallback |
| 재택/외근 확인 | workMode 체크 |

## 5. UI 컴포넌트 구조

```
AgentDashboard
├── Header (모니터링 ON/OFF 토글)
├── Scenario Selector (T1~T5 빠른 테스트)
├── Context Card (현재 입력 상태 표시)
├── Decision Output (AgentOutput 시각화)
│   ├── should_order=true  → 초록 카드 + 메뉴 표시
│   └── should_order=false → 회색 카드
├── Decision History (로그 목록)
└── Notification Modal (confidence >= 0.6 시 팝업)
    ├── 메뉴 표시
    ├── 판단 근거 표시
    └── Confirm / Not Today 버튼
```

## 6. 에러 처리 전략

| 에러 유형 | 처리 방법 | 사용자 경험 |
|-----------|-----------|-------------|
| API 키 없음 | fallback 반환 | reason에 오류 표시 |
| 네트워크 오류 | catch → fallback | "Error in decision engine" 표시 |
| 잘못된 JSON 응답 | JSON.parse 실패 → catch | fallback 반환 |
| 모호한 입력 | 프롬프트 규칙 6번 적용 | should_order=false |
