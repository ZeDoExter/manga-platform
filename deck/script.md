# บทพูด DOOTOON — Final Showcase (25 หน้า + Appendix)

โครงตาม skill presentation-deck: Hook > Context > Journey > Solution > Evidence > Ask
เวลารวม ~30–35 นาที (เล่า 20 + demo 10) ดูเลขหน้าขวาล่างตามได้

---

## Act 1 · Hook & Problem

### 01 · ปัญหา: คนทำไม่ได้เงิน (s1: DooToon)

สวัสดีครับ ขอแนะนำโปรเจกต์ DOOTOON (ดูตูน) ครับ

ทุกวันนี้มังงะและนิยายแปลไทยโดนดูดไปลงเว็บเถื่อนเต็มไปหมด คนแปลกับคนวาดไม่ได้เงินสักบาท ส่วนเว็บที่มีอยู่ก็มีปัญหา — ถ้าตอนไหนโดนแจ้งลบลิขสิทธิ์ เงินที่เก็บจากคนซื้อมาแล้วมักจะค้าง คืนเงินไม่ได้ คนซื้อโวย คนทำเสียขวัญ

DOOTOON คือเว็บอ่านมังงะและนิยายภาษาไทยที่ออกแบบมาเพื่อแก้ปัญหานี้ — หนึ่ง ทำให้คนจ่ายเงินถึงคนทำจริง สอง ถ้าตอนไหนโดนลบ ระบบจะย้อนเงินคืนคนซื้อทุกคนอัตโนมัติ รันอยู่จริงบน Multi-Cloud ด้วย Azure AKS, Cloudflare R2 และ Stripe ครับ

### 02 · ผู้ใช้ 3 กลุ่ม ใช้เว็บเดียวกัน (s1b: Users)

ระบบนี้มีผู้ใช้งาน 3 กลุ่มหลักบนเว็บเดียวกันครับ:

1. **Readers (คนอ่าน)**: เข้ามาเปิดอ่าน 3 ตอนแรกและตอนล่าสุดได้ฟรีทันทีโดยไม่ต้องสมัครสมาชิก หากต้องการอ่านตอนอื่นสามารถเติมเหรียญผ่าน PromptPay หรือบัตรเครดิตด้วย Stripe
2. **Creators (ทีมนักเขียน/นักแปล)**: ตั้งราคาขายและกำหนดสัดส่วนรายได้ของทีมไว้ล่วงหน้า (เช่น คนแปล 70%, คนคลีนภาพ 30%)
3. **Platform / Admin**: หน้าจัดการหลังบ้าน หากตอนไหนมีปัญหาลิขสิทธิ์ แอดมินกด Takedown ได้ทันที ระบบจะสั่งซ่อนตอน บล็อกไฟล์รูป และคืนเหรียญให้คนซื้อทุกคนอัตโนมัติ

### 03 · End-to-end flow 7 ขั้นตอน (s2: Flow)

โฟลวทั้งระบบสรุป 7 ขั้นตอนการทำงานจริงจากซ้ายไปขวาครับ:

เริ่มจาก Guest เข้ามาอ่านฟรี > เมื่อถูกใจก็สมัครสมาชิกผ่านระบบ Better-Auth > เติมเหรียญ 100 coin ผ่าน Stripe ที่มีระบบกันเติมเบิ้ล > กดซื้อตอน 40 coin เงินจะถูกหักและแบ่งให้ครีเอเตอร์ทันที > เข้าอ่านได้ปกติ > และหากเกิดเคส Takedown ระบบจะซ่อนตอน และย้อนคืนเหรียญให้คนซื้อทุกคน 100% เต็มทันทีครับ

### 04 · Constraints โจทย์ 3 ข้อที่กำหนดระบบ (s3: Constraints)

ก่อนจะสร้างสถาปัตยกรรม เราตั้งโจทย์จำกัดไว้ 3 ข้อที่กำหนดหน้าตาระบบทั้งหมด:

