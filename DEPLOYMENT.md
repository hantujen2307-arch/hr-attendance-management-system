# HR & ATTENDANCE MANAGEMENT SYSTEM — DEPLOYMENT GUIDE

Panduan lengkap deployment, instalasi, dan pemeliharaan untuk **HR & Attendance Management System** pada lingkungan produksi (*production environment*).

---

## 1. Arsitektur Sistem

- **Frontend Application**: Next.js 16 (App Router, Turbopack, React 19, Tailwind CSS 4)
- **BFF (Backend-For-Frontend) Proxy**: API Routes (`src/app/api/*`) dengan HTTP-Only Cookie Session.
- **Backend Core API**: NestJS 12 (TypeScript, Modular Architecture, Passport JWT, Throttler).
- **ORM & Migrations**: Prisma 6.
- **Database**: PostgreSQL 14+ (Native Relational Database).
- **Security**: Helmet, IP-based Throttling, IDOR Guards, Magic Byte Image Validation, BCrypt password hashing.

---

## 2. Prasyarat Sistem (*System Prerequisites*)

| Komponen | Versi Minimum | Catatan |
| :--- | :--- | :--- |
| **Node.js** | `>= 20.x LTS` (Disarankan Node.js 22 LTS) | Diperlukan runtime modern |
| **npm** | `>= 10.x` | Package manager |
| **PostgreSQL** | `>= 14.x` | Native instance atau Docker container |
| **PostgreSQL Tools** | `pg_dump` & `pg_restore` | Untuk rutinitas backup & restore |
| **Sistem Operasi** | Linux (Ubuntu 22.04 LTS / Debian 12 / RHEL 9), macOS | Server produksi |

---

## 3. Konfigurasi Environment Variables

Pisahkan konfigurasi environment antara server backend dan server frontend.

### 3.1 Backend Configuration (`backend/.env`)

Salin template dari `backend/.env.example`:

```bash
cp backend/.env.example backend/.env
```

Isi variabel produksi berikut:

```env
# Database Connection (Ganti username, password, host, port, dan dbname produksi)
DATABASE_URL="postgresql://prod_user:StrongSecretPassword2026@db-host:5432/hr_attendance_prod?schema=public"

# Runtime Environment
NODE_ENV="production"
PORT="5001"

# URL Frontend Produksi (Digunakan untuk CORS origin whitelist)
FRONTEND_URL="https://hr.company.com"

# JWT Authentication (Minimal 32 karakter acak yang aman)
JWT_SECRET="c4ca4238a0b923820dcc509a6f75849b291a45c6e83894b0294726b2819472"
JWT_EXPIRES_IN="1d"
```

### 3.2 Frontend Configuration (`.env`)

Salin template dari `.env.example`:

```bash
cp .env.example .env
```

Isi variabel produksi berikut:

```env
# Backend API URL (Alamat private network atau domain internal NestJS)
BACKEND_API_URL="http://127.0.0.1:5001/api"

# Runtime Environment
NODE_ENV="production"
PORT="3000"
```

---

## 4. Langkah Instalasi & Database Migration

### 4.1 Install Dependencies

Jalankan instalasi dependency pada root dan backend:

```bash
# Install root (Frontend Next.js) dependencies
npm install --omit=dev

# Install backend dependencies
cd backend
npm install --omit=dev
cd ..
```

### 4.2 Database Migration

> [!CAUTION]
> **JANGAN PERNAH** menjalankan `npx prisma db push` di lingkungan produksi karena dapat menghapus kolom secara implisit atau merusak riwayat skema.
> **SELALU GUNAKAN** `npx prisma migrate deploy`.

Jalankan migration pada database produksi:

```bash
cd backend
npx prisma generate
npx prisma migrate deploy
cd ..
```

Perintah `prisma migrate deploy` akan mengeksekusi migration secara teratur dan aman:
1. `20260917080847_init`
2. `20260918092300_add_gps_photo_settings_audit`
3. `20260920080705_add_overtime_management`
4. `20260920145500_add_positions_schedules_notifications`

### 4.3 Inisialisasi Akun Superadmin Produksi

Untuk membuat akun Superadmin pertama di server baru tanpa menyentuh atau menghapus data lain:

```bash
cd backend
ADMIN_EMAIL="admin@perusahaan.com" ADMIN_PASSWORD="PasswordKuat2026!Admin" npm run admin:create
cd ..
```

---

