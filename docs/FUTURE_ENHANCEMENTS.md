# Monitoring App - Future Enhancements

Dokumen ini berisi daftar fitur lanjutan yang dapat diimplementasikan setelah MVP selesai.

---

## 1. Telegram Bot Integration

### Deskripsi
Integrasi bot Telegram untuk memudahkan pelaporan dan notifikasi real-time kepada anggota dan koordinator.

### Fitur Detail

#### 1.1 Setup Bot & Authentication
- Buat bot via BotFather
- Link akun Telegram dengan akun user di sistem
- Perintah `/start` untuk register telegramId ke profil user

#### 1.2 Reminder Jadwal Harian
- Kirim reminder otomatis setiap pagi (misal 06:00)
- Daftar program yang harus dilaksanakan hari ini
- Format: nama program, waktu, minimal foto

#### 1.3 Quick Report via Bot
- Perintah `/lapor` untuk memulai sesi
- Upload foto langsung dari chat
- Kirim caption sebagai catatan
- Perintah `/selesai` untuk submit

#### 1.4 Notifikasi ke Koordinator
- Alert jika program tidak terlaksana
- Notifikasi saat anggota submit dengan kendala
- Summary harian keterlaksanaan

### Tech Stack
- `node-telegram-bot-api` atau `grammy`
- Webhook endpoint di Next.js API

### Estimasi: 6-8 jam

---

## 2. Export Laporan PDF/Excel

### Deskripsi
Fitur untuk mengekspor rekap pelaksanaan program dalam format yang bisa dicetak atau diarsipkan.

### Fitur Detail

#### 2.1 Export PDF
- Rekap per divisi atau per program
- Include foto bukti pelaksanaan
- Tanda tangan digital koordinator
- Format siap cetak A4

#### 2.2 Export Excel
- Data tabular lengkap
- Filter by tanggal, divisi, program
- Pivot-ready untuk analisis
- Status pelaksanaan dengan warna

#### 2.3 Scheduled Report
- Kirim rekap mingguan via email
- Auto-generate di akhir bulan
- Archive ke cloud storage

### Tech Stack
- `@react-pdf/renderer` atau `puppeteer` untuk PDF
- `exceljs` atau `xlsx` untuk Excel

### Estimasi: 5-6 jam

---

## 3. Progressive Web App (PWA)

### Deskripsi
Membuat aplikasi dapat diinstall di perangkat mobile dan bekerja offline.

### Fitur Detail

#### 3.1 Installable App
- Manifest.json dengan icon dan splash screen
- Add to Home Screen prompt
- Standalone mode tanpa browser UI

#### 3.2 Offline Support
- Cache halaman utama field app
- Queue foto upload saat offline
- Sync otomatis saat online

#### 3.3 Push Notifications
- Reminder jadwal via browser push
- Notifikasi submit berhasil
- Alert dari koordinator

### Tech Stack
- `next-pwa` package
- Service Worker dengan Workbox
- Web Push API

### Estimasi: 4-5 jam

---

## 4. Cloud Storage Migration

### Deskripsi
Migrasi penyimpanan foto dari local filesystem ke cloud storage untuk reliability dan scalability.

### Fitur Detail

#### 4.1 Uploadthing Integration
- Direct upload dari client
- Image optimization otomatis
- CDN delivery

#### 4.2 Vercel Blob (Alternatif)
- Native integration dengan Vercel
- Simple API
- Pay-per-use pricing

#### 4.3 Migration Script
- Migrasi foto existing ke cloud
- Update URL di database
- Fallback untuk local files

### Tech Stack
- `uploadthing` atau `@vercel/blob`
- Image optimization dengan `sharp`

### Estimasi: 3-4 jam

---

## 5. Detail Enhancements

### Deskripsi
Peningkatan UI/UX dan fitur pendukung untuk pengalaman yang lebih baik.

### Fitur Detail

#### 5.1 Filter & Search
- Search bar di halaman list
- Filter by status, divisi, tanggal
- Sort options (terbaru, nama, dll)

#### 5.2 Pagination
- Infinite scroll atau numbered pages
- Items per page selector
- Total count indicator

#### 5.3 Date Range Picker
- Filter monitoring by rentang tanggal
- Preset: Hari ini, Minggu ini, Bulan ini
- Custom range

#### 5.4 Chart Visualization
- Line chart tren keterlaksanaan
- Bar chart perbandingan divisi
- Pie chart status distribusi

#### 5.5 Activity Log
- Log semua aktivitas user
- Audit trail untuk tracking
- Export log untuk compliance

### Tech Stack
- `recharts` atau `chart.js` untuk visualisasi
- `date-fns` untuk date manipulation
- `@tanstack/react-table` untuk advanced tables

### Estimasi: 6-8 jam

---

## Prioritas Pengerjaan

| No | Fitur | Prioritas | Estimasi |
|----|-------|-----------|----------|
| 1 | Telegram Bot | Tinggi | 6-8 jam |
| 2 | Export Laporan | Tinggi | 5-6 jam |
| 3 | Detail Enhancements | Sedang | 6-8 jam |
| 4 | PWA Support | Sedang | 4-5 jam |
| 5 | Cloud Storage | Rendah* | 3-4 jam |

*Cloud Storage prioritas rendah karena local storage cukup untuk development/small scale

---

## Catatan Teknis

### Database Changes Required
- Telegram: Tambah field `telegramId` di User (sudah ada di schema)
- Activity Log: Model baru `ActivityLog`

### Environment Variables Baru
```env
# Telegram Bot
TELEGRAM_BOT_TOKEN=your-bot-token

# Email (untuk scheduled reports)
SMTP_HOST=smtp.example.com
SMTP_USER=noreply@example.com
SMTP_PASS=password

# Cloud Storage (pilih salah satu)
UPLOADTHING_SECRET=your-secret
# atau
BLOB_READ_WRITE_TOKEN=your-token
```

### Deployment Considerations
- Telegram webhook memerlukan HTTPS
- Cron jobs untuk scheduled reports (Vercel Cron atau external)
- Cloud storage untuk production
