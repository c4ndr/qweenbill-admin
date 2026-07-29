import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

const isDevEnv = process.env.NODE_ENV !== 'production';

export async function isDevModeEnabled(): Promise<boolean> {
  if (!isDevEnv) return false;
  try {
    const snap = await getDoc(doc(db, 'settings', 'dev_mode'));
    return snap.exists() && snap.data().enabled === true;
  } catch {
    return false;
  }
}

export async function setDevMode(enabled: boolean): Promise<void> {
  if (!isDevEnv) return;
  await setDoc(doc(db, 'settings', 'dev_mode'), { enabled }, { merge: true });
}