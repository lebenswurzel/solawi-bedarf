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
import Router from "koa-router";
import { UserRole } from "../../../shared/src/enum";
import { http } from "../consts/http";
import { ErrorLog } from "../database/ErrorLog";
import { AppDataSource } from "../database/database";
import { getUserFromContext } from "./getUserFromContext";
import { GetErrorLogResponse } from "../../../shared/src/types";

export const getErrorLog = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role !== UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }

  const errorLogs = await AppDataSource.getRepository(ErrorLog).find({
    relations: { user: true },
    order: { createdAt: "DESC" },
  });

  ctx.body = errorLogs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    method: log.method,
    url: log.url,
    status: log.status,
    error: log.error,
    requestBody: log.requestBody,
    requestQuery: log.requestQuery,
    requestHeaders: log.requestHeaders,
    userAgent: log.userAgent,
    ip: log.ip,
    userId: log.userId,
    userName: log.user?.name,
  })) as GetErrorLogResponse;
};
