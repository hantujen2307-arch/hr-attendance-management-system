import { Injectable } from '@nestjs/common';
import PDFDocument from 'pdfkit';

export interface PayslipPdfData {
  companyName?: string;
  periodName: string;
  status: string;
  employeeName: string;
  employeeId: string;
  department: string;
  position: string;
  bankName?: string;
  bankAccount?: string;
  presentDays?: number;
  lateDays?: number;
  leaveDays?: number;
  absentDays?: number;
  overtimeHours?: number;
  basicSalary: number;
  allowances: number;
  fixedAllowance?: number;
  transportAllowance?: number;
  mealAllowance?: number;
  overtimePay: number;
  grossSalary: number;
  taxDeduction: number;
  bpjsDeduction: number;
  otherDeduction: number;
  totalDeductions: number;
  takeHomePay: number;
}

@Injectable()
export class PayrollPdfService {
  /**
   * Convert number to Indonesian words (Terbilang).
   */
  private terbilang(n: number): string {
    if (n === 0) return 'Nol';
    const absN = Math.abs(Math.floor(n));
    const bilangan = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];

    const convert = (num: number): string => {
      if (num < 12) return bilangan[num];
      if (num < 20) return convert(num - 10) + ' Belas';
      if (num < 100) return convert(Math.floor(num / 10)) + ' Puluh' + (num % 10 !== 0 ? ' ' + convert(num % 10) : '');
      if (num < 200) return 'Seratus' + (num - 100 !== 0 ? ' ' + convert(num - 100) : '');
      if (num < 1000) return convert(Math.floor(num / 100)) + ' Ratus' + (num % 100 !== 0 ? ' ' + convert(num % 100) : '');
      if (num < 2000) return 'Seribu' + (num - 1000 !== 0 ? ' ' + convert(num - 1000) : '');
      if (num < 1000000) return convert(Math.floor(num / 1000)) + ' Ribu' + (num % 1000 !== 0 ? ' ' + convert(num % 1000) : '');
      if (num < 1000000000) return convert(Math.floor(num / 1000000)) + ' Juta' + (num % 1000000 !== 0 ? ' ' + convert(num % 1000000) : '');
      if (num < 1000000000000) return convert(Math.floor(num / 1000000000)) + ' Miliar' + (num % 1000000000 !== 0 ? ' ' + convert(num % 1000000000) : '');
      return String(num);
    };

