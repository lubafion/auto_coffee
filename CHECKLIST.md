# CHECKLIST — CoffeePath AI Agent 자가 검증

## 자동 판정 가능 항목

각 항목은 test-input/ 케이스로 검증 가능합니다.

---

### ① 출력 스키마 완전성
- [ ] 모든 응답에 `should_order` 필드 존재 (boolean)
- [ ] 모든 응답에 `menu` 필드 존재 (string, 빈 문자열 허용)
- [ ] 모든 응답에 `confidence` 필드 존재 (0.0 이상 1.0 이하 float)
- [ ] 모든 응답에 `reason` 필드 존재 (길이 >= 1 문자열)
- [ ] 응답 필드 수 = 4개

---

### ② 주문 조건 판단 (should_order)

| 케이스 | 입력 조건 | 기대값 | 판정 |
|--------|-----------|--------|------|
| case-1 | Near Office + Office + 미주문 + Sunny | `should_order = true` | [ ] |
| case-2 | Near Office + Office + 미주문 + Cold | `should_order = true` | [ ] |
| case-3 | Near Office + Office + `todayOrdered=true` | `should_order = false` | [ ] |
| case-4 | Near Office + Remote | `should_order = false` | [ ] |
| case-5 | Passed Office + Office + 미주문 | `should_order = false` | [ ] |
| case-6 | Moving + Office + 미주문 | `should_order = false` | [ ] |
| case-7 | OOO + Near Office | `should_order = false` | [ ] |

---

### ③ 메뉴 선택 정확성

- [ ] case-1 (Sunny): `menu`에 "Iced" 포함
- [ ] case-2 (Cold): `menu`에 "Hot" 포함
- [ ] should_order=true 시 `menu` 길이 >= 5 문자 (구체적 음료명)
- [ ] should_order=false 시 `menu` = "" 또는 "N/A"

---

### ④ 신뢰도 (confidence)

- [ ] should_order=true 케이스: `confidence >= 0.6`
- [ ] should_order=false 케이스: `confidence` 값 존재 (0.0~1.0)
- [ ] API 오류 케이스: `confidence = 0`

---

### ⑤ 실패 케이스 처리

- [ ] API 오류 시: `should_order = false`
- [ ] API 오류 시: `confidence = 0`
- [ ] API 오류 시: `reason` 길이 >= 1 (오류 내용 포함)
- [ ] confidence < 0.6 시: Notification Modal 미표시

---

### ⑥ 5회 일관성

동일 입력(case-1)으로 5회 실행 시:
- [ ] 5회 모두 `should_order = true`
- [ ] 5회 모두 `menu`에 "Iced" 포함
- [ ] 5회 모두 `confidence >= 0.6`
- [ ] 5회 모두 `reason` 비어있지 않음

---

### ⑦ 응답 시간

- [ ] Agent 판단 완료까지 5초 이내 (NFR-01)

---

## 모호 표현 금지 확인

다음 표현이 수용 기준에 없는지 확인:
- [ ] "자연스럽게" → 없음 ✅
- [ ] "잘 처리되어야" → 없음 ✅
- [ ] "적절하게" → 없음 ✅
- [ ] 모든 수용 기준은 `=`, `>=`, `<`, `포함`, `필드 N개` 형태 ✅
