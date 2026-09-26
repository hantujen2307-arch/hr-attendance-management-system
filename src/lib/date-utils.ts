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
  if (hour === 24) hour = 0;
  const minute = parseInt(partMap.minute, 10);
  const second = parseInt(partMap.second, 10);

  const formattedMonth = String(month).padStart(2, '0');
  const formattedDay = String(day).padStart(2, '0');
  const dateString = `${year}-${formattedMonth}-${formattedDay}`;

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
    throw new Error('Date string is required');
  }
  const parts = dateStr.split('-');
  if (parts.length !== 3) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }
  const [yearStr, monthStr, dayStr] = parts;
  const year = parseInt(yearStr, 10);
  const month = parseInt(monthStr, 10);
  const day = parseInt(dayStr, 10);

  if (
    isNaN(year) ||
    isNaN(month) ||
    isNaN(day) ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > 31
  ) {
    throw new Error(`Invalid date format: ${dateStr}. Expected YYYY-MM-DD.`);
  }

  const d = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    throw new Error(`Invalid calendar date: ${dateStr}`);
  }

  return d;
}
