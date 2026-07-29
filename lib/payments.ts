import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

export type PaymentMethod = 'transfer' | 'qris' | 'cash' | 'lainnya';

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  transfer: 'Transfer Bank',
  qris: 'QRIS',
  cash: 'Tunai',
  lainnya: 'Lainnya',
};

export interface PaymentInput {
  tenantId: string;
  tenantNama: string;
  amount: number;
  method: PaymentMethod;
  note: string;
  days: number;
}

export async function recordPayment(actor: User, payment: PaymentInput): Promise<void> {
  await addDoc(collection(db, 'payments'), {
    ...payment,
    recordedByUid: actor.uid,
    recordedByEmail: actor.email ?? '',
    createdAt: serverTimestamp(),
  });
}
