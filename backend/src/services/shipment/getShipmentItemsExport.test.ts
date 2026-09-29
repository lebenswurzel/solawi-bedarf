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
import { ShipmentItemExportRow } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import { AppDataSource } from "../../database/database";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { Shipment } from "../../database/Shipment";
import { ShipmentItem } from "../../database/ShipmentItem";
import {
  getDepotByName,
  getProductByName,
  getRequisitionConfigId,
} from "../../../test/testHelpers";
import {
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { getShipmentItemsExport } from "./getShipmentItemsExport";

setupDatabaseCleanup();

const createShipmentItem = async ({
  configId,
  depotName,
  productName,
  validFrom,
  totalShipedQuantity,
  type,
  active,
}: {
  configId: number;
  depotName: string;
  productName: string;
  validFrom: Date;
  totalShipedQuantity: number;
  type: ShipmentType;
  active: boolean;
}) => {
  const depot = await getDepotByName(depotName);
  const product = await getProductByName(productName);
  const shipment = new Shipment();
  shipment.requisitionConfigId = configId;
  shipment.validFrom = validFrom;
  shipment.active = active;
  shipment.description = null;
  shipment.type = type;
  shipment.updatedAt = new Date();
  await AppDataSource.getRepository(Shipment).save(shipment);

  const item = new ShipmentItem();
  item.shipment = shipment;
  item.depotId = depot.id;
  item.productId = product.id;
  item.totalShipedQuantity = totalShipedQuantity;
  item.unit = Unit.PIECE;
  item.multiplicator = 80;
  item.isBio = true;
  item.description = null;
  await AppDataSource.getRepository(ShipmentItem).save(item);
};

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => getShipmentItemsExport(ctx)).rejects.toThrowError(
    "Error 401",
  );
});

testAsUser1(
  "prevent access for non-admin",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      configId: "1",
    });
    await expect(() => getShipmentItemsExport(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdmin(
  "returns joined rows for the requested season only",
  async ({ userData }: TestUserData) => {
    const configId = await getRequisitionConfigId();
    const otherSeason = new RequisitionConfig();
    otherSeason.name = "Andere Saison";
    otherSeason.budget = 1;
    otherSeason.startOrder = new Date("2024-01-01T00:00:00.000Z");
    otherSeason.startBiddingRound = new Date("2024-02-01T00:00:00.000Z");
    otherSeason.endBiddingRound = new Date("2024-03-01T00:00:00.000Z");
    otherSeason.validFrom = new Date("2024-04-01T00:00:00.000Z");
    otherSeason.validTo = new Date("2025-03-31T00:00:00.000Z");
    otherSeason.public = false;
    const savedOtherSeason =
      await AppDataSource.getRepository(RequisitionConfig).save(otherSeason);

    await createShipmentItem({
      configId,
      depotName: "d1",
      productName: "p1",
      validFrom: new Date("2025-03-01T10:00:00.000Z"),
      totalShipedQuantity: 4,
      type: ShipmentType.NORMAL,
      active: false,
    });
    await createShipmentItem({
      configId,
      depotName: "d2",
      productName: "p2",
      validFrom: new Date("2025-04-01T10:00:00.000Z"),
      totalShipedQuantity: 9,
      type: ShipmentType.FORECAST,
      active: true,
    });
    await createShipmentItem({
      configId: savedOtherSeason.id,
      depotName: "d1",
      productName: "p1",
      validFrom: new Date("2025-05-01T10:00:00.000Z"),
      totalShipedQuantity: 99,
      type: ShipmentType.NORMAL,
      active: true,
    });

    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      configId: String(configId),
    });
    await getShipmentItemsExport(ctx);

    const items = ctx.body.items as ShipmentItemExportRow[];
    expect(items).toEqual([
      expect.objectContaining({
        depotName: "d1",
        productName: "p1",
        totalShipedQuantity: 4,
        unit: Unit.PIECE,
        multiplicator: 80,
        season: "Saison 24/25",
      }),
      expect.objectContaining({
        depotName: "d2",
        productName: "p2",
        totalShipedQuantity: 9,
        unit: Unit.PIECE,
        multiplicator: 80,
        season: "Saison 24/25",
      }),
    ]);
    expect(items.map((item) => item.totalShipedQuantity)).not.toContain(99);
  },
);
