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
import { expect, test } from "vitest";
import {
  ShipmentType,
  Unit,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  Id,
  ShipmentRequest,
} from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  getDepotByName,
  getProductByName,
  getRequisitionConfigId,
  updateRequisition,
} from "../../test/testHelpers";
import {
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../testSetup";
import {
  genShipment,
  genShipmentItem,
} from "@lebenswurzel/solawi-bedarf-shared/testSetup";
import { AppDataSource } from "../database/database";
import { Shipment, Shipment as ShipmentEntity } from "../database/Shipment";
import { mergeShipmentWithForecast } from "./shipmentUtil";
import { saveShipment } from "../services/shipment/saveShipment";

const createTestShipment = async (
  description: string,
  active: boolean = false,
) => {
  const configId = await getRequisitionConfigId();
  const shipment = new ShipmentEntity();
  shipment.requisitionConfigId = configId;
  shipment.validFrom = new Date();
  shipment.active = active;
  shipment.description = description;
  shipment.updatedAt = new Date();
  await AppDataSource.getRepository(ShipmentEntity).save(shipment);
  return shipment;
};

testAsAdmin("create new shipment", async ({ userData }: TestUserData) => {
  await updateRequisition(
    true,
    undefined,
    undefined,
    "2025-04-01",
    "2026-03-31",
  );
  await createShipment(userData.token, new Date("2025-05-10"));
  await createShipment(userData.token, new Date("2025-05-17"));
  await createShipment(
    userData.token,
    new Date("2025-05-24"),
    undefined,
    undefined,
    true,
  );

  // forecast
  await createShipment(
    userData.token,
    new Date("2025-05-11"),
    250,
    new Date("2025-05-31"),
  );

  const shipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: { type: ShipmentType.NORMAL },
  });
  const forecastShipments = await AppDataSource.getRepository(Shipment).find({
    relations: { shipmentItems: true },
    where: { type: ShipmentType.FORECAST },
  });

  const merged = mergeShipmentWithForecast(shipments, forecastShipments);

  console.log("merged", merged);

  const forecastItems = merged.filter((si) =>
    si.description?.includes("forecast"),
  );
  expect(forecastItems).toMatchObject([
    { description: "Test item forecast", multiplicator: 50 },
    { description: "Test item forecast", multiplicator: 50 },
    { description: "Test item 2 forecast", multiplicator: 150 },
    { description: "Test item 2 forecast", multiplicator: 150 },
  ]);
});

const createShipment = async (
  token: string,
  validFrom: Date,
  multiplicator: number = 100,
  validTo?: Date,
  onlyProduct1: boolean = false,
) => {
  const configId = await getRequisitionConfigId();
  const depot1 = await getDepotByName("d1");
  const product1 = await getProductByName("p1");
  const depot2 = await getDepotByName("d2");
  const product2 = await getProductByName("p2");

  const suffix = validTo === undefined ? " normal" : " forecast";

  const shipmentItemsProduct1 = [
    genShipmentItem(product1, depot1, {
      totalShipedQuantity: 10,
      description: "Test item" + suffix,
      multiplicator,
    }),
    genShipmentItem(product1, depot2, {
      totalShipedQuantity: 20,
      description: "Test item" + suffix,
      multiplicator,
    }),
  ];

  const shipmentItemsProduct2 = [
    genShipmentItem(product2, depot1, {
      totalShipedQuantity: 30,
      description: "Test item 2" + suffix,
      multiplicator,
    }),
    genShipmentItem(product2, depot2, {
      totalShipedQuantity: 40,
      description: "Test item 2" + suffix,
      multiplicator,
    }),
  ];

  let shipmentItems = shipmentItemsProduct1;
  if (!onlyProduct1) {
    shipmentItems = shipmentItems.concat(shipmentItemsProduct2);
  }

  const request = genShipment({
    requisitionConfigId: configId,
    validFrom,
    validTo,
    active: false,
    description: "Test shipment",
    shipmentItems,
    type: validTo !== undefined ? ShipmentType.FORECAST : ShipmentType.NORMAL,
  });

  const ctx = createBasicTestCtx(request, token, undefined);

  await saveShipment(ctx);
  expect(ctx.status).toBe(201);
};
