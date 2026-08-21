'use client';

import { useState } from 'react';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/lib/auth-context';
import { logActivity } from '@/lib/audit-log';
import { daysUntil, isExpiringSoon } from '@/lib/expiry';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Copy,
  Pencil,
  Trash2,
  RefreshCw,
  Shield,
  Globe,
  Users,
  Check,
  X,
} from 'lucide-react';
import {
  fmtDate,
  gradeName,
  STATUS_LABEL,
  STATUS_VARIANT,
  type Plan,
  type Tenant,
} from './types';

interface Props {
  tenants: Tenant[];
  plans: Plan[];
  onRenew: (t: Tenant) => void;
  onDelete: (t: Tenant) => void;
  onGradeChange: (t: Tenant, newGradeId: string) => void;
  onPinReset: (t: Tenant, tier: 1 | 2) => void;
  onNetTopoAdminReset: (t: Tenant) => void;
  onTeknisiManage: (t: Tenant) => void;
}

export function TenantTable({
  tenants,
  plans,
  onRenew,
  onDelete,
  onGradeChange,
  onPinReset,
  onNetTopoAdminReset,
  onTeknisiManage,
}: Props) {
  const { user } = useAuth();
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingCodeId, setEditingCodeId] = useState<string | null>(null);
  const [editCodeValue, setEditCodeValue] = useState('');

  async function setStatus(id: string, status: 'active' | 'suspended') {
    const t = tenants.find((x) => x.id === id);
    await updateDoc(doc(db, 'tenants', id), { status });
    if (user && t) {
      logActivity(user, status === 'active' ? 'tenant.activate' : 'tenant.suspend', id, t.nama, {
        from: t.status,
        to: status,
      });
    }
  }

  async function copyCode(code: string, id: string) {
    await navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function startEditCode(t: Tenant) {
    setEditingCodeId(t.id);
    setEditCodeValue(t.activationCode ?? '');
  }

  async function saveEditCode(id: string) {
    const code = editCodeValue.trim().toUpperCase();
    if (!code) return;
    const t = tenants.find((x) => x.id === id);
    await updateDoc(doc(db, 'tenants', id), { activationCode: code });
    setEditingCodeId(null);
    if (user && t) {
      logActivity(user, 'tenant.activation_code_edit', id, t.nama, {
        from: t.activationCode,
        to: code,
      });
    }
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama RT/RW</TableHead>
              <TableHead>Grade</TableHead>
              <TableHead>Pelanggan</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Kadaluarsa</TableHead>
              <TableHead>Kode Aktivasi</TableHead>
              <TableHead>Aksi</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenants.map((t) => {
              const expiringSoon = isExpiringSoon(t.status, t.subscriptionExpiresAt);
              const daysLeft = daysUntil(t.subscriptionExpiresAt);
              return (
                <TableRow
                  key={t.id}
                  className={expiringSoon ? 'bg-orange-500/5' : undefined}
                >
                  <TableCell>
                    <p className="font-medium">{t.nama}</p>
                    <p className="text-xs text-muted-foreground">{t.email}</p>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {gradeName(plans, t.gradeId)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {t.pelangganCount ?? 0}
                    {t.customerLimit == null ? '' : ` / ${t.customerLimit}`}
                  </TableCell>
                  <TableCell>
                    <Badge variant={STATUS_VARIANT[t.status] ?? 'secondary'}>
                      {STATUS_LABEL[t.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="whitespace-nowrap">
                    <span className="text-muted-foreground">{fmtDate(t.subscriptionExpiresAt)}</span>
                    {expiringSoon && (
                      <span className="block text-xs text-orange-500 dark:text-orange-400 font-medium mt-0.5">
                        {daysLeft === 0 ? 'Hari ini!' : `${daysLeft} hari lagi`}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    {editingCodeId === t.id ? (
                      <div className="flex items-center gap-1.5">
                        <Input
                          value={editCodeValue}
                          onChange={(e) => setEditCodeValue(e.target.value.toUpperCase())}
                          className="h-6 w-28 text-xs font-mono"
                          autoFocus
                        />
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => saveEditCode(t.id)}
                        >
                          <Check className="size-3 text-green-500" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => setEditingCodeId(null)}
                        >
                          <X className="size-3 text-muted-foreground" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <code className="text-xs text-muted-foreground font-mono">
                          {t.activationCode}
                        </code>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => copyCode(t.activationCode, t.id)}
                        >
                          {copiedId === t.id ? (
                            <Check className="size-3 text-green-500" />
                          ) : (
                            <Copy className="size-3" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          onClick={() => startEditCode(t)}
                        >
                          <Pencil className="size-3 text-yellow-500" />
                        </Button>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {t.status !== 'active' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setStatus(t.id, 'active')}
                          className="text-green-600 dark:text-green-400"
                        >
                          Aktifkan
                        </Button>
                      )}
                      {t.status !== 'suspended' && (
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={() => setStatus(t.id, 'suspended')}
                          className="text-destructive"
                        >
                          Suspend
                        </Button>
                      )}
                      <Button variant="ghost" size="xs" onClick={() => onRenew(t)}>
                        <RefreshCw className="size-3" />
                        Perpanjang
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onPinReset(t, 1)}
                        className="text-orange-500"
                      >
                        <Shield className="size-3" />
                        PIN1
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onPinReset(t, 2)}
                        className="text-orange-500"
                      >
                        <Shield className="size-3" />
                        PIN2
                      </Button>
                      {t.features?.petaTopologi && (
                        <>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onNetTopoAdminReset(t)}
                            className="text-indigo-500"
                          >
                            <Globe className="size-3" />
                            NetTopo
                          </Button>
                          <Button
                            variant="ghost"
                            size="xs"
                            onClick={() => onTeknisiManage(t)}
                            className="text-indigo-500"
                          >
                            <Users className="size-3" />
                            Teknisi
                          </Button>
                        </>
                      )}
                      <Select
                        value=""
                        onValueChange={(val) => {
                          if (val) onGradeChange(t, val);
                        }}
                      >
                        <SelectTrigger className="h-6 text-xs text-purple-500 border-purple-500/30">
                          <SelectValue placeholder="Grade..." />
                        </SelectTrigger>
                        <SelectContent>
                          {plans
                            .filter((p) => p.id !== t.gradeId)
                            .map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.nama}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="xs"
                        onClick={() => onDelete(t)}
                        className="text-destructive"
                      >
                        <Trash2 className="size-3" />
                        Hapus
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}


