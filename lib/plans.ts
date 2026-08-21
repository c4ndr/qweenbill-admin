import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export interface Plan {
  id: string;
  nama: string;
  customerLimit: number | null;
  priceperYear: number;
  routerLimit: number;
  features: Record<string, boolean>;
  active: boolean;
  isTrial?: boolean;
}

export const FEATURE_LABEL: Record<string, string> = {
  router2: '2 Router MikroTik',
  bubbleChat: 'Bubble Chat Teknisi ↔ Pelanggan',
  hotspotFilterLanjutan: 'Filter Hotspot Lanjutan',
  petaTopologi: 'Peta Topologi Geografis',
  multiAdmin: 'Multi-Admin/Koordinator',
};

export const currency = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
});

export async function fetchActivePlans(): Promise<Plan[]> {
  const snap = await getDocs(collection(db, 'plans'));
  const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
  return all.filter((p) => p.active && !p.isTrial).sort((a, b) => a.priceperYear - b.priceperYear);
}
