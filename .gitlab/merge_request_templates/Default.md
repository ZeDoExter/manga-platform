## สรุป (What & Why)

<!-- เปลี่ยนอะไร เพราะอะไร 2-3 บรรทัด -->

## Requirement IDs

<!-- เช่น FR-M3, FR-R3, NFR-Money-1 — ดูใน docs/01-requirements.md -->

- [ ]

## ทดสอบแล้ว (How verified)

<!-- สั่งรันอะไร ผลเป็นยังไง เช่น go test ./..., curl endpoint, แคปหน้าจอ -->

- [ ] `go test ./...` ผ่าน
- [ ] `go vet ./...` ผ่าน
- [ ]  manual test:

## Checklist

- [ ] ไม่อัปโหลด secret / `.env` ขึ้น repo
- [ ] อัปเดต docs ถ้าเปลี่ยน behavior (ดู `docs/` + skill `manga-project-context`)
- [ ] งานเงินยังอยู่ใน transaction เดียว + idempotent (ถ้าแตะ `commerce`)
- [ ] งานอ่านยังผ่าน entitlement check ก่อนเสมอ (ถ้าแตะ `reader`)

## หลักฐาน (ถ้ามี)

<!-- วาง log / screenshot / ตัวเลข load test -->
