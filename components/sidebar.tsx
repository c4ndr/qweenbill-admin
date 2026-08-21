'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { useEffect, useState } from 'react';
import { isDevModeEnabled } from '@/lib/dev-mode';
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
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

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
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              isActive
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
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

  useEffect(() => {
    isDevModeEnabled().then(setDevMode);
  }, []);

  async function handleLogout() {
    await signOut(auth);
    router.push('/login');
  }

  const sidebarContent = (
    <>
      <div className="flex items-center gap-2 px-4 py-4">
        <Shield className="h-5 w-5 text-primary" />
        <div>
          <p className="text-sm font-semibold leading-none">QweenBill</p>
          <p className="text-xs text-muted-foreground mt-1">Superadmin</p>
        </div>
        {devMode && (
          <Badge variant="outline" className="ml-auto border-green-500/50 text-green-400 text-[10px]">
            DEV
          </Badge>
        )}
      </div>
      <Separator />
      <NavList onNavigate={() => setOpen(false)} />
      <div className="mt-auto p-2">
        <Separator className="mb-2" />
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
          <span className="text-sm font-semibold">QweenBill</span>
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
      <aside className="hidden md:flex w-56 shrink-0 flex-col border-r bg-sidebar text-sidebar-foreground">
        {sidebarContent}
      </aside>
    </>
  );
}
