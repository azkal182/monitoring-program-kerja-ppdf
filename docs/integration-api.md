# Integration API (Parity dengan Internal Field App)

Dokumen ini menjelaskan integrasi aplikasi eksternal yang **sama flow-nya** dengan sistem internal (`/field/today` + sesi + upload + submit).

## Indicator Update Docs

- `DOC_VERSION`: `2.0`
- `LAST_UPDATED`: `2026-04-26`
- `STATUS`: `UPDATED - parity flow with internal field app`
- `CHANGES`:
  - menambahkan flow end-to-end yang sama dengan app internal,
  - menambahkan endpoint integrasi untuk start session, upload foto/dokumen, dan submit session,
  - menambahkan kontrak request/response per endpoint.

---

## Kenapa tidak cukup `divisionId` saja?

Tidak cukup. `divisionId` mudah ditebak dan bisa disalahgunakan.

Mekanisme keamanan yang dipakai:

- setiap aplikasi eksternal punya `apiKey` sendiri,
- setiap `apiKey` dibatasi ke `divisionIds` tertentu,
- request wajib menyertakan API key di header.

## Konfigurasi Environment (Server)

Tambahkan di `.env` server:

```env
INTEGRATION_CLIENTS_JSON=[{"name":"mobile-lapangan","apiKey":"isi-key-random-panjang","divisionIds":["cmabc123division"]}]
```

Type konfigurasi:

```ts
type IntegrationClientConfig = {
  name: string;
  apiKey: string; // minimal 16 karakter
  divisionIds: string[];
};
```

## Authentication Header

Pilih salah satu:

- `Authorization: Bearer <apiKey>`
- `x-integration-key: <apiKey>`

---

## Flow Sama Persis dengan Internal Field App

Urutan flow yang direkomendasikan:

1. Ambil jadwal hari ini (scope divisi).
2. Mulai session untuk `scheduleId`.
3. Upload bukti (foto atau dokumen, sesuai requirement program).
4. Submit session (`COMPLETED` / `COMPLETED_WITH_ISSUE`).

Flow ini mirror dengan endpoint internal:

- Internal: `/api/field/today` -> `/api/sessions` -> `/api/sessions/:id/photos|documents` -> `/api/sessions/:id`
- Integrasi: `/api/integrations/v1/field/today` -> `/api/integrations/v1/sessions` -> `/api/integrations/v1/sessions/:id/photos|documents` -> `/api/integrations/v1/sessions/:id`

---

## Endpoint List (Integrasi)

### 1) Get Today Schedules

`GET /api/integrations/v1/field/today?divisionId=<divisionId>`

Catatan:

- jika API key hanya punya 1 divisi, `divisionId` boleh tidak dikirim,
- jika API key punya >1 divisi, `divisionId` wajib.

Response: shape mengikuti endpoint internal `/api/field/today`.

Error umum:

- `401` key tidak ada / tidak valid,
- `400` `divisionId` wajib untuk key multi-divisi,
- `403` `divisionId` di luar scope key.

---

### 2) Start Session

`POST /api/integrations/v1/sessions`

Request:

```ts
type StartSessionRequest = {
  scheduleId: string;
};
```

Behavior:

- validasi jadwal ada,
- validasi divisi jadwal ada dalam scope API key,
- validasi aturan waktu (maksimal 30 menit sebelum `scheduleTime`),
- hanya satu session per `scheduleId`.

Response `201`: shape session setara endpoint internal start session.

Error umum:

- `400` jadwal sudah punya session / terlalu dini,
- `403` jadwal di luar scope key,
- `404` jadwal tidak ditemukan,
- `422` tidak ada user divisi untuk owner session.

---

### 3) Get Session Detail

`GET /api/integrations/v1/sessions/:id`

Response: detail session + photos + documents (setara internal).

Error umum:

- `403` session di luar scope key,
- `404` session tidak ditemukan.

---

### 4) Upload Photo Evidence

`POST /api/integrations/v1/sessions/:id/photos`

Content-Type: `multipart/form-data`

