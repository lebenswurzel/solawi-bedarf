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
import { UserCategory } from "../../../../shared/src/enum";
import {
  TestUserData,
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
} from "../../../testSetup";
import { http } from "../../consts/http";
import { Order } from "../../database/Order";
import { AppDataSource } from "../../database/database";
import { getDepotByName, getDepots } from "../../../test/testHelpers";
import { DepotInfo } from "./depotTypes";
import { saveDepot } from "./saveDepot";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveDepot(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent unprivileged access",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    await expect(() => saveDepot(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin("create new depots", async ({ userData }: TestUserData) => {
  const token = userData.token;
  const ctx = createBasicTestCtx(
    {
      name: "Depot 1",
      address: "123 Fake St",
      openingHours: "9-5",
      capacity: 12,
      active: true,
    },
    token,
  );

  const currentDepotNumber = (await getDepots()).length;

  // create a depot
  await saveDepot(ctx);

  expect(ctx.status).toBe(http.created);

  // validate it's created
  expect(await getDepots()).toHaveLength(currentDepotNumber + 1);
  expect(await getDepotByName("Depot 1")).toMatchObject({
    name: "Depot 1",
    address: "123 Fake St",
    openingHours: "9-5",
    capacity: 12,
    active: true,
    rank: 4,
  });

  // create a depot with the same name again -> error
  expect(() => saveDepot(ctx)).rejects.toThrowError();

  expect(await getDepots()).toHaveLength(currentDepotNumber + 1);

  // create a depot with another name
  const ctx2 = createBasicTestCtx(
    {
      name: "Depot 2",
      address: "321 Standard Rd",
      openingHours: "10-20",
      comment: "another depot",
      capacity: 9,
      active: false,
    },
    token,
  );
  await saveDepot(ctx2);

  expect(ctx2.status).toBe(http.created);
  expect(await getDepots()).toHaveLength(currentDepotNumber + 2);
  expect(await getDepotByName("Depot 2")).toMatchObject({
    name: "Depot 2",
    address: "321 Standard Rd",
    openingHours: "10-20",
    comment: "another depot",
    capacity: 9,
    active: false,
    rank: 5,
  });
});

testAsAdmin("update depot info", async ({ userData }: TestUserData) => {
  const token = userData.token;
  const infoDepot1 = {
    name: "Depot 1",
    address: "123 Fake St",
    openingHours: "9-5",
    capacity: 12,
    active: true,
  };
  const infoDepot2 = {
    name: "Depot 2",
    address: "321 Standard Str",
    openingHours: "10-20",
    capacity: 9,
    active: false,
  };

  // create depots
  for (const entry of [infoDepot1, infoDepot2]) {
    const ctx = createBasicTestCtx(entry, token);
    await saveDepot(ctx);
    expect(ctx.status).toBe(http.created);
  }

  const depot1 = await getDepotByName("Depot 1");
  const updateDepot1: DepotInfo = {
    ...infoDepot1,
    id: depot1.id,
    name: "Depot 1-1",
    comment: "Updated!",
  };
  await saveDepot(createBasicTestCtx(updateDepot1, token));
  expect(await getDepotByName("Depot 1")).toBeUndefined();
  expect(await getDepotByName("Depot 1-1")).toMatchObject(updateDepot1);
  expect(await getDepotByName("Depot 2")).toMatchObject(infoDepot2);

  // rename "Depot 1" to "Depot 2", which should fail
  const updateDepot1Bad = {
    ...updateDepot1,
    name: "Depot 2",
  };
  await expect(() =>
    saveDepot(createBasicTestCtx(updateDepot1Bad, token)),
  ).rejects.toThrowError();
  expect(await getDepotByName("Depot 1-1")).toMatchObject(updateDepot1);
  expect(await getDepotByName("Depot 2")).toMatchObject(infoDepot2);

  // Set Depot 1 inactive (only allowed if no orders exist)
  const updateDepot1inactive = {
    ...updateDepot1,
    active: false,
  };
  await saveDepot(createBasicTestCtx(updateDepot1inactive, token));
  expect(await getDepotByName("Depot 1-1")).toMatchObject(updateDepot1inactive);

  // restore Depot 1-1 to be active
  await saveDepot(createBasicTestCtx(updateDepot1, token));

  // add an order
  let order = new Order();
  order.depotId = depot1.id;
  order.offer = 3;
  order.category = UserCategory.CAT100;
  order.productConfiguration = "{}";
  order.userId = userData.userId;
  await AppDataSource.getRepository(Order).save(order);

  // Set Depot 1 inactive --> fails
  await expect(() =>
    saveDepot(createBasicTestCtx(updateDepot1inactive, token)),
  ).rejects.toThrowError("Error 400");
  expect(await getDepotByName("Depot 1-1")).toMatchObject(updateDepot1);

  // Try modifying inexistient depot
  const badDepotId = {
    ...infoDepot1,
    id: 300,
  };
  await expect(() =>
    saveDepot(createBasicTestCtx(badDepotId, token)),
  ).rejects.toThrowError("Error 400");
});
