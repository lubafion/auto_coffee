# CoffeePath AI Agent

## 어떤 병목을 다루는가

**Task:** 출근 동선 중 커피 주문 타이밍 판단 및 메뉴 선택

| 항목 | 내용 |
|------|------|
| 빈도 | 주 5회 (평일 매일) |
| 소요 시간 | 1회당 약 3~5분 (앱 열기 → 위치 확인 → 날씨 확인 → 메뉴 고민 → 주문) |
| 왜 병목인가 | 출근 중 이동하면서 스마트폰으로 커피 앱을 열고, 현재 위치가 카페 근처인지 확인하고, 날씨와 기분에 맞는 메뉴를 고르는 과정이 매일 반복됨. 타이밍을 놓치면 (사무실 도착 후 주문) 픽업 대기 시간이 길어지거나 주문 자체를 포기하게 됨. 재택/외근 여부를 매번 수동으로 확인해야 하는 것도 마찰 요인. |
| 실패 비용 | 타이밍 미스 → 픽업 대기 15~20분 추가 발생, 또는 당일 커피 포기 |

---

## 왜 AI Agent로 만들었는가

**룰베이스가 안 되는 이유:**

단순 if-else로는 다음 판단을 처리할 수 없습니다:

1. **복합 조건 추론**: "Near Office + Sunny + Office 근무 + 오늘 미주문" 조합이 맞아야 주문 — 조건이 4개 이상 교차하며 우선순위가 상황마다 다름
2. **메뉴 선택 판단**: 날씨(Sunny/Rainy/Cold/Cloudy)와 계절 맥락을 종합해 Iced/Hot 중 적절한 음료를 선택 — 단순 매핑이 아닌 맥락 기반 추론
3. **불확실성 처리**: 입력 조건이 모호하거나 충돌할 때 "주문 안 함"으로 안전하게 fallback하는 판단
4. **신뢰도 산출**: 각 결정에 confidence score를 부여해 낮은 신뢰도(< 0.6)일 때 사람 개입 유도

**AI 판단이 필요한 지점:**
- 화자(사용자) 상태가 명시되지 않은 경우의 기본값 추론
- 날씨 + 이동 상태 + 근무 형태의 3중 교차 판단
- confidence < 0.6 시 자동 주문 억제 및 사용자 확인 요청

---

## Agent 구조

```
입력 (AgentInput)
  ├── currentLocation: { lat, lng }
  ├── currentTime: string
  ├── movementStatus: Moving | Stationary | Near Office | Passed Office
  ├── weather: Sunny | Rainy | Cold | Cloudy
  ├── workMode: Office | Remote | OOO
  ├── todayOrdered: boolean
  └── lastOrderTime?, lastOrderMenu?
         │
         ▼
  [Gemini 1.5 Flash] — structured JSON output (responseMimeType: application/json)
         │
         ▼
출력 (AgentOutput)
  ├── should_order: boolean
  ├── menu: string (e.g., "Iced Americano")
  ├── confidence: float (0~1)
  └── reason: string
         │
         ▼
  후처리
  ├── confidence >= 0.6 → 자동 주문 알림 표시
  ├── confidence < 0.6  → 주문 억제 (should_order=false 처리)
  └── 실패(API 오류)   → should_order=false, reason에 오류 메시지
```

**사용 도구:** `@google/genai` (Gemini API), React 19, TypeScript, Vite, Tailwind v4

**핵심 제약:**
- 하루 1회만 주문 (todayOrdered 플래그)
- Near Office 상태에서만 주문 가능
- Office 근무 모드에서만 주문 가능
- Passed Office 상태면 주문 불가 (타이밍 초과)

---

## 실행 방법

```bash
cd auto_coffee
npm install
cp .env.example .env.local
# .env.local에 GEMINI_API_KEY 입력
npm run dev
# http://localhost:3000 접속
```

---

## 테스트 입력 형식

`test-input/` 디렉토리에 JSON 형식으로 저장됩니다.

**파일 구조:**
```json
{
  "currentLocation": { "lat": 37.5665, "lng": 126.978 },
  "currentTime": "08:45:00",
  "movementStatus": "Near Office",
  "weather": "Sunny",
  "workMode": "Office",
  "todayOrdered": false,
  "lastOrderTime": null,
  "lastOrderMenu": null
}
```

**커버하는 분기:**
| 파일 | 시나리오 | 기대 결과 |
|------|----------|-----------|
| case-1.json | Near Office + Sunny + Office + 미주문 | should_order: true, menu: Iced* |
| case-2.json | Near Office + Cold + Office + 미주문 | should_order: true, menu: Hot* |
| case-3.json | Near Office + Office + 이미 주문 | should_order: false |
| case-4.json | Near Office + Remote 근무 | should_order: false |
| case-5.json | Passed Office + Office + 미주문 | should_order: false |
| case-6.json | Moving (아직 멀리 있음) | should_order: false |
| case-7.json | OOO (외근) | should_order: false |

---

## 실행 결과 (5회)

UI의 Simulation Scenarios 버튼으로 각 케이스를 적용 후 "Trigger Agent Decision" 클릭.

### Run 1 — T1: Weekday Commute (Near Office + Sunny + Office + 미주문)
```json
{
  "should_order": true,
  "menu": "Iced Americano",
  "confidence": 0.95,
  "reason": "All conditions met: approaching office, sunny weather, office work mode, no prior order today."
}
```

### Run 2 — T2: Already Ordered (Near Office + 이미 주문)
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.99,
  "reason": "Coffee already ordered today. Skipping to avoid duplicate order."
}
```

### Run 3 — T3: Remote Working
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.99,
  "reason": "Work mode is Remote. No office commute today, coffee order not applicable."
}
```

### Run 4 — T4: Already Passed Office
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.97,
  "reason": "Location status is Passed Office. The optimal ordering window has closed."
}
```

### Run 5 — T5: Rainy Cold Day (Near Office + Cold + Office + 미주문)
```json
{
  "should_order": true,
  "menu": "Hot Latte",
  "confidence": 0.92,
  "reason": "Cold weather detected. Approaching office with no prior order. Hot beverage recommended."
}
```

**핵심 출력 필드 일관성 확인:**
- `should_order`: 5회 모두 기대값과 일치 ✅
- `menu`: should_order=true 시 항상 구체적 음료명 포함 ✅
- `confidence`: 5회 모두 0.0~1.0 범위 내 float ✅
- `reason`: 5회 모두 비어있지 않은 문자열 ✅
