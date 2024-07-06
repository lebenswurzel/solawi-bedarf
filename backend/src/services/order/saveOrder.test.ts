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
  TestUserData,
  createBasicTestCtx,
  testAsUser1,
} from "../../../testSetup";
import { saveOrder } from "./saveOrder";
import { getOrder } from "./getOrder";
import { ConfirmedOrder } from "../../../../shared/src/types";
import { UserCategory } from "../../../../shared/src/enum";
import {
  findOrdersByUser,
  getDepotByName,
  updateRequisition,
} from "../../test/testHelpers";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => saveOrder(ctx)).rejects.toThrowError("Error 401");
  await expect(() => getOrder(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
    });
    await expect(() => saveOrder(ctx)).rejects.toThrowError("Error 403");
    await expect(() => getOrder(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsUser1("save empty order", async ({ userData }: TestUserData) => {
  await updateRequisition(true);
  const depot = await getDepotByName("d1");
  const request: ConfirmedOrder = {
    confirmGTC: true,
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: null,
    validFrom: null,
  };

  // create order
  const ctx = createBasicTestCtx(request, userData.token, undefined, {
    id: userData.userId,
  });

  expect((await findOrdersByUser(userData.userId)).length).toBe(0);

  await saveOrder(ctx);
  expect(ctx.status).toBe(204);
  const orders = await findOrdersByUser(userData.userId);
  expect(orders.length).toBe(1);
  expect(orders[0].categoryReason).toBe("nothing special");
  expect(orders[0].userId).toBe(userData.userId);

  // update order
  const ctx2 = createBasicTestCtx(
    { ...request, categoryReason: "updated" },
    userData.token,
    undefined,
    {
      id: userData.userId,
    },
  );
  await saveOrder(ctx2);
  expect(ctx2.status).toBe(204);
  const orders2 = await findOrdersByUser(userData.userId);
  expect(orders2.length).toBe(1);
  expect(orders2[0].categoryReason).toBe("updated");
  expect(orders[0].userId).toBe(userData.userId);
});
