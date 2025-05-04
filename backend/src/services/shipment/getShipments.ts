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
import { Shipment } from "../../database/Shipment";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { getUserFromContext } from "../getUserFromContext";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  getConfigIdFromQuery,
  getIncludeItemsFromQuery,
  getNumericQueryParameter,
} from "../../util/requestUtil";

export const getShipments = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }
  const configId = getConfigIdFromQuery(ctx);
  const includeItems = getIncludeItemsFromQuery(ctx);
  const shipmentId = getNumericQueryParameter(
    ctx.request.query,
    "shipmentId",
    0,
  );
  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: {
      shipmentItems: includeItems,
      additionalShipmentItems: includeItems,
    },
    order: {
      validFrom: "ASC",
    },
    where: {
      requisitionConfigId: configId,
      ...(shipmentId ? { id: shipmentId } : {}),
    },
  });
  ctx.body = {
    shipments: shipments.map((s) => ({
      ...s,
      shipmentItems: s.shipmentItems
        ? s.shipmentItems.sort((a, b) => {
            if (a.productId !== b.productId) {
              return a.productId - b.productId;
            }
            return a.depotId - b.depotId;
          })
        : [],
      additionalShipmentItems: s.additionalShipmentItems
        ? s.additionalShipmentItems.sort((a, b) => {
            if (a.product !== b.product) {
              return a.product.localeCompare(b.product);
            }
            return a.depotId - b.depotId;
          })
        : [],
    })),
  };
};
