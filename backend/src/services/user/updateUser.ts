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
import { UserRole } from "../../../../shared/src/enum";
import { UpdateUserRequest } from "../../../../shared/src/types";
import { http } from "../../consts/http";
import { User } from "../../database/User";
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";

export const updateUser = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestUser = ctx.request.body as UpdateUserRequest;
  if (!requestUser.id) {
    ctx.throw(http.bad_request);
  }
  const user = await AppDataSource.getRepository(User).findOneBy({
    id: requestUser.id || 0,
  });
  if (!user) {
    ctx.throw(http.not_found);
  }

  if (requestUser.active !== undefined) {
    user.active = requestUser.active;
    await AppDataSource.getRepository(User).save(user);
    ctx.status = http.no_content;
  }
};
