// Cloudflare Worker: Maintenance & Circuit Breaker (Fallback Page on 522/Origin Timeout)
// Route: dootoon.store/*, api.dootoon.store/*
// เมื่อ Origin (Azure AKS) ปิดเครื่อง (run demo-night.ps1) หรือเกิด Error 522 / 502 / 504
// Worker ตัวนี้จะดักจับและเสิร์ฟหน้า Maintenance UI สวยงามตามธีมแท้ของ DOOTOON ทันที

export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // [TEST MODE]: ถ้าเปิดด้วย ?maintenance=1 หรือส่ง Header X-Maintenance: 1 ให้แสดงหน้า Maintenance ทันที
    if (url.searchParams.has('maintenance') || url.searchParams.has('preview') || request.headers.get('X-Maintenance') === '1') {
      return renderMaintenancePage(522);
    }

    // กำหนดเวลา Timeout สูงสุดที่รอ Origin (เช่น 4.5 วินาที)
    const timeoutMs = 4500;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      // ลองยิงคำขอไปยัง Origin (Azure AKS) ตามปกติ
      const response = await fetch(request, {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // ถ้า Origin ตอบกลับมาเป็น Error 502, 503, 504 หรือ 522 ให้เสิร์ฟหน้า Maintenance
      if ([502, 503, 504, 520, 521, 522, 523, 524].includes(response.status)) {
        return renderMaintenancePage(response.status);
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);
      // เกิด Timeout หรือเชื่อมต่อ Origin ไม่ได้ (522 Connection Timed Out)
      return renderMaintenancePage(522);
    }
  },
};

function renderMaintenancePage(code) {
  const html = `<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>DOOTOON ดูตูน — พักปรับปรุงระบบชั่วคราว</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@600;700;800;900&family=Mitr:wght@600;700&family=Bricolage+Grotesque:opsz,wght@12..96,700..800&family=JetBrains+Mono:wght@600;700&display=swap" rel="stylesheet">
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
      --font-thai: "Mitr", "Kanit", system-ui, sans-serif;
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
      max-width: 580px;
      width: 100%;
      background: var(--card);
      border: 2.5px solid var(--line);
      border-radius: 12px;
      box-shadow: 6px 6px 0 var(--shadow);
      padding: 40px 32px;
      text-align: center;
      position: relative;
    }
    .brand-header {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      margin-bottom: 20px;
    }
    .brand-badge {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      background: var(--accent);
      color: #fff;
      font-family: var(--font-thai);
      font-weight: 700;
      font-size: 1.5rem;
      border: 2px solid var(--line);
      border-radius: 8px;
      transform: rotate(-3deg);
      box-shadow: 3px 3px 0 var(--shadow);
    }
    .brand-title {
      font-family: var(--font-display);
      font-weight: 900;
      font-size: 1.8rem;
      letter-spacing: -0.02em;
      line-height: 1;
    }
    .brand-title small {
      font-family: var(--font-thai);
      color: var(--accent);
      font-weight: 700;
      font-size: 1.3rem;
      margin-left: 6px;
    }
    .kicker {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: var(--font-mono);
      font-size: 0.72rem;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      background: var(--ink);
      color: var(--paper);
      padding: 4px 12px;
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
      font-size: clamp(1.6rem, 4vw, 2.1rem);
      line-height: 1.2;
      margin-bottom: 10px;
    }
    h1 .th {
      font-family: var(--font-thai);
      color: var(--accent);
    }
    .desc {
      font-family: var(--font-thai);
      color: var(--ink2);
      font-size: 0.98rem;
      margin-bottom: 24px;
      line-height: 1.65;
    }
    .status-panel {
      background: var(--paper2);
      border: 2px solid var(--line);
      border-radius: 8px;
      box-shadow: 3px 3px 0 var(--shadow);
      padding: 16px 20px;
      margin-bottom: 26px;
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
      gap: 12px;
      justify-content: center;
      flex-wrap: wrap;
    }
    .btn {
      font-family: var(--font-display);
      font-weight: 800;
      font-size: 0.92rem;
      padding: 11px 24px;
      border: 2px solid var(--line);
      border-radius: 8px;
      cursor: pointer;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      gap: 8px;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .btn-accent {
      background: var(--accent);
      color: #fff;
      box-shadow: 4px 4px 0 var(--shadow);
    }
    .btn-accent:hover {
      transform: translate(-2px, -2px);
      box-shadow: 6px 6px 0 var(--shadow);
    }
    .btn-ghost {
      background: var(--card);
      color: var(--ink);
      box-shadow: 4px 4px 0 var(--shadow);
    }
    .btn-ghost:hover {
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
      <div class="brand-title">DOOTOON<small>ดูตูน</small></div>
    </div>

    <div class="kicker"><span class="pulse-dot"></span> EDGE CIRCUIT BREAKER ACTIVE</div>

    <h1>ระบบกำลังพักผ่อน <span class="th">พักชาร์จแบต</span></h1>
    <p class="desc">
      เซิร์ฟเวอร์ Azure AKS อยู่ในโหมดพักประหยัดงบ (Demo-Night Mode) หรือกำลังสตาร์ทระบบ กรุณารอระบบบูตเครื่องสักครู่แล้วกดลองใหม่อีกครั้ง
    </p>

    <div class="status-panel">
      <div class="status-row">
        <span class="status-label">Cloudflare Edge Proxy</span>
        <span class="badge-chip green">● ONLINE (Anycast BKK)</span>
      </div>
      <div class="status-row">
        <span class="status-label">Azure AKS Cluster</span>
        <span class="badge-chip warn">STANDBY / CONNECTING</span>
      </div>
      <div class="status-row">
        <span class="status-label">Edge Protection</span>
        <span class="badge-chip accent">HTTP ${code} INTERCEPTED</span>
      </div>
    </div>

    <div class="btn-group">
      <button class="btn btn-accent" onclick="location.href='/?refresh='+Date.now()">
        ↻ ลองโหลดหน้าเว็บใหม่
      </button>
      <a href="https://github.com/navapoltawan" target="_blank" rel="noopener" class="btn btn-ghost">
        GitHub Repository ↗
      </a>
    </div>

    <div class="footer-text">
      DOOTOON Multi-Cloud Architecture · Edge Fallback via Cloudflare Worker
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
