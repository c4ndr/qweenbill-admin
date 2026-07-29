import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { db } from './firebase';

export type ActivityAction =
  | 'tenant.create'
  | 'tenant.activate'
  | 'tenant.suspend'
  | 'tenant.renew'
  | 'tenant.grade_change'
  | 'tenant.activation_code_edit'
  | 'tenant.delete';

export async function logActivity(
  actor: User,
  action: ActivityAction,
  tenantId: string,
  tenantNama: string,
  detail: Record<string, unknown> = {},
): Promise<void> {
  try {
    await addDoc(collection(db, 'activity_log'), {
      actorUid: actor.uid,
      actorEmail: actor.email ?? '',
      action,
      tenantId,
      tenantNama,
      detail,
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    // Gagal mencatat log tidak boleh membatalkan aksi utama yang sudah berhasil.
    console.error('[logActivity] Gagal mencatat log:', err);
  }
}
