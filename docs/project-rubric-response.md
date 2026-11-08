# เอกสารตอบข้อกำหนดและเกณฑ์การให้คะแนนโครงการ (Project Rubric Defense)
**โครงการ**: Manga & Novel Reading Platform (ระบบแพลตฟอร์มอ่านมังงะและนิยายออนไลน์)  
**กลุ่มวิชา/สถาปัตยกรรม**: Cloud Architecture & Cloud-Native Microservices (Go on Azure AKS + Cloudflare Multi-Cloud)

---

## 1) ข้อเสนอโครงการและแผนงาน (5 คะแนน)

### 1.1 ความชัดเจนของปัญหาและขอบเขต (Problem & Scope)
- **ปัญหา (Pain Points)**:
  1. *Egress Cost Trap*: แพลตฟอร์มคอนเทนต์รูปภาพ (มังงะ) เมื่อมีผู้ใช้เติบโต ค่าใช้จ่าย Data Egress (Bandwidth ขาออกจากคลาวด์) บนคลาวด์ทั่วไป (เช่น Azure Blob / AWS S3) คิดอยู่ที่ ~$0.087/GB ซึ่งจะกลืนกำไรของแพลตฟอร์มทั้งหมดหากมีผู้อ่านหลักแสนครั้งต่อวัน
  2. *การละเมิดลิขสิทธิ์และการเยียวยา*: มังงะแปลเถื่อนหรือคอนเทนต์ที่ถูกแจ้งละเมิด (DMCA) มักมีปัญหาเรื่องเงินค้างอยู่ในระบบ การลบเนื้อหาโดยไม่มีการ Reversal เงินคืนผู้ซื้อและดึงรายได้กลับจากผู้ปล่อยคอนเทนต์ทำให้เกิดคดีความและความเสียหายทางการเงิน
  3. *ความถูกต้องของการเงิน (Financial Correctness)*: แพลตฟอร์มทั่วไปมักบันทึกเหรียญแบบ mutable balance ทำให้เกิด race condition, double-spending, และไม่สามารถตรวจสอบย้อนหลัง (Reconciliation) กับ Payment Gateway ได้
- **กลุ่มผู้ใช้งานเป้าหมาย (Target Users)**:
  1. `Guest`: ผู้อ่านทั่วไป อ่านตอนฟรี ไม่ต้องล็อกอิน มีโฆษณาคั่นระหว่างหน้า
  2. `User`: สมาชิกทั่วไป ซื้อเหรียญ ปลดล็อกตอนอ่าน บันทึกตำแหน่งการอ่านข้ามอุปกรณ์
  3. `Uploader / Creator Team`: ผู้สร้าง/ผู้แปลเนื้อหา กำหนดราคาตอน และได้รับส่วนแบ่งรายได้ตาม % ของทีม (เช่น คนแปล 70%, คนคลีนภาพ 30%)
  4. `Admin`: ผู้ดูแลระบบ ตรวจสอบเนื้อหา ดำเนินการ Takedown ระงับผู้กระทำผิด และตรวจสอบ Audit Log
- **วัตถุประสงค์ (Objectives)**:
  - สร้างระบบ Cloud-Native Go Microservices ที่มีความปลอดภัย ความถูกต้องของระบบเงินระดับ ACID และสถาปัตยกรรม Multi-Cloud ที่กำจัดค่า Egress Cost ของรูปภาพอย่างถาวร