## 5. Build Produksi (*Production Build*)

Sebelum menjalankan server, kompilasi TypeScript dan bundle aset produksi:

### 5.1 Build Backend
```bash
cd backend
npm run build
cd ..
```
*Output terletak di folder `backend/dist`.*

### 5.2 Build Frontend
```bash
npm run build
```
*Output Next.js teroptimasi di folder `.next`.*

---

## 6. Menjalankan Server Produksi

Gunakan Process Manager seperti **PM2** atau **systemd** untuk auto-restart dan log management.

### Opsi A: Menggunakan PM2 (Disarankan)

Buat file `ecosystem.config.js` di root folder:

```javascript
module.exports = {
  apps: [
    {
      name: 'hr-backend-api',
      cwd: './backend',
      script: 'dist/main.js',
      instances: 1, // Single instance untuk reminder scheduler
      exec_mode: 'fork',
      env: {
        NODE_ENV: 'production',
        PORT: 5001,
      },
    },
    {
      name: 'hr-frontend-web',
      cwd: './',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 3000',
      instances: 'max',
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
```

Jalankan dengan PM2:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### Opsi B: Menjalankan Manual
```bash
# Terminal 1: Backend
cd backend && npm run start:prod

# Terminal 2: Frontend
npm run start
```

---

## 7. Konfigurasi Reverse Proxy (Nginx)

Gunakan Nginx sebagai edge reverse proxy untuk terminasi SSL (HTTPS) dan HTTP/2:

```nginx
# Frontend Web & BFF Proxy
server {
    listen 443 ssl http2;
    server_name hr.company.com;

    ssl_certificate /etc/letsencrypt/live/hr.company.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/hr.company.com/privkey.pem;

    client_max_body_size 12M; # Mendukung upload foto selfie base64

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

## 8. Health Check Probes & Monitoring

Backend menyediakan endpoint monitoring:

- **Liveness Probe**: `GET https://hr.company.com/api/health/live`
  - Respon: `{"status":"ok","uptime":3600,"timestamp":"..."}`
  - Mengonfirmasi proses Node.js hidup.
- **Readiness Probe**: `GET https://hr.company.com/api/health/ready`
  - Respon: `{"status":"ok","database":"connected","ready":true}`
  - Mengonfirmasi koneksi database PostgreSQL aktif dan siap menerima query.
- **General Health**: `GET https://hr.company.com/api/health`
  - Respon: `{"status":"ok"}`

---

## 9. Prosedur Update Aplikasi & Rollback / Recovery jika Deployment Gagal

### 9.1 Prosedur Update Standar (Zero-Downtime Deployment)

1. **Pre-Deployment Backup (Wajib)**:
   ```bash
   ./scripts/backup.sh
   ```
2. **Tarik Versi Kode Terbaru**:
   ```bash
   git fetch --tags
   git checkout tags/v1.x.x # atau git pull origin main
   ```
3. **Instalasi Dependencies & Build**:
   ```bash
   npm install --omit=dev
   cd backend && npm install --omit=dev
   npx prisma generate
   npx prisma migrate deploy
   npm run build
   cd ..
   npm run build
   ```
4. **Reload Service dengan PM2**:
   ```bash
   pm2 reload ecosystem.config.js
   ```
5. **Post-Deployment Verification**:
   ```bash
   curl -f http://127.0.0.1:5001/api/health/ready || echo "❌ Health Check Failed"
   ```

### 9.2 Prosedur Rollback / Recovery jika Deployment Gagal

Jika setelah reload terjadi error 500, crash, atau bug kritis:

1. **Langkah 1: Rollback Kode ke Commit/Tag Sebelumnya**:
   ```bash
   git checkout <previous-commit-or-tag>
   ```
2. **Langkah 2: Restore Database dari Snapshot Pre-Deployment (jika schema telah berubah)**:
   ```bash
   ./scripts/restore.sh ./backups/hr_attendance_pre_deploy_xxx.dump --confirm
   ```
3. **Langkah 3: Rebuild Ulang Backend & Frontend**:
   ```bash
   cd backend
   npx prisma generate
   npm run build
   cd ..
   npm run build
   ```
4. **Langkah 4: Reload Ulang PM2**:
   ```bash
   pm2 reload ecosystem.config.js
   ```
5. **Langkah 5: Validasi Status Health**:
   ```bash
   curl -s http://127.0.0.1:5001/api/health/ready
   ```

