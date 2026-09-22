import {
  getJakartaDateInfo,
  parseJakartaDateString,
  determinePunctualityStatus,
  calculateWorkingMinutes,
  calculateHaversineDistance,
} from '../src/attendance/attendance.time.util';
import { AttendanceStatus } from '@prisma/client';

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: any) {
  if (condition) {
    console.log(`✅ [PASS] ${testName}`);
    passed++;
  } else {
    console.error(`❌ [FAIL] ${testName}`);
    if (detail) console.error('   Details:', JSON.stringify(detail, null, 2));
    failed++;
  }
}

async function runTimezoneEdgeCasesTests() {
  console.log('================================================================');
  console.log('🌏 RUNNING TIMEZONE (WIB / ASIA/JAKARTA) & DATE EDGE CASES SUITE');
  console.log('================================================================\n');

  // ---------------------------------------------------------------------------
  // 1. Basic Jakarta Date & Time Resolution
  // ---------------------------------------------------------------------------
  console.log('--- 1. Jakarta Timezone (WIB) Conversion ---');

  // 2026-09-20 07:30:00 UTC = 2026-09-20 14:30:00 WIB (+7 hours)
  const utcDate = new Date('2026-09-20T07:30:00.000Z');
  const wibInfo = getJakartaDateInfo(utcDate);

  assert(
    wibInfo.year === 2026 &&
      wibInfo.month === 9 &&
      wibInfo.day === 20 &&
      wibInfo.hour === 14 &&
      wibInfo.minute === 30,
    'UTC date converts accurately to Asia/Jakarta (+7h) hour 14:30',
    wibInfo
  );

  assert(
    wibInfo.dateString === '2026-09-20',
    'dateString format is YYYY-MM-DD in WIB',
    wibInfo.dateString
  );

  // ---------------------------------------------------------------------------
  // 2. Midnight Boundary & Shift Rollover
  // ---------------------------------------------------------------------------
  console.log('\n--- 2. Midnight Boundary Tests ---');

  // 2026-09-20 17:00:00 UTC = 2026-09-21 00:00:00 WIB (Exact midnight)
  const midnightUtc = new Date('2026-09-20T17:00:00.000Z');
  const midnightWib = getJakartaDateInfo(midnightUtc);

  assert(
    midnightWib.day === 21 && midnightWib.hour === 0 && midnightWib.minute === 0,
    'UTC 17:00 evaluates to next day midnight (00:00) in WIB',
    midnightWib
  );

  // 23:59:59 WIB to 00:00:00 WIB rollover
  const justBeforeMidnight = new Date('2026-09-20T16:59:59.000Z'); // 23:59:59 WIB
  const justBeforeInfo = getJakartaDateInfo(justBeforeMidnight);
  assert(
    justBeforeInfo.day === 20 && justBeforeInfo.hour === 23 && justBeforeInfo.minute === 59,
    '23:59:59 WIB correctly remains on day 20',
    justBeforeInfo
  );

  // ---------------------------------------------------------------------------
  // 3. Month & Year End Transitions
  // ---------------------------------------------------------------------------
  console.log('\n--- 3. Month and Year End Transitions ---');

  // End of January (31 days) to February
  const endOfJan = new Date('2026-01-31T17:00:00.000Z'); // 2026-02-01 00:00:00 WIB
  const febStartInfo = getJakartaDateInfo(endOfJan);
  assert(
    febStartInfo.month === 2 && febStartInfo.day === 1 && febStartInfo.dateString === '2026-02-01',
    'Rollover from Jan 31 to Feb 01 evaluated accurately in WIB',
    febStartInfo
  );

  // End of February (28 days in non-leap 2026) to March
  const endOfFeb = new Date('2026-02-28T17:00:00.000Z'); // 2026-03-01 00:00:00 WIB
  const marStartInfo = getJakartaDateInfo(endOfFeb);
  assert(
    marStartInfo.month === 3 && marStartInfo.day === 1 && marStartInfo.dateString === '2026-03-01',
    'Rollover from Feb 28 to Mar 01 evaluated accurately in non-leap year 2026',
    marStartInfo
  );

  // End of Year (31 Dec 2026 -> 01 Jan 2027)
  const endOfYear = new Date('2026-12-31T17:00:00.000Z'); // 2027-01-01 00:00:00 WIB
  const newYearInfo = getJakartaDateInfo(endOfYear);
  assert(
    newYearInfo.year === 2027 &&
      newYearInfo.month === 1 &&
      newYearInfo.day === 1 &&
      newYearInfo.dateString === '2027-01-01',
    'Rollover from Dec 31 to New Year Jan 01 evaluated accurately in WIB',
    newYearInfo
  );

  // ---------------------------------------------------------------------------
  // 4. Prisma Date Parsing (parseJakartaDateString)
  // ---------------------------------------------------------------------------
  console.log('\n--- 4. Date Parsing for PostgreSQL @db.Date ---');

  const parsedDate = parseJakartaDateString('2026-09-20');
  assert(
    parsedDate.toISOString() === '2026-09-20T00:00:00.000Z',
    'parseJakartaDateString produces UTC midnight timestamp matching PostgreSQL @db.Date'
  );

  let parseErrorCaught = false;
  try {
    parseJakartaDateString('invalid-date-string');
  } catch {
    parseErrorCaught = true;
  }
  assert(parseErrorCaught, 'parseJakartaDateString throws descriptive error on malformed date string');

  // ---------------------------------------------------------------------------
  // 5. Punctuality Evaluation Logic
  // ---------------------------------------------------------------------------
  console.log('\n--- 5. Punctuality Evaluation Logic ---');

  // Shift starts at 08:00 WIB with 15 min tolerance (cutoff = 08:15)
  const onTimeCheckIn = new Date('2026-09-20T01:10:00.000Z'); // 08:10 WIB -> PRESENT
  const statusOnTime = determinePunctualityStatus(onTimeCheckIn, '08:00', 15);
  assert(
    statusOnTime === AttendanceStatus.PRESENT,
    'Check-in at 08:10 WIB (within 15m tolerance) evaluates to PRESENT',
    statusOnTime
  );

  const exactCutoffCheckIn = new Date('2026-09-20T01:15:00.000Z'); // 08:15 WIB -> PRESENT
  const statusCutoff = determinePunctualityStatus(exactCutoffCheckIn, '08:00', 15);
  assert(
    statusCutoff === AttendanceStatus.PRESENT,
    'Check-in exactly at tolerance cutoff 08:15 WIB evaluates to PRESENT',
    statusCutoff
  );

  const lateCheckIn = new Date('2026-09-20T01:16:00.000Z'); // 08:16 WIB -> LATE
  const statusLate = determinePunctualityStatus(lateCheckIn, '08:00', 15);
  assert(
    statusLate === AttendanceStatus.LATE,
    'Check-in at 08:16 WIB (past 15m tolerance) evaluates to LATE',
    statusLate
  );

  // ---------------------------------------------------------------------------
  // 6. Working Minutes & Overnight Shift Calculations
  // ---------------------------------------------------------------------------
  console.log('\n--- 6. Working Minutes Calculations ---');

  // Standard daytime shift: 08:00 WIB to 17:00 WIB = 9 hours = 540 minutes
  const checkInDay = new Date('2026-09-20T01:00:00.000Z'); // 08:00 WIB
  const checkOutDay = new Date('2026-09-20T10:00:00.000Z'); // 17:00 WIB
  const dayWorkingMinutes = calculateWorkingMinutes(checkInDay, checkOutDay);
  assert(
    dayWorkingMinutes === 540,
    'Normal shift working duration 08:00-17:00 WIB evaluates to 540 minutes',
    dayWorkingMinutes
  );

  // Overnight shift: 22:00 WIB (day 1) to 06:00 WIB (day 2) = 8 hours = 480 minutes
  const checkInNight = new Date('2026-09-20T15:00:00.000Z'); // 22:00 WIB
  const checkOutNight = new Date('2026-09-20T23:00:00.000Z'); // 06:00 WIB next day
  const nightWorkingMinutes = calculateWorkingMinutes(checkInNight, checkOutNight);
  assert(
    nightWorkingMinutes === 480,
    'Overnight shift working duration 22:00-06:00 WIB evaluates to 480 minutes',
    nightWorkingMinutes
  );

  // Invalid check-out earlier than check-in
  let checkoutErrorCaught = false;
  try {
    calculateWorkingMinutes(checkOutDay, checkInDay);
  } catch {
    checkoutErrorCaught = true;
  }
  assert(
    checkoutErrorCaught,
    'calculateWorkingMinutes throws error when checkOut is earlier than checkIn'
  );

  // ---------------------------------------------------------------------------
  // 7. Geofencing Haversine Accuracy
  // ---------------------------------------------------------------------------
  console.log('\n--- 7. Geofencing Haversine Accuracy ---');

  // Kantor Pusat coordinates: -6.2088, 106.8456
  const officeLat = -6.2088;
  const officeLon = 106.8456;

  // Exact location -> distance 0 meters
  const distanceExact = calculateHaversineDistance(officeLat, officeLon, officeLat, officeLon);
  assert(distanceExact === 0, 'Haversine distance to identical coordinates is 0 meters');

  // ~30 meters away (inside 100m radius)
  const nearbyLat = -6.2089;
  const nearbyLon = 106.8458;
  const distanceNearby = calculateHaversineDistance(officeLat, officeLon, nearbyLat, nearbyLon);
  assert(
    distanceNearby > 0 && distanceNearby <= 100,
    `Nearby coordinates distance (${distanceNearby}m) is strictly within allowed 100m radius`
  );

  // ~500 meters away (outside 100m radius)
  const distantLat = -6.2130;
  const distantLon = 106.8480;
  const distanceDistant = calculateHaversineDistance(officeLat, officeLon, distantLat, distantLon);
  assert(
    distanceDistant > 100,
    `Distant coordinates distance (${distanceDistant}m) is strictly recognized as outside radius`
  );

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log('\n================================================================');
  console.log(`📊 TIMEZONE SUITE SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    console.log('🎉 ALL TIMEZONE & DATE EDGE CASES PASSED WITH 100% ACCURACY!');
    process.exit(0);
  }
}

runTimezoneEdgeCasesTests().catch((err) => {
  console.error('Timezone suite error:', err);
  process.exit(1);
});
