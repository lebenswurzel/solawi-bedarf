import { expect, test } from "vitest";
import {
  TestUserData,
  createBasicTestCtx,
  testAsUser1,
} from "../../../testSetup";
import { saveOrder } from "./saveOrder";
import { getOrder } from "./getOrder";

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
