'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, orderBy, query, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/payments';

interface Payment {
  id: string;
  tenantId: string;
  tenantNama: string;
  amount: number;
  method: PaymentMethod;
  note: string;
  days: number;
  recordedByEmail: string;
  createdAt?: Timestamp;
}

const currency = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 });

export default function PaymentsPage() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const q = query(collection(db, 'payments'), orderBy('createdAt', 'desc'), limit(200));
        const snap = await getDocs(q);
        setPayments(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Payment)));
      } catch (err) {
        console.error('[PaymentsPage] Gagal memuat data:', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  function fmtDate(ts?: Timestamp) {
    if (!ts) return '-';
    return ts.toDate().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  const totalAmount = payments.reduce((sum, p) => sum + (p.amount || 0), 0);
  const now = new Date();
  const totalThisMonth = payments
    .filter((p) => {
      const d = p.createdAt?.toDate();
      return d && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    })
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-white text-xl font-semibold">Riwayat Pembayaran</h1>
        <p className="text-gray-500 text-sm mt-1">
          Catatan pembayaran perpanjangan langganan tenant (dicatat manual saat superadmin memperpanjang).
        </p>
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Total Tercatat ({payments.length} transaksi)</p>
            <p className="text-2xl font-bold text-green-400">{currency.format(totalAmount)}</p>
          </div>
          <div className="bg-gray-900 rounded-xl p-5 border border-gray-800">
            <p className="text-gray-400 text-sm mb-1">Bulan Ini</p>
            <p className="text-2xl font-bold text-blue-400">{currency.format(totalThisMonth)}</p>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-gray-500 text-sm">Memuat data...</p>
      ) : payments.length === 0 ? (
        <p className="text-gray-500 text-sm">Belum ada pembayaran tercatat.</p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-800">
                <th className="text-left text-gray-400 font-medium px-4 py-3">Tanggal</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Tenant</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Jumlah</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Metode</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Durasi</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Dicatat Oleh</th>
                <th className="text-left text-gray-400 font-medium px-4 py-3">Catatan</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-b border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{fmtDate(p.createdAt)}</td>
                  <td className="px-4 py-3 text-white">{p.tenantNama}</td>
                  <td className="px-4 py-3 text-green-400 font-medium whitespace-nowrap">{currency.format(p.amount || 0)}</td>
                  <td className="px-4 py-3 text-gray-400">{PAYMENT_METHOD_LABEL[p.method] ?? p.method}</td>
                  <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{p.days} hari</td>
                  <td className="px-4 py-3 text-gray-400">{p.recordedByEmail}</td>
                  <td className="px-4 py-3 text-gray-500">{p.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
