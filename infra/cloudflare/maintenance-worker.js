// Cloudflare Worker: Maintenance & Circuit Breaker (Origin Protection)
// Route: dootoon.store/*, api.dootoon.store/*
// กฎการทำงาน:
// 1. เส้นทาง API (/api/*): ส่งผ่านตรงไปยัง Origin เสมอ ไม่ใช้ Timeout 4.5s และไม่ส่งหน้า Maintenance HTML (เพื่อไม่ให้พังการ Upload/Batch)
// 2. หน้าเว็บทั่วไป: ถ้าเซิร์ฟเวอร์หลังบ้านทำงานปกติ -> ส่งหน้าเว็บจริง
//    ถ้าเซิร์ฟเวอร์หลังบ้านปิดเครื่อง/ล่ม (5xx/522/Timeout) -> เสิร์ฟหน้า Maintenance UI สวยงามอัตโนมัติ

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // [MANUAL PREVIEW]: เปิดทดสอบหน้า Maintenance ได้ด้วย ?maintenance=1
    if (url.searchParams.has('maintenance') || url.searchParams.has('preview')) {
      return renderMaintenancePage(503);
    }

    const isApi = url.pathname.startsWith('/api/');

    // สำหรับ API Requests (รวมถึงการ Upload ภาพ/ZIP): ส่งตรงเข้า Origin ให้เวลาทำงานเต็มที่ ไม่ดักเป็น HTML
    if (isApi) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 120000); // รองรับการอัปโหลดไฟล์ขนาดใหญ่ได้สูงสุด 2 นาที
      try {
        const response = await fetch(request, { signal: controller.signal });
        clearTimeout(timeoutId);
        return response;
      } catch (err) {
        clearTimeout(timeoutId);
        return new Response(JSON.stringify({ error: "Service temporarily unavailable. Please retry." }), {
          status: 503,
          headers: { "Content-Type": "application/json" }
        });
      }
    }

    // สำหรับหน้าเว็บบราวเซอร์ทั่วไป:
    const timeoutMs = 4500;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(request, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // ถ้าเซิร์ฟเวอร์หลังบ้านตอบ 5xx ให้แสดงหน้า Maintenance
      if (response.status >= 500 && response.status <= 599) {
        return renderMaintenancePage(response.status);
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      // Origin ปิดเครื่อง หรือไม่ตอบสนอง (Timeout 522)
      return renderMaintenancePage(522);
    }
  },
};

