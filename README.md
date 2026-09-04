# Monitoring Program Kerja PPDF

Sistem informasi berbasis web untuk pemantauan (monitoring) pelaksanaan program kerja dan kedisiplinan pelaporan anggota per divisi di lingkungan PPDF.

## 🚀 Fitur Utama

- **Pelaporan Berbasis Sesi**: Laporan pelaksanaan program harian, mingguan, bulanan, maupun insidental yang memerlukan bukti berupa foto atau dokumen.
- **Pembangkit Jadwal Otomatis (Cron)**: Sistem mampu meng-generate jadwal kegiatan (*schedule*) secara otomatis berdasarkan konfigurasi program.
- **Notifikasi Multi-Saluran**: Pemberitahuan jadwal dan laporan melalui *Web Push Notification* serta Telegram Bot.
- **Dasbor & Kalender Interaktif**: Tampilan jadwal, batas waktu (*deadline*) divisi, tugas, dan statistik kinerja.
- **Ekspor Laporan PDF**: Rangkuman laporan bulanan dapat diekspor langsung ke format PDF.
- **Integrasi API**: Tersedia *endpoint* bagi aplikasi eksternal untuk membaca ringkasan statistik divisi.

## 🛠️ Stack Teknologi

Sistem ini dibangun dengan pendekatan modern yang berfokus pada performa dan pengelolaan data yang mudah dipelihara:

- **Framework**: [Next.js](https://nextjs.org/) (App Router, v14/15+) & React 19
- **Bahasa**: TypeScript
- **Database & ORM**: PostgreSQL & [Prisma](https://www.prisma.io/)
- **UI/Styling**: [Tailwind CSS v4](https://tailwindcss.com/) & [Radix UI](https://www.radix-ui.com/)
- **Data Fetching**: React Query
- **Autentikasi**: Next-Auth (v5)
- **Penyimpanan (Storage)**: Kompatibel dengan AWS S3 API (contoh: Supabase Storage, MinIO)

## 📦 Menjalankan Proyek secara Lokal

### Prasyarat

Pastikan Anda telah menginstal `Node.js` (disarankan LTS) dan `pnpm` (karena proyek ini menggunakan pnpm-lock.yaml).

### Langkah Instalasi

1. Klon repositori ini dan masuk ke dalam folder proyek.
2. Salin *environment file*:
   ```bash
   cp .env.example .env
   ```
   Lalu sesuaikan nilai variabel yang dibutuhkan di dalam `.env` (terutama `DATABASE_URL`).
3. Instal semua dependensi:
   ```bash
   pnpm install
   ```
4. Sinkronisasi database Prisma:
   ```bash
   pnpm prisma generate
   pnpm prisma db push
   ```
5. (Opsional) Inisialisasi data awal / testing:
   ```bash
   pnpm reset:data
   ```

### Menjalankan Server Development

Untuk menjalankan server di mode *development*:

```bash
pnpm dev
```

Buka [http://localhost:3000](http://localhost:3000) pada browser.

*Terdapat opsi menjalankan development dengan proxy SSL (`pnpm dev:ssl`) menggunakan `local-ssl-proxy`, yang berguna apabila sedang menguji fitur Web Push Notification (yang umumnya mewajibkan protokol HTTPS).*

## ⚙️ Environment Variables (Konfigurasi Lingkungan)

Berikut adalah ringkasan dari konfigurasi yang tersedia:

**Wajib:**
- `DATABASE_URL`: Connection string menuju database PostgreSQL Anda.

**Opsional (Direkomendasikan):**
- `CRON_SECRET`: Bearer token (string acak) untuk melindungi rute API cron dari pemanggilan sembarangan.
- `MAX_UPLOAD_MB`: Ukuran maksimal file bukti (default: 10).
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`: Kredensial manajemen bucket storage (jika menggunakan Supabase).
- `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`: Variabel yang digunakan untuk mengenkripsi pengiriman Web Push.
- `SCHEDULE_REMINDER_LEAD_MINUTES`, `SCHEDULE_REMINDER_LATE_TOLERANCE_MINUTES`: Toleransi waktu kapan pengingat otomatis dikirimkan.
- `INTEGRATION_CLIENTS_JSON`: Kredensial *API keys* bagi klien eksternal.

## 📚 Dokumentasi Terkait

- [Dokumentasi Integrasi API (docs/integration-api.md)](./docs/integration-api.md)
