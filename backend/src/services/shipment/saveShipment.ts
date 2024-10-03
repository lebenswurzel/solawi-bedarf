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
import { getUserFromContext } from "../getUserFromContext";
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Shipment } from "../../database/Shipment";
import { ShipmentItem } from "../../database/ShipmentItem";
import { AdditionalShipmentItem } from "../../database/AdditionalShipmentItem";
import { UserRole } from "../../../../shared/src/enum";
import {
  Id,
  Shipment as ShipmentType,
  ShipmentItem as ShipmentItemType,
  AdditionalShipmentItem as AdditionalShipmentItemType,
} from "../../../../shared/src/types";

export const saveShipment = async (
  ctx: Koa.ParameterizedContext<any, Router.IRouterParamContext<any, {}>, any>,
) => {
  const { role } = await getUserFromContext(ctx);
  if (![UserRole.ADMIN, UserRole.EMPLOYEE].includes(role)) {
    ctx.throw(http.forbidden);
  }
  const requestShipment = ctx.request.body as ShipmentType & Id;
  if (requestShipment.id) {
    const shipment = await AppDataSource.getRepository(Shipment).findOne({
      where: {
        id: requestShipment.id,
      },
      relations: {
        shipmentItems: true,
        additionalShipmentItems: true,
      },
    });
    if (
      shipment &&
      shipment.requisitionConfigId != requestShipment.requisitionConfigId
    ) {
      ctx.throw(
        http.bad_request,
        `shipment configId=${shipment.requisitionConfigId} does not match request shipment configId=${requestShipment.requisitionConfigId}`,
      );
    }
    if (
      !shipment ||
      (shipment.active && shipment.validFrom < new Date()) ||
      !requestShipment.updatedAt ||
      new Date(requestShipment.updatedAt) < shipment.updatedAt
    ) {
      if (
        requestShipment.updatedAt &&
        shipment &&
        new Date(requestShipment.updatedAt) < shipment.updatedAt
      ) {
        ctx.throw(http.bad_request, "outdated shipment");
      } else {
        ctx.throw(http.bad_request);
      }
    } else {
      shipment.validFrom = requestShipment.validFrom;
      shipment.active = requestShipment.active;
      shipment.description = requestShipment.description;
      shipment.updatedAt = new Date();
      await AppDataSource.getRepository(Shipment).save(shipment);
      // new items
      for (let requestItem of requestShipment.shipmentItems) {
        if (
          !shipment.shipmentItems.some(
            (item) =>
              item.depotId == requestItem.depotId &&
              item.productId == requestItem.productId,
          )
        ) {
          const shipmentItem = getNewShipmentItem(requestItem);
          shipmentItem.shipment = shipment;
          await AppDataSource.getRepository(ShipmentItem).save(shipmentItem);
        }
      }
      // update item
      for (let item of shipment.shipmentItems) {
        const requestItem = requestShipment.shipmentItems.find(
          (requestItem) =>
            item.depotId == requestItem.depotId &&
            item.productId == requestItem.productId,
        );
        if (requestItem) {
          const shipmentItem = updateShipmentItem(item, requestItem);
          await AppDataSource.getRepository(ShipmentItem).save(shipmentItem);
        } else {
          await AppDataSource.getRepository(ShipmentItem).delete({
            id: item.id,
          });
        }
      }
      // new items
      for (let requestItem of requestShipment.additionalShipmentItems) {
        if (
          !shipment.additionalShipmentItems.some(
            (item) =>
              item.depotId == requestItem.depotId &&
              item.product.trim() == requestItem.product.trim(),
          )
        ) {
          const additionalShipmentItem =
            getNewAdditionalShipmentItem(requestItem);
          additionalShipmentItem.shipment = shipment;
          await AppDataSource.getRepository(AdditionalShipmentItem).save(
            additionalShipmentItem,
          );
        }
      }
      // update item
      for (let item of shipment.additionalShipmentItems) {
        const requestItem = requestShipment.additionalShipmentItems.find(
          (requestItem) =>
            item.depotId == requestItem.depotId &&
            item.product.trim() == requestItem.product.trim(),
        );
        if (requestItem) {
          const additionalShipmentItem = updateAdditionalShipmentItem(
            item,
            requestItem,
          );
          await AppDataSource.getRepository(AdditionalShipmentItem).save(
            additionalShipmentItem,
          );
        } else {
          await AppDataSource.getRepository(AdditionalShipmentItem).delete({
            id: item.id,
          });
        }
      }
      ctx.status = http.no_content;
    }
  } else {
    const shipment = new Shipment();
    shipment.validFrom = requestShipment.validFrom;
    shipment.active = requestShipment.active;
    shipment.description = requestShipment.description;
    shipment.requisitionConfigId = requestShipment.requisitionConfigId;
    shipment.updatedAt = new Date();
    await AppDataSource.getRepository(Shipment).save(shipment);
    for (let requestShipmentItem of requestShipment.shipmentItems) {
      const shipmentItem = getNewShipmentItem(requestShipmentItem);
      shipmentItem.shipment = shipment;
      await AppDataSource.getRepository(ShipmentItem).save(shipmentItem);
    }
    for (let requestAdditionalShipmentItem of requestShipment.additionalShipmentItems) {
      const additionalShipmentItem = getNewAdditionalShipmentItem(
        requestAdditionalShipmentItem,
      );
      additionalShipmentItem.shipment = shipment;
      await AppDataSource.getRepository(AdditionalShipmentItem).save(
        additionalShipmentItem,
      );
    }
    ctx.status = http.created;
  }
};

