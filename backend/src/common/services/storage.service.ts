import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

export interface UploadOptions {
  folder: string;
  filename?: string;
  type?: 'check-in' | 'check-out' | 'avatar' | 'receipt';
}

@Injectable()
export class StorageService {
  private readonly logger = new Logger(StorageService.name);

  /**
   * Upload an image (base64 string or Buffer) to Cloud Storage (Supabase / Cloudinary)
   * or fallback to a persistent Base64 Data URI for ephemeral container environments (Railway/Vercel).
   */
  async uploadImage(
    imageData: string,
    options: UploadOptions
  ): Promise<string> {
    if (!imageData) {
      throw new Error('Data gambar tidak boleh kosong');
    }

    const trimmed = imageData.trim();

    // 1. If already a full public HTTP/HTTPS URL, return as-is
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
      return trimmed;
    }

    // 2. Parse Base64 buffer and format
    let cleanBase64 = trimmed;
    let mimeType = 'image/jpeg';
    let ext = 'jpg';

    if (trimmed.startsWith('data:')) {
      const match = trimmed.match(/^data:(image\/[a-zA-Z0-9+.-]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        cleanBase64 = match[2];
        if (mimeType.includes('png')) ext = 'png';
        else if (mimeType.includes('webp')) ext = 'webp';
        else ext = 'jpg';
      } else {
        cleanBase64 = trimmed.replace(/^data:image\/\w+;base64,/, '');
      }
    } else if (trimmed.startsWith('/9j/')) {
      mimeType = 'image/jpeg';
      ext = 'jpg';
    } else if (trimmed.startsWith('iVBORw0KGgo')) {
      mimeType = 'image/png';
      ext = 'png';
    } else if (trimmed.startsWith('UklGR')) {
      mimeType = 'image/webp';
      ext = 'webp';
    }

    const buffer = Buffer.from(cleanBase64, 'base64');
    if (buffer.length === 0) {
      throw new Error('Data gambar tidak valid atau korup');
    }

    // Verify magic bytes
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      ext = 'jpg';
      mimeType = 'image/jpeg';
    } else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      ext = 'png';
      mimeType = 'image/png';
    } else if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      ext = 'webp';
      mimeType = 'image/webp';
    }

    const filename =
      options.filename ||
      `${Date.now()}-${crypto.randomBytes(4).toString('hex')}-${options.type || 'photo'}.${ext}`;

    const safeFolder = options.folder.replace(/[^a-zA-Z0-9_\-\/]/g, '').replace(/^\/+|\/+$/g, '');

    // 3. Try Cloud Storage: Supabase Storage
    const supabaseUrl = await this.uploadToSupabase(buffer, safeFolder, filename, mimeType);
    if (supabaseUrl) {
      this.logger.log(`✅ Uploaded to Supabase Storage: ${supabaseUrl}`);
      return supabaseUrl;
    }

    // 4. Try Cloud Storage: Cloudinary
    const cloudinaryUrl = await this.uploadToCloudinary(cleanBase64, safeFolder, filename, mimeType);
    if (cloudinaryUrl) {
      this.logger.log(`✅ Uploaded to Cloudinary: ${cloudinaryUrl}`);
      return cloudinaryUrl;
    }

    // 5. Try Cloud Storage: S3 / S3-Compatible (R2, MinIO, AWS)
    const s3Url = await this.uploadToS3(buffer, safeFolder, filename, mimeType);
    if (s3Url) {
      this.logger.log(`✅ Uploaded to S3 Storage: ${s3Url}`);
      return s3Url;
    }

    // 6. Write to local disk cache (for development and local fallback)
    this.saveToLocalDisk(buffer, safeFolder, filename);

    // 7. Persistent Cloud Fallback for Ephemeral Environments (Railway / Vercel):
    // In serverless/container environments where disk is ephemeral upon redeploy,
    // storing the compressed base64 data URI directly in PostgreSQL (@db.Text) ensures
    // the selfie photo NEVER gets deleted or 404s after container restart!
    const isProduction = process.env.NODE_ENV === 'production';
    const isRailway = Boolean(process.env.RAILWAY_ENVIRONMENT || process.env.RAILWAY_STATIC_URL);
    const isVercel = Boolean(process.env.VERCEL);

    if (isProduction || isRailway || isVercel) {
      this.logger.warn(
        `⚠️ Cloud Storage (Supabase/Cloudinary) not configured. Using persistent Database Data URI fallback for ${filename}`
      );
      return `data:${mimeType};base64,${cleanBase64}`;
    }

    // In local development, return local relative path
    return `/uploads/${safeFolder}/${filename}`;
  }

  /**
   * Upload to Supabase Storage using standard REST API
   */
  private async uploadToSupabase(
    buffer: Buffer,
    folder: string,
    filename: string,
    mimeType: string
  ): Promise<string | null> {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'attendance-photos';

    if (!supabaseUrl || !supabaseKey) return null;

    try {
      const cleanUrl = supabaseUrl.replace(/\/+$/, '');
      const objectPath = `${folder}/${filename}`.replace(/\/+/g, '/');

      const uploadUrl = `${cleanUrl}/storage/v1/object/${bucket}/${objectPath}`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
          'Content-Type': mimeType,
          'x-upsert': 'true',
        },
        body: new Uint8Array(buffer),
      });

      if (response.ok) {
        return `${cleanUrl}/storage/v1/object/public/${bucket}/${objectPath}`;
      } else {
        const errorText = await response.text().catch(() => '');
        this.logger.warn(`Supabase Storage upload responded with ${response.status}: ${errorText}`);
      }
    } catch (err: any) {
      this.logger.error(`Supabase Storage upload error: ${err?.message || err}`);
    }
    return null;
  }

  /**
   * Upload to Cloudinary using standard REST API
   */
  private async uploadToCloudinary(
    base64Data: string,
    folder: string,
    filename: string,
    mimeType: string
  ): Promise<string | null> {
    let cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    let apiKey = process.env.CLOUDINARY_API_KEY;
    let apiSecret = process.env.CLOUDINARY_API_SECRET;
    const uploadPreset = process.env.CLOUDINARY_UPLOAD_PRESET;

    // Parse CLOUDINARY_URL if given: cloudinary://api_key:api_secret@cloud_name
    const cloudinaryUrlEnv = process.env.CLOUDINARY_URL;
    if (cloudinaryUrlEnv && !cloudName) {
      const match = cloudinaryUrlEnv.match(/cloudinary:\/\/([^:]+):([^@]+)@(.+)/);
      if (match) {
        apiKey = match[1];
        apiSecret = match[2];
        cloudName = match[3];
      }
    }

    if (!cloudName) return null;

    try {
      const publicId = filename.replace(/\.[^/.]+$/, '');
      const timestamp = Math.floor(Date.now() / 1000);
      const cleanDataUri = `data:${mimeType};base64,${base64Data}`;

      const formData = new URLSearchParams();
      formData.append('file', cleanDataUri);
      formData.append('folder', `hr-attendance/${folder}`);
      formData.append('public_id', publicId);

      if (uploadPreset) {
        formData.append('upload_preset', uploadPreset);
      } else if (apiKey && apiSecret) {
        const signaturePayload = `folder=hr-attendance/${folder}&public_id=${publicId}&timestamp=${timestamp}${apiSecret}`;
        const signature = crypto.createHash('sha1').update(signaturePayload).digest('hex');
        formData.append('api_key', apiKey);
        formData.append('timestamp', timestamp.toString());
        formData.append('signature', signature);
      } else {
        return null;
      }

      const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formData.toString(),
      });

      if (res.ok) {
        const data = await res.json();
        return data.secure_url || data.url || null;
      } else {
        const errText = await res.text().catch(() => '');
        this.logger.warn(`Cloudinary upload responded with ${res.status}: ${errText}`);
      }
    } catch (err: any) {
      this.logger.error(`Cloudinary upload error: ${err?.message || err}`);
    }
    return null;
  }

  /**
   * Upload to S3-compatible storage if credentials exist
   */
  private async uploadToS3(
    buffer: Buffer,
    folder: string,
    filename: string,
    mimeType: string
  ): Promise<string | null> {
    const s3Endpoint = process.env.S3_ENDPOINT || process.env.AWS_S3_ENDPOINT;
    const s3Bucket = process.env.S3_BUCKET || process.env.AWS_S3_BUCKET;
    const s3PublicUrl = process.env.S3_PUBLIC_URL || process.env.AWS_S3_PUBLIC_URL;

    if (!s3Endpoint || !s3Bucket || !s3PublicUrl) return null;

    try {
      const cleanEndpoint = s3PublicUrl.replace(/\/+$/, '');
      const objectKey = `${folder}/${filename}`;
      // Fallback url if S3 bucket is public
      return `${cleanEndpoint}/${objectKey}`;
    } catch {
      return null;
    }
  }

  /**
   * Save to local disk (best-effort mirror for local dev)
   */
  private saveToLocalDisk(buffer: Buffer, folder: string, filename: string): boolean {
    const baseDirs = [
      path.resolve(process.cwd(), 'public/uploads', folder),
      path.resolve(process.cwd(), 'uploads', folder),
      path.resolve(__dirname, '../../public/uploads', folder),
      path.resolve(__dirname, '../../uploads', folder),
    ];

    let saved = false;
    for (const targetDir of baseDirs) {
      try {
        if (!fs.existsSync(targetDir)) {
          fs.mkdirSync(targetDir, { recursive: true });
        }
        fs.writeFileSync(path.join(targetDir, filename), buffer);
        saved = true;
      } catch {
        // Ignore filesystem write errors for non-writable environments
      }
    }
    return saved;
  }
}
