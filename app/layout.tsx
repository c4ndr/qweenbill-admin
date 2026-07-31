import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';

export const metadata: Metadata = {
  metadataBase: new URL('https://saas.qbill.uk'),
  title: 'QweenBill Admin',
  description: 'Superadmin panel untuk QweenBill RT/RW Net',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className="h-full antialiased scroll-smooth">
      <body className="min-h-full bg-gray-950">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