1. **เงินต้องถูกต้อง (ACID)**: การหักเหรียญ, ให้สิทธิ์อ่าน, และแบ่งรายได้ครีเอเตอร์ ต้องสำเร็จพร้อมกันใน Transaction เดียว หากล้มเหลวต้อง Rollback ทั้งหมด ห้ามมีสถานะเงินหาย
2. **รูปคือ 95% ของทราฟฟิก**: ไฟล์ภาพห้ามวิ่งผ่านเซิร์ฟเวอร์บน Azure เพื่อเลี่ยงค่า Bandwidth Egress มหาศาล จึงแยกไปเสิร์ฟผ่าน Cloudflare R2 ที่ Egress ฟรี ($0)
3. **งบนักศึกษา (~$20/เดือน)**: คุมค่าใช้จ่ายให้อยู่ในเครดิต Azure (~$17-23/เดือน) โดยตัดทรัพยากรราคาแพงอย่าง NAT Gateway, Bastion, และ Redis ออกทั้งหมด

> 💡 **Speaker Notes:**
> - **ACID Transaction**: มาตรฐานความถูกต้องของเงิน หักเหรียญ + ให้สิทธิ์ + แบ่ง 70/30 ต้องสำเร็จพร้อมกันในคำสั่งเดียว หากล้มเหลว Rollback ทั้งหมด เงินไม่สูญหาย
> - **Egress Fee**: ค่าถ่ายโอนข้อมูลส่งออกจากคลาวด์ลงสู่อินเทอร์เน็ต Azure คิดแพงมาก แต่ Cloudflare R2 คิด $0/GB

---

## Act 2 · Cloud Architecture (Big Picture)

### 05 · Full Cloud Architecture ภาพรวมทั้งระบบ (s4: Full Arch)

ภาพรวมสถาปัตยกรรม Multi-Cloud ในหน้าเดียวครับ:

ฝั่งซ้ายคือผู้ใช้และ Stripe วิ่งผ่านด่านหน้า Cloudflare Edge ที่คุม DNS, DDoS, WAF และแคชรูปภาพ จากนั้นทราฟฟิกจะวิ่งเข้าระบบหลังบ้านบน Azure VNet ผ่าน Envoy Gateway บน AKS ซึ่งข้างในมี Next.js และ Go Microservices 9 ตัว ทำงานร่วมกับ PostgreSQL 16 Flexible Server แบบ Private Subnet ไม่มี Public IP และฝั่งขวาคือ Cloudflare R2 สำหรับเก็บภาพมังงะโดยเฉพาะ

> 💡 **Speaker Notes:**
> - **DNS**: สมุดโทรศัพท์อินเทอร์เน็ต แปลง `dootoon.store` เป็น IP ชี้มาที่ Cloudflare ทันที
> - **WAF**: กำแพงไฟตรวจจับและบล็อกสคริปต์อันตราย (SQLi, XSS, บอทสแกน) ก่อนถึงคลัสเตอร์
> - **DDoS Protection**: ป้องกันการยิงถล่มระดับ Terabit/s ที่ Edge ไม่ให้ทราฟฟิกขยะหลุดเข้า Azure
> - **แคชรูปภาพ (CDN Caching)**: *ไม่ใช่การเลือก 10 อันดับมังงะมาแคช* แต่คือ **Edge HTTP Cache** เมื่อมีคนเปิดดูตอนใดตอนหนึ่ง Worker ส่ง Header `cache-control: public, max-age=3600` รูปนั้นจะถูกจำไว้ที่โหนด Cloudflare ในไทย 1 ชม. คนถัดไปเปิดดูจะโหลดได้ทันที 0ms ไม่ต้องไปดึงไฟล์ใหม่จาก R2 ซ้ำ

### 06 · Traffic routing 4 เส้นทาง (s6: Traffic routing)

ทราฟฟิกวิ่งเข้า Cloud แยกออกเป็น 4 เส้นทางตามหน้าที่ชัดเจนครับ:

