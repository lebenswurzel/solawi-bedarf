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
import jwt, { JwtPayload } from "jsonwebtoken";
import { config } from "../config";
import { AppDataSource } from "../database/database";
import { Token } from "../database/Token";
import { http } from "../consts/http";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { getNumericQueryParameter } from "../util/requestUtil";

export const getUserFromContext = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
): Promise<{
  id: number;
  role: UserRole;
  active: boolean;
  userName: string;
}> => {
  const cookieToken = ctx.cookies.get("token");
  if (cookieToken) {
    const now = new Date();
    const { jti, exp } = jwt.verify(
      cookieToken,
      config.jwt.secret,
    ) as JwtPayload;
    if (jti && exp && exp * 1000 > now.getTime()) {
      const dbToken = await AppDataSource.getRepository(Token).findOne({
        where: { jti, active: true },
        relations: { user: true },
      });
      if (dbToken && dbToken.exp > now) {
        const user = dbToken.user;
        return {
          id: user.id,
          role: user.role,
          active: user.active,
          userName: user.name,
        };
      }
    }
  }
  ctx.throw(http.unauthorized);
};

export const getTokenValidity = (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
): Date | null => {
  const cookieToken = ctx.cookies.get("token");
  if (cookieToken) {
    const { jti, exp } = jwt.verify(
      cookieToken,
      config.jwt.secret,
    ) as JwtPayload;

    return exp ? new Date(exp * 1000) : null;
  }
  return null;
};

export const getRequestUserId = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
): Promise<number> => {
  const { id, role } = await getUserFromContext(ctx);
  const requestUserId = getNumericQueryParameter(ctx.request.query, "id");
  if (requestUserId < 1) {
    ctx.throw(http.forbidden);
  }
  if (id != requestUserId && role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  return requestUserId;
};
