import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmployeesService } from '../employees/employees.service';
import {
  ApplicantStatus,
  EmploymentStatus,
  JobVacancyStatus,
  Prisma,
  UserRole,
} from '@prisma/client';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as bcrypt from 'bcryptjs';

import { CreateJobVacancyDto } from './dto/create-job-vacancy.dto';
import { UpdateJobVacancyDto } from './dto/update-job-vacancy.dto';
import { CreateApplicantDto } from './dto/create-applicant.dto';
import { UpdateApplicantStageDto } from './dto/update-applicant-stage.dto';
import { ConvertApplicantDto } from './dto/convert-applicant.dto';
import { QueryApplicantDto, QueryVacancyDto } from './dto/query-recruitment.dto';

@Injectable()
export class RecruitmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
    private readonly employeesService: EmployeesService,
  ) {}

  // ===========================================================================
  // HELPER: SECURE FILE VALIDATION & MAGIC BYTES INSPECTION
  // ===========================================================================

  /**
   * Inspect buffer magic bytes to verify file authenticity (PDF, DOCX, PNG, JPEG, WebP).
   * Calculates SHA-256 integrity hash and persists file safely.
   */
  private processResumeProof(
    proofString: string,
    applicantIdentifier: string,
  ): {
    filePath: string;
    fileHash: string;
    fileSize: number;
    mimeType: string;
    fileName: string;
  } {
    try {
      let buffer: Buffer;
      let declaredMime = '';

      if (proofString.startsWith('data:')) {
        const matches = proofString.match(/^data:([a-zA-Z0-9/._-]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) {
          throw new BadRequestException('Format payload berkas CV (data URL) tidak valid');
        }
        declaredMime = matches[1].toLowerCase();
        buffer = Buffer.from(matches[2], 'base64');
      } else {
        buffer = Buffer.from(proofString, 'base64');
      }

      // 1. Validate file size (max 5 MB)
      const MAX_SIZE = 5 * 1024 * 1024;
      if (buffer.length === 0) {
        throw new BadRequestException('Berkas dokumen CV tidak boleh kosong');
      }
      if (buffer.length > MAX_SIZE) {
        throw new BadRequestException('Ukuran berkas dokumen CV melebihi batas maksimal 5 MB');
      }

      // 2. Validate Magic Bytes
      let detectedExt = '';
      let detectedMime = '';

      // PDF: %PDF- (0x25, 0x50, 0x44, 0x46)
      if (
        buffer.length >= 4 &&
        buffer[0] === 0x25 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x44 &&
        buffer[3] === 0x46
      ) {
        detectedExt = 'pdf';
        detectedMime = 'application/pdf';
      }
      // PNG: 89 50 4E 47
      else if (
        buffer.length >= 4 &&
        buffer[0] === 0x89 &&
        buffer[1] === 0x50 &&
        buffer[2] === 0x4e &&
        buffer[3] === 0x47
      ) {
        detectedExt = 'png';
        detectedMime = 'image/png';
      }
      // JPEG: FF D8 FF
      else if (
        buffer.length >= 3 &&
        buffer[0] === 0xff &&
        buffer[1] === 0xd8 &&
        buffer[2] === 0xff
      ) {
        detectedExt = 'jpg';
        detectedMime = 'image/jpeg';
      }
      // WebP: RIFF....WEBP
      else if (
        buffer.length >= 12 &&
        buffer[0] === 0x52 &&
        buffer[1] === 0x49 &&
        buffer[2] === 0x46 &&
        buffer[3] === 0x46 &&
        buffer[8] === 0x57 &&
        buffer[9] === 0x45 &&
        buffer[10] === 0x42 &&
        buffer[11] === 0x50
      ) {
        detectedExt = 'webp';
        detectedMime = 'image/webp';
      }
      // DOCX / ZIP: PK\x03\x04
      else if (
        buffer.length >= 4 &&
        buffer[0] === 0x50 &&
        buffer[1] === 0x4b &&
        buffer[2] === 0x03 &&
        buffer[3] === 0x04
      ) {
        detectedExt = 'docx';
        detectedMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      } else {
        throw new BadRequestException(
          'Format dokumen CV tidak valid atau rusak. Berkas harus berupa PDF, DOCX, PNG, JPEG, atau WebP yang valid.',
        );
      }

      // 3. Compute SHA-256 hash
      const fileHash = crypto.createHash('sha256').update(buffer).digest('hex');

      // 4. Save file to disk
      const safeId = applicantIdentifier.replace(/[^a-zA-Z0-9_-]/g, '');
      const uniqueName = `cv-${safeId}-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${detectedExt}`;

      const uploadDirs = [
        path.join(process.cwd(), 'uploads', 'resumes'),
        path.join(process.cwd(), 'public', 'uploads', 'resumes'),
      ];

      for (const dir of uploadDirs) {
        try {
          if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
          }
          fs.writeFileSync(path.join(dir, uniqueName), buffer);
        } catch {
          // secondary dir fallback
        }
      }

      const filePath = proofString.startsWith('data:')
        ? proofString
        : `/uploads/resumes/${uniqueName}`;

      return {
        filePath,
        fileHash,
        fileSize: buffer.length,
        mimeType: detectedMime,
        fileName: uniqueName,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      throw new BadRequestException(`Gagal memproses berkas dokumen CV: ${err.message}`);
    }
  }

  // ===========================================================================
  // 1. MANAJEMEN LOWONGAN PEKERJAAN (JOB VACANCY)
  // ===========================================================================

  /**
   * Generate sequential Vacancy number: VAC-YYYYMM-XXXX.
   */
  private async generateVacancyNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `VAC-${year}${month}-`;

    const lastRecord = await this.prisma.jobVacancy.findFirst({
      where: { vacancyNo: { startsWith: prefix } },
      orderBy: { vacancyNo: 'desc' },
      select: { vacancyNo: true },
    });

    let seq = 1;
    if (lastRecord && lastRecord.vacancyNo) {
      const parts = lastRecord.vacancyNo.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Create new Job Vacancy (Admin/HR).
   */
  async createVacancy(dto: CreateJobVacancyDto, user: any, ipAddress?: string) {
    const department = await this.prisma.department.findUnique({
      where: { id: dto.departmentId },
    });
    if (!department) {
      throw new NotFoundException(`Departemen dengan ID '${dto.departmentId}' tidak ditemukan`);
    }

    const startDate = new Date(dto.startDate);
    const endDate = dto.endDate ? new Date(dto.endDate) : null;
    if (endDate && endDate < startDate) {
      throw new BadRequestException('Tanggal penutupan tidak boleh lebih awal dari tanggal mulai');
    }

    const vacancyNo = await this.generateVacancyNumber();

    const vacancy = await this.prisma.jobVacancy.create({
      data: {
        vacancyNo,
        title: dto.title.trim(),
        departmentId: dto.departmentId,
        position: dto.position.trim(),
        description: dto.description.trim(),
        requirements: dto.requirements.trim(),
        location: dto.location?.trim() || 'Jakarta (Hybrid)',
        employmentType: dto.employmentType || 'FULL_TIME',
        quota: dto.quota || 1,
        status: dto.status || JobVacancyStatus.OPEN,
        startDate,
        endDate,
        createdBy: user?.id || null,
      },
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      action: 'JOB_VACANCY_CREATED',
      userId: user?.id,
      ipAddress,
      details: `Lowongan baru ${vacancy.vacancyNo} - ${vacancy.title} (${vacancy.position}) dibuat`,
      metadata: { resource: 'JobVacancy', resourceId: vacancy.id },
    });

    return vacancy;
  }

  /**
   * List Job Vacancies with filters and applicant statistics.
   */
  async findAllVacancies(query: QueryVacancyDto) {
    const { search, status, departmentId, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.JobVacancyWhereInput = {};

    if (status) {
      where.status = status;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { vacancyNo: { contains: term, mode: 'insensitive' } },
        { title: { contains: term, mode: 'insensitive' } },
        { position: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.jobVacancy.findMany({
        where,
        include: {
          department: { select: { id: true, name: true, code: true } },
          _count: {
            select: { applicants: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.jobVacancy.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single Job Vacancy details.
   */
  async findOneVacancy(id: string) {
    const vacancy = await this.prisma.jobVacancy.findUnique({
      where: { id },
      include: {
        department: { select: { id: true, name: true, code: true } },
        applicants: {
          select: {
            id: true,
            applicantNo: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            currentStage: true,
            createdAt: true,
          },
          orderBy: { createdAt: 'desc' },
        },
        _count: {
          select: { applicants: true },
        },
      },
    });

    if (!vacancy) {
      throw new NotFoundException(`Lowongan pekerjaan dengan ID '${id}' tidak ditemukan`);
    }

    return vacancy;
  }

  /**
   * Update Job Vacancy (Admin/HR).
   */
  async updateVacancy(id: string, dto: UpdateJobVacancyDto, user: any, ipAddress?: string) {
    const existing = await this.prisma.jobVacancy.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Lowongan pekerjaan dengan ID '${id}' tidak ditemukan`);
    }

    const data: Prisma.JobVacancyUpdateInput = {};
    if (dto.title) data.title = dto.title.trim();
    if (dto.position) data.position = dto.position.trim();
    if (dto.description) data.description = dto.description.trim();
    if (dto.requirements) data.requirements = dto.requirements.trim();
    if (dto.location !== undefined) data.location = dto.location?.trim() || null;
    if (dto.employmentType) data.employmentType = dto.employmentType;
    if (dto.quota !== undefined) data.quota = dto.quota;
    if (dto.status) data.status = dto.status;
    if (dto.startDate) data.startDate = new Date(dto.startDate);
    if (dto.endDate !== undefined) {
      data.endDate = dto.endDate ? new Date(dto.endDate) : null;
    }

    if (dto.departmentId) {
      const dept = await this.prisma.department.findUnique({
        where: { id: dto.departmentId },
      });
      if (!dept) {
        throw new NotFoundException(`Departemen dengan ID '${dto.departmentId}' tidak ditemukan`);
      }
      data.department = { connect: { id: dto.departmentId } };
    }

    const updated = await this.prisma.jobVacancy.update({
      where: { id },
      data,
      include: {
        department: { select: { id: true, name: true, code: true } },
      },
    });

    await this.auditService.log({
      action: 'JOB_VACANCY_UPDATED',
      userId: user?.id,
      ipAddress,
      details: `Lowongan ${updated.vacancyNo} diperbarui`,
      metadata: { resource: 'JobVacancy', resourceId: id },
    });

    return updated;
  }

  /**
   * Delete Job Vacancy (Admin/HR).
   */
  async deleteVacancy(id: string, user: any, ipAddress?: string) {
    const vacancy = await this.prisma.jobVacancy.findUnique({
      where: { id },
      include: { _count: { select: { applicants: true } } },
    });
    if (!vacancy) {
      throw new NotFoundException(`Lowongan pekerjaan dengan ID '${id}' tidak ditemukan`);
    }

    if (vacancy._count.applicants > 0) {
      throw new BadRequestException(
        `Lowongan ${vacancy.vacancyNo} tidak dapat dihapus karena sudah memiliki ${vacancy._count.applicants} pelamar. Silakan ubah status menjadi CLOSED atau CANCELLED.`,
      );
    }

    await this.prisma.jobVacancy.delete({ where: { id } });

    await this.auditService.log({
      action: 'JOB_VACANCY_DELETED',
      userId: user?.id,
      ipAddress,
      details: `Lowongan ${vacancy.vacancyNo} dihapus`,
      metadata: { resource: 'JobVacancy', resourceId: id },
    });

    return { message: `Lowongan ${vacancy.vacancyNo} berhasil dihapus` };
  }

  // ===========================================================================
  // 2. MANAJEMEN PELAMAR (APPLICANT MANAGEMENT)
  // ===========================================================================

  /**
   * Generate sequential Applicant number: APP-YYYYMM-XXXX.
   */
  private async generateApplicantNumber(): Promise<string> {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const prefix = `APP-${year}${month}-`;

    const lastRecord = await this.prisma.applicant.findFirst({
      where: { applicantNo: { startsWith: prefix } },
      orderBy: { applicantNo: 'desc' },
      select: { applicantNo: true },
    });

    let seq = 1;
    if (lastRecord && lastRecord.applicantNo) {
      const parts = lastRecord.applicantNo.split('-');
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        seq = lastSeq + 1;
      }
    }

    return `${prefix}${String(seq).padStart(4, '0')}`;
  }

  /**
   * Register new Applicant for a Job Vacancy (Admin/HR).
   */
  async createApplicant(dto: CreateApplicantDto, user: any, ipAddress?: string) {
    const vacancy = await this.prisma.jobVacancy.findUnique({
      where: { id: dto.jobVacancyId },
    });
    if (!vacancy) {
      throw new NotFoundException(`Lowongan pekerjaan dengan ID '${dto.jobVacancyId}' tidak ditemukan`);
    }

    if (vacancy.status === JobVacancyStatus.CLOSED || vacancy.status === JobVacancyStatus.CANCELLED) {
      throw new BadRequestException(`Lowongan '${vacancy.title}' saat ini berstatus ${vacancy.status} dan tidak menerima pelamar baru`);
    }

    // Process & validate CV proof file with magic bytes
    const applicantNo = await this.generateApplicantNumber();
    const processedResume = this.processResumeProof(dto.resume, applicantNo);

    const applicant = await this.prisma.applicant.create({
      data: {
        applicantNo,
        jobVacancyId: dto.jobVacancyId,
        firstName: dto.firstName.trim(),
        lastName: dto.lastName.trim(),
        email: dto.email.trim().toLowerCase(),
        phone: dto.phone?.trim() || null,
        address: dto.address?.trim() || null,
        resumeUrl: processedResume.filePath,
        resumeFileName: processedResume.fileName,
        resumeFileSize: processedResume.fileSize,
        resumeFileHash: processedResume.fileHash,
        coverLetter: dto.coverLetter?.trim() || null,
        currentStage: dto.currentStage || ApplicantStatus.APPLIED,
      },
      include: {
        jobVacancy: {
          select: {
            id: true,
            vacancyNo: true,
            title: true,
            position: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
    });

    // Notify HR / Admins
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
      select: { id: true },
    });

    for (const hr of hrUsers) {
      await this.notificationsService.create({
        userId: hr.id,
        type: 'APPLICANT_CREATED',
        title: 'Pelamar Baru Terdaftar',
        message: `${applicant.firstName} ${applicant.lastName} mendaftar untuk lowongan ${vacancy.title} (${applicant.applicantNo}).`,
        referenceType: 'APPLICANT',
        referenceId: applicant.id,
        idempotencyKey: `APP_NEW_${applicant.id}_${hr.id}`,
      });
    }

    await this.auditService.log({
      action: 'APPLICANT_CREATED',
      userId: user?.id,
      ipAddress,
      details: `Pelamar baru ${applicant.applicantNo} - ${applicant.firstName} ${applicant.lastName} didaftarkan ke lowongan ${vacancy.vacancyNo}`,
      metadata: { resource: 'Applicant', resourceId: applicant.id, vacancyId: vacancy.id },
    });

    return applicant;
  }

  /**
   * List Applicants with filters by vacancy, stage, and keyword search.
   */
  async findAllApplicants(query: QueryApplicantDto) {
    const { search, jobVacancyId, stage, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const where: Prisma.ApplicantWhereInput = {};

    if (jobVacancyId) {
      where.jobVacancyId = jobVacancyId;
    }

    if (stage) {
      where.currentStage = stage;
    }

    if (search && search.trim()) {
      const term = search.trim();
      where.OR = [
        { applicantNo: { contains: term, mode: 'insensitive' } },
        { firstName: { contains: term, mode: 'insensitive' } },
        { lastName: { contains: term, mode: 'insensitive' } },
        { email: { contains: term, mode: 'insensitive' } },
        { phone: { contains: term, mode: 'insensitive' } },
        { jobVacancy: { title: { contains: term, mode: 'insensitive' } } },
        { jobVacancy: { position: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.applicant.findMany({
        where,
        include: {
          jobVacancy: {
            select: {
              id: true,
              vacancyNo: true,
              title: true,
              position: true,
              department: { select: { id: true, name: true, code: true } },
            },
          },
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              employmentStatus: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.applicant.count({ where }),
    ]);

    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Get single Applicant details.
   */
  async findOneApplicant(id: string) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id },
      include: {
        jobVacancy: {
          select: {
            id: true,
            vacancyNo: true,
            title: true,
            position: true,
            department: { select: { id: true, name: true, code: true } },
          },
        },
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            email: true,
            position: true,
            employmentStatus: true,
            joinDate: true,
          },
        },
      },
    });

    if (!applicant) {
      throw new NotFoundException(`Pelamar dengan ID '${id}' tidak ditemukan`);
    }

    return applicant;
  }

  /**
   * Move Applicant Stage (SCREENING, INTERVIEW, SELECTED, REJECTED, HIRED).
   */
  async updateApplicantStage(
    id: string,
    dto: UpdateApplicantStageDto,
    user: any,
    ipAddress?: string,
  ) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id },
      include: { jobVacancy: true },
    });

    if (!applicant) {
      throw new NotFoundException(`Pelamar dengan ID '${id}' tidak ditemukan`);
    }

    if (dto.stage === ApplicantStatus.REJECTED && !dto.rejectionReason?.trim()) {
      throw new BadRequestException('Alasan penolakan wajib diisi saat menolak pelamar');
    }

    const data: Prisma.ApplicantUpdateInput = {
      currentStage: dto.stage,
    };

    if (dto.screeningNotes !== undefined) {
      data.screeningNotes = dto.screeningNotes.trim() || null;
    }
    if (dto.interviewNotes !== undefined) {
      data.interviewNotes = dto.interviewNotes.trim() || null;
    }
    if (dto.interviewDate !== undefined) {
      data.interviewDate = dto.interviewDate ? new Date(dto.interviewDate) : null;
    }
    if (dto.rejectionReason !== undefined) {
      data.rejectionReason = dto.rejectionReason.trim() || null;
    }

    const updated = await this.prisma.applicant.update({
      where: { id },
      data,
      include: {
        jobVacancy: {
          select: {
            id: true,
            vacancyNo: true,
            title: true,
            position: true,
            department: { select: { id: true, name: true } },
          },
        },
        employee: true,
      },
    });

    await this.auditService.log({
      action: 'APPLICANT_STAGE_UPDATED',
      userId: user?.id,
      ipAddress,
      details: `Pelamar ${updated.applicantNo} (${updated.firstName} ${updated.lastName}) dipindahkan ke tahap ${dto.stage}`,
      metadata: { resource: 'Applicant', resourceId: id, newStage: dto.stage },
    });

    return updated;
  }

  // ===========================================================================
  // 3. KONVERSI PELAMAR MENJADI KARYAWAN (HIRED -> EMPLOYEE)
  // ===========================================================================

  /**
   * Convert Applicant to Employee without re-entering available data.
   * Auto-provisions NIP, links Department & Position from Vacancy, and creates active Employee.
   */
  async convertApplicantToEmployee(
    id: string,
    dto: ConvertApplicantDto,
    user: any,
    ipAddress?: string,
  ) {
    const applicant = await this.prisma.applicant.findUnique({
      where: { id },
      include: {
        jobVacancy: {
          include: { department: true },
        },
        employee: true,
      },
    });

    if (!applicant) {
      throw new NotFoundException(`Pelamar dengan ID '${id}' tidak ditemukan`);
    }

    if (applicant.employeeId || applicant.employee) {
      throw new ConflictException(
        `Pelamar ${applicant.applicantNo} sudah pernah dikonversi menjadi karyawan dengan NIP: ${applicant.employee?.employeeId}`,
      );
    }

    // Only SELECTED or HIRED can be converted
    if (
      applicant.currentStage !== ApplicantStatus.SELECTED &&
      applicant.currentStage !== ApplicantStatus.HIRED
    ) {
      throw new BadRequestException(
        `Hanya pelamar dengan tahapan SELECTED atau HIRED yang dapat dikonversi menjadi karyawan (Tahapan saat ini: ${applicant.currentStage})`,
      );
    }

    const email = applicant.email.trim().toLowerCase();

    // Check email collision in Employee table
    const existingEmp = await this.prisma.employee.findUnique({ where: { email } });
    if (existingEmp) {
      throw new ConflictException(
        `Email '${email}' sudah digunakan oleh karyawan lain (NIP: ${existingEmp.employeeId})`,
      );
    }

    // Determine NIP
    let employeeId = dto.employeeId?.trim();
    if (!employeeId) {
      employeeId = await this.employeesService.generateNextEmployeeId();
    } else {
      const existingId = await this.prisma.employee.findUnique({ where: { employeeId } });
      if (existingId) {
        throw new ConflictException(`NIP '${employeeId}' sudah digunakan karyawan lain`);
      }
    }

    // Determine Join Date
    const joinDate = dto.joinDate ? new Date(dto.joinDate) : new Date();

    // Verify Shift if provided
    if (dto.shiftId) {
      const shift = await this.prisma.shift.findUnique({ where: { id: dto.shiftId } });
      if (!shift) {
        throw new NotFoundException(`Shift dengan ID '${dto.shiftId}' tidak ditemukan`);
      }
    }

    // Atomic transaction for User + Employee creation and Applicant update
    const result = await this.prisma.$transaction(async (tx) => {
      let linkedUserId: string | null = null;

      if (dto.createAccount !== false) {
        let existingUser = await tx.user.findUnique({ where: { email } });
        if (existingUser) {
          const userLinked = await tx.employee.findUnique({ where: { userId: existingUser.id } });
          if (userLinked) {
            throw new ConflictException(`Akun login '${email}' sudah terhubung ke karyawan lain`);
          }
          linkedUserId = existingUser.id;
        } else {
          const pwd = dto.initialPassword || 'Password123!';
          const passwordHash = await bcrypt.hash(pwd, 10);
          const newUser = await tx.user.create({
            data: {
              email,
              passwordHash,
              role: UserRole.EMPLOYEE,
            },
          });
          linkedUserId = newUser.id;
        }
      }

      // Create Employee
      const newEmployee = await tx.employee.create({
        data: {
          employeeId,
          firstName: applicant.firstName,
          lastName: applicant.lastName,
          email,
          phone: applicant.phone,
          address: applicant.address,
          departmentId: applicant.jobVacancy.departmentId,
          position: applicant.jobVacancy.position,
          joinDate,
          employmentStatus: EmploymentStatus.ACTIVE,
          shiftId: dto.shiftId || null,
          userId: linkedUserId,
        },
        include: {
          department: { select: { id: true, name: true, code: true } },
          shift: { select: { id: true, name: true } },
        },
      });

      // Update Applicant to HIRED and set employeeId
      const updatedApplicant = await tx.applicant.update({
        where: { id },
        data: {
          currentStage: ApplicantStatus.HIRED,
          hiredDate: joinDate,
          employeeId: newEmployee.id,
        },
        include: {
          jobVacancy: {
            select: { id: true, title: true, position: true },
          },
        },
      });

      return {
        applicant: updatedApplicant,
        employee: newEmployee,
      };
    });

    // Notify HR / Admins
    const hrUsers = await this.prisma.user.findMany({
      where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
      select: { id: true },
    });

    for (const hr of hrUsers) {
      await this.notificationsService.create({
        userId: hr.id,
        type: 'APPLICANT_HIRED',
        title: 'Kandidat Berhasil Direkrut',
        message: `${applicant.firstName} ${applicant.lastName} telah resmi direkrut sebagai karyawan (${result.employee.employeeId}) di posisi ${applicant.jobVacancy.position}.`,
        referenceType: 'EMPLOYEE',
        referenceId: result.employee.id,
        idempotencyKey: `APP_HIRE_${applicant.id}_${hr.id}`,
      });
    }

    await this.auditService.log({
      action: 'APPLICANT_HIRED_CONVERTED',
      userId: user?.id,
      ipAddress,
      details: `Pelamar ${applicant.applicantNo} (${applicant.firstName} ${applicant.lastName}) berhasil dikonversi menjadi karyawan baru (NIP: ${result.employee.employeeId})`,
      metadata: {
        resource: 'Applicant',
        resourceId: id,
        employeeId: result.employee.id,
        nip: result.employee.employeeId,
      },
    });

    return result;
  }

  // ===========================================================================
  // 4. STATISTICAL SUMMARY
  // ===========================================================================

  /**
   * Aggregate Recruitment metrics for dashboard cards.
   */
  async getSummary() {
    const [
      totalVacancies,
      openVacancies,
      closedVacancies,
      totalApplicants,
      appliedCount,
      screeningCount,
      interviewCount,
      selectedCount,
      hiredCount,
      rejectedCount,
    ] = await Promise.all([
      this.prisma.jobVacancy.count(),
      this.prisma.jobVacancy.count({ where: { status: JobVacancyStatus.OPEN } }),
      this.prisma.jobVacancy.count({ where: { status: JobVacancyStatus.CLOSED } }),
      this.prisma.applicant.count(),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.APPLIED } }),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.SCREENING } }),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.INTERVIEW } }),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.SELECTED } }),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.HIRED } }),
      this.prisma.applicant.count({ where: { currentStage: ApplicantStatus.REJECTED } }),
    ]);

    return {
      totalVacancies,
      openVacancies,
      closedVacancies,
      totalApplicants,
      appliedCount,
      screeningCount,
      interviewCount,
      selectedCount,
      hiredCount,
      rejectedCount,
    };
  }
}
