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
import { UserRole } from "../shared/src/enum";
import { Order } from "./src/database/Order";
import { User } from "./src/database/User";

const clearAllTables = async () => {
  const entities = AppDataSource.entityMetadatas;
  console.log("deleting all tables");

  // must delete first to prevent foreign key violations
  await AppDataSource.getRepository(Order).delete({});

  for (const entity of entities) {
    await AppDataSource.getRepository(entity.name).delete({});
  }
};

const reinitializeDatabase = async () => {
  console.log("initializing database");
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
      },
      token,
    ),
  );
};

beforeAll(async () => {
  await AppDataSource.initialize().then(async () => {
    console.log("db is up");
    await reinitializeDatabase();
  });
});

afterEach(async () => {
  await reinitializeDatabase();
});

////////////////////////////////////////////////////
// test helper methods
////////////////////////////////////////////////////
export const createBasicTestCtx = (
  body?: any,
  token?: string,
  headers?: any,
  query?: object,
): any => {
  const ctx = {
    cookies: new Map(),
    req: {
      body,
      headers,
    },
    request: {
      body,
      query,
    },
    status: -1,
    throw: (status: number) => {
      throw Error("Error " + status);
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
