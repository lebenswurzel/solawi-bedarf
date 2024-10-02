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
import { Order as OrderType } from "../../../../shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  testAsUser1,
} from "../../../testSetup";
import { Order } from "../../database/Order";
import { getDepotByName, updateRequisition } from "../../../test/testHelpers";
import { getOrder } from "./getOrder";
import { saveOrder } from "./saveOrder";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  await expect(() => getOrder(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for different user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: userData.userId + 100,
    });
    await expect(() => getOrder(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsUser1("get order", async ({ userData }: TestUserData) => {
  const configId = await updateRequisition(true);

  const ctx = createBasicTestCtx({}, userData.token, undefined, {
    id: userData.userId,
    configId,
  });

  await getOrder(ctx);

  // no order yet
  expect(ctx.body).toMatchObject({});

  const depot = await getDepotByName("d1");
  const createOrderRequest: OrderType = {
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: "",
    validFrom: null,
  };

  // create order
  const ctxCreateOrder = createBasicTestCtx(
    { ...createOrderRequest, confirmGTC: true },
    userData.token,
    undefined,
    {
      id: userData.userId,
      configId,
    },
  );
  await saveOrder(ctxCreateOrder);

  // get existing order
  await getOrder(ctx);
  expect(ctx.body as Order).toMatchObject(createOrderRequest);
});
