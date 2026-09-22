import { PrismaClient, UserRole, EmploymentStatus, ReimbursementCategory, ReimbursementStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const BACKEND_URL = 'http://localhost:5001/api';
const prisma = new PrismaClient();

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`  ✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${testName}`);
    if (detail) console.error('     Details:', JSON.stringify(detail, null, 2));
    failed++;
  }
}

// Valid 1x1 PNG base64:
// 89 50 4E 47 0D 0A 1A 0A ...
const VALID_PNG_BASE64 =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

// Valid minimal PDF base64:
// %PDF-1.4 ... %%EOF
const VALID_PDF_BASE64 =
  'data:application/pdf;base64,JVBERi0xLjQKMSAwIG9iago8PAovVHlwZSAvQ2F0YWxvZwovUGFnZXMgMiAwIFIKPj4KZW5kb2JqCjIgMCBvYmoKPDwKL1R5cGUgL1BhZ2VzCi9LaWRzIFszIDAgUl0KL0NvdW50IDEKPj4KZW5kb2JqCjMgMCBvYmoKPDwKL1R5cGUgL1BhZ2UKL1BhcmVudCAyIDAgUgovTWVkaWFCb3ggWzAgMCA2MTIgNzkyXQo+PgplbmRvYmoKeHJlZgowIDQKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMDE1IDAwMDAwIG4gCjAwMDAwMDAwNjggMDAwMDAgbiAKMDAwMDAwMDEyNSAwMDAwMCBuIAp0cmFpbGVyCjw8Ci9TaXplIDQKL1Jvb3QgMSAwIFIKPj4Kc3RhcnR4cmVmCjIwNAolJUVPRg==';

// Malicious / fake file disguised as PNG:
const FAKE_PNG_BASE64 = 'data:image/png;base64,PHNjcmlwdD5hbGVydCgxKTwvc2NyaXB0Pg=='; // contains "<script>alert(1)</script>"

