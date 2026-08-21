'use client';

import { useEffect, useState } from 'react';
import {
  collection, getDocs, orderBy, query, limit, Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from '@/lib/payments';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Wallet, TrendingUp } from 'lucide-react';

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground text-sm">Memuat data...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Riwayat Pembayaran</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Catatan pembayaran perpanjangan langganan tenant (dicatat manual saat superadmin memperpanjang).
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Tercatat
            </CardTitle>
            <Wallet className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-500">{currency.format(totalAmount)}</div>
            <p className="text-xs text-muted-foreground mt-1">{payments.length} transaksi</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Bulan Ini
            </CardTitle>
            <TrendingUp className="size-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-500">{currency.format(totalThisMonth)}</div>
          </CardContent>
        </Card>
      </div>

      {payments.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm text-center">Belum ada pembayaran tercatat.</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tanggal</TableHead>
                  <TableHead>Tenant</TableHead>
                  <TableHead>Jumlah</TableHead>
                  <TableHead>Metode</TableHead>
                  <TableHead>Durasi</TableHead>
                  <TableHead>Dicatat Oleh</TableHead>
                  <TableHead>Catatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-muted-foreground">{fmtDate(p.createdAt)}</TableCell>
                    <TableCell className="font-medium">{p.tenantNama}</TableCell>
                    <TableCell className="text-green-500 font-medium">{currency.format(p.amount || 0)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {PAYMENT_METHOD_LABEL[p.method] ?? p.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{p.days} hari</TableCell>
                    <TableCell className="text-muted-foreground">{p.recordedByEmail}</TableCell>
                    <TableCell className="text-muted-foreground max-w-[200px] truncate">{p.note || '-'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
