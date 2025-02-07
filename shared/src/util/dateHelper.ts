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
