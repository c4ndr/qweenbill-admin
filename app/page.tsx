import type { Metadata } from 'next';
import LandingClient from './landing-client';

const title = 'QweenBill — Billing & Manajemen Pelanggan RT/RW Net';
const description =
  'Platform billing & manajemen pelanggan untuk operator RT/RW Net — tagihan otomatis, isolir MikroTik, app teknisi & pelanggan, dalam satu sistem. Coba gratis 7 hari.';

export const metadata: Metadata = {
  title,
  description,
  openGraph: {
    title,
    description,
    url: '/',
    siteName: 'QweenBill',
    locale: 'id_ID',
    type: 'website',
    images: [{ url: '/logo.png', width: 512, height: 512, alt: 'QweenBill' }],
  },
  twitter: {
    card: 'summary',
    title,
    description,
    images: ['/logo.png'],
  },
};

export default function Page() {
  return <LandingClient />;
}