- **ขอบเขตงาน (Scope)**:
  - **In-Scope (สิ่งที่ทำในโครงการ)**:
    - 8 บริการหลัก: `identity`, `catalog`, `reader`, `entitlement`, `commerce`, `library`, `moderation`, `media-worker`
    - ระบบเงินแบบ Append-Only Ledger พร้อม Idempotent Top-up และ ACID Chapter Purchase
    - ระบบ Content Gating: `reader` ต้องผ่าน `entitlement` ทุกครั้ง และเสิร์ฟรูปผ่าน HMAC Expiring Signed Tokens
    - ระบบ Moderation Takedown อัตโนมัติ: ซ่อนเนื้อหา + บล็อกรูป + คืนเงินผู้ซื้อ (Buyer Refund) + ดึงรายได้ผู้สร้างคืน (Creator Clawback)
    - ระบบอ่านต่อเนื่อง: บันทึกและดึง Reading Position อัตโนมัติ
  - **Out-of-Scope (สิ่งที่ไม่ทำเพื่อคุมขอบเขต)**:
    - ไม่ทำ Pre-screening ตรวจสอบลิขสิทธิ์ภาพอัตโนมัติก่อนอัปโหลด (ใช้ระบบ Attestation + Takedown Workflow ตามกฎหมาย DMCA)
    - ไม่ทำ Mobile Native App (เน้น Responsive Web PWA ก่อน)
    - ไม่ทำ Unlimited Read Subscription ในเฟสแรก (ป้องกันความซับซ้อนของการหารายได้เฉลี่ยให้ Creator)

### 1.2 แผนการทำงานและกลยุทธ์เบื้องต้น (Milestones, Security & Cost Control)
- **แผนงานรายสัปดาห์ (Weekly Milestones)**:
  - *สัปดาห์ที่ 1*: ออกแบบสเปก สถาปัตยกรรม ADRs, สคีมาฐานข้อมูล และ Data Contracts (`docs/00` ถึง `docs/04`)
  - *สัปดาห์ที่ 2*: พัฒนา Core Services แบบ Local-First (`ImageStore` abstraction, `commerce` ACID ledger, unit tests coverage > 80%)
  - *สัปดาห์ที่ 3*: Containerization, คอนฟิก Azure DevOps Pipeline (`azure-pipelines.yml`: Lint, Test, Build, Deploy) และทดสอบ Zero-Downtime Rolling Update
  - *สัปดาห์ที่ 4*: ติดตั้ง Infrastructure บน Azure (Terraform) + Cloudflare (domain/TLS/proxy), เชื่อมต่อ OpenTelemetry Dashboard และรัน Load Test (k6 — open work)
- **แนวทางด้านความปลอดภัย (Security Baseline)**:
  - สถาปัตยกรรม Network แยก Public/Private Subnet บน Azure VNet (10.42.0.0/16)
  - ฐานข้อมูล PostgreSQL Flexible Server วางอยู่ใน Delegated Private Subnet ไม่อนุญาต Public IP
  - จัดการ Credentials, HMAC Secrets, Database Connection Strings ผ่าน **Azure Key Vault** ห้าม Hardcode ใน Source Code เด็ดขาด
  - เสิร์ฟรูปภาพด้วย HMAC-SHA256 Expiring Signed Token ป้องกัน Hotlinking และไม่อนุญาต Permanent URL
- **แผนการควบคุมค่าใช้จ่าย (Cost Control Plan)**:
  - เลือกใช้ **Cloudflare R2** ในการจัดเก็บรูปมังงะ (ADR-001, P0 backlog — demo ใช้ PVC ผ่าน `ImageStore` interface ก่อน) ทำให้ **ค่า Data Egress เป็น $0** ที่ launch
  - ในสภาพแวดล้อม Demo ใช้ Azure Single-Zone, ไม่เปิด NAT Gateway/Bastion Host (ประหยัด ~$60/เดือน)
  - กำหนด Resource Request/Limit ของ Kubernetes Pods ให้พอดีกับ VM Size (Standard_B2s / Standard_D2s_v5)
  - ตั้งค่า Azure Budget Alerts แจ้งเตือนเมื่อค่าใช้จ่ายถึง 50%, 75% และ 90% ของงบประมาณ

---

## 2) สถาปัตยกรรมและการออกแบบคลาวด์ (15 คะแนน)

### 2.1 แผนภาพสถาปัตยกรรมและการไหลของข้อมูล (Architecture & Data Flow)

