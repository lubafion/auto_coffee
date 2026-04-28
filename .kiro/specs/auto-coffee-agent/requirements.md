# Requirements — CoffeePath AI Agent

## 1. 배경 및 병목 정의

### 1.1 Task 단위 정의
**Task:** 출근 동선 중 커피 주문 타이밍 판단 및 메뉴 자동 선택

- 1회 수행 시간: 3~5분 (수동 기준)
[text](.)- 빈도: 주 5회 (평일 매일 출근 시)
- 반복성: 매일 동일한 판단 흐름 반복

### 1.2 병목의 원인 (왜 시간이 오래 걸리는가)

1. **멀티 컨텍스트 수집 부담**: 커피 주문 결정을 위해 현재 위치, 날씨, 근무 형태, 오늘 주문 여부를 동시에 확인해야 함
2. **타이밍 민감성**: Near Office 상태(카페 도착 5~10분 전)에서만 주문이 유효 — 이 창을 놓치면 픽업 대기 15~20분 추가 발생
3. **메뉴 결정 피로**: 날씨와 컨디션에 따라 매번 Iced/Hot, 음료 종류를 고민하는 결정 피로(decision fatigue)
4. **재택/외근 확인 마찰**: 근무 형태를 매번 수동으로 확인하고 주문 여부를 판단해야 함

### 1.3 사람이 할 때 쓰던 암묵 규칙

- "사무실 근처 오면 주문해야지" → Near Office 상태 감지
- "오늘 재택이면 안 주문" → workMode 확인
- "더우면 아이스, 추우면 핫" → 날씨 기반 메뉴 선택
- "이미 주문했으면 또 하지 말자" → todayOrdered 플래그
- "이미 지나쳤으면 포기" → Passed Office 상태 처리
- "확실하지 않으면 주문 안 함" → 불확실성 시 보수적 판단

### 1.4 잘못했을 때의 실패 비용

| 실패 유형 | 비용 |
|-----------|------|
| 타이밍 미스 (Passed Office 후 주문) | 픽업 대기 15~20분 추가 |
| 재택인데 주문 | 불필요한 주문 발생, 취소 번거로움 |
| 중복 주문 | 커피 2잔 결제, 낭비 |
| 잘못된 메뉴 (더운데 핫 음료) | 불만족, 다음 날 신뢰도 하락 |

---

## 2. 기능 요구사항

### 2.1 핵심 판단 요구사항

**FR-01: 주문 가능 조건 판단**
- workMode = Office AND movementStatus = Near Office AND todayOrdered = false 일 때만 주문 고려
- 위 조건 중 하나라도 불충족 시 should_order = false

**FR-02: 타이밍 초과 처리**
- movementStatus = Passed Office 이면 should_order = false (타이밍 창 초과)

**FR-03: 메뉴 자동 선택**
- weather = Sunny 또는 Cloudy → Iced 계열 음료 선택
- weather = Cold 또는 Rainy → Hot 계열 음료 선택
- 메뉴는 구체적 음료명 포함 (예: "Iced Americano", "Hot Latte")

**FR-04: 신뢰도 기반 자동화 제어**
- confidence >= 0.6: 자동 주문 알림 표시
- confidence < 0.6: 주문 억제, 사용자에게 수동 확인 요청
- 이유(reason) 필드는 항상 비어있지 않은 문자열

**FR-05: 중복 주문 방지**
- todayOrdered = true 이면 어떤 조건에서도 should_order = false

### 2.2 실패 케이스 처리 요구사항

**FR-06: API 오류 복구**
- Gemini API 호출 실패 시 should_order = false, confidence = 0으로 안전 fallback
- reason 필드에 오류 내용 포함

**FR-07: 불확실 입력 처리**
- 입력 조건이 모호하거나 충돌할 때 "주문 안 함"으로 보수적 처리
- 예: movementStatus = Moving이면서 workMode = Office → 아직 타이밍 아님, 주문 안 함

---

## 3. 비기능 요구사항

**NFR-01: 응답 시간**
- Agent 판단 완료까지 5초 이내

**NFR-02: 출력 스키마 일관성**
- 모든 응답은 { should_order, menu, confidence, reason } 4개 필드 포함
- should_order = false 시에도 menu 필드 존재 (빈 문자열 허용)

**NFR-03: 하루 1회 제한**
- todayOrdered 플래그로 당일 중복 주문 방지

---

## 4. 수용 기준 (Acceptance Criteria)

| ID | 조건 | 기대 결과 |
|----|------|-----------|
| AC-01 | Near Office + Office + 미주문 + Sunny | should_order=true, menu에 "Iced" 포함 |
| AC-02 | Near Office + Office + 미주문 + Cold | should_order=true, menu에 "Hot" 포함 |
| AC-03 | Near Office + Office + todayOrdered=true | should_order=false |
| AC-04 | Near Office + Remote | should_order=false |
| AC-05 | Passed Office + Office + 미주문 | should_order=false |
| AC-06 | Moving + Office + 미주문 | should_order=false |
| AC-07 | OOO + Near Office | should_order=false |
| AC-08 | API 오류 발생 | should_order=false, confidence=0, reason 비어있지 않음 |
| AC-09 | confidence < 0.6 | 자동 주문 알림 미표시 |
| AC-10 | 모든 응답 | should_order, menu, confidence, reason 4개 필드 모두 존재 |
