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
import { UserRole, Unit } from "../../../../shared/src/enum";
import {
  Shipment,
  ShipmentItem,
  AdditionalShipmentItem,
} from "../../../../shared/src/types";
import {
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { AppDataSource } from "../../database/database";
import { Shipment as ShipmentEntity } from "../../database/Shipment";
import { ShipmentItem as ShipmentItemEntity } from "../../database/ShipmentItem";
import { AdditionalShipmentItem as AdditionalShipmentItemEntity } from "../../database/AdditionalShipmentItem";
import { saveShipment } from "./saveShipment";
import {
  getDepotByName,
  getProductByName,
  getRequisitionConfigId,
  updateRequisition,
} from "../../../test/testHelpers";

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

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveShipment(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for non-admin/employee",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined);
    await expect(() => saveShipment(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("create new shipment", async ({ userData }: TestUserData) => {
  const configId = await getRequisitionConfigId();
  const depot = await getDepotByName("d1");
  const product = await getProductByName("p1");
  const request: Shipment = {
    requisitionConfigId: configId,
    validFrom: new Date(),
    active: true,
    description: "Test shipment",
    shipmentItems: [
      {
        productId: product.id,
        depotId: depot.id,
        totalShipedQuantity: 10,
        isBio: true,
        unit: Unit.WEIGHT,
        description: "Test item",
        multiplicator: 1,
        conversionFrom: 1, // in requested units
        conversionTo: 1, // in delivered units
      },
    ],
    additionalShipmentItems: [
      {
        product: "Additional item",
        depotId: depot.id,
        unit: Unit.WEIGHT,
        isBio: true,
        quantity: 5,
        totalShipedQuantity: 5,
        description: "Test additional item",
      },
    ],
  };

  const ctx = createBasicTestCtx(request, userData.token, undefined);

  await saveShipment(ctx);
  expect(ctx.status).toBe(201);

  const savedShipment = await AppDataSource.getRepository(
    ShipmentEntity,
  ).findOne({
    where: { description: "Test shipment" },
    relations: ["shipmentItems", "additionalShipmentItems"],
  });

  expect(savedShipment).toBeTruthy();
  expect(savedShipment?.description).toBe("Test shipment");
  expect(savedShipment?.shipmentItems).toHaveLength(1);
  expect(savedShipment?.additionalShipmentItems).toHaveLength(1);
});

testAsAdmin("update existing shipment", async ({ userData }: TestUserData) => {
  const configId = await getRequisitionConfigId();
  // First create a shipment
  const shipment = await createTestShipment("Original shipment");

  const request: Shipment & { id: number; updatedAt: Date } = {
    id: shipment.id,
    requisitionConfigId: configId,
    validFrom: new Date(),
    active: false,
    description: "Updated shipment",
    updatedAt: shipment.updatedAt,
    shipmentItems: [],
    additionalShipmentItems: [],
  };

  const ctx = createBasicTestCtx(request, userData.token, undefined);

  await saveShipment(ctx);
  expect(ctx.status).toBe(204);

  const updatedShipment = await AppDataSource.getRepository(
    ShipmentEntity,
  ).findOne({
    where: { id: shipment.id },
  });

  expect(updatedShipment?.description).toBe("Updated shipment");
});

testAsAdmin(
  "prevent outdated shipment update",
  async ({ userData }: TestUserData) => {
    const configId = await getRequisitionConfigId();
    // Create a shipment
    const shipment = await createTestShipment("Original shipment");

    // Try to update with outdated timestamp
    const request: Shipment & { id: number; updatedAt: Date } = {
      id: shipment.id,
      requisitionConfigId: configId,
      validFrom: new Date(),
      active: false,
      description: "Updated shipment",
      updatedAt: new Date(Date.now() - 10000), // Old timestamp
      shipmentItems: [],
      additionalShipmentItems: [],
    };

    const ctx = createBasicTestCtx(request, userData.token, undefined);

    await expect(() => saveShipment(ctx)).rejects.toThrowError(
      "Error 400: outdated shipment",
    );
  },
);

testAsAdmin(
  "prevent update of active shipment",
  async ({ userData }: TestUserData) => {
    const configId = await getRequisitionConfigId();
    // Create a shipment
    const shipment = await createTestShipment("Original shipment", true);

    // Try to update the shipment to inactive
    const request: Shipment & { id: number; updatedAt: Date } = {
      id: shipment.id,
      requisitionConfigId: configId,
      validFrom: new Date(),
      active: false,
      description: "Updated shipment",
      updatedAt: new Date(Date.now() + 10000), // New timestamp
      shipmentItems: [],
      additionalShipmentItems: [],
    };

    const ctx = createBasicTestCtx(request, userData.token, undefined);

    await expect(() => saveShipment(ctx)).rejects.toThrowError(
      "Error 400: shipment is active",
    );
  },
);