const getNewShipmentItem = (item: ShipmentItemType) => {
  const shipmentItem = new ShipmentItem();
  shipmentItem.productId = item.productId;
  shipmentItem.depotId = item.depotId;
  shipmentItem.totalShipedQuantity = item.totalShipedQuantity;
  shipmentItem.isBio = item.isBio;
  shipmentItem.unit = item.unit;
  shipmentItem.description = item.description;
  shipmentItem.multiplicator = item.multiplicator;
  shipmentItem.conversionFrom = item.conversionFrom;
  shipmentItem.conversionTo = item.conversionTo;
  return shipmentItem;
};

const getNewAdditionalShipmentItem = (item: AdditionalShipmentItemType) => {
  const additionalShipmentItem = new AdditionalShipmentItem();
  additionalShipmentItem.product = item.product;
  additionalShipmentItem.depotId = item.depotId;
  additionalShipmentItem.unit = item.unit;
  additionalShipmentItem.isBio = item.isBio;
  additionalShipmentItem.quantity = item.quantity;
  additionalShipmentItem.totalShipedQuantity = item.totalShipedQuantity;
  additionalShipmentItem.description = item.description;
  return additionalShipmentItem;
};

const updateShipmentItem = (
  shipmentItem: ShipmentItem,
  item: ShipmentItemType,
) => {
  shipmentItem.totalShipedQuantity = item.totalShipedQuantity;
  shipmentItem.isBio = item.isBio;
  shipmentItem.unit = item.unit;
  shipmentItem.description = item.description;
  shipmentItem.multiplicator = item.multiplicator;
  shipmentItem.conversionFrom = item.conversionFrom;
  shipmentItem.conversionTo = item.conversionTo;
  return shipmentItem;
};

const updateAdditionalShipmentItem = (
  additionalShipmentItem: AdditionalShipmentItem,
  item: AdditionalShipmentItemType,
) => {
  additionalShipmentItem.totalShipedQuantity = item.totalShipedQuantity;
  additionalShipmentItem.isBio = item.isBio;
  additionalShipmentItem.unit = item.unit;
  additionalShipmentItem.quantity = item.quantity;
  additionalShipmentItem.description = item.description;
  return additionalShipmentItem;
};