Field form-data:

- `file`: File gambar (wajib)
- `caption`: string (opsional)

Validasi mengikuti internal:

- session harus `DRAFT`,
- requirement program harus `PHOTO`,
- ukuran file sesuai `MAX_UPLOAD_MB`,
- MIME harus image.

Response `201`:

```ts
type PhotoResponse = {
  id: string;
  url: string;
  caption: string | null;
  storagePath: string;
  sessionId: string;
  createdAt: string;
};
```

#### List Photos

`GET /api/integrations/v1/sessions/:id/photos`

#### Delete Photo

`DELETE /api/integrations/v1/sessions/:id/photos?photoId=<photoId>`

---

### 5) Upload Document Evidence

`POST /api/integrations/v1/sessions/:id/documents`

Content-Type: `multipart/form-data`

Field form-data:

- `file`: File dokumen (wajib)
- `name`: nama tampilan dokumen (opsional)

Validasi mengikuti internal:

- session harus `DRAFT`,
- requirement program harus `DOCUMENT`,
- ukuran file sesuai `MAX_UPLOAD_MB`,
- MIME dokumen yang diizinkan (`pdf/doc/docx/txt`).

Response `201`:

```ts
type DocumentResponse = {
  id: string;
  url: string;
  filename: string;
  storagePath: string;
  sessionId: string;
  createdAt: string;
};
```

#### List Documents

`GET /api/integrations/v1/sessions/:id/documents`

#### Delete Document

`DELETE /api/integrations/v1/sessions/:id/documents?documentId=<documentId>`

---

### 6) Submit Session

`PUT /api/integrations/v1/sessions/:id`

Request:

```ts
type SubmitSessionRequest = {
  status: "COMPLETED" | "COMPLETED_WITH_ISSUE";
  issueNote?: string;
};
```

Validasi mengikuti internal:

- session harus `DRAFT`,
- jika `COMPLETED_WITH_ISSUE` maka `issueNote` wajib,
- jumlah bukti harus >= `minUploads` sesuai requirement program.

Response `200`: session terbaru.

Error umum:

- `400` payload invalid / bukti kurang / session sudah final,
- `403` session di luar scope key,
- `404` session tidak ditemukan.

---

## Kompatibilitas Endpoint Existing `/api/field/today`

Selain endpoint integrasi di atas, endpoint existing ini juga support API key:

- `GET /api/field/today?divisionId=<divisionId>`

Namun untuk flow parity penuh (start/upload/submit), gunakan endpoint `/api/integrations/v1/*`.

---

## cURL Singkat

### A) Ambil jadwal hari ini

```bash
curl -X GET "http://localhost:3000/api/integrations/v1/field/today?divisionId=cmabc123division" \
  -H "Authorization: Bearer isi-key-random-panjang"
```

### B) Mulai session

```bash
curl -X POST "http://localhost:3000/api/integrations/v1/sessions" \
  -H "Authorization: Bearer isi-key-random-panjang" \
  -H "Content-Type: application/json" \
  -d '{"scheduleId":"cmscheduleid123"}'
```

### C) Upload foto

```bash
curl -X POST "http://localhost:3000/api/integrations/v1/sessions/cmsessionid123/photos" \
  -H "Authorization: Bearer isi-key-random-panjang" \
  -F "file=@/path/to/photo.jpg" \
  -F "caption=Dokumentasi kegiatan"
```

### D) Submit session

```bash
curl -X PUT "http://localhost:3000/api/integrations/v1/sessions/cmsessionid123" \
  -H "Authorization: Bearer isi-key-random-panjang" \
  -H "Content-Type: application/json" \
  -d '{"status":"COMPLETED"}'
```

---

## Legacy Endpoint (Tetap Ada)

Endpoint berikut masih tersedia untuk backward compatibility:

- `GET /api/integrations/v1/divisions/:divisionId/schedules`
- `POST /api/integrations/v1/divisions/:divisionId/reports`

Untuk implementasi baru, pakai flow parity `/api/integrations/v1/sessions*`.