1. **`dootoon.store` → `web:3000`**: หน้าเว็บหลัก Next.js SSR + BFF สำหรับคนอ่านและครีเอเตอร์
2. **`api.dootoon.store` → `gateway:8080`**: สำหรับยิง Public API ตรง และเป็นเส้นทางที่ใช้ทดสอบโหลด k6 ยิงเข้า reader pod
3. **`obs.dootoon.store` → `OpenObserve:5080`**: ให้ DevOps เปิดดูหน้า Dashboard สำหรับมอนิเตอร์ Logs, Traces และ Metrics
4. **`img.dootoon.store` → `Cloudflare R2`**: เส้นทางดาวน์โหลดรูปมังงะโดยตรง โดยมี Worker ตรวจสอบลายเซ็น HMAC ไม่ผ่าน Go หรือ AKS เลย

> 💡 **Speaker Notes:**
> - **Full Strict TLS**: เข้ารหัส HTTPS 443 หัวจรดท้าย (Browser 🔒 Cloudflare 🔒 AKS) ไร้ช่องโหว่ Plaintext
> - **HMAC Token (`?exp=...&token=...`)**: ลายเซ็นดิจิทัลที่เซ็นด้วย Secret Key หลังบ้าน ลิงก์มีอายุ 15 นาที ป้องกันการก๊อปลิงก์รูปไปเผยแพร่หรือดูดภาพนอกเว็บ ถ้าไม่มี Secret จะปลอม token ไม่ได้

---

## Act 3 · Deep Dive (Subsystem Breakdown)

### 07 · Inside web:3000 (s7: BFF Pattern)

ฝั่งเว็บใช้สถาปัตยกรรม Backend-for-Frontend (BFF) ครับ:

เบราว์เซอร์จะไม่คุยกับ Go ตรงๆ แต่จะยิงมาที่ `/api/*` ของ Next.js บนโดเมนเดียวกัน (Same-Origin) ทำให้หน้าบ้านไม่เห็น URL หรือ Secrets หลังบ้าน จากนั้น Next.js ฝั่ง Server จะประสานงานเรียก Go Microservices ในคลัสเตอร์ พร้อมแนบ Header ยืนยันตัวตน `X-User-ID` และ `X-User-Role` ไปด้วยครับ

> 💡 **Speaker Notes:**
> - **BFF (Backend-for-Frontend)**: โค้ด Next.js ฝั่ง Server (`/api/*`) ทำตัวเป็นฉากกั้น หน้าบ้านเห็นแค่โดเมนเดียวกัน ไม่เห็น IP ภายในของ Go และไม่ต้องส่ง credentials ออกนอกเครื่อง
> - **Same-Origin**: หน้าบ้านคุยเฉพาะโดเมนตัวเอง ไม่โดนปัญหา CORS และเบราว์เซอร์ไม่เปิดเผยปลายทางหลังบ้าน

### 08 · Inside AKS: Go 9 Microservices (s8: Microservices)

บน Kubernetes เราแยกการทำงานออกเป็น 9 Go Microservices ชัดเจน:

- `identity :8081` ดูแลบัญชีและสิทธิ์ผู้ใช้
- `catalog :8082` เก็บข้อมูลเรื่อง, ตอน, ราคา, และสัดส่วนส่วนแบ่ง
- `commerce :8083` หัวใจระบบเงิน สมุดบัญชี และการแบ่งรายได้
- `reader :8084` ตรวจสอบสิทธิ์ก่อนอ่านและออก Signed URL
- `moderation :8085` จัดการ Takedown และ Audit log
- `community :8086` ระบบคอมเมนต์
- `library :8087` ประวัติการอ่านและ Bookmark
- `media :8088` อัปโหลดและแปลงภาพ WebP ขึ้น R2
- `gateway :8080` ประตูรับแขกสำหรับ Public API

ทุกตัวเป็น Stateless REST พร้อมระบบ Health check และ OpenTelemetry Trace ทั้งหมดครับ

