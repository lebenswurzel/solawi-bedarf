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
  OrderPaymentType,
  UserCategory,
} from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { ConfirmedOrder } from "@lebenswurzel/solawi-bedarf-shared/src/types";
import {
  TestUserData,
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsUser1,
} from "../../../testSetup";
import { Order } from "../../database/Order";
import { getDepotByName, updateRequisition } from "../../../test/testHelpers";
import { getOrder } from "./getOrder";
import { saveOrder } from "./saveOrder";
import { AppDataSource } from "../../database/database";
import { RequisitionConfig } from "../../database/RequisitionConfig";
import { addMonths } from "date-fns";
import { updateOrderValidFrom } from "../user/saveUser";

setupDatabaseCleanup();

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

  await expect(() => getOrder(ctx)).rejects.toThrowError("Error 404");

  // no order yet
  expect(ctx.body).toMatchObject({});

  // create the order by updating the validFrom date for the user
  // must be set to a future date
  await updateOrderValidFrom(
    userData.userId,
    addMonths(new Date(), 1),
    configId,
  );

  const depot = await getDepotByName("d1");
  const saveOrderRequest: ConfirmedOrder = {
    category: UserCategory.CAT100,
    categoryReason: "nothing special",
    depotId: depot.id,
    orderItems: [],
    offer: 0,
    alternateDepotId: null,
    offerReason: "",
    requisitionConfigId: configId,
    confirmGTC: true,
    paymentInfo: {
      paymentType: OrderPaymentType.BANK_TRANSFER,
      paymentRequired: true,
      amount: 0,
      bankDetails: {
        accountHolder: "Gerda Gemüse",
        iban: "DE73916490657576621284",
        bankName: "Solawi Bank",
      },
    },
  };

  // create order
  const ctxSaveOrder = createBasicTestCtx(
    { ...saveOrderRequest, confirmGTC: true },
    userData.token,
    undefined,
    {
      id: userData.userId,
      configId,
    },
  );
  await saveOrder(ctxSaveOrder);

  // update to the past so that getOrder returns this order
  await updateOrderValidFrom(
    userData.userId,
    addMonths(new Date(), -1),
    configId,
  );

  const config = await AppDataSource.getRepository(
    RequisitionConfig,
  ).findOneOrFail({ where: { id: configId } });

  // get existing order
  await getOrder(ctx);
  expect(ctx.body as Order).toMatchObject(saveOrderRequest);
});
