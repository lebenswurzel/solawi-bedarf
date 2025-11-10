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
import { UserRole } from "@lebenswurzel/solawi-bedarf-shared/src/enum";
import { deactivateApplicant } from "./deactivateApplicant";
import {
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { hashPassword } from "../../security";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx();
  ctx.params = { id: "1" };
  await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
    "Error 401",
  );
});

testAsUser1(
  "prevent access for unprivileged user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "1" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdmin(
  "deactivate applicant and set active=false",
  async ({ userData }: TestUserData) => {
    // Create an active applicant
    const addressRepo = AppDataSource.getRepository(UserAddress);
    const applicantRepo = AppDataSource.getRepository(Applicant);

    const address = new UserAddress();
    address.active = false;
    address.address = JSON.stringify({
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    });
    const savedAddress = await addressRepo.save(address);

    const applicant = new Applicant();
    applicant.confirmGDPR = true;
    applicant.comment = "Test comment";
    applicant.hash = await hashPassword("testpassword123");
    applicant.active = true; // active
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Verify applicant is active
    expect(savedApplicant.active).toBe(true);

    // Deactivate the applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await deactivateApplicant(ctx);

    expect(ctx.status).toBe(http.no_content);

    // Verify applicant is now inactive
    const updatedApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(updatedApplicant).toBeDefined();
    expect(updatedApplicant!.active).toBe(false);
  },
);

testAsAdmin(
  "prevent deactivating non-existent applicant",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "99999" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent deactivating with invalid applicant ID",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: "invalid" };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent deactivating already converted applicant",
  async ({ userData }: TestUserData) => {
    // Create a user first
    const user = new User();
    user.name = "existinguser";
    user.active = false;
    user.hash = await hashPassword("testpassword123");
    user.role = UserRole.USER;
    const savedUser = await AppDataSource.getRepository(User).save(user);

    // Create an applicant that's already converted
    const addressRepo = AppDataSource.getRepository(UserAddress);
    const applicantRepo = AppDataSource.getRepository(Applicant);

    const address = new UserAddress();
    address.active = false;
    address.address = JSON.stringify({
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    });
    const savedAddress = await addressRepo.save(address);

    const applicant = new Applicant();
    applicant.confirmGDPR = true;
    applicant.comment = "Test comment";
    applicant.hash = await hashPassword("testpassword123");
    applicant.active = true;
    applicant.userId = savedUser.id;
    applicant.user = savedUser;
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Try to deactivate converted applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );

    // Verify applicant is still active
    const existingApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(existingApplicant).toBeDefined();
    expect(existingApplicant!.active).toBe(true);
  },
);

testAsAdmin(
  "prevent deactivating already inactive applicant",
  async ({ userData }: TestUserData) => {
    // Create an inactive applicant
    const addressRepo = AppDataSource.getRepository(UserAddress);
    const applicantRepo = AppDataSource.getRepository(Applicant);

    const address = new UserAddress();
    address.active = false;
    address.address = JSON.stringify({
      firstname: "John",
      lastname: "Doe",
      email: "john.doe@example.com",
      phone: "+49123456789",
      street: "Test Street 123",
      postalcode: "12345",
      city: "Test City",
    });
    const savedAddress = await addressRepo.save(address);

    const applicant = new Applicant();
    applicant.confirmGDPR = true;
    applicant.comment = "Test comment";
    applicant.hash = await hashPassword("testpassword123");
    applicant.active = false; // already inactive
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Try to deactivate already inactive applicant
    const ctx = createBasicTestCtx(undefined, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => deactivateApplicant(ctx)).rejects.toThrowError(
      "Error 400",
    );

    // Verify applicant is still inactive
    const existingApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(existingApplicant).toBeDefined();
    expect(existingApplicant!.active).toBe(false);
  },
);
