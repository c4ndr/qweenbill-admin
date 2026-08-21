import type { Timestamp } from 'firebase/firestore';

export interface Plan {
  id: string;
  nama: string;
  active: boolean;
  customerLimit: number | null;
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
}

export interface Tenant {
  id: string;
  nama: string;
  alamat: string;
  email: string;
  status: 'pending' | 'active' | 'suspended' | 'expired';
  gradeId: string;
  customerLimit: number | null;
  pricePerYearAtPurchase?: number;
  pelangganCount: number;
  activationCode: string;
  subscriptionExpiresAt?: Timestamp;
  features?: Record<string, boolean>;
}

export interface TeknisiRow {
  id: string;
  nama: string;
  noHp: string;
  role: string;
  aktif: boolean;
  nettopoEmail: string | null;
  nettopoAccess: boolean;
}

export const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export const STATUS_LABEL: Record<string, string> = {
  active: 'Aktif',
  suspended: 'Suspend',
  pending: 'Menunggu Aktivasi',
  expired: 'Kadaluarsa',
};

export const STATUS_VARIANT: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  active: 'default',
  suspended: 'destructive',
  pending: 'secondary',
  expired: 'outline',
};

export const DURATION_OPTIONS = [
  { label: '1 Hari', days: 1 },
  { label: '3 Hari', days: 3 },
  { label: '1 Minggu', days: 7 },
  { label: '1 Bulan', days: 30 },
  { label: '2 Bulan', days: 60 },
  { label: '3 Bulan', days: 90 },
  { label: '1 Tahun', days: 365 },
];

export function fmtDate(ts?: Timestamp): string {
  if (!ts) return '-';
  return ts.toDate().toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function gradeName(plans: Plan[], gradeId: string): string {
  return plans.find((p) => p.id === gradeId)?.nama ?? gradeId;
}

export function suggestedAmount(t: Tenant, days: number): number {
  if (!t.pricePerYearAtPurchase) return 0;
  return Math.round(((t.pricePerYearAtPurchase / 365) * days) / 1000) * 1000;
}
