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
import { http } from "../consts/http";

export const errorLogger = async (ctx: Koa.Context, next: Koa.Next) => {
  try {
    await next();
  } catch (err) {
    // Log error details
    const errorDetails = {
      timestamp: new Date().toISOString(),
      method: ctx.method,
      url: ctx.url,
      status: ctx.status,
      error:
        err instanceof Error
          ? {
              name: err.name,
              message: err.message,
              stack: err.stack
                ? err.stack.split("\n").map((line) => line.trim())
                : undefined,
            }
          : err,
      requestBody: ctx.request.body,
      requestQuery: ctx.request.query,
      requestHeaders: ctx.request.headers,
      userAgent: ctx.request.headers["user-agent"],
      ip: ctx.request.ip,
      userId: ctx.state.user?.id, // If you have user info in ctx.state
    };

    // Log to console in development, you might want to use a proper logging service in production
    console.error("Error Details:", JSON.stringify(errorDetails, null, 2));

    // Re-throw the error to let Koa handle it
    throw err;
  }
};
