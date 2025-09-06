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
import { ShipmentType } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import {
  genShipment,
  genShipmentItem,
} from "@lebenswurzel/solawi-bedarf-shared/testSetup";
import { expect } from "vitest";
import {
  getDepotByName,
  getProductByName,
  getRequisitionConfigId,
  updateRequisition,
} from "../../test/testHelpers";
import { createBasicTestCtx, testAsAdmin, TestUserData } from "../../testSetup";
import { AppDataSource } from "../database/database";
import { Shipment, Shipment as ShipmentEntity } from "../database/Shipment";
import { saveShipment } from "../services/shipment/saveShipment";
import { mergeShipmentWithForecast } from "./shipmentUtil";

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
  await createShipment(
    // before forecast
    userData.token,
    new Date("2025-05-03"),
    [100, 200],
  );

  await createShipment(userData.token, new Date("2025-05-10"), [100, 100]);
  await createShipment(
    userData.token,
    new Date("2025-05-17"),
    [100, 0],
    undefined,
    true,
  );
  await createShipment(userData.token, new Date("2025-05-24"), [50, 0]);

  await createShipment(
    // after forecast
    userData.token,
    new Date("2025-05-31"),
    [400, 200],
  );

  // forecast
  await createShipment(
    userData.token,
    new Date("2025-05-09"),
    [200, 250],
    new Date("2025-05-30"),
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
  expect(merged.length).toBe(18);

  // console.log("merged", merged);

  const forecastItems = merged.filter((si) =>
    si.description?.includes("forecast"),
  );
  expect(
    new Set(
      forecastItems.map((fi) => ({
        description: fi.description,
        multiplicator: fi.multiplicator,
      })),
    ),
  ).toMatchObject(
    new Set([
      { description: "Test item d2 forecast", multiplicator: 50 },
      // { description: "Test item forecast", multiplicator: 0 },
      { description: "Test item 2 d1 forecast", multiplicator: 150 },
      { description: "Test item 2 d2 forecast", multiplicator: 150 },
    ]),
  );

  // check that the shipment items have been used to reduce the forecast items
  // product 1, depot 1
  const shipmentItemsP1D1 = merged.filter(
    (si) => si.description == "Test item d1 normal",
  );
  const product1Total = shipmentItemsP1D1.reduce(
    (acc, si) => acc + si.multiplicator,
    0,
  );
  const product1Available = shipmentItemsP1D1.reduce(
    (acc, si) => acc + si.availableMultiplicator!,
    0,
  );
  expect(product1Total).toBe(750);
  expect(product1Available).toBe(550);

  // product 2, depot 1
  const shipmentItemsP2D1 = merged.filter(
    (si) => si.description == "Test item 2 d1 normal",
  );
  const product2TotalD1 = shipmentItemsP2D1.reduce(
    (acc, si) => acc + si.multiplicator,
    0,
  );
  const product2AvailableD1 = shipmentItemsP2D1.reduce(
    (acc, si) => acc + si.availableMultiplicator!,
    0,
  );
  expect(product2TotalD1).toBe(500);
  expect(product2AvailableD1).toBe(400);
});

const createShipment = async (
  token: string,
  validFrom: Date,
  multiplicator: number[] = [100, 100],
  validTo?: Date,
  onlyDepot1: boolean = false,
) => {
  const configId = await getRequisitionConfigId();
  const depot1 = await getDepotByName("d1");
  const product1 = await getProductByName("p1");
  const depot2 = await getDepotByName("d2");
  const product2 = await getProductByName("p2");

  const suffix = validTo === undefined ? " normal" : " forecast";

  const shipmentItems = [
    genShipmentItem(product1, depot1, {
      totalShipedQuantity: 10,
      description: "Test item d1" + suffix,
      multiplicator: multiplicator[0],
    }),
    genShipmentItem(product1, depot2, {
      totalShipedQuantity: 20,
      description: "Test item d2" + suffix,
      multiplicator: multiplicator[0],
    }),
    genShipmentItem(product2, depot1, {
      totalShipedQuantity: 30,
      description: "Test item 2 d1" + suffix,
      multiplicator: multiplicator[1],
    }),
    genShipmentItem(product2, depot2, {
      totalShipedQuantity: 40,
      description: "Test item 2 d2" + suffix,
      multiplicator: multiplicator[1],
    }),
  ].filter(
    (si) => si.multiplicator > 0 && (!onlyDepot1 || si.depotId == depot1.id),
  );

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
