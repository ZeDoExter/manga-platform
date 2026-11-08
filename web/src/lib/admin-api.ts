// Client for the moderation service (takedown, ban, audit log).
// Demo admin identity; prod would use the logged-in admin's session.

const BASE = process.env.NEXT_PUBLIC_MODERATION_URL ?? '/api/moderation';

export const DEMO_ADMIN = 'admin-1';

export interface AuditLog {
  id: string;
  admin_id: string;
  action: string;
  target_id: string;
  reason: string;
  created_at: string;
}

async function req(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(body.slice(0, 200) || `moderation ${path} -> ${res.status}`);
  }
  return res;
}

export async function takedownChapter(adminID: string, chapterID: string, reason: string): Promise<void> {
  await req('/takedowns', {
    method: 'POST',
    body: JSON.stringify({ admin_id: adminID, chapter_id: chapterID, reason, purchase_ids: [] }),
  });
}

export async function banUser(adminID: string, targetID: string, reason: string): Promise<void> {
  await req(`/users/${encodeURIComponent(targetID)}/ban`, {
    method: 'POST',
    body: JSON.stringify({ admin_id: adminID, reason }),
  });
}

export async function fetchAuditLogs(): Promise<AuditLog[]> {
  const res = await req('/audit-logs');
  return (await res.json()) as AuditLog[];
}
