/**
 * Overtime time calculation and overlap validation utilities.
 */

export interface ParsedTime {
  hours: number;
  minutes: number;
  totalMinutes: number;
}

/**
 * Parses a HH:mm string into hours, minutes, and total minutes from midnight.
 */
export function parseTimeToMinutes(timeStr: string): ParsedTime {
  const parts = timeStr.split(':');
  if (parts.length < 2) {
    throw new Error(`Format waktu tidak valid: ${timeStr}. Diharapkan format HH:mm.`);
  }

  const hours = parseInt(parts[0], 10);
  const minutes = parseInt(parts[1], 10);

  if (isNaN(hours) || isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Format waktu di luar jangkauan: ${timeStr}. Jam (00-23), Menit (00-59).`);
  }

  return {
    hours,
    minutes,
    totalMinutes: hours * 60 + minutes,
  };
}

/**
 * Calculates exact duration in minutes between start time and end time.
 * Supports standard daytime hours (e.g. 17:00 -> 19:00 = 120 min, 17:05 -> 19:12 = 127 min)
 * as well as overnight intervals crossing midnight (e.g. 23:00 -> 01:00 = 120 min).
 */
export function calculateOvertimeMinutes(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);

  let diff = end.totalMinutes - start.totalMinutes;

  // If end time is earlier or equal to start time, it spans past midnight (+24 hours = 1440 minutes)
  if (diff < 0) {
    diff += 1440;
  }

  return diff;
}

/**
 * Formats minutes into human-readable text, e.g. "2 jam 7 menit" or "120 menit".
 */
export function formatMinutesHuman(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0 && mins > 0) {
    return `${hours} jam ${mins} menit`;
  }
  if (hours > 0) {
    return `${hours} jam`;
  }
  return `${mins} menit`;
}

/**
 * Checks whether two time intervals on the same day/shift overlap.
 * Considers 24-hour wrap around (overnight shifts).
 */
export function hasOvertimeOverlap(
  start1: string,
  end1: string,
  start2: string,
  end2: string,
): boolean {
  const s1 = parseTimeToMinutes(start1).totalMinutes;
  let e1 = parseTimeToMinutes(end1).totalMinutes;
  if (e1 <= s1) e1 += 1440; // Overnight extension

  const s2 = parseTimeToMinutes(start2).totalMinutes;
  let e2 = parseTimeToMinutes(end2).totalMinutes;
  if (e2 <= s2) e2 += 1440; // Overnight extension

  // Function to test if interval [A, B) overlaps with [C, D)
  const overlaps = (a: number, b: number, c: number, d: number) => Math.max(a, c) < Math.min(b, d);

  // Check base, shifted +1440, and shifted -1440
  return (
    overlaps(s1, e1, s2, e2) ||
    overlaps(s1, e1, s2 + 1440, e2 + 1440) ||
    overlaps(s1, e1, s2 - 1440, e2 - 1440)
  );
}
