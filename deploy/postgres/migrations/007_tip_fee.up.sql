-- 007_tip_fee: allow tip_fee ledger type for paid comments (platform keeps 100%).
ALTER TABLE commerce.ledger_entries DROP CONSTRAINT ledger_entries_type_check;
ALTER TABLE commerce.ledger_entries ADD CONSTRAINT ledger_entries_type_check CHECK (type IN (
  'topup', 'purchase_debit', 'platform_fee', 'creator_earning',
  'refund_credit', 'takedown_clawback', 'tip_fee'));
