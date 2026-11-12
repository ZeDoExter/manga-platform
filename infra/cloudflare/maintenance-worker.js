// Cloudflare Worker: Maintenance & Circuit Breaker (Fallback Page on 522/Origin Timeout)
// Route: dootoon.store/*, api.dootoon.store/*
// เมื่อ Origin (Azure AKS) ปิดเครื่อง (run demo-night.ps1) หรือเกิด Error 522 / 502 / 504
// Worker ตัวนี้จะดักจับและเสิร์ฟหน้า Maintenance UI สวยงามทันทีแทนที่จะแสดงหน้าจอ Cloudflare ขาวๆ ดิบๆ

export default {
  async fetch(request, env) {
    // กำหนดเวลา Timeout สูงสุดที่รอ Origin (เช่น 4 วินาที)
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
  <title>DOOTOON ดูตูน — ระบบกำลังอยู่ระหว่างการบำรุงรักษา</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Kanit:wght@400;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #0d0c12;
      --card: #16151f;
      --border: #262438;
      --text: #f4efe4;
      --muted: #8d889b;
      --accent: #ff4a22;
      --mint: #12b58b;
      --gold: #ffd43b;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text);
      font-family: 'Kanit', sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
      line-height: 1.6;
    }
    .box {
      background: var(--card);
      border: 2px solid var(--border);
      border-radius: 16px;
      padding: 40px 32px;
      max-width: 580px;
      width: 100%;
      text-align: center;
      box-shadow: 0 20px 40px rgba(0,0,0,0.4);
    }
    .badge {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--gold);
      background: rgba(255, 212, 59, 0.1);
      border: 1px solid rgba(255, 212, 59, 0.3);
      padding: 4px 12px;
      border-radius: 9999px;
      margin-bottom: 20px;
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      background: var(--gold);
      border-radius: 50%;
      box-shadow: 0 0 8px var(--gold);
      animation: pulse 1.8s infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }
    h1 {
      font-size: 2rem;
      font-weight: 800;
      line-height: 1.2;
      margin-bottom: 12px;
    }
    h1 span { color: var(--accent); }
    p {
      color: var(--muted);
      font-size: 0.95rem;
      margin-bottom: 24px;
    }
    .status-panel {
      background: rgba(0,0,0,0.25);
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 16px;
      margin-bottom: 24px;
      font-size: 0.85rem;
      text-align: left;
    }
    .status-row {
      display: flex;
      justify-content: space-between;
      padding: 6px 0;
      border-bottom: 1px dashed rgba(255,255,255,0.08);
    }
    .status-row:last-child { border-bottom: none; }
    .status-label { color: var(--muted); }
    .status-val { font-family: 'JetBrains Mono', monospace; font-weight: 700; }
    .status-val.warn { color: var(--gold); }
    .status-val.green { color: var(--mint); }
    .btn {
      display: inline-block;
      background: var(--accent);
      color: #fff;
      font-weight: 700;
      font-size: 0.95rem;
      padding: 10px 24px;
      border-radius: 8px;
      text-decoration: none;
      transition: opacity 0.2s;
      cursor: pointer;
      border: none;
    }
    .btn:hover { opacity: 0.9; }
    .footer-note {
      font-size: 0.75rem;
      color: var(--muted);
      margin-top: 20px;
    }
  </style>
</head>
<body>
  <div class="box">
    <div class="badge"><span class="pulse-dot"></span> EDGE CIRCUIT BREAKER ACTIVE</div>
    <h1>DOOTOON <span>ดูตูน</span></h1>
    <p>ระบบอยู่ในช่วง <b>พักปรับปรุงเซิร์ฟเวอร์ (Demo-Night Mode)</b> หรือกำลังเชื่อมต่อไปยัง Azure AKS คลัสเตอร์ กรุณาลองใหม่อีกครั้งในอีกสักครู่</p>
    
    <div class="status-panel">
      <div class="status-row">
        <span class="status-label">Cloudflare Edge Proxy</span>
        <span class="status-val green">ONLINE (Anycast)</span>
      </div>
      <div class="status-row">
        <span class="status-label">Azure AKS Cluster</span>
        <span class="status-val warn">STANDBY / CONNECTING</span>
      </div>
      <div class="status-row">
        <span class="status-label">HTTP Diagnostics</span>
        <span class="status-val warn">HTTP ${code} (Timeout Intercepted)</span>
      </div>
    </div>

    <button class="btn" onclick="location.reload()">ลองรีเฟรชหน้าเว็บ</button>
    <div class="footer-note">DOOTOON Multi-Cloud Architecture · Edge Fallback Handler</div>
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
