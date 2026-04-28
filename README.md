# CoffeePath AI Agent

## 어떤 병목을 다루는가

**Task:** 출근 중 사무실 근처 도달 시점에 커피 주문 여부 판단 + 날씨·기호 기반 메뉴 선택 + 주문 실행

| 항목 | 내용 |
|------|------|
| 빈도 | 주 5회 (평일 매일 출근 시) |
| 소요 시간 | 1회당 약 3~5분 (앱 열기 → 위치 확인 → 날씨 확인 → 메뉴 고민 → 주문) |
| 왜 병목인가 | 출근 중 이동하면서 스마트폰으로 커피 앱을 열고, 현재 위치가 카페 근처인지 확인하고, 날씨와 기분에 맞는 메뉴를 고르는 과정이 매일 반복됨. 타이밍을 놓치면 (사무실 도착 후 주문) 픽업 대기 시간이 길어지거나 주문 자체를 포기하게 됨. 재택/외근 여부를 매번 수동으로 확인해야 하는 것도 마찰 요인. |
| 실패 비용 | 타이밍 미스 → 픽업 대기 15~20분 추가 발생, 또는 당일 커피 포기 |

---

## 왜 AI Agent로 만들었는가

**룰베이스가 안 되는 이유:**

단순 if-else나 Zapier로는 다음 판단을 처리할 수 없습니다:

1. **메뉴 추론 — 사용자 기호 + 날씨 + 이전 주문 이력 조합**: "아이스 선호인데 오늘 비가 오고 어제도 아이스 마셨다" → 오늘은 Hot으로 바꿀지 말지 판단. 단순 매핑 불가.
2. **불확실 상황의 보수적 판단**: 위치 신호가 불안정하거나 근무 형태가 불명확할 때 "주문 안 함"으로 안전하게 fallback — 이 판단 기준을 룰로 명시하면 경우의 수가 무한대
3. **신뢰도 산출**: 각 결정에 confidence score를 부여해 낮은 신뢰도(< 0.6)일 때 자동 실행 억제 후 사람 개입 유도 — 단순 조건문으로는 신뢰도 개념 자체가 없음
4. **자연어 이유 생성**: 왜 주문했는지/안 했는지 `reason` 필드로 설명 — 룰베이스는 이유를 생성하지 못함

**AI 판단이 필요한 지점:**
- 날씨 + 이동 상태 + 근무 형태 + 사용자 기호의 4중 교차 판단
- confidence < 0.6 시 자동 주문 억제 및 사용자 확인 요청
- 모호한 입력 조건에서 보수적 기본값 선택

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
- Near Office 상태에서만 주문 가능
- Office 근무 모드에서만 주문 가능
- Passed Office 상태면 주문 불가 (타이밍 초과)
- todayOrdered=true 시 자동 주문 금지 → 재주문 확인 팝업으로 사용자 결정
- 같은 시간대(아침/점심/저녁) 내 팝업 최대 1회 (쿨다운)

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
| case-3.json | Near Office + Office + todayOrdered=true | should_order: false (재주문 확인 팝업) |
| case-4.json | Near Office + Remote 근무 | should_order: false |
| case-5.json | Passed Office + Office + 미주문 (실패 케이스) | should_order: false |

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

### Run 3 — T3: Already Ordered (Near Office + todayOrdered=true — 재주문 확인)
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.99,
  "reason": "Coffee already ordered today. Showing reorder confirmation to user instead of auto-ordering."
}
```

### Run 4 — T4: Remote Working (재택 근무)
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.99,
  "reason": "Work mode is Remote. No office commute today, coffee order not applicable."
}
```

### Run 5 — T5: Passed Office (타이밍 초과 — 실패 케이스)
```json
{
  "should_order": false,
  "menu": "",
  "confidence": 0.97,
  "reason": "Location status is Passed Office. The optimal ordering window has closed. Cannot place order."
}
```

> **실패 케이스 처리 확인**: Passed Office 상태에서 Agent는 주문을 거부하고 `should_order=false`를 반환합니다. 사람 개입 없이 자동으로 안전하게 fallback됩니다. API 오류 발생 시에도 동일하게 `should_order=false`, `confidence=0`, `reason="Error in decision engine: ..."` 형태로 fallback 처리됩니다.

**핵심 출력 필드 일관성 확인:**
- `should_order`: 5회 모두 기대값과 일치 ✅
- `menu`: should_order=true 시 항상 구체적 음료명 포함 ✅
- `confidence`: 5회 모두 0.0~1.0 범위 내 float ✅
- `reason`: 5회 모두 비어있지 않은 문자열 ✅
