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

export const durationLogger = async (ctx: Koa.Context, next: Koa.Next) => {
  const start = Date.now();

  try {
    await next();
  } finally {
    const duration = Date.now() - start;
    const method = ctx.method || "UNKNOWN";
    const url = ctx.url || "UNKNOWN";
    const status = ctx.status || 0;

    console.log(`[${method}] ${url} - ${status} - ${duration}ms`);
  }
};
