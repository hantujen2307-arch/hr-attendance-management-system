# HR & ATTENDANCE MANAGEMENT SYSTEM — RINGKASAN OPERASIONAL PRODUKSI
## Panduan Singkat: Backup, Restore, Migration, Deployment, dan Recovery

Dokumen ini adalah panduan referensi cepat (*quick reference*) bagi tim DevOps, SRE, dan Administrator Sistem dalam mengoperasikan **HR & Attendance Management System** di lingkungan produksi.

---

## 1. Prosedur Backup Database

Sistem menyediakan script otomatis [scripts/backup.sh](file:///Users/jesen/Documents/kodingan/PROJECT%201%20%E2%80%94%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/scripts/backup.sh) yang membuat dump terkompresi dengan format native PostgreSQL Custom Archive (`-Fc`).

### Menjalankan Backup Rutin / On-Demand
```bash
# Jalankan dari root direktori proyek
./scripts/backup.sh
```
* **Output:** Tersimpan di folder `./backups/hr_attendance_YYYYMMDD_HHMMSS.dump`.
* **Integritas:** Diverifikasi otomatis menggunakan header check `pg_restore -l`.
* **Retensi:** Rotasi otomatis menghapus file dump lokal yang lebih tua dari 30 hari.

### Menjadwalkan Backup Otomatis (Cron Job)
Tambahkan ke crontab server (`crontab -e`):
```cron
# Eksekusi backup setiap hari pukul 02:00 WIB
0 2 * * * cd /path/to/project && ./scripts/backup.sh >> /var/log/hr_db_backup.log 2>&1
```

---

## 2. Prosedur Restore Database

Sistem menyediakan script pemulihan [scripts/restore.sh](file:///Users/jesen/Documents/kodingan/PROJECT%201%20%E2%80%94%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/scripts/restore.sh) dengan proteksi *safety interlock*.

### Menjalankan Pemulihan
```bash
# Wajib menyertakan flag --confirm untuk mencegah restore tidak disengaja
./scripts/restore.sh ./backups/hr_attendance_20260921_212149.dump --confirm
```

### Restore Manual via CLI
```bash
pg_restore --clean --if-exists --no-owner --no-privileges -d "$DATABASE_URL" ./backups/<file_backup>.dump
```

---

## 3. Prosedur Database Migration

> [!CAUTION]
> **JANGAN PERNAH** menggunakan `npx prisma db push` di server produksi karena dapat menghapus kolom dan merusak riwayat skema. Selalu gunakan `prisma migrate deploy`.

### Menjalankan Migration Produksi
```bash
cd backend
# 1. Generate Prisma Client sesuai skema terbaru
npx prisma generate

# 2. Terapkan seluruh migrasi yang belum dieksekusi secara idempotent
npx prisma migrate deploy

# 3. Verifikasi status sinkronisasi skema
npx prisma migrate status
cd ..
```

### Inisialisasi Akun Superadmin Pertama (Tanpa Dummy Data)
Untuk instance baru tanpa data dummy, buat akun Superadmin awal secara aman:
```bash
# Dari root:
ADMIN_EMAIL="admin@perusahaan.com" ADMIN_PASSWORD="PasswordKuat2026!" npm run admin:create

# Atau dari folder backend:
cd backend
ADMIN_EMAIL="admin@perusahaan.com" ADMIN_PASSWORD="PasswordKuat2026!" npm run admin:create
cd ..
```

---

## 4. Prosedur Deployment & Update (Zero-Downtime)

Alur standar pembaruan aplikasi produksi:

```bash
# Langkah 1: Buat snapshot backup database pre-deployment
./scripts/backup.sh

# Langkah 2: Ambil rilis kode terbaru
git fetch --tags
git checkout tags/vX.Y.Z # atau git pull origin main

# Langkah 3: Install dependency produksi
npm install --omit=dev
cd backend && npm install --omit=dev

# Langkah 4: Jalankan migrasi database
npx prisma generate
npx prisma migrate deploy
cd ..

# Langkah 5: Kompilasi bundle produksi
cd backend && npm run build && cd ..
npm run build

# Langkah 6: Reload service dengan process manager
pm2 reload ecosystem.config.js # atau systemctl restart hr-backend hr-frontend

# Langkah 7: Verifikasi liveness & readiness probe
curl -f http://127.0.0.1:5001/api/health/ready || echo "❌ Service Not Ready"
```

---

## 5. Prosedur Rollback & Disaster Recovery

Jika terjadi kegagalan kritis setelah rilis atau server mengalami *crash*:

### Skenario A: Rollback Aplikasi Saja (Skema Database Tidak Berubah)
```bash
# 1. Kembalikan kode ke tag/commit stabil sebelumnya
git checkout <previous-tag-or-commit>

# 2. Re-build backend dan frontend
cd backend && npm run build && cd ..
npm run build

# 3. Reload PM2
pm2 reload ecosystem.config.js

# 4. Cek health status
curl -s http://127.0.0.1:5001/api/health/ready
```

### Skenario B: Full Rollback (Aplikasi + Restore Database Pre-Deployment)
```bash
# 1. Stop traffic sementara (atau alihkan maintenance page di Nginx)
# 2. Kembalikan kode ke versi stabil
git checkout <previous-tag-or-commit>

# 3. Restore database dari snapshot yang dibuat sebelum rilis
./scripts/restore.sh ./backups/hr_attendance_pre_deploy_XXXX.dump --confirm

# 4. Generate ulang Prisma Client dan build ulang
cd backend && npx prisma generate && npm run build && cd ..
npm run build

# 5. Nyalakan kembali service
pm2 reload ecosystem.config.js

# 6. Validasi integritas data dan koneksi
curl -s http://127.0.0.1:5001/api/health/ready
```

---

## 6. Health Check Probes untuk Monitoring

Endpoint health check aktif dan siap dihubungkan ke Uptime Kuma, Prometheus, AWS ALB, atau Datadog:

| Probe | Endpoint | Expected Response | Keterangan |
| :--- | :--- | :--- | :--- |
| **Liveness** | `GET /api/health/live` | `{"status":"ok","uptime":3600,...}` | Memverifikasi proses Node.js aktif |
| **Readiness** | `GET /api/health/ready` | `{"status":"ok","database":"connected","ready":true}` | Memverifikasi koneksi PostgreSQL aktif |
| **Database** | `GET /api/health/database` | `{"status":"ok","database":"connected"}` | Pengecekan spesifik query database |
| **Basic** | `GET /api/health` | `{"status":"ok"}` | Status dasar backend |

---

## 7. Referensi Dokumen Terkait
- Panduan Lengkap Deployment: [DEPLOYMENT.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20%E2%80%94%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/DEPLOYMENT.md)
- Panduan Lengkap Disaster Recovery: [BACKUP.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20%E2%80%94%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/BACKUP.md)
- Checklist 28 Poin Kesiapan Produksi: [PRODUCTION_CHECKLIST.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20%E2%80%94%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/PRODUCTION_CHECKLIST.md)
