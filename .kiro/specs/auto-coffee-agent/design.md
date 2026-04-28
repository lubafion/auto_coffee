# Design — CoffeePath AI Agent

## 1. 시스템 아키텍처

```
[첫 실행]
  └─ localStorage에 기호 없음 → OnboardingScreen (음료 기호 설정)
       └─ 저장 완료 → AgentDashboard

[이후 실행]
  └─ localStorage에 기호 있음 → AgentDashboard (온보딩 스킵)

AgentDashboard
  ├─ 기호 배너 (현재 설정 표시 + 수정 버튼)
  ├─ Context Card (위치/날씨/근무형태/주문여부)
  ├─ Auto-trigger: Near Office 진입 감지
  │     └─ 팝업 쿨다운 체크 → 통과 시 decideCoffeeOrder() 호출
  └─ Notification Modal
        ├─ 일반: "Time for Coffee?" + 메뉴 + 확인/취소
        └─ 재주문: "한 잔 더 어떠세요?" + 이미 주문 안내 배너
```

## 2. 데이터 모델

### 2.1 사용자 기호 (UserPreferences)
```typescript
type DrinkTemperature = 'iced' | 'hot' | 'any';
type DrinkCategory = 'americano' | 'latte' | 'cappuccino' | 'mocha' | 'tea' | 'any';
type SugarLevel = 'none' | 'light' | 'normal';

interface UserPreferences {
  temperature: DrinkTemperature;
  category: DrinkCategory;
  sugarLevel: SugarLevel;
  customNote: string;  // 자유 입력 (예: "디카페인", "오트밀크")
}
```
- localStorage 키: `coffeepath.userPreferences`

### 2.2 팝업 쿨다운
```typescript
type TimeSlot = 'morning' | 'afternoon' | 'evening';
// morning:  07:00~11:59
// afternoon: 12:00~17:59
// evening:  18:00~23:59
// 00:00~06:59: null (팝업 비활성)
```
- localStorage 키: `coffeepath.popupCooldown`
- 저장 형식: `"YYYY-MM-DD-{timeslot}"` (예: `"2026-04-28-morning"`)

### 2.3 입력 스키마 (AgentInput)
```typescript
interface AgentInput {
  currentLocation: { lat: number; lng: number };
  currentTime: string;
  movementStatus: MovementStatus;   // Moving | Stationary | Near Office | Passed Office
  weather: WeatherStatus;           // Sunny | Rainy | Cold | Cloudy
  workMode: WorkMode;               // Office | Remote | OOO
  todayOrdered: boolean;
  lastOrderTime?: string;
  lastOrderMenu?: string;
  userPreferences?: UserPreferences; // 기호 설정 시 주입
}
```

### 2.4 출력 스키마 (AgentOutput)
```typescript
interface AgentOutput {
  should_order: boolean;
  menu: string;        // 구체적 음료명 (예: "Iced Americano")
  confidence: number;  // 0.0 ~ 1.0
  reason: string;      // 판단 근거 (항상 비어있지 않음)
}
```

## 3. 핵심 판단 로직

### 3.1 Auto-trigger 흐름
```
Near Office 진입 감지
  │
  ├─ 팝업 쿨다운 적용 중? → 스킵 (같은 시간대 이미 표시)
  │
  ├─ workMode ≠ Office → 스킵
  │
  └─ decideCoffeeOrder() 호출
       │
       └─ should_order = true?
            ├─ todayOrdered = true → 재주문 확인 팝업 (isReorder=true)
            └─ todayOrdered = false → 일반 주문 팝업
            └─ 팝업 표시 → markPopupShown() (쿨다운 기록)
```

### 3.2 사용자 기호 → 프롬프트 주입
```
UserPreferences 있음
  └─ buildPreferencesSection() 호출
       └─ "USER PREFERENCES (must be respected):" 섹션 생성
            ├─ temperature ≠ 'any' → "Temperature preference: iced/hot"
            ├─ category ≠ 'any' → "Drink category preference: {category}"
            ├─ sugarLevel ≠ 'normal' → "Sugar level: none/light"
            └─ customNote → "Special note: {note}"
  └─ 프롬프트 RULE 8번: "If user preferences are provided, prioritize them"
```

### 3.3 팝업 쿨다운 로직
```typescript
function getTimeSlot(date): TimeSlot | null {
  const h = date.getHours();
  if (h < 7) return null;    // 새벽 비활성
  if (h < 12) return 'morning';
  if (h < 18) return 'afternoon';
  return 'evening';
}

function hasShownPopupThisSlot(): boolean {
  const key = getCooldownKey(); // "YYYY-MM-DD-{slot}"
  if (!key) return true;        // 새벽 → 차단
  return localStorage.getItem(POPUP_COOLDOWN_KEY) === key;
}
```

## 4. UI 컴포넌트 구조

```
App
└── AgentDashboard
    ├── [첫 실행] PreferencesSetup (온보딩)
    │   ├── 온도 선택 (아이스/핫/상관없음)
    │   ├── 음료 종류 선택 (6종)
    │   ├── 당도 선택 (무당/약하게/보통)
    │   └── 추가 요청 입력 (자유 텍스트)
    │
    ├── [기호 수정] PreferencesSetup (isEdit=true)
    │
    └── [메인] Dashboard
        ├── Header (모니터링 ON/OFF)
        ├── 기호 배너 (현재 설정 + 수정 버튼)
        ├── Scenario Selector (T1~T5)
        ├── Context Card
        ├── Decision Output
        ├── Decision History
        └── Notification Modal
            ├── 일반: "Time for Coffee?"
            └── 재주문: "한 잔 더 어떠세요?" + 주의 배너
```

## 5. 에러 처리 전략

| 에러 유형 | 처리 방법 | 사용자 경험 |
|-----------|-----------|-------------|
| API 키 없음 | fallback 반환 | reason에 오류 표시 |
| 네트워크 오류 | catch → fallback | "Error in decision engine" 표시 |
| 잘못된 JSON 응답 | JSON.parse 실패 → catch | fallback 반환 |
| 모호한 입력 | 프롬프트 규칙 적용 | should_order=false |
| 새벽 시간대 | 쿨다운 null 반환 | 팝업 비활성 |
