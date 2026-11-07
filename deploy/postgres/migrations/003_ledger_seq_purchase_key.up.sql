-- 003: ledger ordering sequence + purchase idempotency keys.
-- seq gives ListLedger a stable newest-first order (memory parity).
ALTER TABLE commerce.ledger_entries ADD COLUMN seq BIGINT GENERATED ALWAYS AS IDENTITY;
CREATE UNIQUE INDEX ledger_entries_seq ON commerce.ledger_entries (seq);

-- Purchases carry their own idempotency key so replays resolve without a
-- zero-amount marker row in the ledger.
ALTER TABLE commerce.purchases ADD COLUMN idempotency_key TEXT NOT NULL DEFAULT '';
CREATE UNIQUE INDEX purchases_user_idem_key
  ON commerce.purchases (user_id, idempotency_key) WHERE idempotency_key <> '';
