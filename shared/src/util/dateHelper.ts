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
import { toZonedTime } from "date-fns-tz";
import { de } from "date-fns/locale";

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

export const countThursdaysBetweenDates = (
  earlierDate: Date, // included if Thursday
  laterDate: Date // excluded if Thursday
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

  // Get day of week (0 = Sunday, 4 = Thursday)
  const startDay = start.getDay();

  // Calculate days until first Thursday
  const daysToThursday = (4 - startDay + 7) % 7;

  // Add days to get to first Thursday
  const firstThursday = new Date(start);
  firstThursday.setDate(start.getDate() + daysToThursday);

  // If first Thursday is after end date, return 0
  if (firstThursday > end) {
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

export const getSameOrNextThursday = (date: Date): Date => {
  const dateOnly = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  const day = dateOnly.getDay();

  const daysToThursday = (4 - day + 7) % 7;
  return addDays(dateOnly, daysToThursday);
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
export const calculateNewOrderValidFromDate = (endBiddingRound: Date): Date => {
  // Get the month that follows the endBiddingRound month
  const nextMonth = new Date(
    endBiddingRound.getFullYear(),
    endBiddingRound.getMonth() + 1,
    1
  );

  // Find the first Thursday in that month
  const firstThursday = getSameOrNextThursday(nextMonth);

  // Get the Friday before that Thursday (subtract 6 days to go back to Friday)
  const fridayBefore = addDays(firstThursday, -6);

  return fridayBefore;
};

/**
 * Calculates the validTo date for the previous order when creating a new order.
 * Returns 23:59 of the day before the new order's validFrom date.
 */
export const calculatePreviousOrderValidToDate = (
  newOrderValidFrom: Date
): Date => {
  // Get the day before
  const dayBefore = addDays(newOrderValidFrom, -1);

  // Set to 23:59:59.999
  const validTo = new Date(dayBefore);
  validTo.setHours(23, 59, 59, 999);

  return validTo;
};
