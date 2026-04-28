# Steering — CoffeePath AI Agent

## 전역 규칙 (Agent 전체에 적용)

### RULE-01: 타이밍 창 엄수
- Near Office 상태에서만 주문 고려
- Passed Office 상태이면 어떤 조건에서도 주문 불가
- 근거: 타이밍 미스 시 픽업 대기 15~20분 추가 발생 (requirements.md §1.4)

### RULE-02: 근무 형태 우선 확인
- workMode = Remote 또는 OOO이면 즉시 주문 거부
- 근거: 재택/외근 시 불필요한 주문 발생 방지 (requirements.md §1.3)

### RULE-03: 재주문 시 반드시 사용자 확인
- todayOrdered = true 상태에서 Near Office 진입 시 자동 주문 금지
- "이미 주문하셨어요. 한 잔 더 시킬까요?" 확인 팝업 표시 후 사용자 결정 대기
- 근거: 원치 않는 중복 주문 방지 (requirements.md §1.4)

### RULE-04: 불확실성 시 보수적 판단
- 입력 조건이 모호하거나 충돌할 때 should_order = false
- confidence < 0.6이면 자동 주문 알림 미표시
- 근거: 잘못된 주문의 실패 비용이 미주문보다 큼 (requirements.md §1.3)

### RULE-05: 사용자 기호 우선 적용
- 사용자가 설정한 음료 기호(온도, 종류, 당도, 추가 요청)를 AI 프롬프트에 반드시 주입
- 날씨 기반 추천보다 사용자 기호가 우선
- 기호 미설정 시에만 날씨 기반 규칙 적용
- 근거: 매일 메뉴 고민하는 결정 피로 해소 (requirements.md §1.2)

### RULE-06: 날씨 기반 메뉴 선택 (기호 미설정 시)
- Sunny / Cloudy → Iced 계열 (예: Iced Americano, Iced Latte)
- Cold / Rainy → Hot 계열 (예: Hot Latte, Hot Americano)
- 메뉴는 반드시 구체적 음료명 포함 (단순 "Coffee" 불가)
- 근거: 날씨 불일치 메뉴 → 불만족, 신뢰도 하락 (requirements.md §1.4)

### RULE-07: 팝업 쿨다운 엄수
- 같은 시간대(아침/점심/저녁) 내 팝업은 최대 1회
- 시간대: 아침(07~12시) / 점심(12~18시) / 저녁(18~24시) / 새벽(비활성)
- 쿨다운 키: `날짜-시간대` 형식으로 localStorage 저장
- 근거: 팝업 과다 노출 → 사용자 피로, 알림 무시 습관 (requirements.md §1.4)

### RULE-08: API 오류 시 안전 fallback
- Gemini API 호출 실패 시 should_order = false, confidence = 0
- reason 필드에 오류 내용 반드시 포함
- 근거: 오류 상황에서 잘못된 주문 발생 방지

### RULE-09: 출력 스키마 일관성
- 모든 응답은 { should_order, menu, confidence, reason } 4개 필드 포함
- should_order = false 시에도 menu 필드 존재 (빈 문자열 허용)
- reason은 항상 비어있지 않은 문자열

---

## 판단 우선순위 (충돌 시 적용 순서)

1. API 오류 → 즉시 fallback (RULE-08)
2. 팝업 쿨다운 적용 중 → 팝업 표시 안 함 (RULE-07)
3. workMode ≠ Office → 주문 거부 (RULE-02)
4. movementStatus = Passed Office → 주문 거부 (RULE-01)
5. movementStatus ≠ Near Office → 주문 거부 (RULE-01)
6. todayOrdered = true → 재주문 확인 팝업 (RULE-03)
7. confidence < 0.6 → 알림 억제 (RULE-04)
8. 사용자 기호 적용 → 메뉴 선택 (RULE-05)
9. 기호 미설정 시 날씨 기반 메뉴 선택 (RULE-06)