async function runReimbursementV2TestSuite() {
  console.log('================================================================');
  console.log('🧾 RUNNING V2: REIMBURSEMENT MANAGEMENT COMPREHENSIVE TEST SUITE');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // 0. SETUP: Ensure Users, Profiles, and Auth Tokens
    // -------------------------------------------------------------
    console.log('--- 0. Setup Test Users & Tokens ---');
    const passwordHash = await bcrypt.hash('password123', 10);

    // Admin
    let adminUser = await prisma.user.findUnique({ where: { email: 'admin@example.com' } });
    if (!adminUser) {
      adminUser = await prisma.user.create({
        data: { email: 'admin@example.com', passwordHash, role: UserRole.ADMIN },
      });
    }

    // HR
    let hrUser = await prisma.user.findUnique({ where: { email: 'hr@example.com' } });
    if (!hrUser) {
      hrUser = await prisma.user.create({
        data: { email: 'hr@example.com', passwordHash, role: UserRole.HR },
      });
    }

    // Ensure Department exists
    let dept = await prisma.department.findFirst();
    if (!dept) {
      dept = await prisma.department.create({
        data: { name: 'Operations', code: 'OPS' },
      });
    }

    // Employee 1
    let empUser1: any = await prisma.user.findUnique({
      where: { email: 'employee@example.com' },
      include: { employee: true },
    });
    if (!empUser1) {
      empUser1 = await prisma.user.create({
        data: {
          email: 'employee@example.com',
          passwordHash,
          role: UserRole.EMPLOYEE,
          employee: {
            create: {
              employeeId: 'EMP-V2-001',
              firstName: 'Reimburse',
              lastName: 'Employee One',
              email: 'employee@example.com',
              position: 'Field Operations',
              departmentId: dept.id,
              employmentStatus: EmploymentStatus.ACTIVE,
              joinDate: new Date('2024-01-01'),
            },
          },
        },
        include: { employee: true },
      });
    }

    // Employee 2
    let empUser2: any = await prisma.user.findUnique({
      where: { email: 'employee2@example.com' },
      include: { employee: true },
    });
    if (!empUser2) {
      empUser2 = await prisma.user.create({
        data: {
          email: 'employee2@example.com',
          passwordHash,
          role: UserRole.EMPLOYEE,
          employee: {
            create: {
              employeeId: 'EMP-V2-002',
              firstName: 'Reimburse',
              lastName: 'Employee Two',
              email: 'employee2@example.com',
              position: 'Marketing Rep',
              departmentId: dept.id,
              employmentStatus: EmploymentStatus.ACTIVE,
              joinDate: new Date('2024-01-01'),
            },
          },
        },
        include: { employee: true },
      });
    }

    // Login for tokens
    const login = async (email: string) => {
      const res = await fetch(`${BACKEND_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: 'password123' }),
      });
      const data = (await res.json()) as any;
      return data.access_token;
    };

    const adminToken = await login('admin@example.com');
    const hrToken = await login('hr@example.com');
    const emp1Token = await login('employee@example.com');
    const emp2Token = await login('employee2@example.com');

    assert(
      !!adminToken && !!hrToken && !!emp1Token && !!emp2Token,
      'All auth tokens acquired successfully',
    );

    const emp1Id = empUser1.employee!.id;
    const emp2Id = empUser2.employee!.id;

    // Cleanup previous test reimbursements
    await prisma.reimbursementRequest.deleteMany({
      where: {
        employeeId: { in: [emp1Id, emp2Id] },
      },
    });
    console.log('Cleaned up previous test reimbursement records.\n');

    // -------------------------------------------------------------
    // 1. TEST: Valid Submission & Number Generation
    // -------------------------------------------------------------
    console.log('--- 1. Valid Submission & Sequential Numbering ---');
    const createRes1 = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'TRANSPORTATION',
        amount: 175000,
        date: '2026-09-21',
        description: 'Taksi dinas ke kantor klien Jakarta Pusat',
        receipt: VALID_PNG_BASE64,
        status: 'SUBMITTED',
      }),
    });

    const createData1 = await createRes1.json();
    assert(createRes1.status === 201, 'Employee 1 submitted reimbursement successfully (201)', createData1);
    assert(
      createData1.reimbursementNo && createData1.reimbursementNo.startsWith('RMB-'),
      `Reimbursement number generated: ${createData1.reimbursementNo}`,
    );
    assert(createData1.status === 'SUBMITTED', 'Status is SUBMITTED');
    assert(Number(createData1.amount) === 175000, 'Amount is 175,000');
    assert(!!createData1.receiptFileHash, 'SHA-256 integrity hash is computed');

    const req1Id = createData1.id;

    // Check Notification for HR/Admin
    const notifs = await prisma.notification.findMany({
      where: {
        type: 'REIMBURSEMENT_SUBMITTED',
        referenceId: req1Id,
      },
    });
    assert(notifs.length > 0, 'HR/Admin received notification for new reimbursement submission');

    // -------------------------------------------------------------
    // 2. TEST: Secure File Validation & Magic Bytes Inspection
    // -------------------------------------------------------------
    console.log('\n--- 2. File Upload Security & Magic Byte Inspection ---');
    // A. Malicious fake file disguised as PNG
    const fakeRes = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'MEALS',
        amount: 50000,
        date: '2026-09-21',
        description: 'Makan siang lembur',
        receipt: FAKE_PNG_BASE64,
      }),
    });
    assert(
      fakeRes.status === 400,
      'Disguised non-image payload rejected by magic bytes inspection (400)',
      await fakeRes.json(),
    );

    // B. Invalid category
    const badCatRes = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'INVALID_CATEGORY',
        amount: 50000,
        date: '2026-09-21',
        description: 'Test',
        receipt: VALID_PNG_BASE64,
      }),
    });
    assert(badCatRes.status === 400, 'Invalid category rejected (400)');

    // C. Non-positive amount
    const badAmtRes = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'MEALS',
        amount: -1000,
        date: '2026-09-21',
        description: 'Test',
        receipt: VALID_PNG_BASE64,
      }),
    });
    assert(badAmtRes.status === 400, 'Negative amount rejected (400)');

    // D. Valid PDF receipt
    const pdfRes = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'BUSINESS_TRIP',
        amount: 650000,
        date: '2026-09-20',
        description: 'Tiket kereta perjalanan dinas Bandung',
        receipt: VALID_PDF_BASE64,
      }),
    });
    const pdfData = await pdfRes.json();
    assert(pdfRes.status === 201, 'Valid PDF receipt accepted successfully (201)', pdfData);

    // -------------------------------------------------------------
    // 3. TEST: DRAFT Creation & Update Lifecycle
    // -------------------------------------------------------------
    console.log('\n--- 3. DRAFT Lifecycle & Modifications ---');
    const draftRes = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        category: 'OPERATIONAL',
        amount: 80000,
        date: '2026-09-21',
        description: 'Beli ATK dan kertas printer',
        receipt: VALID_PNG_BASE64,
        status: 'DRAFT',
      }),
    });
    const draftData = await draftRes.json();
    assert(draftData.status === 'DRAFT', 'Reimbursement saved as DRAFT', draftData);

    // Update draft amount and submit
    const updateDraftRes = await fetch(`${BACKEND_URL}/reimbursements/${draftData.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({
        amount: 95000,
        description: 'Beli ATK dan spidol whiteboard',
        status: 'SUBMITTED',
      }),
    });
    const updatedDraft = await updateDraftRes.json();
    assert(updateDraftRes.status === 200, 'Draft updated successfully (200)', updatedDraft);
    assert(Number(updatedDraft.amount) === 95000, 'Updated amount is 95,000');
    assert(updatedDraft.status === 'SUBMITTED', 'Status transitioned from DRAFT to SUBMITTED');

    // -------------------------------------------------------------
    // 4. TEST: Employee Cancellation
    // -------------------------------------------------------------
    console.log('\n--- 4. Employee Cancellation ---');
    const cancelRes = await fetch(`${BACKEND_URL}/reimbursements/${draftData.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const cancelledData = await cancelRes.json();
    assert(cancelRes.status === 200, 'Employee 1 cancelled own submission (200)', cancelledData);
    assert((cancelledData.data?.status || cancelledData.status) === 'CANCELLED', 'Status is CANCELLED');

    // Cannot cancel again
    const cancelAgain = await fetch(`${BACKEND_URL}/reimbursements/${draftData.id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(cancelAgain.status === 400, 'Cannot cancel an already CANCELLED request (400)');

    // -------------------------------------------------------------
    // 5. TEST: Authorization & Strict IDOR Protection
    // -------------------------------------------------------------
    console.log('\n--- 5. Authorization & Strict IDOR Protection ---');
    // A. Employee 2 tries to GET Employee 1's reimbursement by ID
    const idorGet = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}`, {
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    assert(idorGet.status === 403, 'IDOR GET blocked: Employee 2 cannot view Employee 1 request (403)');

    // B. Employee 2 tries to PATCH Employee 1's reimbursement
    const idorPatch = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp2Token}`,
      },
      body: JSON.stringify({ amount: 999999 }),
    });
    assert(idorPatch.status === 403, 'IDOR PATCH blocked: Employee 2 cannot edit Employee 1 request (403)');

    // C. Employee 2 tries to CANCEL Employee 1's reimbursement
    const idorCancel = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/cancel`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp2Token}` },
    });
    assert(idorCancel.status === 403, 'IDOR CANCEL blocked: Employee 2 cannot cancel Employee 1 request (403)');

    // D. Employee 1 tries to call Admin/HR APPROVE endpoint
    const rbacApprove = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ approvedAmount: 175000 }),
    });
    assert(rbacApprove.status === 403, 'RBAC check: Employee cannot call approve endpoint (403)');

    // E. Employee 1 tries to call Admin/HR REJECT endpoint
    const rbacReject = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp1Token}`,
      },
      body: JSON.stringify({ reason: 'Self-reject test' }),
    });
    assert(rbacReject.status === 403, 'RBAC check: Employee cannot call reject endpoint (403)');

    // F. Employee 1 tries to call Admin/HR PAY endpoint
    const rbacPay = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    assert(rbacPay.status === 403, 'RBAC check: Employee cannot call pay endpoint (403)');

    // -------------------------------------------------------------
    // 6. TEST: Scoped Query & Filter Isolation
    // -------------------------------------------------------------
    console.log('\n--- 6. Scoped Query & Filter Isolation ---');
    // Employee 2 submits their own reimbursement
    const emp2Req = await fetch(`${BACKEND_URL}/reimbursements`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${emp2Token}`,
      },
      body: JSON.stringify({
        category: 'MEALS',
        amount: 60000,
        date: '2026-09-21',
        description: 'Konsumsi meeting eksternal',
        receipt: VALID_PNG_BASE64,
        status: 'SUBMITTED',
      }),
    });
    const emp2ReqData = await emp2Req.json();
    assert(emp2Req.status === 201, 'Employee 2 submitted reimbursement (201)', emp2ReqData);

    // List as Employee 1 -> should only contain Employee 1 records
    const emp1List = await fetch(`${BACKEND_URL}/reimbursements`, {
      headers: { Authorization: `Bearer ${emp1Token}` },
    });
    const emp1ListData = await emp1List.json();
    const hasOtherEmpData = emp1ListData.data.some((r: any) => r.employeeId !== emp1Id);
    assert(!hasOtherEmpData, 'Scoped query: Employee 1 sees only own reimbursements');

    // List as Admin -> sees all records
    const adminList = await fetch(`${BACKEND_URL}/reimbursements`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const adminListData = await adminList.json();
    const adminHasEmp1 = adminListData.data.some((r: any) => r.employeeId === emp1Id);
    const adminHasEmp2 = adminListData.data.some((r: any) => r.employeeId === emp2Id);
    assert(adminHasEmp1 && adminHasEmp2, 'Admin query sees reimbursements from both employees');

    // Filter by category
    const catList = await fetch(`${BACKEND_URL}/reimbursements?category=TRANSPORTATION`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const catListData = await catList.json();
    assert(
      catListData.data.every((r: any) => r.category === 'TRANSPORTATION'),
      'Category filter TRANSPORTATION works correctly',
    );

    // -------------------------------------------------------------
    // 7. TEST: HR / Admin Approval Workflow
    // -------------------------------------------------------------
    console.log('\n--- 7. HR / Admin Review & Approval Workflow ---');
    // HR approves req1Id with partial amount
    const hrApproveRes = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/approve`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${hrToken}`,
      },
      body: JSON.stringify({
        approvedAmount: 160000,
        notes: 'Disetujui sebagian, potongan tip supir non-operasional',
      }),
    });
    const approvedData = await hrApproveRes.json();
    assert(hrApproveRes.status === 200, 'HR approved reimbursement (200)', approvedData);
    assert(approvedData.status === 'APPROVED', 'Status changed to APPROVED');
    assert(Number(approvedData.approvedAmount) === 160000, 'Approved amount recorded: 160,000');
    assert(
      approvedData.notes && approvedData.notes.includes('potongan tip'),
      'Approval notes recorded',
    );

    // Verify Employee 1 received approval notification
    const appNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'REIMBURSEMENT_APPROVED',
        referenceId: req1Id,
      },
    });
    assert(!!appNotif, 'Employee 1 received REIMBURSEMENT_APPROVED notification');

    // -------------------------------------------------------------
    // 8. TEST: HR / Admin Rejection Workflow
    // -------------------------------------------------------------
    console.log('\n--- 8. HR / Admin Rejection Workflow ---');
    // Attempt rejection without reason -> 400
    const rejectNoReason = await fetch(`${BACKEND_URL}/reimbursements/${emp2ReqData.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ reason: '' }),
    });
    assert(rejectNoReason.status === 400, 'Rejection without reason rejected (400)');

    // Reject with valid reason
    const rejectRes = await fetch(`${BACKEND_URL}/reimbursements/${emp2ReqData.id}/reject`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        reason: 'Nota tidak memiliki cap/stempel resmi restoran penyedia',
      }),
    });
    const rejectedData = await rejectRes.json();
    assert(rejectRes.status === 200, 'Admin rejected reimbursement with reason (200)', rejectedData);
    assert(rejectedData.status === 'REJECTED', 'Status changed to REJECTED');
    assert(
      rejectedData.rejectedReason && rejectedData.rejectedReason.includes('cap/stempel resmi'),
      'Rejection reason recorded properly',
    );

    // Verify Employee 2 received rejection notification
    const rejNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser2.id,
        type: 'REIMBURSEMENT_REJECTED',
        referenceId: emp2ReqData.id,
      },
    });
    assert(!!rejNotif, 'Employee 2 received REIMBURSEMENT_REJECTED notification');

    // -------------------------------------------------------------
    // 9. TEST: Payment / Disbursement Workflow (PAID)
    // -------------------------------------------------------------
    console.log('\n--- 9. Payment / Disbursement Workflow (PAID) ---');
    // Cannot pay REJECTED request
    const badPayRes = await fetch(`${BACKEND_URL}/reimbursements/${emp2ReqData.id}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(badPayRes.status === 400, 'Cannot mark REJECTED reimbursement as PAID (400)');

    // Pay APPROVED request (req1Id)
    const payRes = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const paidData = await payRes.json();
    assert(payRes.status === 200, 'Reimbursement marked as PAID (200)', paidData);
    assert(paidData.status === 'PAID', 'Status changed to PAID');
    assert(!!paidData.paidAt, 'paidAt timestamp recorded');
    assert(paidData.paidBy === adminUser.id, 'paidBy user ID recorded');

    // Verify Employee 1 received payment notification
    const paidNotif = await prisma.notification.findFirst({
      where: {
        userId: empUser1.id,
        type: 'REIMBURSEMENT_PAID',
        referenceId: req1Id,
      },
    });
    assert(!!paidNotif, 'Employee 1 received REIMBURSEMENT_PAID notification');

    // Cannot pay again
    const payAgain = await fetch(`${BACKEND_URL}/reimbursements/${req1Id}/pay`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(payAgain.status === 400, 'Cannot pay already PAID reimbursement (400)');

    // -------------------------------------------------------------
    // 10. TEST: Statistical Summary API
    // -------------------------------------------------------------
    console.log('\n--- 10. Summary Statistics API ---');
    const summaryRes = await fetch(`${BACKEND_URL}/reimbursements/summary`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const summaryData = await summaryRes.json();
    assert(summaryRes.status === 200, 'Admin fetched summary statistics (200)', summaryData);
    assert(summaryData.totalRequests > 0, 'Total requests aggregated');
    assert(summaryData.paidCount >= 1, 'Paid count reflects paid request');
    assert(summaryData.rejectedCount >= 1, 'Rejected count reflects rejected request');
    assert(summaryData.totalPaidAmount >= 160000, 'Total paid amount aggregates accurately');

    // -------------------------------------------------------------
    // 11. TEST: Audit Log Verification
    // -------------------------------------------------------------
    console.log('\n--- 11. Audit Log Verification ---');
    const auditLogs = await prisma.auditLog.findMany({
      where: {
        action: {
          in: [
            'REIMBURSEMENT_CREATED',
            'REIMBURSEMENT_CANCELLED',
            'REIMBURSEMENT_APPROVED',
            'REIMBURSEMENT_REJECTED',
            'REIMBURSEMENT_PAID',
          ],
        },
      },
    });
    const actionTypes = new Set(auditLogs.map((l) => l.action));
    assert(actionTypes.has('REIMBURSEMENT_CREATED'), 'Audit log contains REIMBURSEMENT_CREATED');
    assert(actionTypes.has('REIMBURSEMENT_CANCELLED'), 'Audit log contains REIMBURSEMENT_CANCELLED');
    assert(actionTypes.has('REIMBURSEMENT_APPROVED'), 'Audit log contains REIMBURSEMENT_APPROVED');
    assert(actionTypes.has('REIMBURSEMENT_REJECTED'), 'Audit log contains REIMBURSEMENT_REJECTED');
    assert(actionTypes.has('REIMBURSEMENT_PAID'), 'Audit log contains REIMBURSEMENT_PAID');

    // -------------------------------------------------------------
    // SUMMARY
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`🎉 TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal error running test suite:', err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runReimbursementV2TestSuite();
