# HR & ATTENDANCE MANAGEMENT SYSTEM — DATABASE BACKUP & DISASTER RECOVERY GUIDE

Panduan lengkap mengenai kebijakan, strategi, prosedur operasional pencadangan (*backup*), pemulihan (*disaster recovery*), dan retensi data untuk database PostgreSQL **HR & Attendance Management System**.

---

## 1. Strategi & Prinsip Backup

Sistem menerapkan prinsip **3-2-1 Backup Strategy**:
- **3 Salinan Data**: 1 database operasional aktif + 2 salinan backup.
- **2 Media Berbeda**: Penyimpanan disk lokal server (SSD NVMe) + Cloud Object Storage (S3 / GCS / Cloudflare R2).
- **1 Salinan Off-site**: Salinan di luar datacenter utama untuk melindungi dari kegagalan fisik fasilitas.

### Metrik Target Pemulihan
- **Recovery Point Objective (RPO)**: $\le 24$ jam (maksimum data hilang jika terjadi bencana total; dapat diturunkan menjadi $\le 1$ jam bila mengaktifkan WAL Archiving / Point-in-Time Recovery).
- **Recovery Time Objective (RTO)**: $\le 60$ menit (waktu maksimal yang dibutuhkan untuk memulihkan database hingga operasional kembali).

---

## 2. Prosedur Backup Database

Sistem telah dilengkapi script otomasi di `scripts/backup.sh` yang mengeksekusi `pg_dump` dengan format Custom Archive (`-Fc`).

### 2.1 Menggunakan Script Otomatis (`scripts/backup.sh`)

Script ini secara otomatis:
1. Membaca `DATABASE_URL` dari environment atau `backend/.env`.
2. Membersihkan parameter query Prisma (seperti `?schema=public`) agar kompatibel dengan PostgreSQL native CLI.
3. Membuat dump terkompresi dengan format Custom Archive (`.dump`).
4. Memvalidasi integritas file arsip menggunakan `pg_restore -l`.
5. Melakukan rotasi penghapusan file backup lokal yang lebih tua dari batas retensi (default: 30 hari).

**Menjalankan backup:**
```bash
# Jalankan dari root workspace
./scripts/backup.sh
```

**Output contoh:**
```
=================================================================
📦 Starting HR & Attendance Database Backup
📅 Timestamp: 20260920_145517
📁 Destination: ./backups/hr_attendance_20260920_145517.dump
=================================================================
🔍 Verifying backup archive header...
✅ Custom dump successfully verified (284K)
🧹 Applying retention policy (30 days)...
🎉 Backup completed successfully.
=================================================================
```

### 2.2 Perintah Manual `pg_dump`

Jika perlu melakukan backup manual tanpa script:

```bash
# Custom Archive terkompresi (Sangat direkomendasikan untuk restore cepat dan hemat ruang)
pg_dump -Fc --no-owner --no-privileges "postgresql://user:password@localhost:5432/hr_attendance_db" -f "./backups/manual_backup_$(date +%Y%m%d).dump"

# Plain SQL text (Alternatif jika ingin menginspeksi DDL/DML secara langsung)
pg_dump --clean --if-exists --no-owner "postgresql://user:password@localhost:5432/hr_attendance_db" -f "./backups/manual_backup_$(date +%Y%m%d).sql"
```

**Penjelasan Flag Penting:**
- `-Fc`: Format Custom Archive (terkompresi secara native oleh zlib, mendukung seleksi tabel saat restore).
- `--no-owner`: Menghindari kegagalan restore akibat perbedaan nama role/user di database target.
- `--no-privileges`: Mencegah override hak akses hak istimewa (GRANT/REVOKE) di database target.
- `--clean --if-exists`: (Khusus plain SQL) Menyertakan `DROP TABLE IF EXISTS` sebelum pembuatan tabel baru.

---

## 3. Prosedur Verifikasi Integritas Backup

Setiap file backup yang dihasilkan **wajib diverifikasi** sebelum dianggap sah.

### 3.1 Verifikasi Struktur Header & TOC (Table of Contents)
Gunakan `pg_restore -l` untuk memeriksa daftar tabel dan metadata di dalam arsip `.dump`:

```bash
pg_restore -l ./backups/hr_attendance_20260920_145517.dump > /dev/null 2>&1 && echo "✅ Backup VALID" || echo "❌ Backup CORRUPT"
```

Jika ingin melihat daftar tabel yang terkandung:
```bash
pg_restore -l ./backups/hr_attendance_20260920_145517.dump | grep "TABLE DATA public"
```

