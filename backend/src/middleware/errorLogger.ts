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
import Koa from "koa";
import { AppDataSource } from "../database/database";
import { ErrorLog } from "../database/ErrorLog";

export const errorLogger = async (ctx: Koa.Context, next: Koa.Next) => {
  try {
    await next();
  } catch (err) {
    // Ensure we have a valid status code
    ctx.status = ctx.status || 500;

    try {
      // Create error log entry with safe defaults and data sanitization
      const errorLog = new ErrorLog();

      // Basic request info with fallbacks
      errorLog.method = ctx.method || "UNKNOWN";
      errorLog.url = ctx.url || "UNKNOWN";
      errorLog.status = ctx.status;

      // Safely handle error object
      errorLog.error = safelyExtractError(err);

      // Safely handle request data with size limits
      errorLog.requestBody = safelySerialize(ctx.request.body);
      errorLog.requestQuery = safelySerialize(ctx.request.query);
      errorLog.requestHeaders = safelySerialize(ctx.request.headers, [
        "authorization",
        "cookie",
      ]); // Exclude sensitive headers

      // Safe string fields with length limits
      errorLog.userAgent = truncateString(
        ctx.request.headers["user-agent"] || "unknown",
        500,
      );
      errorLog.ip = truncateString(ctx.request.ip || "unknown", 45);

      // Safe user ID handling
      errorLog.userId =
        typeof ctx.state?.user?.id === "number" ? ctx.state.user.id : null;

      // Log to console first (in case DB fails)
      console.error("Error Details:", JSON.stringify(errorLog, null, 2));

      // Store in database with timeout
      await Promise.race([
        AppDataSource.getRepository(ErrorLog).save(errorLog),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Database timeout")), 5000),
        ),
      ]);
    } catch (logError) {
      // Log but don't throw logging errors
      console.error("Error logging failed:", logError);
      console.error("Original error:", err);
    }

    // Re-throw the original error
    throw err;
  }
};

// Helper functions for safe error logging

function safelyExtractError(err: unknown): {
  name?: string;
  message: string;
  stack?: string[];
} {
  try {
    if (err instanceof Error) {
      return {
        name: truncateString(err.name, 100),
        message: truncateString(err.message, 1000),
        stack: err.stack
          ? err.stack
              .split("\n")
              .map((line) => truncateString(line.trim(), 200))
              .slice(0, 50) // Limit stack trace length
          : undefined,
      };
    }
    return {
      message: truncateString(String(err), 1000),
    };
  } catch {
    return { message: "Error parsing failed" };
  }
}

function safelySerialize(data: unknown, excludeKeys: string[] = []): any {
  try {
    // Remove sensitive data
    const sanitized =
      excludeKeys.length > 0 ? removeKeys(data, excludeKeys) : data;

    // Stringify and limit size
    const serialized = JSON.stringify(sanitized);
    if (serialized.length > 10000) {
      // 10KB limit
      return JSON.stringify({
        _truncated: true,
        _originalSize: serialized.length,
        _message: "Data too large to log",
      });
    }
    return sanitized;
  } catch {
    return null;
  }
}

function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

function removeKeys(obj: unknown, keys: string[]): unknown {
  if (typeof obj !== "object" || obj === null) return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => removeKeys(item, keys));
  }

  return Object.fromEntries(
    Object.entries(obj)
      .filter(([key]) => !keys.includes(key.toLowerCase()))
      .map(([key, value]) => [key, removeKeys(value, keys)]),
  );
}
