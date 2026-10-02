'use client';

import { toast, useStore } from '@/lib/store';
import { Coins, Plus } from 'lucide-react';

export default function WalletCard() {
  const { coins } = useStore();
  return (
    <div className="b-card b-side">
      <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
        <Coins style={{ width: 17, height: 17, color: 'var(--coin)' }} />
        <h3 style={{ margin: 0 }}>กระเป๋าเหรียญ</h3>
      </div>
      <p style={{ marginTop: 4 }}>แยกเหรียญเติมและโบนัส (FR-M2)</p>
      <div className="stat-big" style={{ color: 'var(--coin)' }}>
        {coins} <span style={{ fontSize: 13, color: 'var(--muted)' }}>เหรียญ</span>
      </div>
      <button
        className="btn btn-coin btn-sm"
        style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5 }}
        onClick={() => toast('เติมผ่าน PromptPay QR / บัตรเครดิต (FR-PAY1) · ยืนยันด้วย Webhook (FR-M1)')}
      >
        <Plus style={{ width: 14, height: 14 }} /> เติมเหรียญ
      </button>
    </div>
  );
}
