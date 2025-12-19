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
import "reflect-metadata";

import { AppDataSource } from "./src/database/database";
import { initDb } from "./src/services/initDb";
import { login } from "./src/services/user/login";
import { afterEach, beforeAll, test } from "vitest";
import { saveUser } from "./src/services/user/saveUser";
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { Order } from "./src/database/Order";
import { User } from "./src/database/User";
import {
  fillDatabaseWithTestData,
  getRequisitionConfigId,
} from "./test/testHelpers";
import { Product } from "./src/database/Product";
import { ProductCategory } from "./src/database/ProductCategory";
import { Depot } from "./src/database/Depot";
import { Token } from "./src/database/Token";
import { OrderItem } from "./src/database/OrderItem";
import { Applicant } from "./src/database/Applicant";
import { UserAddress } from "./src/database/UserAddress";
import { AdditionalShipmentItem } from "./src/database/AdditionalShipmentItem";
import { Shipment } from "./src/database/Shipment";
import { ShipmentItem } from "./src/database/ShipmentItem";
import { PasswordReset } from "./src/database/PasswordReset";

const clearAllTables = async () => {
  const entities = AppDataSource.entityMetadatas;

  // must delete in specific order to prevent foreign key violations
  await AppDataSource.getRepository(OrderItem).deleteAll();
  await AppDataSource.getRepository(ShipmentItem).deleteAll();
  await AppDataSource.getRepository(Product).deleteAll();
  await AppDataSource.getRepository(ProductCategory).deleteAll();
  await AppDataSource.getRepository(Order).deleteAll();
  await AppDataSource.getRepository(AdditionalShipmentItem).deleteAll();
  await AppDataSource.getRepository(Shipment).deleteAll();
  await AppDataSource.getRepository(Depot).deleteAll();
  await AppDataSource.getRepository(Token).deleteAll();
  await AppDataSource.getRepository(Applicant).deleteAll();
  await AppDataSource.getRepository(UserAddress).deleteAll();
  await AppDataSource.getRepository(PasswordReset).deleteAll();
  await AppDataSource.getRepository(User).deleteAll();

  // delete everything that remains
  for (const entity of entities) {
    await AppDataSource.getRepository(entity.name).deleteAll();
  }
};

const reinitializeDatabase = async () => {
  await clearAllTables();
  await initDb();

  // create user1
  const token = await loginUser("admin", "admin");
  await saveUser(
    createBasicTestCtx(
      {
        name: "user1",
        password: "123456",
        role: UserRole.USER,
        active: true,
        requisitionConfigId: await getRequisitionConfigId(),
      },
      token,
    ),
  );
  await fillDatabaseWithTestData();
};

/**
 * Sets up database reinitialization after each test.
 * Call this function in test files that need database cleanup between tests.
 * Tests that don't interact with the database (e.g., pure utility function tests)
 * should not call this to improve test performance.
 */
export const setupDatabaseCleanup = () => {
  beforeAll(async () => {
    await AppDataSource.initialize().then(async () => {
      await reinitializeDatabase();
    });
  });

  afterEach(async () => {
    await reinitializeDatabase();
  });
};

////////////////////////////////////////////////////
// test helper methods
////////////////////////////////////////////////////
export const createBasicTestCtx = <BodyType>(
  body?: BodyType,
  token?: string,
  headers?: any,
  query?: object,
): any => {
  const ctx = {
    cookies: new Map(),
    req: {
      body: { ...body },
      headers: { ...headers },
    },
    request: {
      body: { ...body },
      query: { ...(query || {}) },
    },
    status: -1,
    throw: (status: number, message?: string) => {
      throw Error("Error " + status + (message ? ": " + message : ""));
    },
  };

  if (token) {
    ctx.cookies.set("token", token);
  }

  return ctx;
};

export const loginUser = async (
  name: string,
  pass: string,
): Promise<string> => {
  const authorization = "Basic " + btoa(name + ":" + pass);
  const ctx = createBasicTestCtx(undefined, undefined, { authorization });

  await login(ctx);
  return ctx.cookies.get("token");
};

////////////////////////////////////////////////////
// test fixtures
////////////////////////////////////////////////////
export interface TestUserData {
  userData: {
    token: string;
    userId: number;
  };
}

export interface TestAdminAndUserData {
  userData: {
    adminToken: string;
    adminId: number;
    userToken: string;
    userId: number;
  };
}

/**
 * test fixture for tests that require a logged in admin
 */
export const testAsAdmin = test.extend<TestUserData>({
  userData: async ({}, use) => {
    const token = await loginUser("admin", "admin");
    const userId = await getUserId("admin");
    await use({ token, userId });
  },
});

export const testAsAdminAndUser = test.extend<TestAdminAndUserData>({
  userData: async ({}, use) => {
    const adminToken = await loginUser("admin", "admin");
    const adminId = await getUserId("admin");
    const userToken = await loginUser("user1", "123456");
    const userId = await getUserId("user1");
    await use({ adminToken, adminId, userToken, userId });
  },
});

/**
 * test fixture for tests that require a logged in user
 */
export const testAsUser1 = test.extend<TestUserData>({
  userData: async ({}, use) => {
    const token = await loginUser("user1", "123456");
    const userId = await getUserId("user1");
    await use({ token, userId });
  },
});

export const getUserId = async (name: string): Promise<number> => {
  const user = await AppDataSource.getRepository(User).findOneByOrFail({
    name,
  });
  return user.id;
};
