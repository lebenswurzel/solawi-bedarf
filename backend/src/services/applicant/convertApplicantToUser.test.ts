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
import { convertApplicantToUser } from "./convertApplicantToUser";
import {
  createBasicTestCtx,
  testAsAdmin,
  testAsUser1,
  TestUserData,
} from "../../../testSetup";
import { hashPassword } from "../../security";

test("prevent unauthorized access", async () => {
  const ctx = createBasicTestCtx({ name: "testuser" });
  ctx.params = { id: "1" };
  await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
    "Error 401",
  );
});

testAsUser1(
  "prevent access for unprivileged user",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx({ name: "testuser" }, userData.token);
    ctx.params = { id: "1" };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 403",
    );
  },
);

testAsAdmin(
  "create user and set applicant active=false",
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
    applicant.active = true;
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Convert applicant to user
    const ctx = createBasicTestCtx(
      { name: "newuser" },
      userData.token,
      undefined,
      undefined,
    );
    ctx.params = { id: savedApplicant.id.toString() };
    await convertApplicantToUser(ctx);

    expect(ctx.status).toBe(http.created);

    // Verify applicant is now inactive
    const updatedApplicant = await applicantRepo.findOneBy({
      id: savedApplicant.id,
    });
    expect(updatedApplicant).toBeDefined();
    expect(updatedApplicant!.active).toBe(false);
    expect(updatedApplicant!.userId).toBeDefined();

    // Verify user was created
    const createdUser = await AppDataSource.getRepository(User).findOneBy({
      id: updatedApplicant!.userId!,
    });
    expect(createdUser).toBeDefined();
    expect(createdUser!.name).toBe("newuser");
    expect(createdUser!.active).toBe(false);
    expect(createdUser!.role).toBe(UserRole.USER);
    expect(createdUser!.hash).toBe(applicant.hash);
    expect(createdUser!.deleted).toBe(false);
  },
);

testAsAdmin(
  "prevent converting applicant with missing name",
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
    applicant.active = true;
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Try to convert without name
    const ctx = createBasicTestCtx({}, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent converting non-existent applicant",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx({ name: "testuser" }, userData.token);
    ctx.params = { id: "99999" };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent converting already converted applicant",
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
    applicant.active = false;
    applicant.userId = savedUser.id;
    applicant.user = savedUser;
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Try to convert again
    const ctx = createBasicTestCtx({ name: "newuser" }, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent converting inactive applicant",
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
    applicant.active = false; // inactive
    applicant.address = savedAddress;
    const savedApplicant = await applicantRepo.save(applicant);

    // Try to convert
    const ctx = createBasicTestCtx({ name: "newuser" }, userData.token);
    ctx.params = { id: savedApplicant.id.toString() };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);

testAsAdmin(
  "prevent converting with invalid applicant ID",
  async ({ userData }: TestUserData) => {
    const ctx = createBasicTestCtx({ name: "testuser" }, userData.token);
    ctx.params = { id: "invalid" };
    await expect(() => convertApplicantToUser(ctx)).rejects.toThrowError(
      "Error 400",
    );
  },
);
