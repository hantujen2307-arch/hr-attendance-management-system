import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  UserRole,
  ReimbursementCategory,
  ReimbursementStatus,
  Prisma,
} from '@prisma/client';
import { CreateReimbursementDto } from './dto/create-reimbursement.dto';
import { UpdateReimbursementDto } from './dto/update-reimbursement.dto';
import { ApproveReimbursementDto } from './dto/approve-reimbursement.dto';
import { RejectReimbursementDto } from './dto/reject-reimbursement.dto';
import { QueryReimbursementDto } from './dto/query-reimbursement.dto';
import { parseJakartaDateString } from '../attendance/attendance.time.util';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

@Injectable()
export class ReimbursementService {
  private readonly logger = new Logger(ReimbursementService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auditService: AuditService,
    private readonly notificationsService: NotificationsService,
  ) {}

  // ===========================================================================
  // HELPER: SECURE RECEIPT FILE VALIDATION & PERSISTENCE
  // ===========================================================================

  /**
   * Validates receipt file upload with magic byte inspection and securely saves to disk.
   */
  private processReceiptFile(receiptInput: string, employeeId: string): { url: string; hash: string } {
    if (!receiptInput || typeof receiptInput !== 'string') {
      throw new BadRequestException('Bukti pembayaran wajib disertakan');
    }

    // If input is already an existing relative URL, return it
    if (receiptInput.startsWith('/uploads/')) {
      return { url: receiptInput, hash: 'pre-uploaded' };
    }

    // Extract base64 payload
    let base64Data = receiptInput;
    if (receiptInput.includes(',')) {
      base64Data = receiptInput.split(',')[1];
    }

    let buffer: Buffer;
    try {
      buffer = Buffer.from(base64Data, 'base64');
    } catch {
      throw new BadRequestException('Format data base64 bukti pembayaran tidak valid');
    }

    if (!buffer || buffer.length === 0) {
      throw new BadRequestException('File bukti pembayaran kosong');
    }

    // Size constraint: Max 5MB
    if (buffer.length > 5 * 1024 * 1024) {
      throw new BadRequestException('Ukuran file bukti pembayaran melebihi batas maksimal 5MB');
    }

    // Magic bytes verification
    let ext = '';
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      ext = 'jpg';
    } else if (
      buffer.length >= 8 &&
      buffer[0] === 0x89 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x4e &&
      buffer[3] === 0x47
    ) {
      ext = 'png';
    } else if (
      buffer.length >= 12 &&
      buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
      buffer.subarray(8, 12).toString('ascii') === 'WEBP'
    ) {
      ext = 'webp';
    } else if (
      buffer.length >= 4 &&
      buffer[0] === 0x25 &&
      buffer[1] === 0x50 &&
      buffer[2] === 0x44 &&
      buffer[3] === 0x46
    ) {
      ext = 'pdf';
    } else {
      throw new BadRequestException(
        'Format file bukti tidak valid. Hanya file JPEG, PNG, WebP, atau PDF yang diperbolehkan.',
      );
    }

    // Compute SHA-256 hash for integrity
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    // Create unique filename
    const dateObj = new Date();
    const yearMonth = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
    const filename = `rmb-${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${ext}`;
    const relativeFolder = path.join('reimbursements', yearMonth);

    // Sync to backend and workspace root public folders
    const baseDirs = [
      path.resolve(process.cwd(), 'uploads'),
      path.resolve(process.cwd(), '../uploads'),
      path.resolve(process.cwd(), 'public/uploads'),
      path.resolve(process.cwd(), '../public/uploads'),
    ];

    for (const baseDir of baseDirs) {
      try {
        const targetFolder = path.join(baseDir, relativeFolder);
        if (!fs.existsSync(targetFolder)) {
          fs.mkdirSync(targetFolder, { recursive: true });
        }
        fs.writeFileSync(path.join(targetFolder, filename), buffer);
      } catch {
        // Ignore fallback directory errors
      }
    }

