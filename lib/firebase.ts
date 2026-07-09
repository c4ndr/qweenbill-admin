import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getFunctions } from 'firebase/functions';

const firebaseConfig = {
  apiKey: 'AIzaSyBn8U5j3W6NyC_v05YemyvvB5WQ9BEJXq8',
  authDomain: 'queen-bill.firebaseapp.com',
  projectId: 'queen-bill',
  storageBucket: 'queen-bill.firebasestorage.app',
  messagingSenderId: '783811201795',
  appId: '1:783811201795:web:d63eb70fad14aed3eeb736',
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app, 'us-central1');