```
                            [ User / Web Browser / Next.js ]
                                         │
                                         ▼ (HTTPS)
                     ┌───────────────────────────────────────┐
                     │            CLOUDFLARE EDGE            │
                     │  - DNS & DDoS Protection              │
                     │  - WAF & Rate Limiting                │
                     │  - Edge Token Auth & CDN Caching      │
                     └──────┬─────────────────────────┬──────┘
                            │ (API / HTML)             │ (Manga Images: /img/*)
                            ▼                          ▼
               ┌─────────────────────────┐   ┌──────────────────────────┐
               │    AZURE CLOUD ORIGIN   │   │      CLOUDFLARE R2       │
               │   (VNet 10.42.0.0/16)   │   │  (S3-Compatible Storage) │
               │                         │   │  * $0 Egress Fees *      │
               │  ┌───────────────────┐  │   └──────────────────────────┘
               │  │ snet-aks (Public) │  │                 ▲
               │  │  - Ingress NGINX  │  │                 │ (Uploads via S3 API)
               │  │  - Go Pods (AKS)  │──┼─────────────────┘
               │  └─────────┬─────────┘  │
               │            │ (Private)  │
               │  ┌─────────▼─────────┐  │
               │  │ snet-db (Private) │  │
               │  │  - Azure Database │  │
               │  │    for PostgreSQL │  │
               │  └───────────────────┘  │
               └─────────────────────────┘
```

#### เครือข่าย (Network Subnet Breakdown - VNet 10.42.0.0/16):
- `snet-aks` (`10.42.0.0/24`): โหนด Kubernetes สำหรับรัน Go Microservices (เปิดรับ Inbound 80/443 เฉพาะ Cloudflare IP Ranges)
- `snet-db` (`10.42.1.0/24`): Delegated Subnet สำหรับ Azure Database for PostgreSQL Flexible Server (เปิดรับ Port 5432 เฉพาะจาก `snet-aks` เท่านั้น)
- `snet-ci`: ตัดออกแล้ว — ใช้ MS-hosted agents ของ Azure DevOps (ไม่ต้องมี CI subnet)

### 2.2 การผสานรวมบริการหลัก (Core Components Integration)
สถาปัตยกรรมแยก 3 องค์ประกอบหลักตามมาตรฐานคลาวด์:
1. **Compute Layer**: **Azure Kubernetes Service (AKS)**
   - รัน Go Microservices ที่เป็น Stateless ทั้งหมด
   - รองรับ Horizontal Pod Autoscaler (HPA) ตาม CPU/Memory และคำขอใช้งาน
2. **Storage Layer**: **Cloudflare R2 Object Storage** (P0 — demo ใช้ PVC ผ่าน `ImageStore` interface, swap ตาม ADR-001 ที่ launch)
3. **Database Layer**: **Azure Database for PostgreSQL Flexible Server**
   - จัดเก็บข้อมูลธุรกรรม (Transaction Data) ข้อมูลบัญชีผู้ใช้ และแคตตาล็อก
   - แยก Schema ตามขอบเขตของ Service (Data Isolation) ป้องกันการข้าม DB ข้าม Service

### 2.3 การออกแบบเพื่อความพร้อมใช้งานและความปลอดภัย (Reliability & Security)
- **High Availability & Scalability**:
  - Stateless Application Pods สามารถ Scale จาก 2 $\rightarrow$ 10 replicas อัตโนมัติด้วย HPA
  - การออกแบบรองรับ Multi-AZ (Zone-Redundant Node Pools และ PostgreSQL Standby ในสภาพแวดล้อม Production ผ่านการปรับตัวแปร Terraform `zone_count = 2`)
- **Security Best Practices**:
  - **Zero Direct Exposure**: ฐานข้อมูลอยู่ใน Private Subnet ไม่มี Public IP
  - **Secret Isolation**: เชื่อมต่อ Azure Key Vault ผ่าน Azure Managed Identity ไม่มีการใส่ Database Password หรือ HMAC Secret ใน ConfigMap/Git
  - **Expiring Links (FR-R4)**: ลิงก์รูปภาพมีอายุจำกัด (10-15 นาที) ป้องกันการนำ URL ไปเผยแพร่ต่อ