    return convert(absN);
  }

  /**
   * Draw a single full-page payslip onto the PDFDocument.
   */
  public drawPayslipPage(doc: typeof PDFDocument, data: PayslipPdfData, isNewPage = false) {
    if (isNewPage) {
      doc.addPage({ size: 'A4', margin: 40 });
    }

    const margin = 40;
    const pageWidth = 595.28;
    const contentWidth = pageWidth - margin * 2;

    // Outer decorative border
    doc
      .rect(margin - 10, margin - 10, contentWidth + 20, 770)
      .lineWidth(1)
      .strokeColor('#CBD5E1')
      .stroke();

    // Top Header Banner
    doc
      .rect(margin - 10, margin - 10, contentWidth + 20, 72)
      .fillColor('#1E3A8A')
      .fill();

    // Company Branding & Document Title
    const companyTitle = data.companyName || 'PT. ENTERPRISE HUMAN CAPITAL INDONESIA';
    doc
      .fillColor('#FFFFFF')
      .fontSize(15)
      .font('Helvetica-Bold')
      .text(companyTitle, margin, margin + 6, { width: contentWidth - 120 });

    doc
      .fontSize(10)
      .font('Helvetica')
      .text('SLIP GAJI RESMI (OFFICIAL PAYSLIP)', margin, margin + 27);

    doc
      .fontSize(8)
      .fillColor('#93C5FD')
      .text(`Periode Penggajian: ${data.periodName}`, margin, margin + 42);

    // Status Pill Badge
    const statusBg = data.status === 'PAID' || data.status === 'FINAL' ? '#10B981' : '#F59E0B';
    doc
      .rect(pageWidth - margin - 110, margin + 12, 110, 24)
      .fillColor(statusBg)
      .fill();

    doc
      .fillColor('#FFFFFF')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text(
        data.status === 'PAID' ? 'LUNAS / PAID' : data.status === 'FINAL' ? 'FINAL' : data.status,
        pageWidth - margin - 110,
        margin + 18,
        { width: 110, align: 'center' },
      );

    // -------------------------------------------------------------
    // Employee Information Block
    // -------------------------------------------------------------
    const metaY = margin + 78;
    doc
      .rect(margin, metaY, contentWidth, 68)
      .fillColor('#F8FAFC')
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .fillAndStroke();

    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold');
    doc.text('NAMA KARYAWAN', margin + 12, metaY + 10);
    doc.text('ID KARYAWAN', margin + 175, metaY + 10);
    doc.text('DEPARTEMEN', margin + 295, metaY + 10);
    doc.text('POSISI / JABATAN', margin + 415, metaY + 10);

    doc.fillColor('#0F172A').fontSize(9.5).font('Helvetica-Bold');
    doc.text(data.employeeName, margin + 12, metaY + 22, { width: 155, ellipsis: true });
    doc.text(data.employeeId, margin + 175, metaY + 22, { width: 110, ellipsis: true });
    doc.text(data.department, margin + 295, metaY + 22, { width: 110, ellipsis: true });
    doc.text(data.position, margin + 415, metaY + 22, { width: 95, ellipsis: true });

    doc.fillColor('#64748B').fontSize(7.5).font('Helvetica-Bold');
    doc.text('REKENING BANK', margin + 12, metaY + 44);
    doc.text('TANGGAL TERBIT', margin + 295, metaY + 44);

    const bankInfo = data.bankName && data.bankAccount
      ? `${data.bankName} - ${data.bankAccount}`
      : data.bankAccount || 'BCA (Payroll Auto-Debit)';
    const printedDate = new Intl.DateTimeFormat('id-ID', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }).format(new Date());

    doc.fillColor('#334155').fontSize(8.5).font('Helvetica');
    doc.text(bankInfo, margin + 90, metaY + 44, { width: 190, ellipsis: true });
    doc.text(printedDate, margin + 375, metaY + 44);

    // -------------------------------------------------------------
    // Attendance & Overtime Quick Stats
    // -------------------------------------------------------------
    const attY = metaY + 76;
    doc
      .rect(margin, attY, contentWidth, 34)
      .fillColor('#F1F5F9')
      .strokeColor('#CBD5E1')
      .lineWidth(0.5)
      .fillAndStroke();

    doc.fillColor('#475569').fontSize(8).font('Helvetica');
    const present = data.presentDays ?? 0;
    const late = data.lateDays ?? 0;
    const leave = data.leaveDays ?? 0;
    const absent = data.absentDays ?? 0;
    const otHours = data.overtimeHours ? Number(data.overtimeHours).toFixed(1) : '0.0';

    doc.text(
      `Kehadiran: ${present} Hari Hadir   |   ${late} Hari Terlambat   |   ${leave} Hari Cuti/Izin   |   ${absent} Hari Alpa   |   Lembur Disetujui: ${otHours} Jam`,
      margin,
      attY + 12,
      { width: contentWidth, align: 'center' },
    );

    // -------------------------------------------------------------
    // Financial Columns: Income & Deduction
    // -------------------------------------------------------------
    const finY = attY + 44;
    const colWidth = (contentWidth - 10) / 2;

    // Helper to format currency
    const formatRp = (val: number) => `Rp ${(val || 0).toLocaleString('id-ID')}`;

    // 1. Left Box: Penerimaan (Income)
    doc
      .rect(margin, finY, colWidth, 230)
      .fillColor('#FFFFFF')
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .fillAndStroke();

    doc.rect(margin, finY, colWidth, 24).fillColor('#F8FAFC').fill();
    doc.fillColor('#1E293B').fontSize(9.5).font('Helvetica-Bold').text('PENERIMAAN (INCOME)', margin + 10, finY + 7);

    let curY = finY + 32;
    const renderLine = (label: string, amount: number, x: number, w: number, color = '#0F172A', isBold = false) => {
      doc.fillColor('#475569').fontSize(8.5).font(isBold ? 'Helvetica-Bold' : 'Helvetica').text(label, x + 10, curY);
      doc
        .fillColor(color)
        .fontSize(8.5)
        .font(isBold ? 'Helvetica-Bold' : 'Helvetica')
        .text(formatRp(amount), x + 10, curY, { width: w - 20, align: 'right' });
      curY += 20;
    };

    renderLine('Gaji Pokok (Basic Salary)', data.basicSalary, margin, colWidth);
    renderLine('Tunjangan (Allowance)', data.allowances, margin, colWidth);

    if (data.fixedAllowance && data.fixedAllowance > 0) {
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(`  • Tunjangan Tetap: ${formatRp(data.fixedAllowance)}`, margin + 14, curY - 6);
    }
    if (data.transportAllowance && data.transportAllowance > 0) {
      doc.fillColor('#94A3B8').fontSize(7.5).font('Helvetica').text(`  • Tunjangan Transport: ${formatRp(data.transportAllowance)}`, margin + 14, curY + 2);
    }

    renderLine('Upah Lembur (Overtime)', data.overtimePay, margin, colWidth, '#059669');

    // Divider & Gross Total
    doc.moveTo(margin + 10, finY + 196).lineTo(margin + colWidth - 10, finY + 196).strokeColor('#CBD5E1').stroke();
    curY = finY + 204;
    renderLine('Gross Salary (Gaji Kotor)', data.grossSalary, margin, colWidth, '#1E3A8A', true);

    // 2. Right Box: Potongan (Deduction)
    const rightX = margin + colWidth + 10;
    doc
      .rect(rightX, finY, colWidth, 230)
      .fillColor('#FFFFFF')
      .strokeColor('#E2E8F0')
      .lineWidth(1)
      .fillAndStroke();

    doc.rect(rightX, finY, colWidth, 24).fillColor('#F8FAFC').fill();
    doc.fillColor('#1E293B').fontSize(9.5).font('Helvetica-Bold').text('POTONGAN (DEDUCTION)', rightX + 10, finY + 7);

    curY = finY + 32;
    renderLine('Pajak PPh 21 (Tax)', data.taxDeduction, rightX, colWidth, '#DC2626');
    renderLine('BPJS Ketenagakerjaan/Kesehatan', data.bpjsDeduction, rightX, colWidth, '#DC2626');
    renderLine('Potongan Lainnya (Other Deduction)', data.otherDeduction, rightX, colWidth, '#DC2626');

    // Divider & Total Deductions
    doc.moveTo(rightX + 10, finY + 196).lineTo(rightX + colWidth - 10, finY + 196).strokeColor('#CBD5E1').stroke();
    curY = finY + 204;
    renderLine('Total Potongan (Deductions)', data.totalDeductions, rightX, colWidth, '#DC2626', true);

    // -------------------------------------------------------------
    // Final Highlight Banner: TAKE HOME PAY
    // -------------------------------------------------------------
    const thpY = finY + 242;
    doc
      .rect(margin, thpY, contentWidth, 62)
      .fillColor('#ECFDF5')
      .strokeColor('#10B981')
      .lineWidth(1.5)
      .fillAndStroke();

    doc.fillColor('#065F46').fontSize(11).font('Helvetica-Bold').text('GAJI BERSIH (TAKE HOME PAY)', margin + 14, thpY + 11);
    doc.fontSize(8).font('Helvetica').fillColor('#047857').text('Formula: Gross Salary - Total Potongan', margin + 14, thpY + 26);
    doc
      .fontSize(8)
      .font('Helvetica-Oblique')
      .fillColor('#065F46')
      .text(`Terbilang: ${this.terbilang(data.takeHomePay)} Rupiah`, margin + 14, thpY + 41, { width: contentWidth - 180 });

    doc
      .fillColor('#047857')
      .fontSize(17)
      .font('Helvetica-Bold')
      .text(formatRp(data.takeHomePay), margin + 10, thpY + 18, {
        width: contentWidth - 24,
        align: 'right',
      });

    // -------------------------------------------------------------
    // Signatures & Legal Verification
    // -------------------------------------------------------------
    const signY = thpY + 80;
    doc.fillColor('#475569').fontSize(8.5).font('Helvetica');
    doc.text('Diterbitkan oleh:', margin + 45, signY);
    doc.text('Diterima oleh:', pageWidth - margin - 150, signY);

    doc.moveTo(margin + 20, signY + 60).lineTo(margin + 160, signY + 60).strokeColor('#94A3B8').stroke();
    doc.moveTo(pageWidth - margin - 170, signY + 60).lineTo(pageWidth - margin - 30, signY + 60).stroke();

    doc.fillColor('#0F172A').fontSize(8.5).font('Helvetica-Bold');
    doc.text('HR & Payroll Department', margin + 20, signY + 65, { width: 140, align: 'center' });
    doc.text(data.employeeName, pageWidth - margin - 170, signY + 65, { width: 140, align: 'center' });

    // Footer Security Notice
    doc
      .fillColor('#94A3B8')
      .fontSize(7)
      .font('Helvetica-Oblique')
      .text(
        'Slip gaji ini diterbitkan secara otomatis dan sah melalui Enterprise HR System. Dokumen ini bersifat rahasia (CONFIDENTIAL).',
        margin,
        786,
        { width: contentWidth, align: 'center' },
      );
  }

  /**
   * Generate PDF buffer for a single employee payslip record.
   */
  public async generateSinglePayslipPdf(record: any): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers: Buffer[] = [];

      doc.on('data', (b: Buffer) => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: any) => reject(err));

      const pdfData = this.formatRecordToPdfData(record);
      this.drawPayslipPage(doc, pdfData, false);

      doc.end();
    });
  }

  /**
   * Generate multi-page PDF buffer containing all employee payslips for a period.
   */
  public async generateBulkPayslipsPdf(period: any, records: any[]): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ size: 'A4', margin: 40, autoFirstPage: false });
      const buffers: Buffer[] = [];

      doc.on('data', (b: Buffer) => buffers.push(b));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err: any) => reject(err));

      records.forEach((rec, idx) => {
        const pdfData = this.formatRecordToPdfData(rec, period);
        this.drawPayslipPage(doc, pdfData, true);
      });

      doc.end();
    });
  }

  /**
   * Transform database record into PDF layout view model.
   */
  private formatRecordToPdfData(record: any, periodOverride?: any): PayslipPdfData {
    const period = periodOverride || record.payrollPeriod || {};
    const emp = record.employee || {};
    const salary = emp.salary || {};

    const basicSalary = Number(record.basicSalary || salary.basicSalary || 0);
    const fixedAllowance = Number(record.fixedAllowance || salary.fixedAllowance || 0);
    const transportAllowance = Number(record.transportAllowance || salary.transportAllowance || 0);
    const mealAllowance = Number(record.mealAllowance || salary.mealAllowance || 0);
    const allowances = Number(record.allowances || salary.allowances || fixedAllowance + transportAllowance + mealAllowance || 0);

    const overtimePay = Number(record.overtimePay || 0);
    const grossSalary = Number(record.grossSalary || basicSalary + allowances + overtimePay);

    const taxDeduction = Number(record.taxDeduction || salary.taxDeduction || 0);
    const bpjsDeduction = Number(record.bpjsDeduction || salary.bpjsDeduction || 0);
    const lateDeduction = Number(record.lateDeduction || 0);
    const alphaDeduction = Number(record.alphaDeduction || 0);
    const unpaidLeaveDeduction = Number(record.unpaidLeaveDeduction || 0);
    const fixedDeduction = Number(record.fixedDeduction || salary.fixedDeduction || 0);
    const otherDeduction = Number(
      record.otherDeduction ||
      lateDeduction + alphaDeduction + unpaidLeaveDeduction + fixedDeduction ||
      0
    );

    const totalDeductions = Number(record.totalDeductions || record.deductions || taxDeduction + bpjsDeduction + otherDeduction);
    const takeHomePay = Number(record.takeHomePay || record.netSalary || Math.max(0, grossSalary - totalDeductions));

    return {
      companyName: 'PT. ENTERPRISE HUMAN CAPITAL INDONESIA',
      periodName: period.name || 'Periode Penggajian',
      status: record.status || period.status || 'PROCESSED',
      employeeName: `${emp.firstName || ''} ${emp.lastName || ''}`.trim() || 'Karyawan',
      employeeId: emp.employeeId || 'EMP-000',
      department: typeof emp.department === 'object' ? emp.department?.name : emp.department || 'Umum',
      position: emp.position || 'Staff',
      bankName: salary.bankName || 'BCA',
      bankAccount: salary.bankAccount || salary.bankAccountNumber || '-',
      presentDays: record.presentDays || 0,
      lateDays: record.lateDays || 0,
      leaveDays: record.leaveDays || 0,
      absentDays: record.absentDays || 0,
      overtimeHours: Number(record.overtimeHours || 0),
      basicSalary,
      allowances,
      fixedAllowance,
      transportAllowance,
      mealAllowance,
      overtimePay,
      grossSalary,
      taxDeduction,
      bpjsDeduction,
      otherDeduction,
      totalDeductions,
      takeHomePay,
    };
  }
}