    return {
      url: `/uploads/${relativeFolder}/${filename}`,
      hash,
    };
  }

  /**
   * Generates a sequential, readable reimbursement number: RMB-YYYYMM-XXXX
   */
  private async generateReimbursementNo(): Promise<string> {
    const now = new Date();
    const yearMonth = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}`;
    const prefix = `RMB-${yearMonth}-`;

    const count = await this.prisma.reimbursementRequest.count({
      where: {
        reimbursementNo: {
          startsWith: prefix,
        },
      },
    });

    const sequence = String(count + 1).padStart(4, '0');
    return `${prefix}${sequence}`;
  }

  // ===========================================================================
  // 1. SUBMISSION & CRUD
  // ===========================================================================

  /**
   * Submit a new reimbursement request.
   */
  async create(dto: CreateReimbursementDto, user: any, ipAddress?: string) {
    let employeeId: string;

    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Profil karyawan Anda tidak ditemukan');
      }
      employeeId = user.employee.id;
    } else {
      if (!dto.employeeId && !user.employee?.id) {
        throw new BadRequestException('employeeId wajib disertakan');
      }
      employeeId = dto.employeeId || user.employee.id;
    }

    const employee = await this.prisma.employee.findUnique({
      where: { id: employeeId },
      include: { department: true },
    });

    if (!employee) {
      throw new NotFoundException(`Karyawan dengan ID '${employeeId}' tidak ditemukan`);
    }

    // Process and validate receipt file
    const receiptFile = this.processReceiptFile(dto.receipt, employeeId);
    const reimbursementNo = await this.generateReimbursementNo();
    const dateObj = parseJakartaDateString(dto.date);

    const status = dto.status || ReimbursementStatus.SUBMITTED;

    const reimbursement = await this.prisma.reimbursementRequest.create({
      data: {
        reimbursementNo,
        employeeId,
        category: dto.category,
        amount: new Prisma.Decimal(dto.amount),
        date: dateObj,
        description: dto.description.trim(),
        receiptUrl: receiptFile.url,
        receiptFileHash: receiptFile.hash,
        status,
      },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            position: true,
          },
        },
      },
    });

    // Notify HR / Admins if status is SUBMITTED
    if (status === ReimbursementStatus.SUBMITTED) {
      const hrUsers = await this.prisma.user.findMany({
        where: { role: { in: [UserRole.ADMIN, UserRole.HR] } },
        select: { id: true },
      });

      for (const hr of hrUsers) {
        await this.notificationsService.create({
          userId: hr.id,
          type: 'REIMBURSEMENT_SUBMITTED',
          title: 'Pengajuan Reimbursement Baru',
          message: `${employee.firstName} ${employee.lastName} mengajukan reimbursement ${dto.category} sebesar Rp ${Number(dto.amount).toLocaleString('id-ID')}.`,
          referenceType: 'REIMBURSEMENT_REQUEST',
          referenceId: reimbursement.id,
          idempotencyKey: `RMB_SUBMIT_${reimbursement.id}_${hr.id}`,
        });
      }
    }

    await this.auditService.log({
      action: 'REIMBURSEMENT_CREATED',
      userId: user.id,
      ipAddress,
      details: `Pengajuan reimbursement ${reimbursementNo} (${dto.category}) sebesar Rp ${dto.amount} dibuat`,
      metadata: {
        resource: 'ReimbursementRequest',
        resourceId: reimbursement.id,
        reimbursementNo,
        amount: dto.amount,
        category: dto.category,
        status,
      },
    });

    return reimbursement;
  }

  /**
   * Query reimbursement requests with strict IDOR protection and filters.
   */
  async findAll(query: QueryReimbursementDto, user: any) {
    const page = Number(query.page) || 1;
    const limit = Math.min(100, Number(query.limit) || 50);
    const skip = (page - 1) * limit;

    const where: Prisma.ReimbursementRequestWhereInput = {};
    const employeeWhere: Prisma.EmployeeWhereInput = {};

    // IDOR Enforcement: EMPLOYEE role can ONLY see their own requests
    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Profil karyawan tidak ditemukan');
      }
      where.employeeId = user.employee.id;
    } else {
      if (query.employeeId) where.employeeId = query.employeeId;
      if (query.departmentId) employeeWhere.departmentId = query.departmentId;
    }

    if (query.status) where.status = query.status;
    if (query.category) where.category = query.category;

    if (query.startDate || query.endDate) {
      where.date = {};
      if (query.startDate) where.date.gte = parseJakartaDateString(query.startDate);
      if (query.endDate) where.date.lte = parseJakartaDateString(query.endDate);
    }

    if (query.search && query.search.trim()) {
      const search = query.search.trim();
      where.OR = [
        { reimbursementNo: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { employee: { firstName: { contains: search, mode: 'insensitive' } } },
        { employee: { lastName: { contains: search, mode: 'insensitive' } } },
        { employee: { employeeId: { contains: search, mode: 'insensitive' } } },
      ];
    }

    if (Object.keys(employeeWhere).length > 0) {
      where.employee = { is: employeeWhere };
    }

    const [data, total] = await Promise.all([
      this.prisma.reimbursementRequest.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              employeeId: true,
              firstName: true,
              lastName: true,
              department: { select: { id: true, name: true } },
              position: true,
            },
          },
          approver: {
            select: { id: true, email: true, role: true },
          },
          payer: {
            select: { id: true, email: true, role: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.reimbursementRequest.count({ where }),
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
   * Get single reimbursement details with IDOR protection.
   */
  async findOne(id: string, user: any) {
    const reimbursement = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
            position: true,
            salary: {
              select: {
                bankName: true,
                bankAccount: true,
                bankAccountHolder: true,
              },
            },
          },
        },
        approver: {
          select: { id: true, email: true, role: true },
        },
        payer: {
          select: { id: true, email: true, role: true },
        },
      },
    });

    if (!reimbursement) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    // IDOR Protection
    if (user.role === UserRole.EMPLOYEE && reimbursement.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Anda tidak berhak melihat pengajuan reimbursement karyawan lain');
    }

    return reimbursement;
  }

  /**
   * Update reimbursement request (only allowed if DRAFT or SUBMITTED).
   */
  async update(id: string, dto: UpdateReimbursementDto, user: any, ipAddress?: string) {
    const record = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    // IDOR Protection: Employee can only update own request
    if (user.role === UserRole.EMPLOYEE && record.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Anda tidak memiliki izin untuk mengubah pengajuan ini');
    }

    if (
      record.status !== ReimbursementStatus.DRAFT &&
      record.status !== ReimbursementStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        `Pengajuan dengan status ${record.status} sudah tidak dapat diubah`,
      );
    }

    const data: Prisma.ReimbursementRequestUpdateInput = {};

    if (dto.category) data.category = dto.category;
    if (dto.amount) data.amount = new Prisma.Decimal(dto.amount);
    if (dto.date) data.date = parseJakartaDateString(dto.date);
    if (dto.description) data.description = dto.description.trim();
    if (dto.status) data.status = dto.status;

    if (dto.receipt) {
      const processed = this.processReceiptFile(dto.receipt, record.employeeId);
      data.receiptUrl = processed.url;
      data.receiptFileHash = processed.hash;
    }

    const updated = await this.prisma.reimbursementRequest.update({
      where: { id },
      data,
      include: {
        employee: {
          select: {
            id: true,
            employeeId: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    await this.auditService.log({
      action: 'REIMBURSEMENT_UPDATED',
      userId: user.id,
      ipAddress,
      details: `Pengajuan reimbursement ${record.reimbursementNo} diperbarui`,
      metadata: { resource: 'ReimbursementRequest', resourceId: id, updates: dto },
    });

    return updated;
  }

  /**
   * Cancel reimbursement request (only by owner employee, allowed if DRAFT or SUBMITTED).
   */
  async cancel(id: string, user: any, ipAddress?: string) {
    const record = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    if (user.role === UserRole.EMPLOYEE && record.employeeId !== user.employee?.id) {
      throw new ForbiddenException('Anda tidak berhak membatalkan pengajuan karyawan lain');
    }

    if (
      record.status !== ReimbursementStatus.DRAFT &&
      record.status !== ReimbursementStatus.SUBMITTED
    ) {
      throw new BadRequestException(
        `Pengajuan dengan status ${record.status} tidak dapat dibatalkan`,
      );
    }

    const cancelled = await this.prisma.reimbursementRequest.update({
      where: { id },
      data: { status: ReimbursementStatus.CANCELLED },
    });

    await this.auditService.log({
      action: 'REIMBURSEMENT_CANCELLED',
      userId: user.id,
      ipAddress,
      details: `Pengajuan reimbursement ${record.reimbursementNo} dibatalkan`,
      metadata: { resource: 'ReimbursementRequest', resourceId: id },
    });

    return {
      success: true,
      message: `Pengajuan reimbursement ${record.reimbursementNo} berhasil dibatalkan`,
      data: cancelled,
    };
  }

  // ===========================================================================
  // 2. APPROVAL & DISBURSEMENT WORKFLOW (ADMIN / HR)
  // ===========================================================================

  /**
   * Approve reimbursement request (Admin/HR only).
   */
  async approve(id: string, dto: ApproveReimbursementDto, user: any, ipAddress?: string) {
    const record = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    if (
      record.status !== ReimbursementStatus.SUBMITTED &&
      record.status !== ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Hanya pengajuan dengan status SUBMITTED atau DRAFT yang dapat disetujui (Status saat ini: ${record.status})`,
      );
    }

    const approvedAmountNum = dto.approvedAmount !== undefined ? dto.approvedAmount : Number(record.amount);

    const approved = await this.prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: ReimbursementStatus.APPROVED,
        approvedAmount: new Prisma.Decimal(approvedAmountNum),
        notes: dto.notes ? dto.notes.trim() : record.notes,
        approvedBy: user.id,
        approvedAt: new Date(),
      },
      include: {
        employee: true,
      },
    });

    // Notify Employee
    if (record.employee.userId) {
      await this.notificationsService.create({
        userId: record.employee.userId,
        type: 'REIMBURSEMENT_APPROVED',
        title: 'Reimbursement Disetujui',
        message: `Pengajuan reimbursement Anda (${record.reimbursementNo}) telah disetujui sebesar Rp ${approvedAmountNum.toLocaleString('id-ID')}.`,
        referenceType: 'REIMBURSEMENT_REQUEST',
        referenceId: record.id,
        idempotencyKey: `RMB_APPROVE_${record.id}`,
      });
    }

    await this.auditService.log({
      action: 'REIMBURSEMENT_APPROVED',
      userId: user.id,
      ipAddress,
      details: `Pengajuan reimbursement ${record.reimbursementNo} disetujui sebesar Rp ${approvedAmountNum}`,
      metadata: {
        resource: 'ReimbursementRequest',
        resourceId: id,
        approvedAmount: approvedAmountNum,
        notes: dto.notes,
      },
    });

    return approved;
  }

  /**
   * Reject reimbursement request (Admin/HR only).
   */
  async reject(id: string, dto: RejectReimbursementDto, user: any, ipAddress?: string) {
    const record = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    if (
      record.status !== ReimbursementStatus.SUBMITTED &&
      record.status !== ReimbursementStatus.DRAFT
    ) {
      throw new BadRequestException(
        `Hanya pengajuan berstatus SUBMITTED yang dapat ditolak (Status saat ini: ${record.status})`,
      );
    }

    const rejected = await this.prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: ReimbursementStatus.REJECTED,
        rejectedReason: dto.reason.trim(),
        approvedBy: user.id,
        approvedAt: new Date(),
      },
      include: { employee: true },
    });

    // Notify Employee
    if (record.employee.userId) {
      await this.notificationsService.create({
        userId: record.employee.userId,
        type: 'REIMBURSEMENT_REJECTED',
        title: 'Reimbursement Ditolak',
        message: `Pengajuan reimbursement Anda (${record.reimbursementNo}) ditolak. Alasan: ${dto.reason.trim()}`,
        referenceType: 'REIMBURSEMENT_REQUEST',
        referenceId: record.id,
        idempotencyKey: `RMB_REJECT_${record.id}`,
      });
    }

    await this.auditService.log({
      action: 'REIMBURSEMENT_REJECTED',
      userId: user.id,
      ipAddress,
      details: `Pengajuan reimbursement ${record.reimbursementNo} ditolak. Alasan: ${dto.reason}`,
      metadata: { resource: 'ReimbursementRequest', resourceId: id, reason: dto.reason },
    });

    return rejected;
  }

  /**
   * Mark reimbursement as PAID / disbursed (Admin/HR only).
   */
  async markPaid(id: string, user: any, ipAddress?: string) {
    const record = await this.prisma.reimbursementRequest.findUnique({
      where: { id },
      include: { employee: true },
    });

    if (!record) {
      throw new NotFoundException(`Pengajuan reimbursement dengan ID '${id}' tidak ditemukan`);
    }

    if (record.status !== ReimbursementStatus.APPROVED) {
      throw new BadRequestException(
        `Hanya pengajuan berstatus APPROVED yang dapat dicairkan (PAID). Status saat ini: ${record.status}`,
      );
    }

    const paidAt = new Date();
    const paid = await this.prisma.reimbursementRequest.update({
      where: { id },
      data: {
        status: ReimbursementStatus.PAID,
        paidAt,
        paidBy: user.id,
      },
      include: { employee: true },
    });

    const disbursementAmount = Number(record.approvedAmount ?? record.amount);

    // Notify Employee
    if (record.employee.userId) {
      await this.notificationsService.create({
        userId: record.employee.userId,
        type: 'REIMBURSEMENT_PAID',
        title: 'Dana Reimbursement Dicairkan',
        message: `Dana reimbursement (${record.reimbursementNo}) sebesar Rp ${disbursementAmount.toLocaleString('id-ID')} telah dibayarkan/ditransfer ke rekening Anda.`,
        referenceType: 'REIMBURSEMENT_REQUEST',
        referenceId: record.id,
        idempotencyKey: `RMB_PAID_${record.id}`,
      });
    }

    await this.auditService.log({
      action: 'REIMBURSEMENT_PAID',
      userId: user.id,
      ipAddress,
      details: `Dana reimbursement ${record.reimbursementNo} sebesar Rp ${disbursementAmount} telah dicairkan (PAID)`,
      metadata: { resource: 'ReimbursementRequest', resourceId: id, amount: disbursementAmount },
    });

    return paid;
  }

  // ===========================================================================
  // 3. STATISTICAL SUMMARY
  // ===========================================================================

  /**
   * Aggregate reimbursement stats for dashboard cards.
   */
  async getSummary(user: any) {
    const where: Prisma.ReimbursementRequestWhereInput = {};

    if (user.role === UserRole.EMPLOYEE) {
      if (!user.employee?.id) {
        throw new ForbiddenException('Profil karyawan tidak ditemukan');
      }
      where.employeeId = user.employee.id;
    }

    const records = await this.prisma.reimbursementRequest.findMany({
      where,
      select: {
        status: true,
        amount: true,
        approvedAmount: true,
      },
    });

    let totalRequests = records.length;
    let submittedCount = 0;
    let approvedCount = 0;
    let rejectedCount = 0;
    let paidCount = 0;
    let totalRequestedAmount = 0;
    let totalApprovedAmount = 0;
    let totalPaidAmount = 0;

    for (const r of records) {
      const amt = Number(r.amount);
      const appAmt = r.approvedAmount !== null ? Number(r.approvedAmount) : amt;
      totalRequestedAmount += amt;

      switch (r.status) {
        case ReimbursementStatus.SUBMITTED:
        case ReimbursementStatus.DRAFT:
          submittedCount++;
          break;
        case ReimbursementStatus.APPROVED:
          approvedCount++;
          totalApprovedAmount += appAmt;
          break;
        case ReimbursementStatus.REJECTED:
          rejectedCount++;
          break;
        case ReimbursementStatus.PAID:
          paidCount++;
          totalApprovedAmount += appAmt;
          totalPaidAmount += appAmt;
          break;
      }
    }

    return {
      totalRequests,
      submittedCount,
      approvedCount,
      rejectedCount,
      paidCount,
      totalRequestedAmount,
      totalApprovedAmount,
      totalPaidAmount,
    };
  }
}
