# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

นักอ่านทั่วไปทุกคน (ยังไม่แบ่ง role ละเอียด) — ใช้งานได้ทันทีทั้งมังงะภาพและนิยายข้อความภาษาไทย
บทบาทชุดแรกมีแค่ **user** กับ **uploader** (ลงเรื่องเองได้); role อื่นค่อยแบ่งทีหลัง — เป็น open decision
ที่งานในอนาคตต้องไม่ถือว่าล็อกแล้ว

## Product Purpose

DooToon คือแพลตฟอร์มอ่านมังงะและนิยายภาษาไทยครบจบในที่เดียว
ความสำเร็จขั้นแรกคือเดโมโฟลว์ครบวงจรตาม `docs/00-goals-as-is-to-be.md`:
เกสต์อ่านตอนฟรี → สมัคร → เติมเหรียญ → ซื้อตอนล็อก → รายได้ครีเอเตอร์ขึ้น → แอดมิน takedown →
คืนเงินผู้ซื้อ พร้อมหลักฐาน trace/metrics ให้กรรมการตรวจได้

## Positioning

ยังไม่มีจุดต่างที่ยืนยัน (open decision — ห้ามงานในอนาคตอ้าง positioning ใดว่าตกลงแล้ว)
สิ่งเดียวที่เจ้าของผลิตภัณฑ์ยืนยันคือ **ต้องโหลดไวที่สุด** (บันทึกเป็น Product Principle แทน)

## Operating Context

- โปรเจกต์จบ Year4: ส่งเดโมให้กรรมการตรวจ ไม่ใช่ production launch
- โฟลว์ประเมิน: อ่าน → สมัคร → เติมเหรียญ (test-mode) → ซื้อ → รายได้ครีเอเตอร์ → takedown + คืนเงิน
- frontend ปัจจุบัน (`web/`, Vite + React + TS) เป็น mock-first ต่อ Go microservices จริงทีหลัง

## Capabilities and Constraints

- ซื้อรายตอนด้วยเหรียญ ปลดล็อกถาวร; รายได้แบ่งให้ทีมผู้สร้างตามสัดส่วน (FR-M3/FR-M4)
- takedown ต้องย้อนรายได้ + คืนเหรียญผู้ซื้อเสมอ (FR-M6)
- เช็กสิทธิ์ผ่าน `entitlement` ก่อนเสิร์ฟคอนเทนต์ทุกครั้ง (FR-R3)
- งบ Azure จำกัด: single-zone, ไม่มี NAT Gateway/Bastion, ทำลาย resource หลังเดโม (NFR-Cost-1)
- เดโมใช้คอนเทนต์ที่สร้างเองเท่านั้น ไม่ตรวจลิขสิทธิ์ล่วงหน้า รับเรื่องร้องเรียนแทน
- Undecided: โมเดล role สุดท้าย, positioning, วิธีชำระเงินจริง (PromptPay/บัตร — ขึ้นกับ gateway)

## Brand Commitments

- ชื่อ DooToon สโลแกน "Read More. Feel More." แมสคอตแมวดำ
- พื้นหลัง navy เข้ม `#080D18` / พื้นผิว `#101827` / เหลือง `#FFD43B` / ตัวอักษร `#F5F7FA` / รอง `#8B96A8`
- ฟอนต์ Kanit (display) + Noto Sans Thai (body)
- อาร์ตต้นฉบับของโปรเจกต์ใน `web/reference/` และปกที่ตัดแล้วใน `web/public/art/`

## Evidence on Hand

- Prototype ใช้งานได้: `web/` (`npm run dev`), mock 10 เรื่อง + 8 ปกจริง
- เอกสารความต้องการ/สถาปัตยกรรม: `docs/00-goals-as-is-to-be.md`, `docs/01-requirements.md`, `docs/02-architecture.md`, `docs/03-testing.md`
- ขาดและห้าม fabricate: โลโก้ไฟล์ทางการ, คอนเทนต์ลิขสิทธิ์บุคคลที่สาม, ตัวเลข pricing/benchmark

## Product Principles

1. โหลดไวที่สุด — ทุกการตัดสินใจด้าน frontend ชั่งด้วยความเร็ว (ยืนยันโดยเจ้าของผลิตภัณฑ์)
2. เงินต้องถูกต้องตรวจสอบได้ — ยอด wallet ไม่ติดลบ ย้อนรอยถึง ledger ได้เสมอ
3. ไม่มีทางลัดผ่านด่านสิทธิ์ — อ่านคอนเทนต์ได้ก็ต่อเมื่อ entitlement อนุญาต
4. อยู่ภายใต้งบเดโม — เพิ่ม cloud resource ใดต้องผ่าน NFR-Cost-1 ก่อน
