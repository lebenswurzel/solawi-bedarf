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
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { UpdateUserRequest } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { http } from "../../consts/http";
import { User } from "../../database/User";
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { updateOrderValidFrom } from "./saveUser";
import { createAdditionalOrder } from "../order/modifyOrder";

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
    ctx.throw(http.not_found, "user not found");
  }

  const requisitionConfig = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOne({
    where: { id: requestUser.configId },
  });
  if (!requisitionConfig) {
    ctx.throw(http.not_found, "invalid config id");
  }

  ctx.status = http.bad_request;
  if (requestUser.active !== undefined) {
    user.active = requestUser.active;
    await AppDataSource.getRepository(User).save(user);
    ctx.status = http.no_content;
  }

  try {
    if (requestUser.orderValidFrom !== undefined) {
      await updateOrderValidFrom(
        user.id,
        requestUser.orderValidFrom,
        requestUser.configId,
      );
      ctx.status = http.no_content;
    }

    if (requestUser.addNewOrder) {
      await createAdditionalOrder(user.id, requisitionConfig, new Date());
      ctx.status = http.no_content;
    }
  } catch (error: any) {
    ctx.throw(http.bad_request, error.message, error);
  }
};
