'use client';

import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, doc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CheckCircle, XCircle, FileText, AlertTriangle } from 'lucide-react';

interface Plan {
  id: string;
  nama: string;
  active: boolean;
  customerLimit: number | null;
}

interface Application {
  id: string;
  namaUsaha: string;
  namaPemilik: string;
  email: string;
  whatsapp: string;
  alamat: string;
  status: 'pending' | 'approved' | 'rejected';
  tenantId?: string;
  activationCode?: string;
  rejectionReason?: string;
  autoApproved?: boolean;
  requestedPlan?: string | null;
  createdAt?: Timestamp;
}

function normalizeWhatsapp(raw: string): string {
  let s = (raw || '').replace(/[\s-]/g, '');
  if (s.startsWith('+62')) s = `0${s.slice(3)}`;
  else if (s.startsWith('62') && s.length > 9) s = `0${s.slice(2)}`;
  return s;
}

const STATUS_LABEL: Record<Application['status'], string> = {
  pending: 'Menunggu',
  approved: 'Disetujui',
  rejected: 'Ditolak',
};

const STATUS_VARIANT: Record<Application['status'], 'default' | 'secondary' | 'destructive'> = {
  pending: 'secondary',
  approved: 'default',
  rejected: 'destructive',
};

export default function ApplicationsPage() {
  const { user } = useAuth();
  const [applications, setApplications] = useState<Application[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');

  const [approveTarget, setApproveTarget] = useState<Application | null>(null);
  const [approveGradeId, setApproveGradeId] = useState('');
  const [approveDurationDays, setApproveDurationDays] = useState(365);
  const [approveSaving, setApproveSaving] = useState(false);
  const [approveError, setApproveError] = useState('');

  const [rejectTarget, setRejectTarget] = useState<Application | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectSaving, setRejectSaving] = useState(false);
  const [rejectError, setRejectError] = useState('');

  async function loadAll() {
    setLoading(true);
    try {
      const [appSnap, planSnap] = await Promise.all([
        getDocs(collection(db, 'tenant_applications')),
        getDocs(collection(db, 'plans')),
      ]);
      setApplications(appSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Application)));
      setPlans(planSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan)).filter((p) => p.active !== false));
    } catch (err) {
      console.error('[ApplicationsPage] Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadAll(); }, []);

  function openApprove(a: Application) {
    setApproveTarget(a);
    const requested = a.requestedPlan && plans.some((p) => p.id === a.requestedPlan) ? a.requestedPlan : null;
    setApproveGradeId(requested ?? plans[0]?.id ?? '');
    setApproveDurationDays(365);
    setApproveError('');
  }

  async function confirmApprove() {
    if (!approveTarget || !approveGradeId) return;
    setApproveSaving(true);
    setApproveError('');
    try {
      const provisionTenant = httpsCallable(functions, 'provisionTenant');
      const res = await provisionTenant({
        nama: approveTarget.namaUsaha,
        alamat: approveTarget.alamat,
        email: approveTarget.email,
        gradeId: approveGradeId,
        durationDays: approveDurationDays,
      });
      const data = res.data as { tenantId: string; activationCode: string };

      await updateDoc(doc(db, 'tenant_applications', approveTarget.id), {
        status: 'approved',
        tenantId: data.tenantId,
        activationCode: data.activationCode,
        reviewedAt: serverTimestamp(),
      });

      if (user) {
        logActivity(user, 'application.approve', data.tenantId, approveTarget.namaUsaha, {
          gradeId: approveGradeId,
          durationDays: approveDurationDays,
        });
      }

      setApproveTarget(null);
      await loadAll();
    } catch (err: unknown) {
      setApproveError(err instanceof Error ? err.message : 'Gagal menyetujui pendaftaran');
    } finally {
      setApproveSaving(false);
    }
  }

  function openReject(a: Application) {
    setRejectTarget(a);
    setRejectReason('');
    setRejectError('');
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setRejectSaving(true);
    setRejectError('');
    try {
      await updateDoc(doc(db, 'tenant_applications', rejectTarget.id), {
        status: 'rejected',
        rejectionReason: rejectReason.trim(),
        reviewedAt: serverTimestamp(),
      });
      if (user) {
        logActivity(user, 'application.reject', rejectTarget.id, rejectTarget.namaUsaha, {
          reason: rejectReason.trim(),
        });
      }
      setRejectTarget(null);
      await loadAll();
    } catch (err: unknown) {
      setRejectError(err instanceof Error ? err.message : 'Gagal menolak pendaftaran');
    } finally {
      setRejectSaving(false);
    }
  }

  const duplicateWhatsapp = useMemo(() => {
    const counts = new Map<string, number>();
    for (const a of applications) {
      const key = normalizeWhatsapp(a.whatsapp);
      if (!key) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    return counts;
  }, [applications]);

  const visible = applications
    .filter((a) => (filter === 'all' ? true : a.status === 'pending'))
    .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0));

  const pendingCount = applications.filter((a) => a.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">Pendaftaran Tenant</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Kelola pendaftaran RT/RW baru. Setujui atau tolak pendaftaran yang masuk.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Menunggu</CardTitle>
            <FileText className="size-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-yellow-500">{pendingCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Disetujui</CardTitle>
            <CheckCircle className="size-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-green-500">
              {applications.filter((a) => a.status === 'approved').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ditolak</CardTitle>
            <XCircle className="size-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-medium text-red-500">
              {applications.filter((a) => a.status === 'rejected').length}
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={filter} onValueChange={(v) => setFilter(v as 'pending' | 'all')}>
        <TabsList>
          <TabsTrigger value="pending">Menunggu</TabsTrigger>
          <TabsTrigger value="all">Semua</TabsTrigger>
        </TabsList>
      </Tabs>

      {loading ? (
        <div className="flex items-center justify-center h-32">
          <p className="text-muted-foreground text-sm">Memuat...</p>
        </div>
      ) : visible.length === 0 ? (
        <Card>
          <CardContent className="py-8">
            <p className="text-muted-foreground text-sm text-center">
              Tidak ada pendaftaran{filter === 'pending' ? ' yang menunggu' : ''}.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((a) => (
            <Card key={a.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium">{a.namaUsaha}</p>
                    <p className="text-muted-foreground text-sm">{a.namaPemilik} · {a.email} · {a.whatsapp}</p>
                    <p className="text-muted-foreground text-xs">{a.alamat}</p>
                    {a.requestedPlan && (
                      <p className="text-blue-500 text-xs">
                        Paket diminta: {plans.find((p) => p.id === a.requestedPlan)?.nama ?? a.requestedPlan}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5">
                    <Badge variant={STATUS_VARIANT[a.status]}>
                      {STATUS_LABEL[a.status]}
                    </Badge>
                    {a.autoApproved && (
                      <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
                        Auto-approved (trial)
                      </Badge>
                    )}
                    {(duplicateWhatsapp.get(normalizeWhatsapp(a.whatsapp)) ?? 0) > 1 && (
                      <Badge variant="secondary" className="bg-yellow-500/10 text-yellow-500">
                        <AlertTriangle className="size-3" />
                        Nomor WA dipakai berulang
                      </Badge>
                    )}
                  </div>
                </div>

                {a.status === 'approved' && (
                  <p className="text-green-500 text-xs mt-2 font-mono">Kode aktivasi: {a.activationCode}</p>
                )}
                {a.status === 'rejected' && a.rejectionReason && (
                  <p className="text-red-500 text-xs mt-2">Alasan: {a.rejectionReason}</p>
                )}

                {a.status === 'pending' && (
                  <div className="flex gap-2 mt-3">
                    <Button
                      size="sm"
                      onClick={() => openApprove(a)}
                    >
                      <CheckCircle className="size-3" />
                      Setujui
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => openReject(a)}
                    >
                      <XCircle className="size-3" />
                      Tolak
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Approve Dialog */}
      <Dialog open={!!approveTarget} onOpenChange={(open) => !open && setApproveTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Setujui {approveTarget?.namaUsaha}</DialogTitle>
            <DialogDescription>
              Pilih grade dan durasi langganan untuk tenant ini.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Grade/Paket</Label>
              <div className="flex flex-wrap gap-2">
                {plans.map((p) => (
                  <Button
                    key={p.id}
                    variant={approveGradeId === p.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setApproveGradeId(p.id)}
                  >
                    {p.nama}
                  </Button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Durasi Awal (hari)</Label>
              <Input
                type="number"
                value={approveDurationDays}
                onChange={(e) => setApproveDurationDays(Number(e.target.value))}
                min={1}
              />
            </div>

            {approveError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                {approveError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setApproveTarget(null)}>
              Batal
            </Button>
            <Button
              onClick={confirmApprove}
              disabled={approveSaving || !approveGradeId}
            >
              {approveSaving ? 'Memproses...' : 'Setujui'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => !open && setRejectTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tolak {rejectTarget?.namaUsaha}</DialogTitle>
            <DialogDescription>
              Berikan alasan penolakan (opsional).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Alasan (opsional)</Label>
              <Textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                rows={3}
              />
            </div>

            {rejectError && (
              <div className="bg-destructive/10 text-destructive text-sm rounded-lg px-3 py-2">
                {rejectError}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectTarget(null)}>
              Batal
            </Button>
            <Button
              variant="destructive"
              onClick={confirmReject}
              disabled={rejectSaving}
            >
              {rejectSaving ? 'Memproses...' : 'Tolak'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
