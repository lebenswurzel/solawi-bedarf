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

export const prettyDateWithDayName = (date?: Date | string | null): string => {
  return date ? format(date, "EEEE, d. MMMM yyyy", { locale: de }) : "nie";
};

export const countThursdaysBetweenDates = (
  earlierDate: Date,
  laterDate: Date
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
  const thursdays = Math.floor(days / 7) + 1; // Add 1 to include first Thursday

  return thursdays;
};
