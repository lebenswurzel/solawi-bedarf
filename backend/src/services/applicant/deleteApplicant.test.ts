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
import { http } from "../../consts/http";
import { AppDataSource } from "../../database/database";
import { Applicant } from "../../database/Applicant";
import { User } from "../../database/User";
import { UserAddress } from "../../database/UserAddress";
import { deleteApplicant } from "./deleteApplicant";
import {
  createBasicTestCtx,
  setupDatabaseCleanup,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import {
  createTestApplicant,
  createTestApplicantWithUser,
} from "../../../test/testHelpers";

setupDatabaseCleanup();

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx(undefined, undefined, undefined, { id: "1" });
  await expect(() => deleteApplicant(ctx)).rejects.toThrowError("Error 401");
});

testAsUser1(
  "prevent access for unprivileged user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: "1",
    });
    await expect(() => deleteApplicant(ctx)).rejects.toThrowError("Error 403");
  },
);

testAsAdmin(
  "remove applicant data and set user deleted=true",
  async ({ userData }: TestUserData) => {
    // Create an inactive applicant (linked to user) - must be inactive to delete
    const { applicant: savedApplicant, user: savedUser } =
      await createTestApplicantWithUser({
        active: false,
        userName: "testuser",
      });
    // Set user active for this test
    savedUser.active = true;
    await AppDataSource.getRepository("User").save(savedUser);

    // Delete the applicant
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: savedApplicant.id.toString(),
    });
    await deleteApplicant(ctx);

    expect(ctx.status).toBe(http.no_content);

    // Verify applicant was removed
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const deletedApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(deletedApplicant).toBeNull();

    // Verify address was removed
    const addressRepo = AppDataSource.getRepository(UserAddress);
    const deletedAddress = await addressRepo.findOneBy({
      id: savedApplicant.addressId,
    });
    expect(deletedAddress).toBeNull();

    // Verify user still exists but is marked as deleted and inactive
    const updatedUser = await AppDataSource.getRepository(User).findOneBy({
      id: savedUser.id,
    });
    expect(updatedUser).toBeDefined();
    expect(updatedUser!.deleted).toBe(true);
    expect(updatedUser!.active).toBe(false);
  },
);

testAsAdmin(
  "prevent deleting active applicant",
  async ({ userData }: TestUserData) => {
    // Create an active applicant - cannot delete
    const savedApplicant = await createTestApplicant({ active: true });

    // Try to delete active applicant
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: savedApplicant.id.toString(),
    });
    await expect(() => deleteApplicant(ctx)).rejects.toThrowError("Error 400");

    // Verify applicant still exists
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const existingApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(existingApplicant).toBeDefined();
    expect(existingApplicant!.active).toBe(true);
  },
);

testAsAdmin(
  "prevent deleting non-existent applicant",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: "99999",
    });
    await expect(() => deleteApplicant(ctx)).rejects.toThrowError("Error 400");
  },
);

testAsAdmin(
  "prevent deleting without applicant ID",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {});
    await expect(() => deleteApplicant(ctx)).rejects.toThrowError("Error 400");
  },
);

testAsAdmin(
  "delete applicant without user (user already deleted)",
  async ({ userData }: TestUserData) => {
    // Create an inactive applicant without user
    const savedApplicant = await createTestApplicant({ active: false });

    // Delete the applicant
    const ctx = createBasicTestCtx(undefined, userData.token, undefined, {
      id: savedApplicant.id.toString(),
    });
    await deleteApplicant(ctx);

    expect(ctx.status).toBe(http.no_content);

    // Verify applicant was removed
    const applicantRepo = AppDataSource.getRepository(Applicant);
    const deletedApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(deletedApplicant).toBeNull();

    // Verify address was removed
    const addressRepo = AppDataSource.getRepository(UserAddress);
    const deletedAddress = await addressRepo.findOneBy({
      id: savedApplicant.addressId,
    });
    expect(deletedAddress).toBeNull();
  },
);