> 💡 **Speaker Notes:**
> - **Stateless REST**: ไม่มี session ค้างในหน่วยความจำของ Pod หาก pod ตัวไหนดับ สามารถแทนที่ได้ทันทีโดยระบบไม่พัง
> - **OTel Trace**: แนบ trace ID ตั้งแต่ gateway ผ่านทุก service เพื่อตามแกะรอย latency และ error ได้ตลอดสาย

### 09 · Money In: Top-Up Flow (s9: Stripe Top-Up)

การเติมเหรียญแบ่งเป็น 2 ขา:

ขาเติมเงิน ผู้ใช้เลือกแพ็กเกจ BFF จะสร้าง Stripe Checkout Session เมื่อจ่ายสำเร็จ Stripe Webhook จะยิงกลับมาที่ระบบเพื่อตรวจสอบลายเซ็น จากนั้นสั่งให้ `commerce:8083` บันทึกเหรียญลง Ledger พร้อม Idempotency Key ป้องกันการเติมซ้ำ และมีหน้า `/verify` เป็นทางสำรองหาก Webhook ตกหล่น

ส่วนขาเปิดอ่าน ReaderPage จะยิงตรวจสอบผ่าน Catalog และ Gateway ไปยัง Reader เพื่อเช็กสิทธิ์ก่อนปล่อยเนื้อหาครับ

> 💡 **Speaker Notes:**
> - **Idempotency Key**: รหัสเฉพาะต่อการจ่ายเงิน 1 ครั้ง หาก Stripe ส่ง webhook ซ้ำ 2 รอบ ระบบจะบันทึกเงินรอบแรก และข้ามรอบสอง ไม่มีการเติมเงินเบิ้ลเด็ดขาด
> - **Webhook Signature**: กุญแจลายเซ็นดิจิทัลที่ Stripe แนบมา เพื่อพิสูจน์ว่าเป็นคำสั่งมาจาก Stripe จริง ไม่ใช่แฮกเกอร์ปลอมยิงมา

### 10 · Purchase: 5 ขั้นใน 1 Transaction (s10: Purchase)

หัวใจของความถูกต้องทางการเงินคือการซื้อตอน 1 ครั้ง จะต้องเกิด 5 ขั้นตอนใน 1 Database Transaction เสมอ:

1. ล็อกแถวผู้ใช้เพื่อป้องกัน Race Condition
2. ตรวจสอบ Idempotency Key ป้องกันการกดซื้อซ้ำ
3. หักเหรียญโบนัสก่อนเหรียญจริง
4. บันทึกสิทธิ์การเข้าถึง (Entitlement)
5. แบ่งรายได้ 30% ให้แพลตฟอร์ม และ 70% ให้ครีเอเตอร์ตามสัดส่วนที่ตั้งไว้

หากขั้นตอนใดขั้นตอนหนึ่งพัง ระบบจะ Rollback ทั้งหมด เงินจะไม่สูญหายครับ

> 💡 **Speaker Notes:**
> - **Row Lock (`SELECT ... FOR UPDATE`)**: สั่งล็อกข้อมูลผู้ใช้ในตารางชั่วคราว ป้องกันการกดยิงซื้อตอนพร้อมกันหลายแท็บจนยอดเหรียญติดลบ (Race Condition)
> - **Bonus First**: หักเหรียญฟรี/เหรียญโบนัสก่อนเหรียญจริง เพื่อให้ผู้ใช้ได้รับสิทธิ์ แต่เหรียญโบนัสจะไม่นำไปปันส่วนแบ่งให้ครีเอเตอร์

### 11 · Gates + Takedown (s11: Gates & Takedown)

ระบบความปลอดภัยมี 2 ด้าน:

ฝั่ง **Read Gates**: ก่อนเปิดอ่าน `reader` จะไล่ตรวจสิทธิ์ — ตอนนี้ถูกลบไหม, เป็นตอนฟรีหรือไม่, เป็นแอดมินหรือทีมงานไหม, หรือเคยซื้อหรือยัง หากผ่านจะออก HMAC Token ที่มีอายุ 15 นาทีให้ไปโหลดรูป

