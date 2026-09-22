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
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { CommercialDelivery } from "../../database/CommercialDelivery";
import { getUserFromContext } from "../getUserFromContext";
import { getNumericQueryParameter } from "../../util/requestUtil";
import { CommercialDeliveryItem } from "../../database/CommercialDeliveryItem";

export const deleteCommercialDelivery = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }

  const deliveryId = getNumericQueryParameter(ctx.request.query, "id");
  if (!deliveryId) {
    ctx.throw(http.bad_request, "delivery id is required");
  }

  const delivery = await AppDataSource.getRepository(
    CommercialDelivery,
  ).findOne({
    where: { id: deliveryId },
    relations: { invoice: true },
  });
  if (!delivery) {
    ctx.throw(http.not_found);
  }
  if (delivery.invoice) {
    ctx.throw(http.bad_request, "deliveries with invoice cannot be deleted");
  }

  await AppDataSource.getRepository(CommercialDeliveryItem).delete({
    commercialDeliveryId: deliveryId,
  });
  await AppDataSource.getRepository(CommercialDelivery).delete(deliveryId);
  ctx.status = http.ok;
};