function renderMaintenancePage(code) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DOOTOON — Scheduled Maintenance</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@700;800;900&family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --paper: #f2ede2;
      --paper2: #e8e1d1;
      --card: #fbf8f1;
      --ink: #15120f;
      --ink2: #3b352e;
      --muted: #7a7064;
      --line: #15120f;
      --shadow: #15120f;
      --accent: #ff4a22;
      --hl: #ffd43b;
      --mint: #12b58b;
      --font-display: "Kanit", "Bricolage Grotesque", system-ui, sans-serif;
      --font-mono: "JetBrains Mono", ui-monospace, monospace;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--paper);
      color: var(--ink);
      font-family: var(--font-display);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
      line-height: 1.6;
      background-image: radial-gradient(rgba(21, 18, 15, 0.14) 1.2px, transparent 0);
      background-size: 24px 24px;
    }
    .card-wrap {
      max-width: 560px;
      width: 100%;
      background: var(--card);
      border: 2.5px solid var(--line);
      border-radius: 12px;
      box-shadow: 6px 6px 0 var(--shadow);
      padding: 42px 36px;
      text-align: center;
      position: relative;
    }
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 22px;
    }
    .brand-badge {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      background: var(--accent);
      color: #fff;
      font-weight: 800;
      font-size: 1.5rem;
      border: 2px solid var(--line);
      border-radius: 8px;
      transform: rotate(-3deg);
      box-shadow: 3px 3px 0 var(--shadow);
    }
    .brand-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 1.9rem;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .brand-title span {
      color: var(--accent);
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 7px;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.1em;
      text-transform: uppercase;
      background: var(--ink);
      color: var(--paper);
      padding: 4px 14px;
      border-radius: 999px;
      margin-bottom: 18px;
    }
    .pulse-dot {
      width: 7px;
      height: 7px;
      background: var(--hl);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--hl);
      animation: pulseDot 1.6s infinite ease-in-out;
    }
    @keyframes pulseDot {
      0%, 100% { transform: scale(1); opacity: 1; }
      50% { transform: scale(1.4); opacity: 0.5; }
    }
    h1 {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: clamp(1.8rem, 4.5vw, 2.3rem);
      line-height: 1.15;
      margin-bottom: 12px;
      letter-spacing: -0.02em;
    }
    h1 .accent {
      color: var(--accent);
    }
    .desc {
      color: var(--ink2);
      font-size: 0.98rem;
      margin-bottom: 26px;
      line-height: 1.65;
    }
    .status-panel {
      background: var(--paper2);
      border: 2px solid var(--line);
      border-radius: 8px;
      box-shadow: 3px 3px 0 var(--shadow);
      padding: 16px 20px;
      margin-bottom: 28px;
      text-align: left;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 8px 0;
      border-bottom: 1.5px dashed color-mix(in srgb, var(--line) 25%, transparent);
      font-size: 0.88rem;
    }
    .status-row:last-child { border-bottom: none; }
    .status-label {
      font-family: var(--font-display);
      font-weight: 700;
      color: var(--ink2);
    }
    .badge-chip {
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 0.72rem;
      padding: 3px 8px;
      border: 1.5px solid var(--line);
      border-radius: 6px;
      white-space: nowrap;
    }
    .badge-chip.green { background: var(--mint); color: #fff; }
    .badge-chip.warn { background: var(--hl); color: #15120f; }
    .badge-chip.accent { background: var(--accent); color: #fff; }
    .btn-group {
      display: flex;
      justify-content: center;
    }
    .btn {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.95rem;
      padding: 12px 28px;
      border: 2px solid var(--line);
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
      background: var(--accent);
      color: #fff;
      box-shadow: 4px 4px 0 var(--shadow);
    }
    .btn:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 var(--shadow);
    }
    .footer-text {
      font-family: var(--font-mono);
      font-size: 0.74rem;
      color: var(--muted);
      margin-top: 24px;
      text-align: center;
    }
  </style>
</head>
<body>

  <div class="card-wrap">
    <div class="brand-header">
      <span class="brand-badge">ด</span>
      <div class="brand-title">DOOTOON <span>STORE</span></div>
    </div>

    <div class="kicker"><span class="pulse-dot"></span> SYSTEM MAINTENANCE</div>

    <h1>We'll Be <span class="accent">Back Soon</span></h1>
    <p class="desc">
      Our platform is currently undergoing scheduled maintenance and infrastructure updates. We are working to restore full access as quickly as possible.
    </p>

    <div class="status-panel">
      <div class="status-row">
        <span class="status-label">Edge Gateway</span>
        <span class="badge-chip green">● OPERATIONAL</span>
      </div>
      <div class="status-row">
        <span class="status-label">Core Application Services</span>
        <span class="badge-chip warn">UPDATING</span>
      </div>
      <div class="status-row">
        <span class="status-label">Estimated Downtime</span>
        <span class="badge-chip accent">FEW MINUTES</span>
      </div>
    </div>

    <div class="btn-group">
      <button class="btn" onclick="location.href='/?retry='+Date.now()">
        ↻ Check Again
      </button>
    </div>

    <div class="footer-text">
      DOOTOON · Digital Manga & Light Novel Reading Platform
    </div>
  </div>

</body>
</html>`;

  return new Response(html, {
    status: 503,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-store, no-cache, must-revalidate',
      'Retry-After': '30',
    },
  });
}