ฝั่ง **Takedown**: เมื่อแอดมินสั่งลบ ระบบจะซ่อนตอน, สั่งลบรูปบน R2, วนคืนเงินให้คนซื้อทุกคน 100% และบันทึก Audit log ทันทีครับ

> 💡 **Speaker Notes:**
> - **Takedown Cascade**: การลบตอนที่มีลิขสิทธิ์จะไม่ใช่แค่ซ่อนหน้าเว็บ แต่ลบรูปจริงบน Storage และวนคืนเงินผ่าน Ledger Entry แบบ `refund` อัตโนมัติ ป้องกันคดีความเงินตกค้าง
> - **Expiring Signed URL**: ลิงก์รูปมีอายุ 15 นาที หมดอายุแล้วต้องขอ token ใหม่จาก reader ทำให้เอาลิงก์ไปแปะดูดนอกเว็บไม่ได้

### 12 · Data + Auth (s12: PostgreSQL 6 Schemas & Auth)

ระบบข้อมูลและยืนยันตัวตน:

ฐานข้อมูลใช้ PostgreSQL 16 ตัวเดียวแต่แยกเป็น 6 Schemas ตามขอบเขต Service เพื่อให้การทำธุรกรรมทางการเงินอยู่ใน ACID เดียวกันได้ และไม่มีคอลัมน์เก็บยอดเงิน Balance ดิบ แต่คำนวณจากผลรวมของ Ledger Entries แบบ Append-only เสมอ

ฝั่ง Auth ใช้ Better-Auth รองรับ Email และ Google Login โดยออก Session Cookie 7 วัน และแปลงเป็น Header ส่งต่อให้ Go ภายในคลัสเตอร์ครับ

> 💡 **Speaker Notes:**
> - **Append-only Ledger**: ตารางเงินจะไม่มีคำสั่ง `UPDATE` หรือ `DELETE` มีแต่ `INSERT` แถวธุรกรรมใหม่เรื่อยๆ ยอดเงินจริงคือ `SUM(amount)` ป้องกันเงินหายหรือโดนแอบแก้ตัวเลข
> - **Header Identity**: หน้าบ้านส่ง cookie ยืนยันตัวตนกับ Next.js แต่พอวิ่งในคลัสเตอร์ Next.js จะแกะออกแล้วส่งเป็น header `X-User-ID` กับ `X-User-Role` ไปให้ Go ทำให้ Go ทำงานเบาและไม่ต้องเช็ค session ซ้ำ

---

## Act 4 · Journey, CI/CD & Verification

### 13 · How we built it in 4 weeks (s13: Journey)

เราสร้างระบบนี้เสร็จใน 4 สัปดาห์:
- Week 1: ออกแบบ Spec, Schema และ Architecture
- Week 2: พัฒนา Core Services, Ledger และ Gates พร้อม Unit Tests
- Week 3: วางระบบ CI/CD Pipeline และ Zero-downtime Deployment
- Week 4: ติดตั้งบน Azure Cloud จริง เชื่อมต่อ Cloudflare R2 และทดสอบ Load Test

### 14 · Architectural Trade-offs (s14: Trade-offs)

ข้อแลกเปลี่ยนในการออกแบบ:
- **ที่เลือกใช้**: R2 แม้ต้องดูแล 2 Cloud แต่ประหยัด Egress, Envoy Gateway ควบคุม Routing และ HPA ได้ดีแทน Nginx ที่ EOL, และ Postgres Flexible Server ปลอดภัยใน Private Subnet
- **ที่ตั้งใจตัดทิ้ง**: Redis เพราะ Postgres ทำงานได้เร็วระดับ 0.1ms ยังไม่มีคอขวด, Message Queue เพราะยังไม่มี Async Consumer จำเป็น, และ gRPC เพราะ REST เพียงพอและดีบักง่ายกว่า

