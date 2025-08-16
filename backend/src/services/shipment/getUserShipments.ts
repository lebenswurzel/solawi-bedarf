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
import { getRequestUserId } from "../getUserFromContext";
import { AppDataSource } from "../../database/database";
import { Shipment } from "../../database/Shipment";
import { Order } from "../../database/Order";
import { In } from "typeorm";
import { getConfigIdFromQuery } from "../../util/requestUtil";
import {
  OrderType,
  ShipmentType,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";

export const getUserShipments = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const requestUserId = await getRequestUserId(ctx);

  const configId = getConfigIdFromQuery(ctx);

  const depotIds = (
    await AppDataSource.getRepository(Order).find({
      where: {
        userId: requestUserId,
        requisitionConfigId: configId,
        type: OrderType.NORMAL,
      },
      select: {
        depotId: true,
      },
    })
  ).map((d) => d.depotId);
  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: {
      shipmentItems: true,
      additionalShipmentItems: true,
    },
    where: [
      {
        requisitionConfigId: configId,
        shipmentItems: {
          depotId: In(depotIds),
        },
        active: true,
        type: ShipmentType.NORMAL,
      },
      {
        requisitionConfigId: configId,
        additionalShipmentItems: {
          depotId: In(depotIds),
        },
        active: true,
        type: ShipmentType.NORMAL,
      },
    ],
    order: {
      validFrom: "DESC",
    },
  });

  ctx.body = {
    shipments: shipments.map((s) => ({
      ...s,
      shipmentItems: s.shipmentItems.filter((i) =>
        depotIds.includes(i.depotId),
      ),
      additionalShipmentItems: s.additionalShipmentItems.filter((i) =>
        depotIds.includes(i.depotId),
      ),
    })),
  };
};
