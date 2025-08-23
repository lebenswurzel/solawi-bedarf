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
import { User } from "../../database/User";
import { AppDataSource } from "../../database/database";
import { hashPassword } from "../../security";
import { getUserFromContext } from "../getUserFromContext";
import { http } from "../../consts/http";
import Koa from "koa";
import Router from "koa-router";
import { invalidateTokenForUser } from "../../token";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Order } from "../../database/Order";
import { appConfig } from "@lebenswurzel/solawi-bedarf-shared/src/config";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { SaveUserRequest } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { getUserOrders } from "../order/getAllOrders";

export const saveUser = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (role != UserRole.ADMIN) {
    ctx.throw(http.forbidden);
  }
  const requestUser = ctx.request.body as SaveUserRequest;
  if (
    !requestUser.requisitionConfigId ||
    !(await AppDataSource.getRepository(RequisitionConfig).find({
      where: { id: requestUser.requisitionConfigId },
    }))
  ) {
    ctx.throw(
      http.bad_request,
      "missing or bad requisition config id " + requestUser.requisitionConfigId,
    );
  }
  try {
    if (requestUser.id) {
      const user = await AppDataSource.getRepository(User).findOneBy({
        id: requestUser.id,
      });
      if (!user) {
        ctx.throw(http.bad_request);
      } else {
        user.name = requestUser.name;
        user.role = requestUser.role;
        user.active = requestUser.active;
        if (requestUser.password) {
          user.hash = await hashPassword(requestUser.password);
          await invalidateTokenForUser(user.id);
        }
        await AppDataSource.getRepository(User).save(user);
        if (requestUser.orderValidFrom) {
          await updateOrderValidFrom(
            user,
            requestUser.orderValidFrom,
            requestUser.requisitionConfigId,
          );
        }
        ctx.status = http.no_content;
      }
    } else {
      const user = new User();
      user.name = requestUser.name;
      user.hash = await hashPassword(requestUser.password!);
      user.role = requestUser.role;
      user.active = requestUser.active;
      await AppDataSource.getRepository(User).save(user);
      if (requestUser.orderValidFrom) {
        await updateOrderValidFrom(
          user,
          requestUser.orderValidFrom,
          requestUser.requisitionConfigId,
        );
      }
      ctx.status = http.created;
    }
  } catch (error: any) {
    ctx.throw(http.bad_request, error.message, error);
  }
};

export const updateOrderValidFrom = async (
  user: User,
  orderValidFrom: Date,
  configId: number,
) => {
  let orders = await AppDataSource.getRepository(Order).find({
    where: { userId: user.id, requisitionConfigId: configId },
    order: { validFrom: "ASC" },
    relations: { orderItems: true },
  });
  if (orders.length > 1) {
    throw new Error("Multiple orders found, cannot update validFrom date!");
  }
  if (orders[0].orderItems && orders[0].orderItems.length > 0) {
    throw new Error("Order has order items, cannot update validFrom date!");
  }
  if (orders.length === 1) {
    const order = orders[0];
    await AppDataSource.getRepository(Order).update(
      { id: order.id },
      {
        validFrom: orderValidFrom,
        updatedAt: order.updatedAt, // prevent modification of updatedAt as we use it to indicate whether a user changed his order
      },
    );
  } else {
    const config = await AppDataSource.getRepository(
      RequisitionConfig,
    ).findOneBy({
      id: configId,
    });
    if (!config) {
      throw new Error(`Config ${configId} not found`);
    }
    const order = new Order();
    order.user = user;
    order.offer = 0;
    order.category = appConfig.defaultCategory;
    order.validFrom = orderValidFrom;
    order.validTo = config.validTo;
    order.productConfiguration = "";
    order.requisitionConfigId = configId;
    await AppDataSource.getRepository(Order).save(order);
  }
};
