# Contributing — Manga Platform

## เริ่ม dev (ครั้งแรกครั้งเดียว)

1. ติดตั้ง: Docker Desktop, minikube, Go 1.25+, Node 20+
2. เปิด Docker Desktop + WSL integration (Windows)
3. `cp web/.env.example web/.env.local` แล้วใส่ keys ที่ต้องใช้
4. `minikube start` แล้ว `tilt up` (หรือดู `docs/05-ops-demo.md` สำหรับโหมด K8s)

## ส่งงาน (ทุกครั้ง)

1. สร้าง branch จาก `master`: `feature/<ชื่อสั้น>` / `fix/<ชื่อสั้น>`
2. เปิด Merge Request เข้า `master` — กรอกเทมเพลตให้ครบ
3. รอ CI เขียว (lint → test + coverage gate 80% → build) แดงห้าม merge
4. Merge ผ่าน UI เท่านั้น ห้าม push ตรง `master`

## กฎเหล็ก (จาก skill `manga-project-context`)

- งานเงิน (`commerce`) ต้องอยู่ใน transaction เดียว + retry ได้เสมอ
- งานอ่าน (`reader`) ต้องผ่าน entitlement check ก่อนเสมอ ไม่มีข้อยกเว้น
- สิทธิ์ uploader เช็ค**ราย story** ไม่ใช่ global flag
- Takedown ต้องคืนเงิน + ดึงรายได้กลับด้วยเสมอ (ของคู่กัน)
- เพิ่ม resource cloud ใหม่ต้องเช็ค NFR-Cost-1 ก่อน
- ของที่เป็น non-goal ใน docs (เช่น ตรวจลิขสิทธิ์ล่วงหน้า, unlimited subscription) ห้ามทำเงียบๆ ต้องคุยก่อน

## Commit message

`type(scope): สรุปสั้น` — เช่น `feat(commerce): แบ่งรายได้ 70/30 + ลง ledger`, `fix(reader): กัน IDOR ใน saveProgress`
อ้าง Requirement ID ใน MR (`FR-M3`, `NFR-Money-1` ฯลฯ) ดูรายการใน `docs/01-requirements.md`

## Docs

เปลี่ยน behavior = อัปเดต `docs/` ใน MR เดียวกัน อย่าปล่อยให้โค้ดกับ docs ไม่ตรงกัน
