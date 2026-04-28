# Requirements — CoffeePath AI Agent

## 1. 배경 및 병목 정의

### 1.1 Task 단위 정의
**Task:** 출근 동선 중 커피 주문 타이밍 판단 및 메뉴 자동 선택

- 1회 수행 시간: 3~5분 (수동 기준)
- 빈도: 주 5회 (평일 매일 출근 시)
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
- "이미 주문했으면 한 번 더 물어봐" → 재주문 확인 팝업
- "이미 지나쳤으면 포기" → Passed Office 상태 처리
- "확실하지 않으면 주문 안 함" → 불확실성 시 보수적 판단
- "내가 좋아하는 음료 위주로 추천해줘" → 사용자 기호 반영

### 1.4 잘못했을 때의 실패 비용

| 실패 유형 | 비용 |
|-----------|------|
| 타이밍 미스 (Passed Office 후 주문) | 픽업 대기 15~20분 추가 |
| 재택인데 주문 | 불필요한 주문 발생, 취소 번거로움 |
| 원치 않는 중복 주문 | 커피 2잔 결제, 낭비 |
| 잘못된 메뉴 (더운데 핫 음료) | 불만족, 다음 날 신뢰도 하락 |
| 팝업 과다 노출 | 사용자 피로, 알림 무시 습관 형성 |

---

## 2. 기능 요구사항

### 2.1 사용자 음료 기호 설정 (온보딩)

**FR-00: 첫 실행 온보딩**
- 앱 최초 실행 시 음료 기호 설정 화면 표시
- localStorage에 기호 저장 → 이후 실행 시 온보딩 스킵
- 설정 항목:
  - 온도 선호: 아이스 / 핫 / 상관없음
  - 음료 종류: 아메리카노 / 라떼 / 카푸치노 / 모카 / 티 / 상관없음
  - 당도: 무당 / 약하게 / 보통
  - 추가 요청 (자유 입력): 디카페인, 오트밀크 등
- 대시보드 내 기호 배너에서 언제든 수정 가능

**FR-00a: 기호 기반 메뉴 추천**
- 설정된 기호를 AI 프롬프트에 주입
- 날씨 기반 추천보다 사용자 기호가 우선 적용
- 예: 아이스 선호 + 추운 날 → 아이스 음료 추천 (날씨 규칙 override)

### 2.2 핵심 판단 요구사항

**FR-01: 주문 가능 조건 판단**
- workMode = Office AND movementStatus = Near Office 일 때 주문 고려
- todayOrdered 여부와 무관하게 Near Office 진입 시 판단 실행
- 단, todayOrdered = true인 경우 재주문 확인 팝업 표시 (자동 실행 금지)

**FR-02: 타이밍 초과 처리**
- movementStatus = Passed Office 이면 should_order = false (타이밍 창 초과)

**FR-03: 메뉴 자동 선택**
- 사용자 기호가 설정된 경우 기호 우선 적용
- 기호 미설정 시: weather = Sunny/Cloudy → Iced, weather = Cold/Rainy → Hot
- 메뉴는 구체적 음료명 포함 (예: "Iced Americano", "Hot Latte")

**FR-04: 신뢰도 기반 자동화 제어**
- confidence >= 0.6: 자동 주문 알림 표시
- confidence < 0.6: 주문 억제, 사용자에게 수동 확인 요청
- 이유(reason) 필드는 항상 비어있지 않은 문자열

**FR-05: 재주문 확인**
- todayOrdered = true 상태에서 Near Office 진입 시 "이미 주문하셨어요. 한 잔 더 시킬까요?" 확인 팝업 표시
- 사용자가 명시적으로 확인해야만 재주문 실행

**FR-06: 팝업 쿨다운 (시간대별 1회 제한)**
- 같은 시간대 내 팝업은 최대 1회만 표시
- 시간대 구분:
  - 아침: 07:00 ~ 11:59
  - 점심: 12:00 ~ 17:59
  - 저녁: 18:00 ~ 23:59
  - 새벽(00:00~06:59): 팝업 비활성
- 쿨다운 상태는 localStorage에 `날짜-시간대` 키로 저장
- 날짜가 바뀌면 자동 초기화

### 2.3 실패 케이스 처리 요구사항

**FR-07: API 오류 복구**
- Gemini API 호출 실패 시 should_order = false, confidence = 0으로 안전 fallback
- reason 필드에 오류 내용 포함

**FR-08: 불확실 입력 처리**
- 입력 조건이 모호하거나 충돌할 때 "주문 안 함"으로 보수적 처리

---

## 3. 비기능 요구사항

**NFR-01: 응답 시간**
- Agent 판단 완료까지 5초 이내

**NFR-02: 출력 스키마 일관성**
- 모든 응답은 { should_order, menu, confidence, reason } 4개 필드 포함
- should_order = false 시에도 menu 필드 존재 (빈 문자열 허용)

**NFR-03: 기호 영속화**
- 사용자 기호는 localStorage에 저장되어 앱 재시작 후에도 유지

---

## 4. 수용 기준 (Acceptance Criteria)

| ID | 조건 | 기대 결과 |
|----|------|-----------|
| AC-01 | Near Office + Office + 미주문 + Sunny | should_order=true, menu에 "Iced" 포함 |
| AC-02 | Near Office + Office + 미주문 + Cold | should_order=true, menu에 "Hot" 포함 |
| AC-03 | Near Office + Office + todayOrdered=true | 재주문 확인 팝업 표시 (자동 실행 금지) |
| AC-04 | Near Office + Remote | should_order=false |
| AC-05 | Passed Office + Office + 미주문 | should_order=false |
| AC-06 | Moving + Office + 미주문 | should_order=false |
| AC-07 | OOO + Near Office | should_order=false |
| AC-08 | API 오류 발생 | should_order=false, confidence=0, reason 비어있지 않음 |
| AC-09 | confidence < 0.6 | 자동 주문 알림 미표시 |
| AC-10 | 모든 응답 | should_order, menu, confidence, reason 4개 필드 모두 존재 |
| AC-11 | 같은 시간대 2회 Near Office 진입 | 팝업 1회만 표시 (쿨다운 적용) |
| AC-12 | 아이스 선호 설정 + Cold 날씨 | menu에 "Iced" 포함 (기호 우선) |
| AC-13 | 첫 실행 | 온보딩 화면 표시 |
| AC-14 | 온보딩 완료 후 재실행 | 온보딩 스킵, 대시보드 바로 표시 |
