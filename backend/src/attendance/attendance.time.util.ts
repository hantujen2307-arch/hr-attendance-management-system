import { AttendanceStatus } from '@prisma/client';

export interface JakartaDateInfo {
  year: number;
  month: number; // 1-12
  day: number; // 1-31
  hour: number; // 0-23
  minute: number; // 0-59
  second: number; // 0-59
  dayOfWeek: number; // 1 (Mon) - 7 (Sun)
  dateString: string; // YYYY-MM-DD
  attendanceDate: Date; // UTC midnight Date matching Postgres @db.Date
}

/**
 * Extracts date and time components in the Asia/Jakarta (WIB) timezone.
 */
export function getJakartaDateInfo(date: Date = new Date()): JakartaDateInfo {
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(date);
  const partMap: Record<string, string> = {};
  for (const part of parts) {
    partMap[part.type] = part.value;
  }

  const year = parseInt(partMap.year, 10);
  const month = parseInt(partMap.month, 10);
  const day = parseInt(partMap.day, 10);
  let hour = parseInt(partMap.hour, 10);
  // Some formatters might return "24" for midnight
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const dateString = `${year}-${formattedMonth}-${formattedDay}`;

  // PostgreSQL @db.Date is stored as UTC midnight representation in Prisma
  const attendanceDate = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  const rawDay = attendanceDate.getUTCDay();
  const dayOfWeek = rawDay === 0 ? 7 : rawDay;

  return {
    year,
    month,
    day,
    hour,
    minute,
    second,
    dayOfWeek,
    dateString,
    attendanceDate,
  };
}

/**
 * Parses a YYYY-MM-DD date string into a UTC midnight Date object suitable for Prisma @db.Date.
 */
export function parseJakartaDateString(dateStr: string): Date {
  if (!dateStr || typeof dateStr !== 'string') {
    throw new Error('Tanggal wajib diisi');
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (isNaN(year) || isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (d.getUTCFullYear() !== year || d.getUTCMonth() !== month - 1 || d.getUTCDate() !== day) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }

  return d;
}

/**
 * Centralized punctuality evaluation based on work start time and tolerance window.
 * e.g., workStartTime "08:00" and toleranceMinutes 15 -> 08:00 - 08:15 is PRESENT, > 08:15 is LATE.
 */
export function determinePunctualityStatus(
  checkInDate: Date,
  workStartTime: string = '08:00',
  toleranceMinutes: number = 15
): AttendanceStatus {
  const { hour, minute } = getJakartaDateInfo(checkInDate);
  const [startHourStr, startMinuteStr] = (workStartTime || '08:00').split(':');
  const startHour = parseInt(startHourStr, 10) || 8;
  const startMinute = parseInt(startMinuteStr, 10) || 0;

  const totalStartMinutes = startHour * 60 + startMinute;
  const cutoffMinutes = totalStartMinutes + (toleranceMinutes || 0);

  const checkInMinutes = hour * 60 + minute;

  if (checkInMinutes > cutoffMinutes) {
    return AttendanceStatus.LATE;
  }

  return AttendanceStatus.PRESENT;
}

/**
 * Calculates great-circle distance between two geographic coordinates using the Haversine formula.
 * Returns distance in meters (rounded).
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates working minutes between checkIn and checkOut.
 */
export function calculateWorkingMinutes(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  if (diffMs < 0) {
    throw new Error('Check-out time cannot be earlier than check-in time');
  }
  return Math.max(0, Math.round(diffMs / (1000 * 60)));
}
