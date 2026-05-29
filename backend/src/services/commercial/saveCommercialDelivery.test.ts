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
import { Unit, UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { getProductByName } from "../../../test/testHelpers";
import {
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsAdmin,
  TestUserData,
} from "../../../testSetup";
import { AppDataSource } from "../../database/database";
import { User } from "../../database/User";
import { CommercialProfile } from "../../database/CommercialProfile";
import { CommercialDelivery } from "../../database/CommercialDelivery";
import { hashPassword } from "../../security";
import { saveCommercialDelivery } from "./saveCommercialDelivery";

setupDatabaseCleanup();

const createCommercialCustomer = async () => {
  const user = new User(
    "gastro1",
    await hashPassword("123456"),
    UserRole.COMMERCIAL,
    true,
  );
  await AppDataSource.getRepository(User).save(user);
  const profile = new CommercialProfile();
  profile.userId = user.id;
  profile.user = user;
  profile.companyName = "Gastro Albergo";
  profile.street = "Hauptstr. 1";
  profile.postalcode = "01796";
  profile.city = "Pirna";
  await AppDataSource.getRepository(CommercialProfile).save(profile);
  return user;
};

testAsAdmin(
  "create commercial delivery",
  async ({ userData }: TestUserData) => {
    const customer = await createCommercialCustomer();
    const product = await getProductByName("p1");

    const ctx = createBasicTestCtx(
      {
        deliveryDate: new Date(),
        customerUserId: customer.id,
        description: "Marktstand",
        active: true,
        items: [
          {
            productId: product.id,
            quantity: 1500,
            unit: Unit.WEIGHT,
            conversionFrom: 1,
            conversionTo: 1,
            unitPriceCents: product.msrp,
            vatRate: 7,
            isBio: true,
            description: null,
          },
        ],
      },
      userData.token,
    );

    await saveCommercialDelivery(ctx);
    expect(ctx.body.id).toBeDefined();

    const saved = await AppDataSource.getRepository(
      CommercialDelivery,
    ).findOneOrFail({
      where: { description: "Marktstand" },
      relations: { items: true },
    });
    expect(saved.items).toHaveLength(1);
    expect(saved.customerUserId).toBe(customer.id);
  },
);

testAsAdmin(
  "reject delivery for non-commercial customer",
  async ({ userData }: TestUserData) => {
    const regularUser = await AppDataSource.getRepository(User).findOneByOrFail(
      {
        name: "user1",
      },
    );

    const product = await getProductByName("p1");
    const ctx = createBasicTestCtx(
      {
        deliveryDate: new Date(),
        customerUserId: regularUser.id,
        description: "invalid",
        active: true,
        items: [
          {
            productId: product.id,
            quantity: 1,
            unit: Unit.PIECE,
            conversionFrom: 1,
            conversionTo: 1,
            unitPriceCents: 100,
            vatRate: 7,
            isBio: false,
            description: null,
          },
        ],
      },
      userData.token,
    );

    await expect(() => saveCommercialDelivery(ctx)).rejects.toThrow(
      "invalid commercial customer",
    );
  },
);