---

## 3) ระบบสาธิตการทำงานจริง (15 คะแนน)

### 3.1 การทำงานของระบบตามกรณีใช้งานหลัก (Core Use Case Flow)
ระบบสามารถสาธิตวงจรชีวิตของระบบอ่านและระบบเงินได้อย่างสมบูรณ์แบบ:
1. **Guest Access**: ผู้ใช้ Guest เปิดอ่านตอนฟรีได้ทันที โฆษณาแสดงคั่นระหว่างหน้า
2. **Signup & Top-up**: ผู้ใช้สมัครสมาชิก $\rightarrow$ เติมเหรียญผ่าน Payment Webhook $\rightarrow$ ระบบตรวจสอบ Idempotency ป้องกันการเติมเงินซ้ำ
3. **Coin Purchase (ACID Transaction)**: ผู้ใช้ซื้อตอนแบบเสียเหรียญ:
   - ตรวจสอบยอดเงิน (หัก Bonus Coins ก่อน แล้วจึงหัก Purchased Coins)
   - ตัดเหรียญใน Wallet และบันทึก Ledger Entry
   - ออกสิทธิ์การอ่าน (`entitlement`) ทันที
   - คำนวณและโอนส่วนแบ่งรายได้ให้ทีมผู้สร้างตามสัดส่วนร้อยละ (FR-M4)
   - ปล่อย Event `PurchaseCompleted`
4. **Authorized Reading**: Reader ตรวจสิทธิ์ผ่าน `entitlement` $\rightarrow$ ส่งคืน Signed URL ให้เบราว์เซอร์เรนเดอร์ภาพจาก Cloudflare Edge
5. **Moderation Takedown & Automated Reversal (FR-M6)**:
   - Admin แจ้ง Takedown ตอนที่มีปัญหา
   - ระบบระงับการเข้าถึงตอน และบล็อกรูปใน Storage
   - ระบบ **คืนเหรียญให้ผู้ซื้อทุกคนอัตโนมัติ (Buyer Refund)**
   - ระบบ **ดึงรายได้ที่โอนให้ Creator คืนเข้ากระเป๋ากลาง (Creator Clawback)** ใน Transaction เดียวกัน

### 3.2 การจัดการสถานะตามแนวคิดคลาวด์เนทีฟ (Stateless & Decoupled)
- **Stateless Compute**: Pods ของ Go ไม่มี Local State หรือ Session ผูกติด สามารถ Restart, Re-schedule หรือ Scale out ได้ตลอดเวลาโดยที่ผู้ใช้ไม่หลุดจากระบบ
- **Decoupled Media**: รูปภาพหน้ามังงะไม่เคยวิ่งผ่าน Go Service ตอนอ่าน ผู้อ่านดึงตรงจาก Cloudflare CDN Edge Cache ทำให้ Go Server รับโหลดเพียง Request เมทาดาทาขนาดเล็ก (p95 latency < 300ms)
- **Decoupled Storage & Database**: แยกหน้าที่ชัดเจนระหว่าง Unstructured Binary Data (R2) กับ Structured ACID Ledger Data (PostgreSQL)

### 3.3 การติดตั้งและจัดการสภาพแวดล้อม (Deployment & Setup)
- Infrastructure ทั้งหมดถูกนิยามผ่าน **Terraform (Infrastructure as Code)**
- Application Deployment จัดการผ่าน Kubernetes Manifests / Helm Charts
- คอนฟิกแยกสภาพแวดล้อมตาม Environment Variables (`DEV`, `STAGING`, `PROD`)

---

## 4) การนำเสนอและการให้เหตุผล (10 คะแนน)

### 4.1 การอธิบายบริการคลาวด์หลัก 3 มิติ (What, Role, Why) และ Trade-offs

