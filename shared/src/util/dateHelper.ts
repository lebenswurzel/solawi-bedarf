/*
This file is part of the SoLawi Bedarf app

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.
*/
import { format } from "date-fns";
import { fromZonedTime, toZonedTime } from "date-fns-tz";
import { de } from "date-fns/locale";
import { DeliveryPauseRange } from "../types";

export const addYears = (date: Date, yearsDiff: number): Date => {
  const result = new Date(date);
  result.setFullYear(date.getFullYear() + yearsDiff);
  return result;
};

export const addDays = (date: Date, daysDiff: number): Date => {
  const result = new Date(date);
  result.setDate(date.getDate() + daysDiff);
  return result;
};

export const addWeeks = (date: Date, weeksDiff: number): Date => {
  return addDays(date, weeksDiff * 7);
};

export const addMonths = (date: Date, monthsDiff: number): Date => {
  const result = new Date(date);
  result.setMonth(date.getMonth() + monthsDiff);
  return result;
};

export const dayDifference = (earlierDate: Date, laterDate: Date): number => {
  const start = new Date(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate()
  );
  const end = new Date(
    laterDate.getFullYear(),
    laterDate.getMonth(),
    laterDate.getDate()
  );
  const diffTime = end.getTime() - start.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

export const formatDateForFilename = (date: Date): string => {
  return format(date, "yyyy-MM-dd HH_mm_ss");
};

export const prettyDate = (
  date?: Date | string | null,
  withSeconds?: boolean
): string => {
  return date
    ? format(date, "PPp", { locale: de }) +
        (withSeconds ? format(date, ":ss") : "")
    : "nie";
};

export const prettyCompactDate = (
  date?: Date | string | null,
  timezone?: string
): string => {
  if (timezone && date) {
    date = toZonedTime(date, timezone);
  }
  return date ? format(date, "dd.MM.yyyy, HH:mm:ss", { locale: de }) : "nie";
};

export const prettyDateNoTime = (
  date?: Date | string | number | null
): string => {
  return date ? format(date, "dd.MM.yyyy", { locale: de }) : "nie";
};

export const getDateTimestampWithoutTime = (
  date: Date | string | undefined | null
): number | undefined => {
  if (!date) {
    return undefined;
  }
  return new Date(date).setHours(0, 0, 0, 0);
};

export const prettyDateWithDayName = (date?: Date | string | null): string => {
  return date ? format(date, "EEEE, d. MMMM yyyy", { locale: de }) : "nie";
};

export const prettyDateWithMonthAndYear = (
  date?: Date | string | null
): string => {
  return date ? format(date, "MMMM yyyy", { locale: de }) : "";
};

/**
 * Converts a delivery pause range to actual date ranges for a given year.
 * Returns the pause range as [beginDate, endDate) for that year.
 */
const getDeliveryPauseDatesForYear = (
  year: number,
  deliveryPauseRange: DeliveryPauseRange
): { begin: Date; end: Date } => {
  const beginMonth = deliveryPauseRange.begin.month - 1; // Convert to 0-indexed
  const beginDay = deliveryPauseRange.begin.day;
  const endMonth = deliveryPauseRange.end.month - 1; // Convert to 0-indexed
  const endDay = deliveryPauseRange.end.day;

  const begin = new Date(year, beginMonth, beginDay);
  let endYear = year;
  if (deliveryPauseRange.begin.month > deliveryPauseRange.end.month) {
    // Range spans year boundary, end is in next year
    endYear = year + 1;
  }
  const end = new Date(endYear, endMonth, endDay);

  return { begin, end };
};

/**
 * Finds the overlap between two date ranges [start1, end1) and [start2, end2).
 * Returns the overlap as [overlapStart, overlapEnd) or null if no overlap.
 */
const findDateRangeOverlap = (
  start1: Date,
  end1: Date,
  start2: Date,
  end2: Date
): { overlapStart: Date; overlapEnd: Date } | null => {
  const overlapStart = start1 > start2 ? start1 : start2;
  const overlapEnd = end1 < end2 ? end1 : end2;

  if (overlapStart >= overlapEnd) {
    return null; // No overlap
  }

  return { overlapStart, overlapEnd };
};

/**
 * Counts Thursdays between two dates (original implementation without pause consideration).
 */
const countThursdaysBetweenDatesInternal = (
  earlierDate: Date, // included if Thursday
  laterDate: Date // excluded if Thursday
): number => {
  // Normalize dates to start of day to avoid time-of-day issues
  const start = new Date(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate()
  );
  const end = new Date(
    laterDate.getFullYear(),
    laterDate.getMonth(),
    laterDate.getDate()
  );

  // Get day of week (0 = Sunday, 4 = Thursday)
  const startDay = start.getDay();

  // Calculate days until first Thursday
  const daysToThursday = (4 - startDay + 7) % 7;

  // Add days to get to first Thursday
  const firstThursday = new Date(start);
  firstThursday.setDate(start.getDate() + daysToThursday);

  // If first Thursday is after end date, return 0
  if (firstThursday >= end) {
    return 0;
  }

  // Calculate number of weeks between first Thursday and end date
  const days = Math.floor(
    (end.getTime() - firstThursday.getTime()) / (1000 * 60 * 60 * 24)
  );
  const excludeLastThursday = end.getDay() == 4 ? 0 : 1;
  const thursdays = Math.floor(days / 7) + excludeLastThursday; // don't include if end date is a Thursday

  return thursdays;
};

export const countThursdaysBetweenDates = (
  earlierDate: Date, // included if Thursday
  laterDate: Date, // excluded if Thursday
  deliveryPauseRange?: DeliveryPauseRange
) => {
  // Normalize dates to start of day to avoid time-of-day issues
  const start = new Date(
    earlierDate.getFullYear(),
    earlierDate.getMonth(),
    earlierDate.getDate()
  );
  const end = new Date(
    laterDate.getFullYear(),
    laterDate.getMonth(),
    laterDate.getDate()
  );

  // Count all Thursdays between dates
  const totalThursdays = countThursdaysBetweenDatesInternal(start, end);

  // If no delivery pause range, return total
  if (!deliveryPauseRange) {
    return totalThursdays;
  }

  // Find all delivery pause ranges that might overlap with [start, end)
  // The pause range spans year boundaries (e.g., Dec 23 - Jan 3), so we need to check
  // the pause range for each year in the date range and potentially the previous year.
  const startYear = start.getFullYear();
  const endYear = end.getFullYear();
  const yearsToCheck = new Set<number>();

  // Check pause ranges for all years that might overlap
  // If pause spans year boundary, we also need to check previous year's pause
  // (since it extends into the current year)
  const pauseSpansYearBoundary =
    deliveryPauseRange.begin.month > deliveryPauseRange.end.month;

  // Add all years from startYear to endYear
  for (let year = startYear; year <= endYear; year++) {
    yearsToCheck.add(year);
    // If pause spans boundary, also check previous year's pause (it extends into this year)
    if (pauseSpansYearBoundary && year > 0) {
      yearsToCheck.add(year - 1);
    }
  }

  // Count Thursdays in overlapping pause ranges
  let pauseThursdays = 0;
  for (const year of yearsToCheck) {
    const pauseDates = getDeliveryPauseDatesForYear(year, deliveryPauseRange);
    const overlap = findDateRangeOverlap(
      start,
      end,
      pauseDates.begin,
      pauseDates.end
    );
    if (overlap) {
      pauseThursdays += countThursdaysBetweenDatesInternal(
        overlap.overlapStart,
        overlap.overlapEnd
      );
    }
  }

  return totalThursdays - pauseThursdays;
};

export const getSameOrNextThursday = (date: Date, timezone?: string): Date => {
  let relevantDate = date;
  if (timezone) {
    relevantDate = toZonedTime(date, timezone);
  }
  const dateOnly = new Date(
    relevantDate.getFullYear(),
    relevantDate.getMonth(),
    relevantDate.getDate()
  );
  const day = dateOnly.getDay();

  const daysToThursday = (4 - day + 7) % 7;
  return addDays(dateOnly, daysToThursday);
};

export const getSameOrPreviousThursday = (
  date: Date,
  timezone?: string
): Date => {
  let relevantDate = date;
  if (timezone) {
    relevantDate = toZonedTime(date, timezone);
  }
  const dateOnly = new Date(
    relevantDate.getFullYear(),
    relevantDate.getMonth(),
    relevantDate.getDate()
  );
  const day = dateOnly.getDay();
  const daysToThursday = (day - 4 + 7) % 7;
  return addDays(dateOnly, -daysToThursday);
};

export const getValidFromMonth = (date: Date, timezone?: string): Date => {
  const firstDeliveryDate = getSameOrNextThursday(date, timezone);
  return new Date(
    firstDeliveryDate.getFullYear(),
    firstDeliveryDate.getMonth(),
    1
  );
};

export const getValidToMonth = (date: Date, timezone?: string): Date => {
  const firstDeliveryDate = getSameOrPreviousThursday(date, timezone);
  return new Date(
    firstDeliveryDate.getFullYear(),
    firstDeliveryDate.getMonth(),
    1
  );
};

export const countCalendarMonths = (
  date1: Date,
  date2: Date,
  timezone?: string
) => {
  let earlierDate = date1.getTime() < date2.getTime() ? date1 : date2;
  let laterDate = date1.getTime() < date2.getTime() ? date2 : date1;
  if (timezone) {
    earlierDate = toZonedTime(earlierDate, timezone);
    laterDate = toZonedTime(laterDate, timezone);
  }

  const earlierYear = earlierDate.getFullYear();
  const earlierMonth = earlierDate.getMonth();

  const laterYear = laterDate.getFullYear();
  const laterMonth = laterDate.getMonth();

  const monthDiff =
    (laterYear - earlierYear) * 12 + (laterMonth - earlierMonth) + 1;

  return monthDiff;
};

/**
 * Calculates the validFrom date for a new order modification.
 * Returns the Friday before the first Thursday in the month that follows
 * the month of the endBiddingRound date.
 */
export const calculateNewOrderValidFromDate = (
  endBiddingRound: Date,
  timezone?: string
): Date => {
  // Get the month that follows the endBiddingRound month
  const nextMonth = new Date(
    endBiddingRound.getFullYear(),
    endBiddingRound.getMonth() + 1,
    1
  );

  // Find the first Thursday in that month
  const firstThursday = getSameOrNextThursday(nextMonth, timezone);

  // Get the Friday before that Thursday (subtract 6 days to go back to Friday)
  const fridayBefore = addDays(firstThursday, -6);

  if (timezone) {
    // Create a date that represents midnight in the specified timezone
    // and convert it to UTC
    const midnightInTimezone = new Date(
      fridayBefore.getFullYear(),
      fridayBefore.getMonth(),
      fridayBefore.getDate(),
      0,
      0,
      0,
      0
    );

    // Convert to the specified timezone and then to UTC
    const zonedDate = fromZonedTime(midnightInTimezone, timezone);
    return new Date(zonedDate.getTime());
  }

  return fridayBefore;
};

export const isDateInRange = (
  date: Date | string | number,
  range: {
    from: Date | string | number | null;
    to: Date | string | number | null;
  }
) => {
  return (
    (range.from === null ||
      new Date(date).getTime() >= new Date(range.from).getTime()) &&
    (range.to === null ||
      new Date(date).getTime() < new Date(range.to).getTime())
  );
};

export const isDateEqual = (
  date1?: Date | string | number,
  date2?: Date | string | number
): boolean => {
  if (!date1 || !date2) {
    return false;
  }
  return new Date(date1).getTime() === new Date(date2).getTime();
};