> 💡 **Speaker Notes:**
> - **ทำไมตัด Redis?**: วัดผลจริงแล้ว query ของ Postgres ใช้เวลาแค่ ~0.1ms ในช่วงเริ่มต้น การใส่ Redis จะเพิ่มความซับซ้อนและเสี่ยงเรื่อง Cache Invalidation โดยยังไม่จำเป็น
> - **ทำไมใช้ Envoy แทน Nginx Ingress?**: Kubernetes community แนะนำ Gateway API และ ingress-nginx เดิมประกาศสถานะ EOL (End of Life) Envoy จึงเป็นมาตรฐานใหม่ที่ทันสมัยกว่า

### 15 · CI/CD Pipeline (s15: Pipeline)

สายพาน Azure DevOps ทำงาน 4 สเตจ ใช้เวลาราว 17 นาที:
1. `Lint`: ตรวจสอบโค้ดด้วย `go vet`
2. `Test`: ทดสอบบน Postgres จริง พร้อมประตูกั้น Coverage ≥80%
3. `Build`: สร้าง Docker Images 10 ตัวส่งเข้า Azure Container Registry (ACR)
4. `Deploy`: ทำ RollingUpdate ปัก SHA บน AKS แบบไร้ Downtime (เฉพาะ Master Branch)

> 💡 **Speaker Notes:**
> - **SHA Pinning**: การ deploy จะระบุ image tag ด้วย Git Commit SHA เสมอ ไม่ใช้ tag `:latest` เพื่อให้ตรวจสอบย้อนกลับและ rollback ได้แน่นอน 100%
> - **RollingUpdate**: Kubernetes จะทยอยเปิด pod เวอร์ชันใหม่ให้พร้อมทำงานก่อน แล้วค่อยดับ pod เก่า ทำให้เว็บไม่เกิด Downtime เลยขณะ deploy

### 16 · Inside Test (s16: Quality Gate)

ซูมลึกในสเตจ Test:
ระบบจะรัน Docker Service `postgres:16-alpine` จริงใน Pipeline เพื่อรันทั้ง Unit Test และ Integration Test ที่จำลองการยิงคอนเคอร์เรนต์ 50 Goroutines และกำหนดเกณฑ์ว่าถ้าโค้ดฝั่ง `commerce` มี Test Coverage ต่ำกว่า 80% Pipeline จะหยุดทันที ป้องกันบั๊กการเงินหลุดขึ้น Production

> 💡 **Speaker Notes:**
> - **Coverage Gate ≥80%**: ถ้าเทสครอบคลุมโค้ดระบบเงินไม่ถึง 80% บิลด์จะ fail ทันที ห้ามขึ้น production
> - **Concurrent Tests**: ทดสอบยิงซื้อตอนพร้อมกัน 50 goroutines เพื่อพิสูจน์ว่า Row Lock ทำงานจริง ไม่เกิด Race condition ยอดเหรียญผิด

### 17 · K8s Load Test (s17: k6 Load Test)

ผลการทดสอบโหลดจริงด้วย k6:
เราจำลองผู้ใช้ 50 VUs ยิงเข้า API Gateway ต่อเนื่อง 5 นาที รวมกว่า 10,599 requests:
- Latency p95 อยู่ที่ 251ms (ผ่านเกณฑ์ที่ตั้งไว้ <300ms)
- Error rate เป็น 0.00%
- Kubernetes HPA ทำงานถูกต้อง โดยสั่งสเกล Reader Pod จาก 1 เป็น 2 Pods อัตโนมัติเมื่อ CPU เกิน 70%

> 💡 **Speaker Notes:**
> - **HPA (Horizontal Pod Autoscaler)**: ตัวขยาย Pod บน Kubernetes อัตโนมัติเมื่อ CPU เกิน 70% สเกล reader pod จาก 1 เป็น 2 ตัวรับโหลดหนักได้ทันที
> - **p95 Latency 251ms**: 95% ของผู้ใช้งานทั้งหมดได้รับการตอบสนองเร็วกว่า 251ms ซึ่งเร็วกว่าเกณฑ์มาตรฐานสากล (<300ms)

### 18 · Numbers: ต้นทุนและตัวเลขจริง (s18: Numbers)

