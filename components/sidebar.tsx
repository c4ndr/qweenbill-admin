'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { collection, getDocs, Timestamp } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { isDevModeEnabled } from '@/lib/dev-mode';
import { isExpiringSoon } from '@/lib/expiry';
import {
  LayoutDashboard,
  Building2,
  FileText,
  CreditCard,
  Bike,
  DollarSign,
  History,
  Smartphone,
  LogOut,
  Menu,
  Shield,
  AlertTriangle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const navItems = [
  { href: '/dashboard', label: 'Ringkasan', icon: LayoutDashboard },
  { href: '/dashboard/tenants', label: 'Kelola RT/RW', icon: Building2 },
  { href: '/dashboard/applications', label: 'Pendaftaran', icon: FileText },
  { href: '/dashboard/plans', label: 'Paket/Grade', icon: CreditCard },
  { href: '/dashboard/jasa', label: 'Jasa ZasaQu', icon: Bike },
  { href: '/dashboard/payments', label: 'Pembayaran', icon: DollarSign },
  { href: '/dashboard/activity', label: 'Log Aktivitas', icon: History },
  { href: '/dashboard/app-version', label: 'Versi App', icon: Smartphone },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {navItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              'flex items-center gap-[8.4px] rounded-lg px-[8.4px] py-[7px] text-[13.5px] font-medium transition-colors',
              isActive
                ? 'border border-primary/35 bg-primary/12 text-[#d2cefd]'
                : 'border border-transparent text-[#b2b6ca] hover:bg-primary/8 hover:text-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default function Sidebar() {
  const router = useRouter();
  const [devMode, setDevMode] = useState(false);
  const [open, setOpen] = useState(false);
  const [expiringSoonCount, setExpiringSoonCount] = useState(0);

  useEffect(() => {
    isDevModeEnabled().then(setDevMode);
  }, []);

  useEffect(() => {
    getDocs(collection(db, 'tenants'))
      .then((snap) => {
        const count = snap.docs.filter((d) => {
          const t = d.data() as { status: string; subscriptionExpiresAt?: Timestamp };
          return isExpiringSoon(t.status, t.subscriptionExpiresAt);
        }).length;
        setExpiringSoonCount(count);
      })
      .catch(() => setExpiringSoonCount(0));
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push('/login');
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <Shield className="h-[18px] w-[18px] text-primary" />
        <div>
          <p className="text-[14.5px] font-medium leading-none">QweenBill</p>
          <p className="text-[11px] text-muted-foreground mt-1">Superadmin</p>
        </div>
        {devMode && (
          <Badge variant="outline" className="ml-auto border-green-500/50 text-green-400 text-[9.5px]">
            DEV
          </Badge>
        )}
      </div>
      <Separator />
      <NavList onNavigate={() => setOpen(false)} />
      <div className="mt-auto space-y-2 p-2">
        {expiringSoonCount > 0 && (
          <div className="flex items-start gap-2 rounded-lg bg-primary/10 p-3 text-[12px] text-[#d2cefd]">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-primary" />
            <span>
              {expiringSoonCount} langganan kadaluarsa dalam 7 hari.
            </span>
          </div>
        )}
        <Separator />
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-muted-foreground"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          Keluar
        </Button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile topbar */}
      <div className="sticky top-0 z-40 flex items-center justify-between border-b bg-background px-4 py-3 md:hidden">
        <div className="flex items-center gap-2">
          <Shield className="h-4 w-4" />
          <span className="text-sm font-medium">QweenBill</span>
        </div>
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger render={<Button variant="ghost" size="icon" className="h-8 w-8" />}>
            <Menu className="h-4 w-4" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64 p-0">
            <div className="flex h-full flex-col">{sidebarContent}</div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-[228px] shrink-0 flex-col border-r border-sidebar-border bg-gradient-to-b from-[#1b1d2d] to-[#161826] text-sidebar-foreground">
        {sidebarContent}
      </aside>
    </>
  );
}
