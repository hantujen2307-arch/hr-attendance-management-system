# Enterprise HR & Attendance Management System (V2)

[![Next.js](https://img.shields.io/badge/Next.js-16.3.5-black?logo=next.js)](https://nextjs.org/)
[![NestJS](https://img.shields.io/badge/NestJS-12.0.1-red?logo=nestjs)](https://nestjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14%2B-blue?logo=postgresql)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-6.19.3-teal?logo=prisma)](https://www.prisma.io/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-v4-38bdf8?logo=tailwindcss)](https://tailwindcss.com/)
[![PWA](https://img.shields.io/badge/PWA-Ready-purple?logo=pwa)](https://web.dev/progressive-web-apps/)
[![License](https://img.shields.io/badge/License-Proprietary-gray)](#)

Enterprise HR & Attendance Management System adalah platform human resource dan presensi modern yang dirancang untuk mengelola seluruh siklus hidup karyawan (*employee lifecycle*), presensi berbasis geolokasi GPS dan swafoto anti-fraud, manajemen shift & lembur lintas tengah malam, payroll dinamis, reimbursement, rekrutmen hingga analitik eksekutif HR terpadu dalam satu arsitektur modular berkemampuan PWA (*Progressive Web App*).

---

## 📑 Daftar Isi

1. [Problem Statement & Solusi](#-problem-statement--solusi)
2. [Tech Stack & Arsitektur](#-tech-stack--arsitektur)
3. [Fitur Berdasarkan Role](#-fitur-berdasarkan-role)
4. [Pilar Fungsional Utama](#-pilar-fungsional-utama)
5. [Keamanan, RBAC, dan Perlindungan IDOR](#-keamanan-rbac-dan-perlindungan-idor)
6. [Panduan Instalasi & Menjalankan Sistem](#-panduan-instalasi--menjalankan-sistem)
7. [Environment Variables](#-environment-variables)
8. [Database Migration & Seeding](#-database-migration--seeding)
9. [Pengujian & Verifikasi Kualitas](#-pengujian--verifikasi-kualitas)
10. [Deployment, Backup & Pemeliharaan](#-deployment-backup--pemeliharaan)
11. [Akun Demo Pengujian](#-akun-demo-pengujian)

---

## 💡 Problem Statement & Solusi

### Masalah yang Dihadapi Organisasi:
1. **Kecurangan Presensi (*Attendance Fraud*)**: Titip absen, manipulasi lokasi (*fake GPS*), atau presensi di luar radius kantor.
2. **Silo Data HR**: Sistem absensi, cuti, lembur, reimbursement, dan penggajian terpisah-pisah, mengakibatkan rekonsiliasi manual yang lambat dan rawan *human error*.
3. **Kompleksitas Lembur & Shift**: Perhitungan lembur yang melewati tengah malam (*cross-midnight overtime*) dan toleransi keterlambatan shift sering tidak akurat.
4. **Kebocoran Data Finansial & Privasi**: Risiko kebocoran slip gaji karyawan lain (*Insecure Direct Object Reference / IDOR*) dan akses data tanpa otorisasi.
5. **Aksesibilitas Karyawan Lapangan**: Ketiadaan aplikasi mobile yang ringan dan responsif untuk karyawan yang mobile.

### Solusi yang Dihadirkan:
* **Presensi Anti-Fraud Terintegrasi**: Validasi jarak radius kantor dengan rumus *Haversine*, verifikasi GPS akurasi tinggi, serta tangkapan foto swafoto langsung (*live camera canvas capture*) yang divalidasi *magic bytes*.
* **Ekosistem HR 9 Pilar Terpadu**: Menyatukan *Employee Management, Geolocation Attendance, Leave/Time-Off, Shift Rosters, Overtime Engine, Dynamic Payroll, KPI Scoring, Expense Reimbursement,* dan *Recruitment Pipeline*.
* **Multi-Device & PWA Ready**: Berjalan mulus di desktop, tablet, dan smartphone dengan kapabilitas *installable PWA*, *offline service worker caching*, dan antarmuka *mobile-first*.
* **Enterprise Security & Data Isolation**: Autentikasi berbasis *HTTP-Only JWT cookies*, *NestJS Role Guards*, serta isolasi baris data (*row-level ownership verification*).

---

## 🛠 Tech Stack & Arsitektur

```mermaid
graph TD
    Client["Client Browsers / Mobile PWA (iOS/Android)"]
    NextProxy["Next.js 16 BFF Proxy (Port 3000)"]
    NestCore["NestJS 12 Core Backend API (Port 5001)"]
    PostgresDB[("PostgreSQL Database Engine")]
    Storage[("Secure File Storage / Uploads")]

    Client -->|"HTTP / HTTPS (PWA)"| NextProxy
    NextProxy -->|"HTTP-Only Cookie Forwarding"| NestCore
    NestCore -->|"Prisma ORM Queries"| PostgresDB
    NestCore -->|"Magic-Byte Validated Files"| Storage
```

| Lapisan | Teknologi | Deskripsi |
| :--- | :--- | :--- |
| **Frontend Framework** | Next.js 16.3.5 (App Router, Turbopack) | Server Components & Client Interactive Components |
| **UI & Styling** | Tailwind CSS v4, Lucide React, Leaflet Maps | Antarmuka modern, responsif, dan konsisten |
| **Mobile PWA** | Web App Manifest, Service Worker | Installable PWA dengan icon & asset caching |
| **Backend Framework** | NestJS 12.0.1 (TypeScript, Express Engine) | Modular Architecture, Guards, Interceptors & DTO Pipes |
| **Database & ORM** | PostgreSQL 14+, Prisma ORM 6.19.3 | Relational Engine dengan 7 migration terstruktur |
| **Autentikasi** | Passport.js, JWT, BCrypt, HTTP-Only Cookies | Zero-exposure token handling & session security |
| **Validasi & Proteksi** | Class-Validator, Helmet, Throttler | Sanitasi payload ketat, rate limiting, dan header security |

---

## 👥 Fitur Berdasarkan Role

### 1. `ADMIN` (Superadministrator)
* **Tata Kelola Sistem**: Kontrol penuh atas seluruh pengaturan kantor (lokasi GPS kantor utama, radius meter toleransi, jam kerja reguler).
* **Manajemen Akun & Hak Akses**: Membuat, mengubah status karyawan, mengelola kredensial dan role pengguna.
* **Audit Log & Keamanan**: Memantau log aktivitas audit sistem secara komprehensif.
* **Master Shift & Rosters**: Mengonfigurasi master shift kerja (pagi, siang, malam) dan penugasan jadwal kerja karyawan.
* **Persetujuan & Payroll Global**: Memproses periode penggajian bulanan, mengunci slip gaji, dan menyetujui reimbursement/lembur.
* **Eksekutif HR Analytics**: Melihat metrik organisasi 9 pilar, perbandingan divisi, dan ekspor laporan terpadu.

### 2. `HR` (Human Resources)
* **Manajemen Karyawan**: Mengelola master data profil karyawan, divisi, jabatan, dan dokumen pelengkap.
* **Recruitment Pipeline**: Mengelola lowongan kerja (*Job Vacancies*), memproses pelamar (*Applicants*) melalui tahapan seleksi (`APPLIED` $\rightarrow$ `SCREENING` $\rightarrow$ `INTERVIEW` $\rightarrow$ `SELECTED` $\rightarrow$ `HIRED`), dan konversi langsung pelamar terpilih menjadi karyawan baru tanpa entri ulang.
* **Verifikasi & Persetujuan Operasional**: Review dan persetujuan pengajuan cuti/izin, lembur, dan klaim biaya reimbursement dengan catatan review.
* **Payroll Processing**: Menyusun rekap kehadiran, lembur disetujui, tunjangan, dan potongan untuk pembuatan slip gaji.
* **Laporan & Rekap**: Mengunduh dan mencetak rekap harian, bulanan, rekap divisi, rekap lembur, serta ekspor CSV/PDF.

### 3. `EMPLOYEE` (Karyawan)
* **Dashboard Karyawan**: Tampilan ringkasan kehadiran pribadi, jadwal shift hari ini, sisa cuti, jam lembur, dan skor kepatuhan disiplin.
* **Presensi Mandiri (Mobile / Desktop)**:
  * **ABSEN MASUK**: Validasi lokasi GPS terhadap geofence kantor + kamera selfie langsung.
  * **ABSEN PULANG**: Validasi lokasi + verifikasi durasi total jam kerja.
* **Pengajuan Cuti & Izin**: Pengajuan cuti tahunan, sakit, izin khusus dengan riwayat status real-time.
* **Pengajuan Lembur**: Pengajuan lembur terencana maupun aktual (mendukung lintas tengah malam).
* **Klaim Biaya Reimbursement**: Pengajuan pengeluaran (transport, makan, dinas, operasional) dengan lampiran bukti struk.
* **Slip Gaji Interaktif**: Melihat dan mengunduh rincian slip gaji pribadi.
* **Pusat Notifikasi**: Notifikasi in-app otomatis saat status cuti, lembur, shift, dan gaji diperbarui.

---

## 🚀 Pilar Fungsional Utama

### 1. Attendance Engine (Geolokasi GPS + Swafoto)
* Kalkulasi jarak otomatis menggunakan formula **Haversine Geodetic**:
  $$d = 2R \cdot \arcsin\left(\sqrt{\sin^2\left(\frac{\Delta\phi}{2}\right) + \cos(\phi_1)\cos(\phi_2)\sin^2\left(\frac{\Delta\lambda}{2}\right)}\right)$$
* Deteksi keterlambatan otomatis berdasarkan jam mulai shift dan batas menit toleransi (misal 15 menit).
* Anti-fraud: Verifikasi foto langsung dari webcam/kamera smartphone via Canvas API, pencegahan upload gambar palsu menggunakan validasi *Magic Bytes* di backend.

### 2. Overtime Management (Lembur Lintas Tengah Malam)
* Fleksibilitas pencatatan jam lembur yang melintasi pergantian hari (contoh: 22:00 s/d 02:00 WIB).
* Validasi durasi jam lembur dan integrasi langsung ke perhitungan nominal gaji pada modul Payroll.

### 3. Dynamic Payroll & Slip Gaji
* Formula penggajian transparan:
  $$\text{Gaji Bersih} = (\text{Gaji Pokok} + \text{Tunjangan} + \text{Upah Lembur Disetujui}) - \text{Potongan Keterlambatan/Absensi}$$
* Status siklus payroll: `DRAFT` $\rightarrow$ `PROCESSED` $\rightarrow$ `PAID`.
* Komponen slip gaji dapat dilihat dan dicetak langsung oleh karyawan terkait.

### 4. Expense Reimbursement
* Kategori pengeluaran terstandarisasi: *Transportasi, Makan, Perjalanan Dinas, Operasional, Medis/Lainnya*.
* Validasi file bukti struk (JPEG, PNG, WebP) dengan batas ukuran aman.
* Alur status: `DRAFT` $\rightarrow$ `SUBMITTED` $\rightarrow$ `APPROVED` / `REJECTED` $\rightarrow$ `PAID`.

### 5. Recruitment to Employee Conversion
* Tahapan seleksi kandidat terstruktur: `APPLIED` $\rightarrow$ `SCREENING` $\rightarrow$ `INTERVIEW` $\rightarrow$ `SELECTED` $\rightarrow$ `HIRED` $\rightarrow$ `REJECTED`.
* Tombol **"Konversi ke Karyawan"** mengonversi pelamar status `HIRED` menjadi `Employee` dan membuatkan user account aktif secara otomatis.

### 6. HR Analytics & Executive Dashboard
* Agregasi 9 pilar data secara *real-time* dari basis data PostgreSQL.
* Metrik kehadiran, rasio ketepatan waktu (*Punctuality Rate*), rasio keterlambatan/alpha.
* **KPI Compliance Score (0–100)**: Pengukuran indeks kedisiplinan staf berdasarkan konsistensi kehadiran dan ketepatan waktu.
* Funnel rekrutmen dan perbandingan beban payroll serta performa antar divisi.

---

## 🔒 Keamanan, RBAC, dan Perlindungan IDOR

1. **Autentikasi Token Aman**:
   * Token JWT disimpan pada *HTTP-Only Secure Cookie*, terlindung dari serangan *Cross-Site Scripting (XSS)*.
2. **Role-Based Access Control (RBAC)**:
   * Setiap rute dan endpoint diproteksi oleh *NestJS Guards* (`JwtAuthGuard`, `RolesGuard`).
3. **Pencegahan IDOR (Insecure Direct Object Reference)**:
   * Karyawan dengan role `EMPLOYEE` hanya dapat melihat, mengajukan, atau mengunduh data miliknya sendiri (`userId` / `employeeId` diinjeksi langsung dari token yang tervalidasi, bukan dari parameter URL pengguna).
4. **Proteksi Unggahan Berkas**:
   * Verifikasi tipe MIME dan *Magic Bytes* berkas untuk mencegah *arbitrary file execution*.
5. **Rate Limiting & Headers**:
   * Implementasi *Helmet* untuk HTTP header security dan *NestJS Throttler* untuk menangkal *Brute Force / DoS*.

---

## 📦 Panduan Instalasi & Menjalankan Sistem

### Prasyarat:
* **Node.js**: `>= 20.x LTS` (Disarankan Node.js 22 LTS)
* **npm**: `>= 10.x`
* **PostgreSQL**: `>= 14.x` (Lokal atau Docker)

### 1. Kloning Repositori
```bash
git clone <repository-url>
cd "PROJECT 1 — HR & ATTENDANCE MANAGEMENT SYSTEM"
```

### 2. Instalasi Dependensi
```bash
# Instal dependensi Frontend (Next.js)
npm install

# Instal dependensi Backend (NestJS)
cd backend
npm install
cd ..
```

---

## ⚙️ Environment Variables

### Frontend Configuration (`.env`)
Buat berkas `.env` pada direktori root:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_attendance_db?schema=public"
NODE_ENV="development"
PORT="5001"
FRONTEND_URL="http://localhost:3000"
BACKEND_API_URL="http://localhost:5001/api"
JWT_SECRET="your-super-strong-jwt-secret-min-32-chars-long"
JWT_EXPIRES_IN="1d"
```

### Backend Configuration (`backend/.env`)
Buat berkas `backend/.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/hr_attendance_db?schema=public"
NODE_ENV="development"
PORT="5001"
FRONTEND_URL="http://localhost:3000"
JWT_SECRET="your-super-strong-jwt-secret-min-32-chars-long"
JWT_EXPIRES_IN="1d"
```

---

## 🗄 Database Migration & Seeding

```bash
# Menjalankan migrasi database PostgreSQL via Prisma
npx prisma migrate dev --name init_hr_system

# Mengisi data awal (Departemen, Shift, Akun Demo Admin, HR, dan Karyawan)
npx prisma db seed
```

> **Catatan Keamanan Produksi:** Pada lingkungan `NODE_ENV=production`, script seeding otomatis dinonaktifkan untuk mencegah penimpaan data. Untuk membuat akun superadmin awal di server produksi, jalankan:
> ```bash
> npm run admin:create
> ```

---

## 🏃 Menjalankan Aplikasi

### Mode Pengembangan (*Development*)

Buka dua jendela terminal:

```bash
# Terminal 1: Jalankan Backend NestJS API (Port 5001)
cd backend
npm run start:dev

# Terminal 2: Jalankan Frontend Next.js Web App (Port 3000)
npm run dev
```

Akses portal di: **`http://localhost:3000`**

### Mode Produksi (*Production*)

```bash
# 1. Build Backend
cd backend
npm run build
npm run start:prod &
cd ..

# 2. Build & Start Frontend
npm run build
npm run start
```

---

## 🧪 Pengujian & Verifikasi Kualitas

Sistem dilengkapi rangkaian test otomatis (*Unit Tests, Integration Tests, Security & IDOR Audits, Notification Checks, Timezone Tests*):

```bash
# 1. Menjalankan Unit & Aggregation Tests (Backend)
cd backend
npm run test

# 2. Menjalankan E2E & Full Security Audit Tests
npx tsx test/test-security-suite.ts
npx tsx test/test-step10-full-audit.ts
npx tsx test/test-timezone-edge-cases.ts
cd ..

# 3. Validasi Tipe Data TypeScript
npx tsc --noEmit

# 4. Production Build Verification
npm run build
```

---

## 💾 Deployment, Backup & Pemeliharaan

* **Panduan Lengkap Deployment**: Lihat dokumentasi detail di [DEPLOYMENT.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20—%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/DEPLOYMENT.md).
* **Panduan Backup & Restore PostgreSQL**: Lihat dokumentasi detail di [BACKUP.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20—%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/BACKUP.md).
* **Checklist Kesiapan Produksi**: Lihat [PRODUCTION_CHECKLIST.md](file:///Users/jesen/Documents/kodingan/PROJECT%201%20—%20HR%20&%20ATTENDANCE%20MANAGEMENT%20SYSTEM/PRODUCTION_CHECKLIST.md).

### Backup Database Otomatis:
```bash
./scripts/backup.sh
```

### Restore Database:
```bash
./scripts/restore.sh backups/backup_hr_db_YYYYMMDD_HHMMSS.dump
```

---

## 🔑 Akun Demo Pengujian

Setelah menjalankan `npx prisma db seed`, gunakan akun demo berikut untuk eksplorasi fitur:

| Role | Email | Password | Hak Akses |
| :--- | :--- | :--- | :--- |
| **ADMIN** | `admin@example.com` | `password123` | Akses penuh sistem, setting kantor, audit logs, analytics |
| **HR** | `hr@example.com` | `password123` | Rekrutmen, persetujuan cuti/lembur/biaya, payroll, laporan |
| **EMPLOYEE** | `budi.santoso@example.com` | `password123` | Presensi GPS/Selfie, pengajuan mandiri, slip gaji pribadi |
| **EMPLOYEE** | `siti.rahma@example.com` | `password123` | Presensi GPS/Selfie, pengajuan mandiri, slip gaji pribadi |

---

## 📱 Ringkasan Portofolio & Studi Kasus

Proyek ini mendemonstrasikan implementasi rekayasa perangkat lunak enterprise full-stack yang mencakup:
1. **PWA Mobile-First**: Performa tinggi dan responsif untuk presensi lapangan.
2. **Algoritma Geodesi & Anti-Fraud**: Formula Haversine dengan verifikasi kamera canvas dan validasi buffer server-side.
3. **Arsitektur Modular Skalabel**: NestJS controllers, services, repositories, dan Next.js App Router.
4. **Data Privacy & Zero Trust**: Strict RBAC, HTTP-only cookie JWT, dan proteksi IDOR menyeluruh.
5. **Business Logic Completeness**: Alur bisnis nyata dari pelamar kerja $\rightarrow$ karyawan aktif $\rightarrow$ jadwal shift $\rightarrow$ presensi harian $\rightarrow$ cuti $\rightarrow$ lembur $\rightarrow$ reimbursement $\rightarrow$ slip gaji $\rightarrow$ analitik eksekutif.
