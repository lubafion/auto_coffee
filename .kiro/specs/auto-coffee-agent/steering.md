# Steering — CoffeePath AI Agent

## 전역 규칙 (Agent 전체에 적용)

### RULE-01: 타이밍 창 엄수
- Near Office 상태에서만 주문 고려
- Passed Office 상태이면 어떤 조건에서도 주문 불가
- 근거: 타이밍 미스 시 픽업 대기 15~20분 추가 발생 (requirements.md §1.4)

### RULE-02: 근무 형태 우선 확인
- workMode = Remote 또는 OOO이면 즉시 주문 거부
- 근거: 재택/외근 시 불필요한 주문 발생 방지 (requirements.md §1.3)

### RULE-03: 중복 주문 절대 금지
- todayOrdered = true이면 어떤 조건에서도 should_order = false
- 근거: 중복 주문 시 커피 2잔 결제, 낭비 (requirements.md §1.4)

### RULE-04: 불확실성 시 보수적 판단
- 입력 조건이 모호하거나 충돌할 때 should_order = false
- confidence < 0.6이면 자동 주문 알림 미표시
- 근거: 잘못된 주문의 실패 비용이 미주문보다 큼 (requirements.md §1.3)

### RULE-05: 날씨 기반 메뉴 선택
- Sunny / Cloudy → Iced 계열 (예: Iced Americano, Iced Latte)
- Cold / Rainy → Hot 계열 (예: Hot Latte, Hot Americano)
- 메뉴는 반드시 구체적 음료명 포함 (단순 "Coffee" 불가)
- 근거: 날씨 불일치 메뉴 → 불만족, 신뢰도 하락 (requirements.md §1.4)

### RULE-06: API 오류 시 안전 fallback
- Gemini API 호출 실패 시 should_order = false, confidence = 0
- reason 필드에 오류 내용 반드시 포함
- 근거: 오류 상황에서 잘못된 주문 발생 방지

### RULE-07: 출력 스키마 일관성
- 모든 응답은 { should_order, menu, confidence, reason } 4개 필드 포함
- should_order = false 시에도 menu 필드 존재 (빈 문자열 허용)
- reason은 항상 비어있지 않은 문자열

### RULE-08: 하루 1회 제한
- 주문 성공(should_order=true + 사용자 확인) 후 todayOrdered = true 설정
- 이후 모든 Agent 호출에서 주문 거부

---

## 판단 우선순위 (충돌 시 적용 순서)

1. API 오류 → 즉시 fallback (RULE-06)
2. todayOrdered = true → 주문 거부 (RULE-03)
3. workMode ≠ Office → 주문 거부 (RULE-02)
4. movementStatus = Passed Office → 주문 거부 (RULE-01)
5. movementStatus ≠ Near Office → 주문 거부 (RULE-01)
6. confidence < 0.6 → 알림 억제 (RULE-04)
7. 날씨 기반 메뉴 선택 (RULE-05)
