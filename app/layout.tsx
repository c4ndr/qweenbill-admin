import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { cn } from '@/lib/utils';
import { TooltipProvider } from '@/components/ui/tooltip';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://saas.qbill.uk'),
  title: 'QweenBill Admin',
  description: 'Superadmin panel untuk QweenBill RT/RW Net',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={cn('dark h-full antialiased scroll-smooth', inter.variable)}>
      <body className="min-h-full font-sans">
        <AuthProvider>
          <TooltipProvider>{children}</TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