| บริการที่เลือก | What it is (คืออะไร) | Its Role (บทบาทในระบบ) | Why this service (ทำไมจึงเลือก) | Trade-offs vs บริการทางเลือกอื่น |
|---|---|---|---|---|
| **Cloudflare R2** | S3-Compatible Object Storage บน Cloudflare Edge | จัดเก็บและเสิร์ฟไฟล์ภาพมังงะและปกหนังสือทั้งหมด | **Zero Egress Fees**: ไม่คิดค่า Bandwidth ขาออก ทำให้ควบคุมต้นทุนได้เมื่อทราฟฟิกสูง | **เทียบกับ Azure Blob**: Azure Blob คิดค่า Egress ~$0.087/GB ที่ 100k views/วัน Azure Blob เสียค่าแบนด์วิดท์ ~$4,000/เดือน ขณะที่ R2 เสียเพียง ~$42/เดือน (Trade-off: ต้องบริหารจัดการ 2 Cloud Provider) |
| **Azure Kubernetes Service (AKS)** | Managed Kubernetes Orchestrator | โฮสต์ Stateless Go Microservices และจัดการ Auto-scaling | รองรับ Microservice Architecture เต็มรูปแบบ, ทำ Rolling Update แบบ Zero-Downtime ได้ง่าย | **เทียบกับ Azure Container Apps (ACA)**: ACA ใช้ง่ายกว่าแต่ Custom Ingress/Network ควบคุมระดับ Low-level ได้จำกัดกว่า และ AKS ประหยัดกว่าเมื่อรันหลาย Service แชร์ Node Pool เดียวกัน |
| **Azure Database for PostgreSQL (Flexible Server)** | Fully Managed Relational Database Service | จัดเก็บข้อมูลธุรกรรมบัญชี, Ledger, สิทธิ์การอ่าน และ Catalog | มี Built-in High Availability, Automated Backups, Point-in-time Restore และรองรับ ACID เต็มรูปแบบ | **เทียบกับ Self-hosted DB บน VM**: Flexible Server ลดภาระ Maintenance, Patching, Backup และการทำ Failover แม้จะมีค่าบริการรายเดือนสูงกว่า VM เล็กน้อย |
| **Azure Key Vault** | Cloud Hardware Security Module (HSM) Secret Store | จัดเก็บรหัสผ่าน DB, คีย์ HMAC, และ S3 API Tokens | แยกจัดการความลับออกจากซอร์สโค้ด ป้องกัน Credential Leaks รองรับ RBAC ผ่าน Managed Identity | **เทียบกับ Kubernetes Secrets**: K8s Secrets ปกติเก็บ Base64 ไม่ได้เข้ารหัสระดับฮาร์ดแวร์ Key Vault มี Audit Trail บันทึกทุกครั้งที่มีการอ่านรหัสผ่าน |

---

## 5) การถาม–ตอบ (5 คะแนน) - แนวทางการตอบข้อซักถามเชิงลึก

- **Q1: ทำไมจึงใช้สถาปัตยกรรม Multi-Cloud (Azure + Cloudflare) แทนที่จะใช้ Azure 100%?**
  - *คำตอบ*: แกนหลักคือ **Egress Bandwidth Cost** แพลตฟอร์มมังงะมี Payload 95% เป็นรูปภาพ (ประมาณ 15-20 MB ต่อตอน) หากใช้ Azure Blob แบบ Single-Cloud ค่า Egress จะเติบโตตามจำนวนผู้อ่านแบบ Linear การย้ายเฉพาะ Storage Layer ไปไว้ที่ Cloudflare R2 ทำให้ต้นทุนลดลงกว่า 90% โดยที่ Compute และ Database ยังคงใช้ความเสถียรของ Azure
- **Q2: หาก Cloudflare ล่ม หรือมีปัญหากับ R2 ระบบจะทำงานต่อได้อย่างไร?**
  - *คำตอบ*: โค้ดของระบบสร้างอยู่บน Go `ImageStore` Interface แบบ Cloud-Portable (NFR-Port-1) ตัวแอปพลิเคชันไม่มีการผูกติดกับ SDK ของ R2 สามารถสลับ Adapter ไปใช้ Azure Blob Storage หรือ AWS S3 ได้ทันทีเพียงเปลี่ยนการตั้งค่า Config
