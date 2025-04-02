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
    // Create error log entry
    const errorLog = new ErrorLog();
    errorLog.method = ctx.method;
    errorLog.url = ctx.url;
    errorLog.status = ctx.status;
    errorLog.error =
      err instanceof Error
        ? {
            name: err.name,
            message: err.message,
            stack: err.stack
              ? err.stack.split("\n").map((line) => line.trim())
              : undefined,
          }
        : { message: String(err) };
    errorLog.requestBody = ctx.request.body;
    errorLog.requestQuery = ctx.request.query;
    errorLog.requestHeaders = ctx.request.headers;
    errorLog.userAgent = ctx.request.headers["user-agent"] || "unknown";
    errorLog.ip = ctx.request.ip;
    errorLog.userId = ctx.state.user?.id;

    console.error("Error Details:", JSON.stringify(errorLog, null, 2));

    // Store error in database
    try {
      await AppDataSource.getRepository(ErrorLog).save(errorLog);
    } catch (dbError) {
      // If we can't store the error in the database, at least log it to console
      console.error("Failed to store error in database:", dbError);
      console.error(
        "Original error details:",
        JSON.stringify(errorLog, null, 2),
      );
    }

    // Re-throw the error to let Koa handle it
    throw err;
  }
};
