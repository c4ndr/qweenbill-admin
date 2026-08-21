'use client';

import { useEffect, useState, useCallback } from 'react';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';
import { recordPayment, type PaymentMethod } from '@/lib/payments';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

import { Loader2, Plus, Copy, Check } from 'lucide-react';

import { type Plan, type Tenant } from '@/components/dashboard/tenants/types';

import { AddTenantForm } from '@/components/dashboard/tenants/add-tenant-form';
import { RenewDialog } from '@/components/dashboard/tenants/renew-dialog';
import { GradeChangeDialog } from '@/components/dashboard/tenants/grade-change-dialog';
import { DeleteDialog } from '@/components/dashboard/tenants/delete-dialog';
import { PinResetDialog } from '@/components/dashboard/tenants/pin-reset-dialog';
import { NetTopoResetDialog } from '@/components/dashboard/tenants/nettopo-reset-dialog';
import { TeknisiDialog } from '@/components/dashboard/tenants/teknisi-dialog';
import { TenantTable } from '@/components/dashboard/tenants/tenant-table';

export default function TenantsPage() {
  const { user } = useAuth();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);

  // Activation result banner
  const [activation, setActivation] = useState<{
    nama: string;
    code: string;
    nettopoEmail?: string;
    nettopoPassword?: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  // Dialogs
  const [showAddForm, setShowAddForm] = useState(false);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewTarget, setRenewTarget] = useState<Tenant | null>(null);
  const [renewSaving, setRenewSaving] = useState(false);
  const [renewError, setRenewError] = useState('');

  const [gradeChangeOpen, setGradeChangeOpen] = useState(false);
  const [gradeChangeTarget, setGradeChangeTarget] = useState<Tenant | null>(null);
  const [gradeChangeNewId, setGradeChangeNewId] = useState('');
  const [gradeChangeSaving, setGradeChangeSaving] = useState(false);
  const [gradeChangeError, setGradeChangeError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Tenant | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const [pinResetOpen, setPinResetOpen] = useState(false);
  const [pinResetTarget, setPinResetTarget] = useState<{ tenant: Tenant; tier: 1 | 2 } | null>(null);
  const [pinResetSaving, setPinResetSaving] = useState(false);
  const [pinResetError, setPinResetError] = useState('');
  const [pinResetDone, setPinResetDone] = useState(false);

  const [netTopoOpen, setNetTopoOpen] = useState(false);
  const [netTopoTarget, setNetTopoTarget] = useState<Tenant | null>(null);
  const [netTopoSaving, setNetTopoSaving] = useState(false);
  const [netTopoError, setNetTopoError] = useState('');
  const [netTopoResult, setNetTopoResult] = useState<{ email: string; password: string } | null>(
    null,
  );

  const [teknisiOpen, setTeknisiOpen] = useState(false);
  const [teknisiTarget, setTeknisiTarget] = useState<Tenant | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [tenantSnap, planSnap] = await Promise.all([
        getDocs(collection(db, 'tenants')),
        getDocs(collection(db, 'plans')),
      ]);
      setTenants(tenantSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Tenant)));
      const planList = planSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Plan));
      setPlans(planList.filter((p) => p.active !== false));
    } catch (err) {
      console.error('[TenantsPage] Gagal memuat data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  async function handleRenew(days: number, amount: string, method: PaymentMethod, note: string) {
    if (!renewTarget) return;
    setRenewSaving(true);
    setRenewError('');
    try {
      const now = new Date();
      const currentExpiry = renewTarget.subscriptionExpiresAt?.toDate();
      const base = currentExpiry && currentExpiry > now ? currentExpiry : now;
      const next = new Date(base);
      next.setDate(next.getDate() + days);
      await updateDoc(doc(db, 'tenants', renewTarget.id), {
        subscriptionExpiresAt: next,
        status: 'active',
      });
      if (user) {
        logActivity(user, 'tenant.renew', renewTarget.id, renewTarget.nama, {
          days,
          newExpiry: next.toISOString(),
        });
        await recordPayment(user, {
          tenantId: renewTarget.id,
          tenantNama: renewTarget.nama,
          amount: Number(amount) || 0,
          method,
          note: note.trim(),
          days,
        });
      }
      setRenewOpen(false);
      await loadAll();
    } catch (err: unknown) {
      setRenewError(err instanceof Error ? err.message : 'Gagal memperpanjang / mencatat pembayaran');
    } finally {
      setRenewSaving(false);
    }
  }

  async function handleGradeChange() {
    if (!gradeChangeTarget) return;
    const newPlan = plans.find((p) => p.id === gradeChangeNewId);
    if (!newPlan) return;
    setGradeChangeSaving(true);
    setGradeChangeError('');
    try {
      await updateDoc(doc(db, 'tenants', gradeChangeTarget.id), {
        gradeId: newPlan.id,
        customerLimit: newPlan.customerLimit,
        routerLimit: newPlan.routerLimit,
        features: newPlan.features || {},
        pricePerYearAtPurchase: newPlan.priceperYear,
      });
      if (user) {
        logActivity(user, 'tenant.grade_change', gradeChangeTarget.id, gradeChangeTarget.nama, {
          from: gradeChangeTarget.gradeId,
          to: newPlan.id,
        });
      }
      setGradeChangeOpen(false);
      await loadAll();
    } catch (err: unknown) {
      setGradeChangeError(err instanceof Error ? err.message : 'Gagal mengubah grade');
    } finally {
      setGradeChangeSaving(false);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    setDeleteError('');
    try {
      const deleteTenant = httpsCallable(functions, 'deleteTenant');
      await deleteTenant({ tenantId: deleteTarget.id });
      if (user) {
        logActivity(user, 'tenant.delete', deleteTarget.id, deleteTarget.nama, {
          pelangganCount: deleteTarget.pelangganCount,
          gradeId: deleteTarget.gradeId,
        });
      }
      setTenants((prev) => prev.filter((t) => t.id !== deleteTarget.id));
      setDeleteOpen(false);
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Gagal menghapus tenant');
    } finally {
      setDeleting(false);
    }
  }

  async function handlePinReset() {
    if (!pinResetTarget) return;
    setPinResetSaving(true);
    setPinResetError('');
    try {
      const resetFn = httpsCallable(functions, 'resetAdminPin');
      await resetFn({ tenantId: pinResetTarget.tenant.id, tier: pinResetTarget.tier });
      setPinResetDone(true);
      if (user) {
        logActivity(user, 'tenant.admin_pin_reset', pinResetTarget.tenant.id, pinResetTarget.tenant.nama, {
          tier: pinResetTarget.tier,
        });
      }
    } catch (err: unknown) {
      setPinResetError(err instanceof Error ? err.message : 'Gagal mereset PIN admin');
    } finally {
      setPinResetSaving(false);
    }
  }

  async function handleNetTopoReset() {
    if (!netTopoTarget) return;
    setNetTopoSaving(true);
    setNetTopoError('');
    try {
      const resetFn = httpsCallable(functions, 'resetNetTopoAdminPassword');
      const res = await resetFn({ tenantId: netTopoTarget.id });
      const data = res.data as { email: string; password: string };
      setNetTopoResult(data);
      if (user) {
        logActivity(user, 'tenant.nettopo_admin_reset', netTopoTarget.id, netTopoTarget.nama, {
          email: data.email,
        });
      }
    } catch (err: unknown) {
      setNetTopoError(err instanceof Error ? err.message : 'Gagal mereset password NetTopo admin');
    } finally {
      setNetTopoSaving(false);
    }
  }

  function gradeNameForId(gradeId: string): string {
    return plans.find((p) => p.id === gradeId)?.nama ?? gradeId;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-xl font-semibold">Kelola RT/RW</h1>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="size-4" />
          Tambah Tenant
        </Button>
      </div>

      {activation && (
        <Card className="border-green-500/20 bg-green-500/5">
          <CardContent className="space-y-3">
            <p className="text-sm text-green-600 dark:text-green-400 font-medium">
              Tenant &quot;{activation.nama}&quot; berhasil dibuat. Bagikan kode aktivasi ini ke tenant
              (lewat WA/Telegram bareng link APK) — dipakai sekali saat pertama kali buka aplikasi
              bill/teknisi/customer:
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="bg-muted text-foreground text-lg font-mono px-4 py-2 rounded-lg tracking-wider break-all">
                {activation.code}
              </code>
              <Button
                variant="ghost"
                size="sm"
                onClick={async () => {
                  await navigator.clipboard.writeText(activation.code);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 2000);
                }}
              >
                {copied ? <Check className="size-3" /> : <Copy className="size-3" />}
                {copied ? 'Tersalin' : 'Salin'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setActivation(null)}
                className="ml-auto text-muted-foreground"
              >
                Tutup
              </Button>
            </div>
            {activation.nettopoEmail && (
              <div className="pt-3 border-t border-green-500/20">
                <p className="text-sm text-green-600 dark:text-green-400 font-medium mb-2">
                  Login Peta Topologi (NetTopo):
                </p>
                <div className="text-sm space-y-1">
                  <p>
                    Email:{' '}
                    <span className="font-mono text-foreground">{activation.nettopoEmail}</span>
                  </p>
                  <p>
                    Password:{' '}
                    <span className="font-mono text-foreground">{activation.nettopoPassword}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Akses via menu &quot;Peta Topologi Jaringan&quot; di aplikasi bill. Ganti password
                    setelah login pertama.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      <AddTenantForm
        plans={plans}
        open={showAddForm}
        onOpenChange={setShowAddForm}
        onCreated={loadAll}
        onShowActivation={(data) => {
          setActivation(data);
          setCopied(false);
        }}
      />

      {loading ? (
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" />
          Memuat data...
        </p>
      ) : tenants.length === 0 ? (
        <p className="text-sm text-muted-foreground">Belum ada tenant terdaftar.</p>
      ) : (
        <TenantTable
          tenants={tenants}
          plans={plans}
          onRenew={(t) => {
            setRenewTarget(t);
            setRenewOpen(true);
          }}
          onDelete={(t) => {
            setDeleteTarget(t);
            setDeleteOpen(true);
          }}
          onGradeChange={(t, newGradeId) => {
            setGradeChangeTarget(t);
            setGradeChangeNewId(newGradeId);
            setGradeChangeOpen(true);
          }}
          onPinReset={(t, tier) => {
            setPinResetTarget({ tenant: t, tier });
            setPinResetDone(false);
            setPinResetOpen(true);
          }}
          onNetTopoAdminReset={(t) => {
            setNetTopoTarget(t);
            setNetTopoResult(null);
            setNetTopoOpen(true);
          }}
          onTeknisiManage={(t) => {
            setTeknisiTarget(t);
            setTeknisiOpen(true);
          }}
        />
      )}

      <RenewDialog
        target={renewTarget}
        open={renewOpen}
        onOpenChange={setRenewOpen}
        saving={renewSaving}
        error={renewError}
        onConfirm={handleRenew}
      />

      <GradeChangeDialog
        target={gradeChangeTarget}
        newGradeId={gradeChangeNewId}
        plans={plans}
        open={gradeChangeOpen}
        onOpenChange={setGradeChangeOpen}
        saving={gradeChangeSaving}
        error={gradeChangeError}
        onConfirm={handleGradeChange}
        onGradeName={gradeNameForId}
      />

      <DeleteDialog
        target={deleteTarget}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        deleting={deleting}
        error={deleteError}
        onConfirm={handleDelete}
      />

      <PinResetDialog
        target={pinResetTarget}
        open={pinResetOpen}
        onOpenChange={setPinResetOpen}
        saving={pinResetSaving}
        error={pinResetError}
        done={pinResetDone}
        onConfirm={handlePinReset}
      />

      <NetTopoResetDialog
        target={netTopoTarget}
        open={netTopoOpen}
        onOpenChange={setNetTopoOpen}
        saving={netTopoSaving}
        error={netTopoError}
        result={netTopoResult}
        onConfirm={handleNetTopoReset}
      />

      <TeknisiDialog target={teknisiTarget} open={teknisiOpen} onOpenChange={setTeknisiOpen} />
    </div>
  );
}
