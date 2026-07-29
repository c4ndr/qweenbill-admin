import type { Timestamp } from 'firebase/firestore';

export const EXPIRY_WARNING_DAYS = 7;

export function daysUntil(ts?: Timestamp): number | null {
  if (!ts) return null;
  const diffMs = ts.toDate().getTime() - Date.now();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}

export function isExpiringSoon(status: string, ts?: Timestamp): boolean {
  const days = daysUntil(ts);
  if (days === null) return false;
  return status === 'active' && days >= 0 && days <= EXPIRY_WARNING_DAYS;
}