- **Q3: ระบบรับประกันได้อย่างไรว่าเงินจะไม่หาย และไม่มีการเติมเงินซ้ำ?**
  - *คำตอบ*: ออกแบบระบบเงินตามมาตรฐานการเงินด้วย **Append-Only Ledger**:
    1. Wallet Balance เป็นเพียง View ที่คำนวณจากการ Sum ตาราง Ledger
    2. ทุก Transaction มี `Idempotency-Key` หาก Webhook จาก Gateway ส่งซ้ำ 10 ครั้ง ระบบจะเครดิตเงินเพียงครั้งเดียว
    3. การซื้อตอน (`PurchaseChapter`) ทำงานภายใต้ ACID Transaction Boundary เดียวกัน หากการตัดเหรียญสำเร็จแต่การให้สิทธิ์อ่านล้มเหลว ระบบจะ Rollback 100% ป้องกันเหรียญติดลบ (ยืนยันด้วย Concurrency Test 50 Goroutines)

---

## 6) Bonus Track (+5 คะแนนพิเศษ)

### 🌟 Bonus 1: CI/CD Pipeline แบบสมบูรณ์ (Full Automation)
- **เครื่องมือ**: **Azure DevOps Pipelines** (`azure-pipelines.yml`, MS-hosted `ubuntu-24.04`)
- **การทำงาน**:
  - เมื่อมีการ `git push` ขึ้น Azure Repos
  - Pipeline ทำงานอัตโนมัติ: **Lint** (`go vet`) → **Test** (`go test` + PG service, coverage gate ≥ 80% บน commerce) → **Build** (10 images: 9 Go + Next.js web, push ACR ทั้ง SHA tag + `latest`) → **Deploy** (AzureCLI: `set image` ปัก SHA ทุก deployment + `rollout status`, ~17 นาที/รอบ)
  - (ย้ายจาก GitLab CI/CD: GitLab.com free tier หมด compute minutes และ throttle unauthenticated web — ดู ADR ใน `docs/agents/azure-devops.md`)
### 🌟 Bonus 2: Zero-Downtime Deployment (Rolling Update Strategy)
- **เทคนิค**: Kubernetes Deployment RollingUpdate บน AKS
- **คอนฟิกกลยุทธ์**:
  ```yaml
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 25%          # สร้าง Pod เวอร์ชันใหม่ขึ้นมาก่อน 25%
      maxUnavailable: 0      # ห้ามมี Pod ดับแม้แต่ตัวเดียวระหว่างอัปเกรด
  ```
- **Readiness / Liveness Probes**: Pod ใหม่จะยังไม่ได้รับทราฟฟิกจนกว่าจะผ่าน Readiness Probe (`/healthz`) ทำให้ผู้ใช้ที่กำลังอ่านมังงะหรือซื้อตอนไม่พบการสะดุดหรือ Error 502/503 ระหว่างการ Deploy

### 🌟 Bonus 3: Cloud Observability (Real-Time Metrics & Tracing)
- **เครื่องมือ**: **OpenTelemetry (OTel)** ร่วมกับ **OpenObserve / Grafana Dashboard**
- **สิ่งที่แสดงผลบน Dashboard แบบ Real-Time**:
  1. **Distributed Tracing**: สามารถ Trace คำขอจาก Reader $\rightarrow$ Ingress $\rightarrow$ Reader Service $\rightarrow$ Entitlement Service $\rightarrow$ Database ได้ตั้งแต่ต้นจนจบ พร้อมแสดง Latency แต่ละช่วง
  2. **Golden Signals Metrics**: อัตรา Request Per Second (RPS), Error Rate (4xx, 5xx), และ Latency Percentiles (p50, p90, p95)
  3. **Structured JSON Logs with Correlation**: ทุกล็อกมี `trace_id` และ `user_id` แนบกำกับ สามารถค้นหาข้อผิดพลาดของธุรกรรมได้ทันทีเมื่อเกิดปัญหา
