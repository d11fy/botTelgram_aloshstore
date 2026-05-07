// In-memory session store (works for serverless via external state)
// For production scale, use Supabase or Redis
const sessions = new Map<number, any>();

export function getSession(userId: number) {
  if (!sessions.has(userId)) sessions.set(userId, {});
  return sessions.get(userId);
}

export function setSession(userId: number, data: any) {
  sessions.set(userId, data);
}

export function clearSession(userId: number) {
  sessions.delete(userId);
}

// Admin reply sessions
export const adminReplySessions = new Map<number, { orderId: string; customerTelegramId: number }>();
