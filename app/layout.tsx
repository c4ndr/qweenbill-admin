import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

export const metadata: Metadata = {
  metadataBase: new URL('https://saas.qbill.uk'),
  title: 'QweenBill Admin',
  description: 'Superadmin panel untuk QweenBill RT/RW Net',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={cn('dark h-full antialiased scroll-smooth')}>
      <body className="min-h-full">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