Output yang diharapkan mencakup tabel-tabel utama:
- `users`
- `employee_profiles`
- `departments`
- `positions`
- `attendances`
- `leave_requests`
- `shifts`
- `employee_schedules`
- `notifications`
- `audit_logs`
- `settings`

---

## 4. Prosedur Restore Database

Sistem menyediakan script restore aman di `scripts/restore.sh` yang dilengkapi pengaman *safety interlock* untuk mencegah *accidental overwrite*.

### 4.1 Menggunakan Script Otomatis (`scripts/restore.sh`)

> [!WARNING]
> Proses restore akan menimpa data pada database target. Script membutuhkan flag `--confirm` secara eksplisit.

```bash
# Mengembalikan backup ke database yang didefinisikan di TARGET_DATABASE_URL atau DATABASE_URL
./scripts/restore.sh ./backups/hr_attendance_20260920_145517.dump --confirm
```

**Output contoh:**
```
=================================================================
⚠️  DATABASE RESTORE UTILITY
📁 Source File: ./backups/hr_attendance_20260920_145517.dump
🎯 Target URL:  postgresql://postgres:postgres@localhost:5432/hr_attendance_db
=================================================================
🔍 Step 1: Validating archive format...
✅ Valid PostgreSQL custom archive detected.
🚀 Step 2: Restoring schema and data into target database...
🔍 Step 3: Verifying restored database integrity...
✅ Restoration completed. Total tables in public schema: 14
🎉 Database successfully restored.
=================================================================
```

### 4.2 Perintah Manual `pg_restore`

```bash
# Restore ke database tertentu dengan membersihkan tabel lama (--clean --if-exists)
pg_restore --clean --if-exists --no-owner --no-privileges \
  -d "postgresql://user:password@localhost:5432/hr_attendance_db" \
  ./backups/hr_attendance_20260920_145517.dump
```

---

## 5. Uji Coba Restore pada Database Terisolasi (*Test Drill*)

Untuk memastikan kesiapan pemulihan bencana tanpa mengganggu database operasional, lakukan uji coba berkala (minimal sebulan sekali) ke database pengujian terisolasi:

```bash
# 1. Buat database pengujian sementara
createdb -h localhost -U postgres hr_test_restore_drill

# 2. Lakukan restore arsip backup ke database pengujian
TARGET_DATABASE_URL="postgresql://postgres:postgres@localhost:5432/hr_test_restore_drill" \
  ./scripts/restore.sh ./backups/hr_attendance_20260920_145517.dump --confirm

# 3. Lakukan query verifikasi data di database pengujian
psql "postgresql://postgres:postgres@localhost:5432/hr_test_restore_drill" -c "
  SELECT 
    (SELECT COUNT(*) FROM users) AS total_users,
    (SELECT COUNT(*) FROM employee_profiles) AS total_employees,
    (SELECT COUNT(*) FROM attendances) AS total_attendances,
    (SELECT COUNT(*) FROM audit_logs) AS total_audit_logs;
"

# 4. Hapus database pengujian setelah verifikasi selesai
dropdb -h localhost -U postgres hr_test_restore_drill
echo "✅ Restore drill completed successfully."
```

---

## 6. Kebijakan Retensi Backup (*Backup Retention Policy*)

| Periode | Frekuensi Backup | Retensi Penyimpanan | Lokasi |
| :--- | :--- | :--- | :--- |
| **Harian (Daily)** | Setiap hari pukul 02:00 AM | Disimpan selama **30 hari** | Server Lokal + Cloud Bucket |
| **Mingguan (Weekly)** | Setiap hari Minggu pukul 03:00 AM | Disimpan selama **12 minggu** (3 bulan) | Cloud Bucket (Cold Tier) |
| **Bulanan (Monthly)** | Setiap tanggal 1 pukul 04:00 AM | Disimpan selama **12 bulan** (1 tahun) | Cloud Bucket (Cold Tier) |
| **Tahunan (Annual)** | Setiap 31 Desember pukul 23:59 | Disimpan selama **5 tahun** | Cloud Archive / Glacier |

### Otomasi dengan Crontab Server

Jadwalkan eksekusi backup otomatis pada server produksi:

```bash
# Buka editor crontab
crontab -e

# Tambahkan jadwal backup harian pada jam 02:00 dini hari
0 2 * * * cd /var/www/hr-attendance && ./scripts/backup.sh >> /var/log/hr_backup.log 2>&1

# (Opsional) Sinkronisasi ke Cloud Storage setiap jam 02:30 dini hari
30 2 * * * aws s3 sync /var/www/hr-attendance/backups s3://company-hr-backups/postgres/ --delete
```

---