ตัวเลขค่าใช้จ่ายจริงของระบบ:
- ค่า Cloud รวม Azure อยู่ที่ ~$17–23 ต่อเดือน (อยู่ในงบ $30)
- Egress บน Cloudflare R2 เป็น $0/GB
- การตัด NAT Gateway และ Bastion ช่วยประหยัดไปกว่า $60 ต่อเดือน
- และหากสมมติทราฟฟิกภาพ 45TB/เดือน การใช้ Cloudflare R2 จ่ายเพียง ~$11 เทียบกับ Azure Blob ที่ต้องจ่ายถึง ~$5,414 ประหยัดไปกว่า 500 เท่า

> 💡 **Speaker Notes:**
> - **NAT Gateway / Bastion Host**: เซอร์วิสของ Azure ที่คิดเงินรายชั่วโมงแม้ไม่มีทราฟฟิก (~$32 ต่อตัว/เดือน) เราตัดออกแล้วใช้การต่อตรงผ่าน NSG และ kubectl port-forward แทน ทำให้ประหยัดงบได้ทันที $60+/เดือน

---

## Act 5 · Demo & Next Steps

### 19 · Demo runbook 10 minutes (s19: Demo Runbook)

แผนการสาธิตระบบ 10 นาที:
- นาที 0-2: เปิดหน้าเว็บ โชว์การอ่านมังงะฟรี และการบันทึก Reading Progress
- นาที 2-5: สาธิตระบบเงิน เติมเหรียญด้วย Stripe, ซื้อตอน และทดสอบ Takedown เพื่อโชว์การคืนเงินอัตโนมัติ
- นาที 5-8: สลับดูหน้าจอแอดมิน, Dashboard บน OpenObserve ดู Traces และ Pipeline
- นาที 8-10: โชว์ความทนทานของ Kubernetes และสั่งปิดระบบด้วย `demo-night` เพื่อรักษาเครดิต

### 20 · What is next after demo (s20: Roadmap)

ทิศทางการพัฒนาต่อยอด:
- **Money (P0)**: รองรับ PromptPay เต็มรูปแบบ, ระบบกระทบยอดรายวัน (Reconciliation) และระบบถอนเงินครีเอเตอร์
- **Discovery (P0)**: ค้นหาชื่อเรื่องภาษาไทย, แจ้งเตือนตอนใหม่ผ่าน LINE, และระบบจัดการคอมเมนต์เต็มรูปแบบ
- **Retention (P1)**: ระบบอ่านล่วงหน้า (Early Access), การให้ Tips ครีเอเตอร์ และระบบ Subscription รายเดือน

### 21 · Questions Welcome (s21: Cover)

จบการนำเสนอ DOOTOON ครับ ยินดีตอบคำถามทั้งในส่วนสถาปัตยกรรม โค้ด และตัวเลขต่างๆ ครับ

### 22 · What we cover (s22: Appendix Map)

หน้านี้คือสารบัญและแผนผังทั้งหมดของเด็คนี้ครับ สามารถคลิกย้อนกลับไปดูสไลด์ต่างๆ หรือเปิดโค้ดจริงในภาคผนวก A1-A3 ได้ทันทีครับ

---

## Appendix (โค้ดจริงประกอบการตอบคำถาม)

### A1 · โค้ด Stripe Checkout & Webhook (s23)
แสดงโค้ดส่วนการสร้าง Session และการตรวจสอบ Webhook Signature พร้อม Idempotency Key กันเงินเข้าซ้ำ

### A2 · โค้ด Purchase Transaction & Read Gates (s24)
แสดงโค้ด 5 ขั้นตอนในการหักเงิน ให้สิทธิ์ แบ่งรายได้ใน Transaction เดียว และด่านตรวจสิทธิ์อ่านก่อนออก Signed URL

### A3 · โค้ด Takedown & Cloudflare Worker (s25)
แสดงโค้ดฟังก์ชัน Takedown ที่สั่งซ่อนตอน ลบรูป ย้อนเงินคืนทุกคน และโค้ด Cloudflare Worker สั้นๆ ที่คอยดักตรวจ HMAC Token หน้า R2 ครับ
