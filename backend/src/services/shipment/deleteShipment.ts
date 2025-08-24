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
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import Koa from "koa";
import Router from "koa-router";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Shipment } from "../../database/Shipment";
import { getUserFromContext } from "../getUserFromContext";
import { getNumericQueryParameter } from "../../util/requestUtil";

export const deleteShipment = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }
  const shipmentId = getNumericQueryParameter(ctx.request.query, "id");
  if (!shipmentId) {
    ctx.throw(http.bad_request, "shipmentId is required");
  }
  const shipment = await AppDataSource.getRepository(Shipment).findOne({
    where: { id: shipmentId },
    relations: {
      additionalShipmentItems: true,
      shipmentItems: true,
    },
  });
  if (!shipment) {
    ctx.throw(http.not_found);
  }
  if (
    shipment.additionalShipmentItems.length > 0 ||
    shipment.shipmentItems.length > 0
  ) {
    ctx.throw(http.bad_request, "shipment has items");
  }
  await AppDataSource.getRepository(Shipment).delete(shipmentId);
  console.log("shipment deleted", shipmentId);
  ctx.status = http.ok;
};
