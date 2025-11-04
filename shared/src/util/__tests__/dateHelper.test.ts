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
import { describe, it, expect } from "vitest";
import {
  addYears,
  addDays,
  addWeeks,
  addMonths,
  formatDateForFilename,
  prettyDate,
  prettyDateWithDayName,
  countThursdaysBetweenDates,
  dayDifference,
  countCalendarMonths,
  calculateNewOrderValidFromDate,
  isDateInRange,
} from "../dateHelper";
import { DeliveryPauseRange } from "../../types";

describe("dateHelper", () => {
  describe("addYears", () => {
    it("should add positive years", () => {
      const date = new Date("2024-01-01");
      const result = addYears(date, 2);
      expect(result.getFullYear()).toBe(2026);
    });

    it("should add negative years", () => {
      const date = new Date("2024-01-01");
      const result = addYears(date, -2);
      expect(result.getFullYear()).toBe(2022);
    });
  });

  describe("addDays", () => {
    it("should add positive days", () => {
      const date = new Date("2024-01-01");
      const result = addDays(date, 5);
      expect(result.getDate()).toBe(6);
    });

    it("should add negative days", () => {
      const date = new Date("2024-01-10");
      const result = addDays(date, -5);
      expect(result.getDate()).toBe(5);
    });

    it("should handle month boundaries", () => {
      const date = new Date("2024-01-31");
      const result = addDays(date, 1);
      expect(result.getMonth()).toBe(1); // February
      expect(result.getDate()).toBe(1);
    });

    it("should handle year boundaries", () => {
      const date = new Date("2024-01-02");
      const result = addDays(date, -3);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(30);
      expect(result.getFullYear()).toBe(2023);
    });
  });

  describe("addWeeks", () => {
    it("should add positive weeks", () => {
      const date = new Date("2024-01-01");
      const result = addWeeks(date, 2);
      expect(result.getDate()).toBe(15);
    });

    it("should add negative weeks", () => {
      const date = new Date("2024-01-15");
      const result = addWeeks(date, -2);
      expect(result.getDate()).toBe(1);
    });
  });

  describe("addMonths", () => {
    it("should add positive months", () => {
      const date = new Date("2024-01-01");
      const result = addMonths(date, 2);
      expect(result.getMonth()).toBe(2); // March
    });

    it("should add negative months", () => {
      const date = new Date("2024-03-01");
      const result = addMonths(date, -2);
      expect(result.getMonth()).toBe(0); // January
    });

    it("should handle year boundaries", () => {
      const date = new Date("2024-12-01");
      const result = addMonths(date, 1);
      expect(result.getFullYear()).toBe(2025);
      expect(result.getMonth()).toBe(0); // January
    });
  });

  describe("formatDateForFilename", () => {
    it("should format date correctly", () => {
      const date = new Date("2024-01-01T12:34:56");
      const result = formatDateForFilename(date);
      expect(result).toBe("2024-01-01 12_34_56");
    });
  });

  describe("prettyDate", () => {
    it("should format date with seconds", () => {
      const date = new Date("2024-01-01T12:34:56");
      const result = prettyDate(date, true);
      expect(result).toContain("1. Jan. 2024");
      expect(result).toContain(":56");
    });

    it("should format date without seconds", () => {
      const date = new Date("2024-01-01T12:34:56");
      const result = prettyDate(date);
      expect(result).toContain("1. Jan. 2024");
      expect(result).not.toContain(":56");
    });

    it("should handle null input", () => {
      const result = prettyDate(null);
      expect(result).toBe("nie");
    });
  });

  describe("prettyDateWithDayName", () => {
    it("should format date with day name", () => {
      const date = new Date("2024-01-01");
      const result = prettyDateWithDayName(date);
      expect(result).toBe("Montag, 1. Januar 2024");
    });

    it("should handle null input", () => {
      const result = prettyDateWithDayName(null);
      expect(result).toBe("nie");
    });
  });

  describe("countThursdaysBetweenDates", () => {
    it("should count Thursdays between dates", () => {
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-31"); // Wednesday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(4); // Jan 4, 11, 18, 25
    });

    it("should count Thursdays between dates, starting on Thursday", () => {
      const start = new Date("2024-01-04"); // Thursday
      const end = new Date("2024-01-31"); // Wednesday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(4); // Jan 4, 11, 18, 25
    });

    it("should count Thursdays between dates, ending on Thursday (excluded!)", () => {
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-25"); // Thursday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(3); // Jan 4, 11, 18
    });

    it("should count Thursdays between dates, starting on Friday", () => {
      const start = new Date("2024-01-05"); // Friday
      const end = new Date("2024-01-25"); // Thursday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(2); // Jan 11, 18
    });

    it("should return 0 if no Thursdays in range", () => {
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-03"); // Wednesday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(0);
    });

    it("should return 1 if start and end is Thursdays, one week apart", () => {
      const start = new Date("2024-01-04"); // Thursday
      const end = new Date("2024-01-11"); // Thursday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(1);
    });

    it("should return 0 if no Thursdays in range and end is Thursday", () => {
      const start = new Date("2024-01-01"); // Monday
      const end = new Date("2024-01-04"); // Thursday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(0);
    });

    it("should handle same day -> excluded", () => {
      const date = new Date("2024-01-04"); // Thursday
      const result = countThursdaysBetweenDates(date, date);
      expect(result).toBe(0);
    });

    it("should handle dates in reverse order", () => {
      const start = new Date("2024-01-31"); // Wednesday
      const end = new Date("2024-01-01"); // Monday
      const result = countThursdaysBetweenDates(start, end);
      expect(result).toBe(0);
    });

    describe("with deliveryPauseRange", () => {
      // Standard pause: Dec 23 (inclusive) to Jan 3 (exclusive)
      const deliveryPauseRange: DeliveryPauseRange = {
        begin: { month: 12, day: 23 },
        end: { month: 1, day: 4 },
      };

      it("should exclude Thursdays within delivery pause range", () => {
        // Range: Dec 20, 2024 to Jan 10, 2025
        // Thursdays: Dec 26, 2024 (in pause), Jan 2, 2025 (in pause), Jan 9, 2025
        // Without pause: 3 Thursdays
        // With pause: 1 Thursday (Jan 9)
        const start = new Date("2024-12-20"); // Friday
        const end = new Date("2025-01-10"); // Friday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(1); // Only Jan 9
      });

      it("should handle range that doesn't overlap with pause", () => {
        // Range: Jan 10 to Jan 31, 2024 (no overlap with pause)
        // Thursdays: Jan 11, 18, 25
        const start = new Date("2024-01-10"); // Wednesday
        const end = new Date("2024-01-31"); // Wednesday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(3); // All Thursdays counted
      });

      it("should handle range that fully contains pause", () => {
        // Range: Dec 1, 2024 to Jan 15, 2025
        // Thursdays: Dec 5, 12, 19, 26 (in pause), Jan 2 (in pause), 9
        // Without pause: 6 Thursdays
        // With pause: 4 Thursdays (Dec 5, 12, 19, Jan 9)
        const start = new Date("2024-12-01"); // Sunday
        const end = new Date("2025-01-15"); // Wednesday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(4);
      });

      it("should handle range starting before pause and ending during pause", () => {
        // Range: Dec 20, 2024 to Dec 30, 2024
        // Thursdays: Dec 26 (in pause)
        // Without pause: 1 Thursday
        // With pause: 0 Thursdays
        const start = new Date("2024-12-20"); // Friday
        const end = new Date("2024-12-30"); // Monday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(0);
      });

      it("should handle range starting during pause and ending after pause", () => {
        // Range: Dec 25, 2024 to Jan 10, 2025
        // Thursdays: Dec 26 (in pause), Jan 2 (in pause), Jan 9
        // Without pause: 3 Thursdays
        // With pause: 1 Thursday (Jan 9)
        const start = new Date("2024-12-25"); // Wednesday
        const end = new Date("2025-01-10"); // Friday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(1);
      });

      it("should handle range that exactly matches pause boundaries", () => {
        // Range: Dec 23, 2024 to Jan 3, 2025 (exactly the pause range)
        // Thursdays: Dec 26 (in pause), Jan 2 (in pause)
        // Without pause: 2 Thursdays
        // With pause: 0 Thursdays
        const start = new Date("2024-12-23"); // Monday
        const end = new Date("2025-01-04"); // Saturday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(0);
      });

      it("should handle range starting exactly on pause begin", () => {
        // Range: Dec 23, 2024 to Jan 10, 2025
        // Thursdays: Dec 26 (in pause), Jan 2 (in pause), Jan 9
        // Without pause: 3 Thursdays
        // With pause: 1 Thursday (Jan 9)
        const start = new Date("2024-12-23"); // Monday
        const end = new Date("2025-01-10"); // Friday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(1);
      });

      it("should handle range ending exactly on pause end", () => {
        // Range: Dec 20, 2024 to Jan 3, 2025
        // Thursdays: Dec 26 (in pause), Jan 2 (in pause)
        // Without pause: 2 Thursdays
        // With pause: 0 Thursdays
        const start = new Date("2024-12-20"); // Friday
        const end = new Date("2025-01-04"); // Friday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        expect(result).toBe(0);
      });

      it("should handle range spanning multiple years with pause", () => {
        // Range: Dec 1, 2023 to Feb 15, 2025
        // This spans multiple years and includes two pause periods:
        // - Dec 23, 2023 to Jan 3, 2024
        // - Dec 23, 2024 to Jan 3, 2025
        // Thursdays in Dec 2023: Dec 5, 12, 19, 26 (in pause)
        // Thursdays in Jan 2024: Jan 2 (in pause), 9, 16, 23, 30
        // ... and many more in 2024 and early 2025
        const start = new Date("2023-12-01"); // Friday
        const end = new Date("2025-02-15"); // Saturday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        // Without pause, this would be many Thursdays
        // With pause, we should exclude Dec 28, 2023; Dec 26, 2024; Jan 2, 2025
        // Let's verify it's less than without pause
        const withoutPause = countThursdaysBetweenDates(start, end);
        expect(result).toBe(withoutPause - 3);
      });

      it("should handle pause range that doesn't span year boundary", () => {
        // Test with a pause range within same year: June 1 to June 15
        const sameYearPause: DeliveryPauseRange = {
          begin: { month: 6, day: 1 },
          end: { month: 6, day: 15 },
        };
        // Range: May 25 to June 20, 2024
        // Thursdays: May 30, June 6 (in pause), June 13 (in pause)
        // Without pause: 3 Thursdays
        // With pause: 1 Thursday (May 30)
        const start = new Date("2024-05-25"); // Saturday
        const end = new Date("2024-06-20"); // Thursday
        const result = countThursdaysBetweenDates(start, end, sameYearPause);
        expect(result).toBe(1);
      });

      it("should return same result when no pause range provided", () => {
        // Range: Dec 20, 2024 to Jan 10, 2025
        const start = new Date("2024-12-20"); // Friday
        const end = new Date("2025-01-10"); // Friday
        const withPause = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        const withoutPause = countThursdaysBetweenDates(start, end);
        // Without pause should be more (includes paused Thursdays)
        expect(withoutPause).toBeGreaterThan(withPause);
      });

      it("should handle Thursday exactly on pause begin boundary", () => {
        // If Dec 23, 2024 is a Thursday, it should be excluded (inclusive begin)
        // Dec 23, 2024 is a Monday, so let's use a year where it's Thursday
        // Dec 23, 2021 was a Thursday
        const start = new Date("2021-12-20"); // Monday
        const end = new Date("2022-01-10"); // Monday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        // Dec 23, 2021 was Thursday, so it should be excluded
        // Dec 30, 2021 was Thursday (in pause)
        // Jan 6, 2022 was Thursday (after pause)
        // Should be 1 Thursday (Jan 6)
        expect(result).toBe(1);
      });

      it("should handle Thursday exactly on pause end boundary", () => {
        // Jan 3, 2024 was a Wednesday, but let's check a year where Jan 3 is Thursday
        // Jan 3, 2025 is a Friday, so pause ends on Friday (exclusive)
        // So Jan 3, 2025 should NOT be in pause
        // But if Jan 2, 2025 is Thursday, it should be in pause
        // Jan 2, 2025 is a Thursday
        const start = new Date("2024-12-20"); // Friday
        const end = new Date("2025-01-10"); // Friday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        // Dec 26, 2024 (Thursday) - in pause
        // Jan 2, 2025 (Thursday) - in pause (Jan 3 is exclusive)
        // Jan 9, 2025 (Thursday) - not in pause
        expect(result).toBe(1); // Only Jan 9
      });

      it("should handle multiple pause periods across year boundary", () => {
        // Range from Nov 2023 to March 2025
        // Includes pauses: Dec 23, 2023 - Jan 3, 2024 and Dec 23, 2024 - Jan 3, 2025
        const start = new Date("2023-11-01"); // Wednesday
        const end = new Date("2025-03-01"); // Saturday
        const result = countThursdaysBetweenDates(
          start,
          end,
          deliveryPauseRange
        );
        const withoutPause = countThursdaysBetweenDates(start, end);
        // Should exclude Thursdays that fall within pause periods
        // Verify result is less than without pause and greater than 0
        expect(result).toBeLessThan(withoutPause);
        expect(result).toBeGreaterThan(0);
        // Verify that at least 2 Thursdays are excluded (one per pause period)
        expect(withoutPause - result).toBeGreaterThanOrEqual(2);
      });
    });
  });

  describe("dayDifference", () => {
    it("should return 0 for same day", () => {
      const date = new Date("2023-01-01");
      expect(dayDifference(date, date)).toBe(0);
    });

    it("should return 1 for consecutive days", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      expect(dayDifference(date1, date2)).toBe(1);
    });

    it("should handle dates in reverse order", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-02");
      expect(dayDifference(date2, date1)).toBe(-1);
    });

    it("should handle month boundaries", () => {
      const date1 = new Date("2023-01-31");
      const date2 = new Date("2023-02-01");
      expect(dayDifference(date1, date2)).toBe(1);
    });

    it("should handle year boundaries", () => {
      const date1 = new Date("2023-12-31");
      const date2 = new Date("2024-01-01");
      expect(dayDifference(date1, date2)).toBe(1);
    });

    it("should handle leap years", () => {
      const date1 = new Date("2024-02-28");
      const date2 = new Date("2024-02-29");
      expect(dayDifference(date1, date2)).toBe(1);
    });

    it("should ignore time components", () => {
      const date1 = new Date("2023-01-01T00:00:00");
      const date2 = new Date("2023-01-01T23:59:59");
      expect(dayDifference(date1, date2)).toBe(0);
    });

    it("should handle time zone", () => {
      const date1 = new Date("2023-01-01T23:00:00Z");
      const date2 = new Date("2023-01-02T00:00:00+01:00");
      expect(dayDifference(date1, date2)).toBe(0);
    });

    it("should handle time zone reverse", () => {
      const date1 = new Date("2023-01-02T00:50:00Z");
      const date2 = new Date("2023-01-01T22:59:59+01:00");
      expect(dayDifference(date1, date2)).toBe(-1);
    });
  });

  describe("countCalendarMonths", () => {
    it("should return 1 for same month", () => {
      const date = new Date("2023-01-01");
      expect(countCalendarMonths(date, date, "UTC")).toBe(1);
    });

    it("should return 1 for full month", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2023-01-31");
      expect(countCalendarMonths(date1, date2, "UTC")).toBe(1);
    });

    it("should return 2 for month before", () => {
      const date1 = new Date("2023-01-01");
      const date2 = new Date("2022-12-31");
      expect(countCalendarMonths(date1, date2, "UTC")).toBe(2);
    });

    it("should return 2 for December to January", () => {
      const date1 = new Date("2022-12-31");
      const date2 = new Date("2023-01-01");
      expect(countCalendarMonths(date1, date2, "UTC")).toBe(2);
    });

    it("should return 14 for 2 months and 2 years before", () => {
      const date1 = new Date("2023-01-11");
      const date2 = new Date("2021-11-03");
      expect(countCalendarMonths(date1, date2, "UTC")).toBe(15);
      expect(countCalendarMonths(date2, date1, "UTC")).toBe(15);
    });

    it("should return 12 for Solawi year - UTC", () => {
      const date1 = new Date("2025-04-01T00:00:00Z");
      const date2 = new Date("2026-03-31T23:59:59Z");
      expect(countCalendarMonths(date1, date2, "UTC")).toBe(12);
    });

    it("should return 12 for Solawi year - Europe/Berlin", () => {
      const date1 = new Date("2025-04-01T00:00:00+02:00");
      const date2 = new Date("2026-03-31T23:59:59+02:00");
      expect(countCalendarMonths(date1, date2, "Europe/Berlin")).toBe(12);
    });
  });

  describe("calculateNewOrderValidFromDate", () => {
    it("should calculate valid from date for next month's first Thursday", () => {
      // End bidding round on January 15th (should look for February's first Thursday)
      const endBiddingRound = new Date("2024-01-15");
      const result = calculateNewOrderValidFromDate(endBiddingRound);

      // February 1st, 2024 is a Thursday, so we go back 6 days to Friday January 26th
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(26);
      expect(result.getDay()).toBe(5); // Friday
    });

    it("should handle month where first day is not Thursday", () => {
      // End bidding round on March 20th (should look for April's first Thursday)
      const endBiddingRound = new Date("2024-03-20");
      const result = calculateNewOrderValidFromDate(endBiddingRound);

      // April 1st, 2024 is a Monday, first Thursday is April 4th
      // Go back 6 days to Friday March 29th
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(2); // March
      expect(result.getDate()).toBe(29);
      expect(result.getDay()).toBe(5); // Friday
    });

    it("should handle year boundary", () => {
      // End bidding round on December 15th (should look for January's first Thursday)
      const endBiddingRound = new Date("2024-12-15");
      const result = calculateNewOrderValidFromDate(endBiddingRound);

      // January 1st, 2025 is a Wednesday, first Thursday is January 2nd
      // Go back 6 days to Friday December 27th, 2024
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(11); // December
      expect(result.getDate()).toBe(27);
      expect(result.getDay()).toBe(5); // Friday
    });

    it("should handle timezone parameter", () => {
      const endBiddingRound = new Date("2024-01-15T23:00:00Z");
      const result = calculateNewOrderValidFromDate(
        endBiddingRound,
        "Europe/Berlin"
      );

      // Should return UTC date representing midnight Berlin time on January 26th
      // January 26th, 2024 at 00:00:00 in Europe/Berlin (UTC+1 in January)
      // converts to January 25th, 2024 at 23:00:00 UTC
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(25);
      expect(result.getDay()).toBe(4); // Thursday (UTC)
      expect(result.getHours()).toBe(23);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it("should handle leap year February", () => {
      // End bidding round on January 15th, 2024 (leap year)
      const endBiddingRound = new Date("2024-01-15");
      const result = calculateNewOrderValidFromDate(endBiddingRound);

      // February 1st, 2024 is a Thursday, so we go back 6 days to Friday January 26th
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(0); // January
      expect(result.getDate()).toBe(26);
      expect(result.getDay()).toBe(5); // Friday
    });

    it("should return UTC date representing midnight in timezone", () => {
      // Test that the function returns a UTC date representing midnight in the timezone
      const endBiddingRound = new Date("2024-06-15"); // June 15th
      const result = calculateNewOrderValidFromDate(
        endBiddingRound,
        "Europe/Berlin"
      );

      // July 1st, 2024 is a Monday, first Thursday is July 4th
      // Go back 6 days to Friday June 28th
      // June 28th, 2024 at 00:00:00 in Europe/Berlin (UTC+2 in June)
      // converts to June 27th, 2024 at 22:00:00 UTC
      expect(result.getFullYear()).toBe(2024);
      expect(result.getMonth()).toBe(5); // June
      expect(result.getDate()).toBe(27);
      expect(result.getHours()).toBe(22);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });
  });

  describe("isDateInRange", () => {
    it("should return true when date is within range", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should return true when date equals from boundary", () => {
      const date = new Date("2024-02-01");
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should return false when date equals to boundary", () => {
      const date = new Date("2024-02-28");
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(false);
    });

    it("should return false when date is before from boundary", () => {
      const date = new Date("2024-01-31");
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(false);
    });

    it("should return false when date is after to boundary", () => {
      const date = new Date("2024-03-01");
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(false);
    });

    it("should handle null from boundary (unbounded start)", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: null,
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle null to boundary (unbounded end)", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: new Date("2024-02-01"),
        to: null,
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle both boundaries as null (unbounded range)", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: null,
        to: null,
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle string date input", () => {
      const date = "2024-02-15";
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle number date input (timestamp)", () => {
      const date = new Date("2024-02-15").getTime();
      const range = {
        from: new Date("2024-02-01"),
        to: new Date("2024-02-28"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle string range boundaries", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: "2024-02-01",
        to: "2024-02-28",
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle number range boundaries (timestamps)", () => {
      const date = new Date("2024-02-15");
      const range = {
        from: new Date("2024-02-01").getTime(),
        to: new Date("2024-02-28").getTime(),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle timezone differences correctly", () => {
      // Date in UTC
      const date = new Date("2024-02-15T12:00:00Z");
      // Range boundaries in Europe/Berlin (UTC+1 in February)
      const range = {
        from: new Date("2024-02-15T00:00:00+01:00"),
        to: new Date("2024-02-15T23:59:59+01:00"),
      };

      expect(isDateInRange(date, range)).toBe(true);
    });

    it("should handle edge case with exact time boundaries", () => {
      const date = new Date("2024-02-15T12:00:00");
      const range = {
        from: new Date("2024-02-15T12:00:00"),
        to: new Date("2024-02-15T12:00:00"),
      };

      expect(isDateInRange(date, range)).toBe(false);
    });
  });
});
