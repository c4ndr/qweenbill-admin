import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { buttonVariants } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Kebijakan Privasi — QweenBill',
  description: 'Kebijakan privasi aplikasi QweenBill (QweenBill, QweenBill Teknisi, QweenBill Pelanggan).',
};

const LAST_UPDATED = '22 November 2026';
const CONTACT_EMAIL = 'support@qbill.uk';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-8">
      <h2 className="text-[19px] font-medium">{title}</h2>
      <div className="mt-2 space-y-3 text-[14px] leading-relaxed text-[#9397ab]">{children}</div>
    </section>
  );
}

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex h-[49px] max-w-[840px] items-center justify-between px-[22.4px]">
          <Link href="/" className="flex items-center gap-2">
            <Image src="/logo.png" alt="QweenBill" width={26} height={26} className="rounded-lg" />
            <span className="text-[17px] font-medium">QweenBill</span>
          </Link>
          <Link href="/" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
            <ArrowLeft className="size-4" />
            Kembali
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-[840px] px-[22.4px] py-16">
        <h1 className="text-[30px] font-medium">Kebijakan Privasi</h1>
        <p className="mt-2 text-[13px] text-[#75798c]">Terakhir diperbarui: {LAST_UPDATED}</p>

        <p className="mt-6 text-[14px] leading-relaxed text-[#9397ab]">
          Kebijakan Privasi ini berlaku untuk seluruh aplikasi dalam ekosistem <strong className="text-foreground">QweenBill</strong>
          {' '}— yaitu aplikasi <strong className="text-foreground">QweenBill</strong> (admin/operator), <strong className="text-foreground">QweenBill Teknisi</strong>
          {' '}(portal teknisi lapangan), <strong className="text-foreground">QweenBill Pelanggan</strong>, dan situs web ini
          (<em>saas.qbill.uk</em>) — yang secara bersama disebut &quot;Layanan&quot;. QweenBill adalah perangkat lunak yang disewakan
          (SaaS) kepada operator RT/RW Net (&quot;Mitra&quot;) untuk mengelola layanan internet mereka.
        </p>

        <Section title="1. Siapa Mengendalikan Data Apa">
          <p>
            QweenBill bertindak sebagai <strong className="text-foreground">penyedia perangkat lunak (data processor)</strong> bagi
            Mitra. Data pelanggan internet (nama, alamat, nomor telepon, status tagihan, dll.) yang dikelola di dalam Layanan adalah
            milik dan menjadi tanggung jawab Mitra masing-masing sebagai pengendali data. QweenBill menyimpan data tersebut dengan aman
            dan tidak menjual atau membagikannya ke pihak ketiga di luar keperluan operasional Layanan.
          </p>
          <p>
            Bagian di bawah ini menjelaskan data yang dikumpulkan langsung dari <strong className="text-foreground">pengguna aplikasi</strong>
            {' '}(admin, teknisi, atau pelanggan yang login ke Layanan).
          </p>
        </Section>

        <Section title="2. Data yang Kami Kumpulkan">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Data akun</strong> — nomor telepon dan kata sandi (admin menggunakan PIN) untuk proses
              masuk (login), dikelola lewat Firebase Authentication.
            </li>
            <li>
              <strong className="text-foreground">Data operasional</strong> — data pelanggan RT/RW Net (nama, alamat, nomor telepon,
              tagihan, status pembayaran), data paket/langganan, dan data teknisi, disimpan di Firebase Firestore milik Mitra terkait.
            </li>
            <li>
              <strong className="text-foreground">Foto</strong> — foto bukti pekerjaan teknisi dan foto bukti pembayaran, diunggah
              pengguna secara sukarela lewat fitur kamera/galeri, disimpan di Firebase Storage.
            </li>
            <li>
              <strong className="text-foreground">Token notifikasi</strong> — untuk mengirim notifikasi push (Firebase Cloud Messaging),
              misalnya notifikasi tugas baru atau pesan chat.
            </li>
            <li>
              <strong className="text-foreground">Data perangkat &amp; log teknis</strong> — informasi standar seperti versi aplikasi dan
              log error, untuk keperluan diagnosa teknis.
            </li>
          </ul>
          <p>
            Kami <strong className="text-foreground">tidak</strong> mengakses lokasi GPS perangkat secara langsung. Tombol &quot;buka
            lokasi di Maps&quot; hanya membuka aplikasi peta eksternal menggunakan koordinat alamat yang sudah tersimpan di data
            pelanggan, bukan lokasi perangkat pengguna saat itu.
          </p>
        </Section>

        <Section title="3. Izin Khusus yang Digunakan">
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong className="text-foreground">Notifikasi</strong> — untuk mengirim pemberitahuan tugas/chat/tagihan.
            </li>
            <li>
              <strong className="text-foreground">Kamera &amp; Galeri</strong> — untuk mengunggah foto bukti pekerjaan/pembayaran.
            </li>
            <li>
              <strong className="text-foreground">Tampil di atas aplikasi lain (overlay)</strong> — khusus aplikasi QweenBill Teknisi &amp;
              Pelanggan, dipakai untuk menampilkan bubble chat mengambang ala pesan instan, supaya notifikasi pesan tetap terlihat saat
              pengguna berpindah aplikasi.
            </li>
            <li>
              <strong className="text-foreground">Layanan latar depan (foreground service)</strong> — menjaga bubble chat &amp; koneksi
              notifikasi tetap aktif selama aplikasi digunakan.
            </li>
          </ul>
        </Section>

        <Section title="4. Bagaimana Data Digunakan">
          <p>
            Data digunakan semata-mata untuk menjalankan fungsi inti Layanan: autentikasi pengguna, pengelolaan tagihan &amp; pelanggan,
            penugasan &amp; pelacakan pekerjaan teknisi, komunikasi (chat) antara admin/teknisi/pelanggan, dan pengiriman notifikasi
            terkait. Kami tidak menggunakan data untuk iklan ataupun menjualnya ke pihak ketiga.
          </p>
        </Section>

        <Section title="5. Berbagi Data ke Pihak Ketiga">
          <p>
            Data diproses lewat <strong className="text-foreground">Google Firebase</strong> (Authentication, Firestore, Cloud
            Functions, Cloud Messaging, Storage) sebagai penyedia infrastruktur cloud. Untuk Mitra yang mengaktifkan integrasi
            MikroTik/RADIUS, kredensial perangkat jaringan Mitra disimpan terenkripsi dan hanya dipakai untuk komunikasi ke perangkat
            milik Mitra sendiri. Kami tidak membagikan data pengguna ke pengiklan atau broker data pihak ketiga.
          </p>
        </Section>

        <Section title="6. Keamanan &amp; Penyimpanan">
          <p>
            Data dipisahkan per-Mitra (multi-tenant) dengan aturan akses (Firestore Security Rules) yang membatasi setiap Mitra hanya
            bisa mengakses datanya sendiri. Kata sandi/PIN disimpan menggunakan mekanisme autentikasi aman dari Firebase, bukan dalam
            bentuk teks biasa.
          </p>
        </Section>

        <Section title="7. Hak Anda &amp; Penghapusan Data">
          <p>
            Anda dapat meminta penghapusan akun dan data pribadi yang terkait dengan Anda dengan menghubungi kami melalui kontak di
            bawah, atau menghubungi admin RT/RW Net (Mitra) tempat Anda terdaftar sebagai pelanggan/teknisi. Permintaan akan diproses
            dalam waktu wajar setelah verifikasi identitas.
          </p>
        </Section>

        <Section title="8. Privasi Anak">
          <p>Layanan ini ditujukan untuk penggunaan oleh operator usaha dan karyawan/pelanggan dewasa, bukan untuk anak-anak.</p>
        </Section>

        <Section title="9. Perubahan Kebijakan">
          <p>
            Kebijakan ini dapat diperbarui sewaktu-waktu. Perubahan material akan tercermin dari tanggal &quot;Terakhir diperbarui&quot;
            di atas.
          </p>
        </Section>

        <Section title="10. Kontak">
          <p>
            Pertanyaan seputar privasi dapat dikirim ke{' '}
            <a href={`mailto:${CONTACT_EMAIL}`} className="text-foreground underline">
              {CONTACT_EMAIL}
            </a>
            .
          </p>
        </Section>
      </section>
    </div>
  );
}
