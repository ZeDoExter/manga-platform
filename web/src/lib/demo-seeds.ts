// Demo login users, seeded into better-auth on first auth call and via
// POST /api/auth/seed (the memory adapter loses data on restart).
// Password for all: dootoon123
export const DEMO_SEEDS = [
  { name: "Reader", email: "user@dootoon.store", password: "dootoon123", role: "user" },
  { name: "Creator", email: "creator@dootoon.store", password: "dootoon123", role: "creator" },
  { name: "System Admin", email: "admin@dootoon.store", password: "dootoon123", role: "admin" },
] as const;