## 7. Data Retention & Archiving Guidelines (Kepatuhan Hukum)

Sesuai regulasi ketenagakerjaan Indonesia (**UU Ketenagakerjaan No. 13/2003**, **UU Cipta Kerja No. 6/2023**, dan **UU Perlindungan Data Pribadi No. 27/2022**), penghapusan data harus mempertimbangkan masa kadaluarsa tuntutan hukum dan audit pajak/payroll.

### 7.1 Matriks Retensi Data

| Kategori Data | Tabel Terkait | Masa Retensi Aktif | Dasar Regulasi / Pertimbangan | Kebijakan Pasca Retensi |
| :--- | :--- | :--- | :--- | :--- |
| **Data Karyawan & Akun** | `users`, `employee_profiles`, `departments`, `positions` | Selama aktif + **5 tahun** pasca *offboarding* | Penyelesaian perselisihan hak kerja, audit pajak PPh 21, BPJS | Soft delete (`isActive = false`), hapus selfie setelah 5 tahun |
| **Data Absensi & GPS** | `attendances` | **3 - 5 tahun** | Audit lembur, sanksi disipliner, verifikasi penggajian | Arsipkan ke cold storage / compressed CSV, lalu bersihkan koordinat presisi jika > 3 tahun |
| **Pengajuan Izin / Cuti** | `leave_requests` | **3 tahun** | Hak cuti tahunan, audit surat dokter | Arsipkan PDF surat sakit, simpan metadata approval |
| **Audit Log Keamanan** | `audit_logs` | **1 - 2 tahun** | Kepatuhan ISO 27001, audit forensik keamanan, UU PDP | Ekspor ke format terenkripsi WORM (*Write Once Read Many*), bersihkan log operasional non-kritis > 1 tahun |
| **Notifikasi Sistem** | `notifications` | **90 hari** | Pengingat operasional yang bersifat sementara | Purge otomatis notifikasi dengan status `isRead: true` yang berumur > 90 hari |

### 7.2 Strategi Pengarsipan (*Archiving Strategy*)

Untuk menjaga performa database PostgreSQL tetap cepat tanpa menghapus data legalitas:

1. **Partitioning Berdasarkan Waktu**:
   - Untuk tabel berukuran besar seperti `attendances` dan `audit_logs`, gunakan skema partisi PostgreSQL berdasarkan tahun (`attendances_2025`, `attendances_2026`).
2. **Scheduled Cold-Export**:
   - Data absensi yang berusia $> 3$ tahun diekspor ke format terkompresi Parquet/CSV dan disimpan di Cloud Cold Storage (Amazon S3 Glacier / Google Cloud Archive).
3. **Pembersihan Notifikasi Otomatis (Cron Query)**:
   ```sql
   -- Dijalankan berkala untuk membersihkan notifikasi usang
   DELETE FROM notifications 
   WHERE "isRead" = true 
     AND "createdAt" < NOW() - INTERVAL '90 days';
   ```
4. **Perlindungan Data Pribadi (UU PDP)**:
   - Foto selfie absensi yang berumur lebih dari 1 tahun dapat diturunkan resolusinya atau dibersihkan jika verifikasi fisik sudah disetujui HR dan periode payroll sudah ditutup.

---

## 8. Prosedur Disaster Recovery (Langkah Demi Langkah)

Jika server utama mengalami kegagalan fatal (hardware failure, ransomware, atau data corruption):

1. **Identifikasi Status Kerusakan**:
   - Konfirmasi apakah database primer masih dapat diakses atau harus dialihkan ke backup.
2. **Siapkan Server / Database Target**:
   - Pastikan instance PostgreSQL baru telah siap dan dapat diakses.
3. **Unduh Backup Terbaru**:
   - Ambil file `.dump` terbaru dari penyimpanan offsite/cloud.
4. **Verifikasi Hash & Integritas**:
   - Jalankan `pg_restore -l` untuk memastikan file tidak rusak dalam proses transfer.
5. **Jalankan Restore**:
   - Eksekusi `./scripts/restore.sh <file.dump> --confirm`.
6. **Validasi Skema & Data**:
   - Periksa ketersediaan 14 tabel utama dan jumlah row esensial.
7. **Jalankan Prisma Migrations (jika ada delta)**:
   - `cd backend && npx prisma migrate deploy`.
8. **Alihkan Traffic (Cutover)**:
   - Update `DATABASE_URL` pada backend environment, restart service backend (`pm2 reload hr-backend`).
9. **Verifikasi Health Probes**:
   - Pastikan `/api/health/ready` mengembalikan `status: "ready"` dan HTTP 200.
